import { IsDateString, IsInt, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsInt()
  nutritionistId: number;

  @IsDateString()
  date: string;

  @IsString()
  startTime: string;
}
