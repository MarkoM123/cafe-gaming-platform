import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { MenuModule } from './menu/menu.module';
import { QrModule } from './qr/qr.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SessionsModule } from './sessions/sessions.module';
import { GamesModule } from './games/games.module';
import { ReservationsModule } from './reservations/reservations.module';
import { SettingsModule } from './settings/settings.module';
import { AuditModule } from './audit/audit.module';
import { TablesModule } from './tables/tables.module';
import { rateLimit } from './common/rate-limit.middleware';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    OrdersModule,
    MenuModule,
    QrModule,
    SessionsModule,
    GamesModule,
    ReservationsModule,
    SettingsModule,
    AuditModule,
    TablesModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const loginMax = Number(process.env.RATE_LIMIT_LOGIN_MAX || 8);
    const loginWindowSec = Number(process.env.RATE_LIMIT_LOGIN_WINDOW_SEC || 60);
    const ordersMax = Number(process.env.RATE_LIMIT_ORDERS_MAX || 30);
    const ordersWindowSec = Number(process.env.RATE_LIMIT_ORDERS_WINDOW_SEC || 60);
    const reservationsMax = Number(process.env.RATE_LIMIT_RESERVATIONS_MAX || 5);
    const reservationsWindowSec = Number(process.env.RATE_LIMIT_RESERVATIONS_WINDOW_SEC || 600);

    consumer
      .apply(rateLimit({ windowMs: loginWindowSec * 1000, max: loginMax, keyPrefix: 'login' }))
      .forRoutes({ path: 'auth/login', method: RequestMethod.POST });

    consumer
      .apply(rateLimit({ windowMs: ordersWindowSec * 1000, max: ordersMax, keyPrefix: 'orders' }))
      .forRoutes('orders');

    consumer
      .apply(
        rateLimit({
          windowMs: reservationsWindowSec * 1000,
          max: reservationsMax,
          keyPrefix: 'reservations',
        }),
      )
      .forRoutes({ path: 'reservations', method: RequestMethod.POST });
  }
}
