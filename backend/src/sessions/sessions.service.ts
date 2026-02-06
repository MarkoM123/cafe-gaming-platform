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

    const updated = await this.prisma.tableSession.update({
      where: { id: session.id },
      data: { endedAt: new Date() },
    });

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
