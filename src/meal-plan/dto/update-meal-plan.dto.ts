import { PartialType } from '@nestjs/mapped-types';
import { CreateMealPlanDto } from './create-meal-plan.dto';
import { OmitType } from '@nestjs/mapped-types';

export class UpdateMealPlanDto extends PartialType(
  OmitType(CreateMealPlanDto, ['patientId'] as const),
) {}
