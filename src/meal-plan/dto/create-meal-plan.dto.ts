import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { MealItemDto } from './meal-item.dto';

export class CreateMealPlanDto {
  @IsInt()
  patientId: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealItemDto)
  meals: MealItemDto[];
}
