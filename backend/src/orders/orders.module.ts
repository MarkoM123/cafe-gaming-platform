import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersEventsService } from './orders.events';
import { QrModule } from '../qr/qr.module';

@Module({
  imports: [QrModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersEventsService],
})
export class OrdersModule {}
