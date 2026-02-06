import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  @Cron('*/5 * * * *')
  async closeIdleSessions() {
    const idleMinutes = Number(process.env.TABLE_SESSION_IDLE_MINUTES || 120);
    const cutoff = new Date(Date.now() - idleMinutes * 60 * 1000);

    await this.prisma.tableSession.updateMany({
      where: {
        endedAt: null,
        lastActivityAt: { lt: cutoff },
      },
      data: { endedAt: new Date() },
    });
  }

  async closeByTable(
    tableCode: string,
    actor?: { id?: string; email?: string; role?: string },
  ) {
    if (!tableCode) {
      throw new NotFoundException('Table not found');
    }

    const table = await this.prisma.table.findUnique({
      where: { code: tableCode },
    });
    if (!table) {
      throw new NotFoundException('Table not found');
    }

    const session = await this.prisma.tableSession.findFirst({
      where: { tableId: table.id, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    if (!session) {
      return { closed: false };
    }

    const activeOrders = await this.prisma.order.count({
      where: {
        tableSessionId: session.id,
        deletedAt: null,
        status: { in: ['NEW', 'IN_PROGRESS'] },
      },
    });
    if (activeOrders > 0) {
      return { closed: false, reason: 'ACTIVE_ORDERS' };
    }

    const updated = await this.prisma.tableSession.update({
      where: { id: session.id },
      data: { endedAt: new Date() },
    });

    const activeReservations = await this.prisma.reservation.findMany({
      where: {
        tableSessionId: session.id,
        deletedAt: null,
      },
    });

    const stopTime = new Date();
    for (const reservation of activeReservations) {
      await this.prisma.reservation.update({
        where: { id: reservation.id },
        data: { deletedAt: stopTime },
      });

      await this.prisma.auditLog.create({
        data: {
          userId: actor?.id,
          action: 'GAME_SESSION_STOP_BY_TABLE_CLOSE',
          entityType: 'Reservation',
          entityId: reservation.id,
          metadata: {
            tableCode,
            stationId: reservation.stationId,
            actorEmail: actor?.email,
            actorRole: actor?.role,
          },
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userId: actor?.id,
        action: 'TABLE_SESSION_CLOSED',
        entityType: 'TableSession',
        entityId: updated.id,
        metadata: {
          tableCode,
          actorEmail: actor?.email,
          actorRole: actor?.role,
        },
      },
    });

    return { closed: true, sessionId: updated.id };
  }
}
