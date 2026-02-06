import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';
import { QrService } from '../qr/qr.service';
import { OrdersEventsService } from './orders.events';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private qrService: QrService,
    private events: OrdersEventsService,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    if (dto.idempotencyKey) {
      const existing = await this.prisma.order.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: {
          items: { include: { menuItem: true } },
          tableSession: { include: { table: true } },
        },
      });
      if (existing) {
        return existing;
      }
    }

    const session = await this.qrService.getOrCreateSession(dto.tableCode);

    const itemIds = dto.items.map((i) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: itemIds }, isActive: true },
    });

    if (menuItems.length !== itemIds.length) {
      throw new BadRequestException('Some menu items are invalid');
    }

    const itemsMap = new Map(menuItems.map((m) => [m.id, m]));
    const orderItems = dto.items.map((i) => {
      const menuItem = itemsMap.get(i.menuItemId)!;
      const unitPriceCents = menuItem.priceCents;
      const totalCents = unitPriceCents * i.quantity;
      return {
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        unitPriceCents,
        totalCents,
      };
    });

    const totalCents = orderItems.reduce((sum, i) => sum + i.totalCents, 0);

    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`;

    const order = await this.prisma.$transaction(async (tx) => {
      const counter = await tx.orderDailyCounter.upsert({
        where: { dateKey },
        create: { dateKey, nextNumber: 1 },
        update: { nextNumber: { increment: 1 } },
      });

      return tx.order.create({
        data: {
          tableSessionId: session.id,
          status: OrderStatus.NEW,
          totalCents,
          idempotencyKey: dto.idempotencyKey,
          orderNumber: counter.nextNumber,
          orderDateKey: dateKey,
          items: { create: orderItems },
        },
        include: {
          items: {
            include: { menuItem: true },
          },
          tableSession: { include: { table: true } },
        },
      });
    });

    await this.prisma.tableSession.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    this.events.emit({
      type: 'order.created',
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalCents: order.totalCents,
        tableCode: order.tableSession.table.code,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((i) => ({
          id: i.id,
          name: i.menuItem.name,
          quantity: i.quantity,
        })),
      },
    });

    return order;
  }

  listOrders(filters: { status?: OrderStatus; from?: string; to?: string }) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      const fromDate = filters.from ? new Date(filters.from) : undefined;
      const toDate = filters.to ? new Date(filters.to) : undefined;
      if (fromDate && Number.isNaN(fromDate.getTime())) {
        throw new BadRequestException('Invalid from date');
      }
      if (toDate && Number.isNaN(toDate.getTime())) {
        throw new BadRequestException('Invalid to date');
      }
      where.createdAt = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      };
    }

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { menuItem: true } },
        tableSession: { include: { table: true } },
      },
    });
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    actor?: { id?: string; email?: string; role?: string },
  ) {
    const exists = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!exists || exists.deletedAt) {
      throw new NotFoundException('Order not found');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: { include: { menuItem: true } },
        tableSession: { include: { table: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actor?.id,
        action: 'ORDER_STATUS_CHANGE',
        entityType: 'Order',
        entityId: updated.id,
        metadata: {
          oldStatus: exists.status,
          newStatus: updated.status,
          actorEmail: actor?.email,
          actorRole: actor?.role,
        },
      },
    });

    this.events.emit({
      type: 'order.status_changed',
      data: {
        id: updated.id,
        oldStatus: exists.status,
        newStatus: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });

    return updated;
  }

  async closeOrder(
    orderId: string,
    paidCents: number,
    actor?: { id?: string; email?: string; role?: string },
  ) {
    const exists = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!exists || exists.deletedAt) {
      throw new NotFoundException('Order not found');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.DONE },
      include: {
        items: { include: { menuItem: true } },
        tableSession: { include: { table: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actor?.id,
        action: 'ORDER_CLOSED',
        entityType: 'Order',
        entityId: updated.id,
        metadata: {
          paidCents,
          actorEmail: actor?.email,
          actorRole: actor?.role,
        },
      },
    });

    this.events.emit({
      type: 'order.status_changed',
      data: {
        id: updated.id,
        oldStatus: exists.status,
        newStatus: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });

    return updated;
  }

  async getPublicStatus(orderId: string, tableCode: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tableSession: { include: { table: true } },
      },
    });
    if (!order || order.deletedAt) {
      throw new NotFoundException('Order not found');
    }

    if (order.tableSession.table.code !== tableCode) {
      throw new NotFoundException('Order not found');
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      updatedAt: order.updatedAt,
      createdAt: order.createdAt,
      totalCents: order.totalCents,
    };
  }

  async archiveOrder(orderId: string, actor?: { id?: string; email?: string; role?: string }) {
    const exists = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!exists || exists.deletedAt) {
      throw new NotFoundException('Order not found');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actor?.id,
        action: 'ORDER_ARCHIVED',
        entityType: 'Order',
        entityId: updated.id,
        metadata: {
          actorEmail: actor?.email,
          actorRole: actor?.role,
        },
      },
    });

    return { id: updated.id, archivedAt: updated.deletedAt };
  }

  async summary(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    if (fromDate && Number.isNaN(fromDate.getTime())) {
      throw new BadRequestException('Invalid from date');
    }
    if (toDate && Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid to date');
    }

    const where = {
      deletedAt: null,
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const orders = await this.prisma.order.findMany({
      where,
      select: { totalCents: true, createdAt: true },
    });

    const dailyMap = new Map<string, { totalCents: number; ordersCount: number }>();
    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      const current = dailyMap.get(key) || { totalCents: 0, ordersCount: 0 };
      current.totalCents += order.totalCents;
      current.ordersCount += 1;
      dailyMap.set(key, current);
    }

    const daily = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({ date, ...data }));

    const totalCents = orders.reduce((sum, o) => sum + o.totalCents, 0);

    return {
      totalCents,
      ordersCount: orders.length,
      daily,
    };
  }

  async topItems(from?: string, to?: string, limit = 5) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    if (fromDate && Number.isNaN(fromDate.getTime())) {
      throw new BadRequestException('Invalid from date');
    }
    if (toDate && Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid to date');
    }

    const grouped = await this.prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: {
          deletedAt: null,
          ...(fromDate || toDate
            ? {
                createdAt: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {}),
                },
              }
            : {}),
        },
      },
      _sum: {
        quantity: true,
        totalCents: true,
      },
      orderBy: {
        _sum: { totalCents: 'desc' },
      },
      take: limit,
    });

    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: grouped.map((g) => g.menuItemId) } },
    });
    const menuMap = new Map(menuItems.map((m) => [m.id, m]));

    return grouped.map((g) => ({
      menuItemId: g.menuItemId,
      name: menuMap.get(g.menuItemId)?.name || 'Unknown',
      totalCents: g._sum.totalCents || 0,
      quantity: g._sum.quantity || 0,
    }));
  }
}
