import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export type OrderEvent =
  | {
      type: 'order.created';
      data: {
        id: string;
        orderNumber: number;
        status: string;
        totalCents: number;
        tableCode: string;
        createdAt: string;
        items: { id: string; name: string; quantity: number }[];
      };
    }
  | {
      type: 'order.status_changed';
      data: {
        id: string;
        oldStatus: string;
        newStatus: string;
        updatedAt: string;
      };
    };

@Injectable()
export class OrdersEventsService {
  private subject = new Subject<OrderEvent>();

  emit(event: OrderEvent) {
    this.subject.next(event);
  }

  stream() {
    return this.subject.asObservable();
  }
}
