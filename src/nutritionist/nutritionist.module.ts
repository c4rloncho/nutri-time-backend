import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NutritionistController } from './nutritionist.controller';
import { NutritionistService } from './nutritionist.service';
import { User } from 'src/user/entities/user.entity';
import { Appointment } from 'src/appointment/entities/appointment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Appointment])],
  controllers: [NutritionistController],
  providers: [NutritionistService],
  exports: [NutritionistService],
})
export class NutritionistModule {}
