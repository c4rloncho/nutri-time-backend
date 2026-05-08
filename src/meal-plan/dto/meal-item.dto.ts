import { IsString, Matches } from 'class-validator';

export class MealItemDto {
  @Matches(/^\d{2}:\d{2}$/, { message: 'time debe tener formato HH:mm' })
  time: string;

  @IsString()
  label: string;

  @IsString()
  foods: string;
}
