import { IsString } from 'class-validator';

export class CreateStationDto {
  @IsString()
  name!: string;
}
