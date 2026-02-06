import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class QrService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateSession(tableCode: string) {
    const idleMinutes = Number(process.env.TABLE_SESSION_IDLE_MINUTES || 120);
    const cutoff = new Date(Date.now() - idleMinutes * 60 * 1000);
    let table = await this.prisma.table.findUnique({
      where: { code: tableCode },
    });

    if (!table) {
      table = await this.prisma.table.create({
        data: { code: tableCode },
      });
    }

    let session = await this.prisma.tableSession.findFirst({
      where: { tableId: table.id, endedAt: null },
      include: { table: true },
    });

    if (session && session.lastActivityAt < cutoff) {
      await this.prisma.tableSession.update({
        where: { id: session.id },
        data: { endedAt: new Date() },
      });
      session = null;
    }

    if (!session) {
      session = await this.prisma.tableSession.create({
        data: { tableId: table.id },
        include: { table: true },
      });
    } else {
      await this.prisma.tableSession.update({
        where: { id: session.id },
        data: { lastActivityAt: new Date() },
      });
    }

    return session;
  }

  async validateActiveSession(tableCode: string) {
    const idleMinutes = Number(process.env.TABLE_SESSION_IDLE_MINUTES || 120);
    const cutoff = new Date(Date.now() - idleMinutes * 60 * 1000);

    const table = await this.prisma.table.findUnique({
      where: { code: tableCode },
    });
    if (!table || !table.isActive) {
      return false;
    }

    const session = await this.prisma.tableSession.findFirst({
      where: { tableId: table.id, endedAt: null },
    });

    if (!session) {
      return false;
    }

    if (session.lastActivityAt < cutoff) {
      await this.prisma.tableSession.update({
        where: { id: session.id },
        data: { endedAt: new Date() },
      });
      return false;
    }

    await this.prisma.tableSession.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    return true;
  }
}
