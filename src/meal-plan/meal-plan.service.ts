import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from 'src/user/entities/user.entity';
import { MealPlan } from './entities/meal-plan.entity';
import { CreateMealPlanDto } from './dto/create-meal-plan.dto';
import { UpdateMealPlanDto } from './dto/update-meal-plan.dto';

@Injectable()
export class MealPlanService {
  constructor(
    @InjectRepository(MealPlan)
    private readonly repo: Repository<MealPlan>,
  ) {}

  async create(nutritionistId: number, dto: CreateMealPlanDto) {
    const plan = this.repo.create({
      nutritionistId,
      patientId: dto.patientId,
      name: dto.name,
      notes: dto.notes ?? null,
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
      meals: dto.meals,
    });
    return this.repo.save(plan);
  }

  async findByPatient(patientId: number, requesterId: number, role: UserRole) {
    if (role === UserRole.PATIENT && requesterId !== patientId) {
      throw new ForbiddenException();
    }
    return this.repo.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, requesterId: number, role: UserRole) {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan de alimentación no encontrado');

    if (
      role === UserRole.PATIENT && plan.patientId !== requesterId ||
      role === UserRole.NUTRITIONIST && plan.nutritionistId !== requesterId
    ) {
      throw new ForbiddenException();
    }

    return plan;
  }

  async update(id: number, nutritionistId: number, dto: UpdateMealPlanDto) {
    const plan = await this.repo.findOne({ where: { id, nutritionistId } });
    if (!plan) throw new NotFoundException('Plan de alimentación no encontrado');

    Object.assign(plan, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.startDate !== undefined && { startDate: dto.startDate }),
      ...(dto.endDate !== undefined && { endDate: dto.endDate }),
      ...(dto.meals !== undefined && { meals: dto.meals }),
    });

    return this.repo.save(plan);
  }

  async remove(id: number, nutritionistId: number) {
    const plan = await this.repo.findOne({ where: { id, nutritionistId } });
    if (!plan) throw new NotFoundException('Plan de alimentación no encontrado');
    await this.repo.remove(plan);
    return { message: 'Plan eliminado correctamente' };
  }
}
