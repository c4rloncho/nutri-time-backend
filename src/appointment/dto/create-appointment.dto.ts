import { IsBoolean, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsInt()
  nutritionistId: number;

  @IsDateString()
  date: string;

  @IsString()
  startTime: string;

  @IsBoolean()
  @IsOptional()
  isOnline?: boolean;
}
