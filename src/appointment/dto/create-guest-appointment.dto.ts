import { IsBoolean, IsDateString, IsEmail, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateGuestAppointmentDto {
  @IsInt()
  nutritionistId: number;

  @IsDateString()
  date: string;

  @IsString()
  startTime: string;

  @IsString()
  guestName: string;

  @IsEmail()
  guestEmail: string;

  @IsBoolean()
  @IsOptional()
  isOnline?: boolean;
}
