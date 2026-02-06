import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  async list(query: { stationId?: string; from?: string; to?: string }) {
    const { stationId, from, to } = query;
    if (!stationId || !from || !to) {
      throw new BadRequestException('Missing query params');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (toDate <= fromDate) {
      throw new BadRequestException('Invalid time range');
    }

    return this.prisma.reservation.findMany({
      where: {
        stationId,
        deletedAt: null,
        startsAt: { lt: toDate },
        endsAt: { gt: fromDate },
      },
      orderBy: { startsAt: 'asc' },
      include: { game: true, station: true },
    });
  }

  async create(dto: CreateReservationDto) {
    const station = await this.prisma.gameStation.findUnique({
      where: { id: dto.stationId },
    });
    if (!station || !station.isActive) {
      throw new NotFoundException('Station not available');
    }

    if (dto.gameId) {
      const game = await this.prisma.game.findUnique({
        where: { id: dto.gameId },
      });
      if (!game || !game.isActive) {
        throw new NotFoundException('Game not available');
      }
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException('Invalid time range');
    }
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid time range');
    }

    const minMinutes = Number(process.env.RESERVATION_MIN_MINUTES || 30);
    const maxMinutes = Number(process.env.RESERVATION_MAX_MINUTES || 120);
    const durationMinutes = (endsAt.getTime() - startsAt.getTime()) / 60000;
    if (durationMinutes < minMinutes || durationMinutes > maxMinutes) {
      throw new BadRequestException('Invalid reservation duration');
    }

    const conflict = await this.prisma.reservation.findFirst({
      where: {
        stationId: dto.stationId,
        deletedAt: null,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (conflict) {
      throw new BadRequestException('Time slot not available');
    }

    // Limit one active reservation per phone per day
    const dayStart = new Date(startsAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const phoneCount = await this.prisma.reservation.count({
      where: {
        customerPhone: dto.customerPhone,
        deletedAt: null,
        startsAt: { gte: dayStart, lt: dayEnd },
      },
    });
    if (phoneCount >= 5) {
      throw new BadRequestException('Phone already has 5 reservations for this day');
    }

    return this.prisma.reservation.create({
      data: {
        stationId: dto.stationId,
        gameId: dto.gameId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        startsAt,
        endsAt,
      },
      include: {
        station: true,
        game: true,
      },
    });
  }

  async archiveReservation(
    reservationId: string,
    actor?: { id?: string; email?: string; role?: string },
  ) {
    const exists = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!exists || exists.deletedAt) {
      throw new NotFoundException('Reservation not found');
    }

    const updated = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actor?.id,
        action: 'RESERVATION_ARCHIVED',
        entityType: 'Reservation',
        entityId: updated.id,
        metadata: {
          actorEmail: actor?.email,
          actorRole: actor?.role,
        },
      },
    });

    return { id: updated.id, archivedAt: updated.deletedAt };
  }

  async startGame(
    data: {
      stationId: string;
      gameId?: string;
      durationMinutes?: number;
      customerName?: string;
      customerPhone?: string;
    },
    actor?: { id?: string; email?: string; role?: string },
  ) {
    const minutes = data.durationMinutes ?? 60;
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + minutes * 60 * 1000);

    const dto: CreateReservationDto = {
      stationId: data.stationId,
      gameId: data.gameId,
      customerName: data.customerName || 'Walk-in',
      customerPhone: data.customerPhone || 'N/A',
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    };

    const created = await this.create(dto);

    await this.prisma.auditLog.create({
      data: {
        userId: actor?.id,
        action: 'GAME_SESSION_START',
        entityType: 'Reservation',
        entityId: created.id,
        metadata: {
          stationId: created.stationId,
          gameId: created.gameId,
          actorEmail: actor?.email,
          actorRole: actor?.role,
        },
      },
    });

    return created;
  }

  async stopGame(
    reservationId: string,
    actor?: { id?: string; email?: string; role?: string },
  ) {
    const exists = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!exists || exists.deletedAt) {
      throw new NotFoundException('Reservation not found');
    }

    const now = new Date();
    const durationMinutes = Math.max(
      1,
      Math.round((now.getTime() - exists.startsAt.getTime()) / 60000),
    );
    const pricePerHour = Number(process.env.GAME_PRICE_PER_HOUR || 300);
    const unit = Math.round(pricePerHour / 2);
    const blocks = Math.ceil(durationMinutes / 30);
    const amountCents = blocks * unit;

    const updated = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { deletedAt: now },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actor?.id,
        action: 'GAME_SESSION_STOP',
        entityType: 'Reservation',
        entityId: updated.id,
        metadata: {
          durationMinutes,
          amountCents,
          actorEmail: actor?.email,
          actorRole: actor?.role,
        },
      },
    });

    return {
      id: updated.id,
      stoppedAt: updated.deletedAt,
      durationMinutes,
      amountCents,
    };
  }

  async topGames(from?: string, to?: string, limit = 5) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    if (fromDate && Number.isNaN(fromDate.getTime())) {
      throw new BadRequestException('Invalid from date');
    }
    if (toDate && Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid to date');
    }

    const grouped = await this.prisma.reservation.groupBy({
      by: ['gameId'],
      where: {
        deletedAt: null,
        gameId: { not: null },
        ...(fromDate || toDate
          ? {
              startsAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      _count: { gameId: true },
      orderBy: { _count: { gameId: 'desc' } },
      take: limit,
    });

    const gameIds = grouped.map((g) => g.gameId).filter(Boolean) as string[];
    const games = await this.prisma.game.findMany({
      where: { id: { in: gameIds } },
    });
    const gameMap = new Map(games.map((g) => [g.id, g.name]));

    return grouped.map((g) => ({
      gameId: g.gameId,
      name: g.gameId ? gameMap.get(g.gameId) || 'Unknown' : 'Unknown',
      count: g._count.gameId ?? 0,
    }));
  }
}
