import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  stationId!: string;

  @IsOptional()
  @IsString()
  gameId?: string;

  @IsString()
  customerName!: string;

  @IsString()
  customerPhone!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}
