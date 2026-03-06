import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { Appointment } from './entities/appointment.entity';
import { User } from 'src/user/entities/user.entity';
import { AvailabilityModule } from 'src/availability/availability.module';
import { AvailabilityBlock } from 'src/availability/entities/availability-block.entity';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, User, AvailabilityBlock]),
    AvailabilityModule,
    MailModule,
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
