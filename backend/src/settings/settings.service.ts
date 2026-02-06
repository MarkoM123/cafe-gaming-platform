import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const DEFAULT_HOURS = [
  { dayOfWeek: 0, openTime: '08:00', closeTime: '23:59', isClosed: false },
  { dayOfWeek: 1, openTime: '08:00', closeTime: '23:59', isClosed: false },
  { dayOfWeek: 2, openTime: '08:00', closeTime: '23:59', isClosed: false },
  { dayOfWeek: 3, openTime: '08:00', closeTime: '23:59', isClosed: false },
  { dayOfWeek: 4, openTime: '08:00', closeTime: '23:59', isClosed: false },
  { dayOfWeek: 5, openTime: '08:00', closeTime: '23:59', isClosed: false },
  { dayOfWeek: 6, openTime: '08:00', closeTime: '23:59', isClosed: false },
];

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getHours() {
    const existing = await this.prisma.operatingHour.findMany({
      orderBy: { dayOfWeek: 'asc' },
    });

    if (existing.length === 7) {
      return existing;
    }

    const toCreate = DEFAULT_HOURS.filter(
      (h) => !existing.some((e) => e.dayOfWeek === h.dayOfWeek),
    );
    if (toCreate.length > 0) {
      await this.prisma.operatingHour.createMany({ data: toCreate });
    }

    return this.prisma.operatingHour.findMany({
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async updateHours(hours: {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }[]) {
    const updates = hours.map((h) =>
      this.prisma.operatingHour.upsert({
        where: { dayOfWeek: h.dayOfWeek },
        update: {
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed,
        },
        create: h,
      }),
    );

    await this.prisma.$transaction(updates);
    return this.getHours();
  }
}
