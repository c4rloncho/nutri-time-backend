import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealPlan } from './entities/meal-plan.entity';
import { MealPlanController } from './meal-plan.controller';
import { MealPlanService } from './meal-plan.service';

@Module({
  imports: [TypeOrmModule.forFeature([MealPlan])],
  controllers: [MealPlanController],
  providers: [MealPlanService],
})
export class MealPlanModule {}
