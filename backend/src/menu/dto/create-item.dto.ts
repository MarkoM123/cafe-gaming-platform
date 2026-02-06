import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateItemDto {
  @IsString()
  categoryId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  priceCents!: number;
}
