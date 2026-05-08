import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
} from '@nestjs/common';
import { MealPlanService } from './meal-plan.service';
import { CreateMealPlanDto } from './dto/create-meal-plan.dto';
import { UpdateMealPlanDto } from './dto/update-meal-plan.dto';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/entities/user.entity';

@Controller('meal-plans')
export class MealPlanController {
  constructor(private readonly mealPlanService: MealPlanService) {}

  // Nutritionist creates a plan for a patient
  @Post()
  @Roles(UserRole.NUTRITIONIST)
  create(@Request() req, @Body() dto: CreateMealPlanDto) {
    return this.mealPlanService.create(req.user.id, dto);
  }

  // Patient gets their own plans
  @Get('my')
  @Roles(UserRole.PATIENT)
  getMyPlans(@Request() req) {
    return this.mealPlanService.findByPatient(
      req.user.id,
      req.user.id,
      UserRole.PATIENT,
    );
  }

  // Nutritionist gets all plans for a specific patient
  @Get('patient/:patientId')
  @Roles(UserRole.NUTRITIONIST)
  getByPatient(
    @Request() req,
    @Param('patientId', ParseIntPipe) patientId: number,
  ) {
    return this.mealPlanService.findByPatient(
      patientId,
      req.user.id,
      UserRole.NUTRITIONIST,
    );
  }

  // Get a specific plan (nutritionist or patient)
  @Get(':id')
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.mealPlanService.findOne(id, req.user.id, req.user.role);
  }

  // Nutritionist updates a plan
  @Put(':id')
  @Roles(UserRole.NUTRITIONIST)
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMealPlanDto,
  ) {
    return this.mealPlanService.update(id, req.user.id, dto);
  }

  // Nutritionist deletes a plan
  @Delete(':id')
  @Roles(UserRole.NUTRITIONIST)
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.mealPlanService.remove(id, req.user.id);
  }
}
