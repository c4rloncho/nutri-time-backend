import { IsDateString, IsEmail, IsInt, IsString } from 'class-validator';

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
}
