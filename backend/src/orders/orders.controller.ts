import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, OrderStatus } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersEventsService } from './orders.events';
import { filter, map, merge, interval, of } from 'rxjs';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly events: OrdersEventsService,
  ) {}

  // Public: create order from QR flow
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  // Staff: list orders (optionally by status)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get()
  getAll(@Query() query: OrdersQueryDto) {
    return this.ordersService.listOrders({
      status: query.status as OrderStatus | undefined,
      from: query.from,
      to: query.to,
    });
  }

  // Public: order status for guest, validated by tableCode
  @Get(':id/public')
  getPublicStatus(
    @Param('id') id: string,
    @Query('tableCode') tableCode?: string,
  ) {
    return this.ordersService.getPublicStatus(id, tableCode || '');
  }

  // Public: order status stream for guest (validated by tableCode)
  @Sse(':id/stream')
  async streamPublic(
    @Param('id') id: string,
    @Query('tableCode') tableCode?: string,
  ) {
    const initial = await this.ordersService.getPublicStatus(
      id,
      tableCode || '',
    );

    const heartbeat$ = interval(30000).pipe(
      map(() => ({
        type: 'ping',
        data: { ts: new Date().toISOString() },
        id: `ping-${Date.now()}`,
      })),
    );

    const status$ = this.events.stream().pipe(
      filter(
        (event) =>
          event.type === 'order.status_changed' &&
          event.data.id === id &&
          'newStatus' in event.data,
      ),
      map((event) => {
        const data = event.data as {
          id: string;
          newStatus: string;
          updatedAt: string;
        };
        return {
          type: 'order.status',
          data: {
            id: data.id,
            status: data.newStatus,
            updatedAt: data.updatedAt,
          },
          id: `status-${data.id}-${data.updatedAt}`,
        };
      }),
    );

    const initial$ = of({
      type: 'order.status',
      data: {
        id: initial.id,
        status: initial.status,
        updatedAt: initial.updatedAt,
      },
      id: `status-${initial.id}-${initial.updatedAt}`,
    });

    return merge(initial$, status$, heartbeat$);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('summary')
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.ordersService.summary(from, to);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('top-items')
  topItems(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? Number(limit) : undefined;
    return this.ordersService.topItems(from, to, parsed);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Sse('stream')
  stream() {
    const heartbeat$ = interval(30000).pipe(
      map(() => ({
        type: 'ping',
        data: { ts: new Date().toISOString() },
        id: `ping-${Date.now()}`,
      })),
    );

    const events$ = this.events.stream().pipe(
      map((event) => ({
        type: event.type,
        data: event.data,
        id:
          event.type === 'order.created'
            ? `order-${event.data.id}`
            : `status-${event.data.id}-${event.data.updatedAt}`,
      })),
    );

    return merge(events$, heartbeat$);
  }

  // Staff: update order status
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.ordersService.updateStatus(id, dto.status, dto.reason, {
      id: user?.sub,
      email: user?.email,
      role: user?.role,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Patch(':id/close')
  closeOrder(
    @Param('id') id: string,
    @Body() body: { paidCents: number; paymentMethod: 'CASH' | 'CARD' | 'MIXED' },
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.ordersService.closeOrder(id, body.paidCents, body.paymentMethod, {
      id: user?.sub,
      email: user?.email,
      role: user?.role,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/archive')
  archiveOrder(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.ordersService.archiveOrder(id, {
      id: user?.sub,
      email: user?.email,
      role: user?.role,
    });
  }
}
