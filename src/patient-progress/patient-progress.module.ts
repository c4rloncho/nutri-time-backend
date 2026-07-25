import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientProgressController } from './patient-progress.controller';
import { PatientProgressService } from './patient-progress.service';
import { PatientProgress } from './entities/patient-progress.entity';
import { WeightGoal } from './entities/weight-goal.entity';
import { Appointment } from 'src/appointment/entities/appointment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PatientProgress, WeightGoal, Appointment]),
  ],
  controllers: [PatientProgressController],
  providers: [PatientProgressService],
  exports: [PatientProgressService],
})
export class PatientProgressModule {}
