import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { Appointment } from './entities/appointment.entity';
import { User } from 'src/user/entities/user.entity';
import { AvailabilityModule } from 'src/availability/availability.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, User]),
    AvailabilityModule,
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
