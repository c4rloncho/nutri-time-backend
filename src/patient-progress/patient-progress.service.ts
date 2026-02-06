import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientProgress } from './entities/patient-progress.entity';
import { WeightGoal } from './entities/weight-goal.entity';
import { CreateProgressDto } from './dto/create-progress.dto';
import { SetGoalDto } from './dto/set-goal.dto';

export interface ProgressSummary {
  currentWeight: number;
  goalWeight: number;
  startWeight: number;
  remaining: number;
  lost: number;
  progressPercent: number;
  monthlyChange: number | null;
  trend: 'down' | 'up' | 'stable' | null;
}

@Injectable()
export class PatientProgressService {
  constructor(
    @InjectRepository(PatientProgress)
    private readonly progressRepository: Repository<PatientProgress>,
    @InjectRepository(WeightGoal)
    private readonly goalRepository: Repository<WeightGoal>,
  ) {}

  async setGoal(patientId: number, dto: SetGoalDto) {
    let goal = await this.goalRepository.findOne({ where: { patientId } });

    if (goal) {
      goal.startWeight = dto.startWeight;
      goal.goalWeight = dto.goalWeight;
    } else {
      goal = this.goalRepository.create({
        patientId,
        startWeight: dto.startWeight,
        goalWeight: dto.goalWeight,
      });
    }

    return this.goalRepository.save(goal);
  }

  async addProgress(patientId: number, dto: CreateProgressDto) {
    const existing = await this.progressRepository.findOne({
      where: { patientId, date: new Date(dto.date) },
    });

    if (existing) {
      throw new BadRequestException(
        'Ya existe un registro de peso para esta fecha. Usa otro día o elimina el registro existente.',
      );
    }

    const progress = this.progressRepository.create({
      patientId,
      weight: dto.weight,
      date: new Date(dto.date),
      note: dto.note,
    });

    return this.progressRepository.save(progress);
  }

  async getProgress(patientId: number) {
    const goal = await this.goalRepository.findOne({ where: { patientId } });
    const entries = await this.progressRepository.find({
      where: { patientId },
      order: { date: 'DESC' },
    });

    if (!goal && entries.length === 0) {
      return {
        goal: null,
        currentWeight: null,
        entries: [],
        summary: null,
      };
    }

    const currentWeight = entries.length > 0 ? Number(entries[0].weight) : null;
    const previousWeight =
      entries.length > 1 ? Number(entries[1].weight) : null;

    let summary: ProgressSummary | null = null;
    if (goal && currentWeight !== null) {
      const goalWeight = Number(goal.goalWeight);
      const startWeight = Number(goal.startWeight);
      const totalToLose = startWeight - goalWeight;
      const lost = startWeight - currentWeight;
      const remaining = currentWeight - goalWeight;
      const progressPercent =
        totalToLose !== 0
          ? Math.min(Math.max(Math.round((lost / totalToLose) * 100), 0), 100)
          : 0;

      summary = {
        currentWeight,
        goalWeight,
        startWeight,
        remaining: Math.round(remaining * 100) / 100,
        lost: Math.round(lost * 100) / 100,
        progressPercent,
        monthlyChange:
          previousWeight !== null
            ? Math.round((currentWeight - previousWeight) * 100) / 100
            : null,
        trend:
          previousWeight !== null
            ? currentWeight < previousWeight
              ? 'down'
              : currentWeight > previousWeight
                ? 'up'
                : 'stable'
            : null,
      };
    }

    return {
      goal: goal
        ? {
            startWeight: Number(goal.startWeight),
            goalWeight: Number(goal.goalWeight),
          }
        : null,
      currentWeight,
      entries: entries.map((e) => ({
        id: e.id,
        weight: Number(e.weight),
        date: e.date,
        note: e.note,
      })),
      summary,
    };
  }

  async deleteProgress(patientId: number, progressId: number) {
    const entry = await this.progressRepository.findOne({
      where: { id: progressId, patientId },
    });

    if (!entry) {
      throw new NotFoundException('Registro de peso no encontrado');
    }

    await this.progressRepository.remove(entry);
    return { message: 'Registro eliminado correctamente' };
  }
}
