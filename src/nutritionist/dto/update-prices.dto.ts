import { IsOptional, IsInt, Min } from 'class-validator';

export class UpdatePricesDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  price15?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  price30?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  price45?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  price60?: number;
}
