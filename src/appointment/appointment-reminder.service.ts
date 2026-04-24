import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AppointmentReminderService {
  private readonly logger = new Logger(AppointmentReminderService.name);

  constructor(
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    private mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const appointments = await this.appointmentRepository.find({
      where: { date: dateStr, status: AppointmentStatus.CONFIRMED },
      relations: ['patient', 'nutritionist'],
    });

    this.logger.log(`Sending reminders for ${appointments.length} appointments on ${dateStr}`);

    for (const appointment of appointments) {
      await this.mailService.sendAppointmentReminder({
        patientName: appointment.patient?.fullname ?? appointment.guestName ?? 'Invitado',
        patientEmail: appointment.patient?.email ?? appointment.guestEmail ?? '',
        nutritionistName: appointment.nutritionist.fullname,
        nutritionistEmail: appointment.nutritionist.email,
        date: appointment.date,
        startTime: appointment.startTime.substring(0, 5),
        endTime: appointment.endTime.substring(0, 5),
        duration: appointment.duration,
        price: appointment.price,
      });
    }
  }
}
