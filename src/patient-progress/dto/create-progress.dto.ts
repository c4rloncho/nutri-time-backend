import { IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateProgressDto {
  @IsNumber()
  @Min(20)
  @Max(500)
  weight: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  note?: string;
}
