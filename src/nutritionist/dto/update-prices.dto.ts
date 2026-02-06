import { IsOptional, IsNumber, Min } from 'class-validator';

export class UpdatePricesDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  price15?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price30?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price45?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price60?: number;
}
