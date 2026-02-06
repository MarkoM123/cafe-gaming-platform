import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class OrdersQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
