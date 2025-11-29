import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Appointment } from './entities/appointment.entity';
import { AvailabilityService } from 'src/availability/availability.service';
import { User, UserRole } from 'src/user/entities/user.entity';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private availabilityService: AvailabilityService,
  ) {}

  async create(
    patientId: number,
    createDto: CreateAppointmentDto,
  ): Promise<Appointment> {
    const nutritionist = await this.userRepository.findOne({
      where: { id: createDto.nutritionistId },
    });

    if (!nutritionist) {
      throw new NotFoundException('Nutritionist not found');
    }

    if (nutritionist.role !== UserRole.NUTRITIONIST) {
      throw new BadRequestException('Selected user is not a nutritionist');
    }

    const appointmentDate = new Date(createDto.date);
    const availableSlots = await this.availabilityService.getAvailableSlots(
      createDto.nutritionistId,
      appointmentDate,
    );

    if (!availableSlots.includes(createDto.startTime)) {
      throw new BadRequestException(
        'Selected time slot is not available for this nutritionist',
      );
    }

    const slotDuration = 60;
    const endTime = this.calculateEndTime(createDto.startTime, slotDuration);

    const conflictingAppointment = await this.appointmentRepository.findOne({
      where: {
        nutritionistId: createDto.nutritionistId,
        date: appointmentDate,
        startTime: createDto.startTime,
        status: 'CONFIRMED',
      },
    });

    if (conflictingAppointment) {
      throw new ConflictException('This time slot is already booked');
    }

    const appointment = this.appointmentRepository.create({
      patientId,
      nutritionistId: createDto.nutritionistId,
      date: appointmentDate,
      startTime: createDto.startTime,
      endTime,
      status: 'PENDING',
    });

    return await this.appointmentRepository.save(appointment);
  }

  async findAll(): Promise<Appointment[]> {
    return await this.appointmentRepository.find({
      relations: ['patient', 'nutritionist'],
      order: { date: 'DESC', startTime: 'DESC' },
    });
  }

  async findByPatient(patientId: number): Promise<Appointment[]> {
    return await this.appointmentRepository.find({
      where: { patientId },
      relations: ['nutritionist'],
      order: { date: 'DESC', startTime: 'DESC' },
    });
  }

  async findByNutritionist(nutritionistId: number): Promise<Appointment[]> {
    return await this.appointmentRepository.find({
      where: { nutritionistId },
      relations: ['patient'],
      order: { date: 'DESC', startTime: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['patient', 'nutritionist'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async update(id: number, updateDto: UpdateAppointmentDto): Promise<Appointment> {
    const appointment = await this.findOne(id);
    Object.assign(appointment, updateDto);
    return await this.appointmentRepository.save(appointment);
  }

  async cancel(id: number, userId: number): Promise<Appointment> {
    const appointment = await this.findOne(id);

    if (appointment.patientId !== userId && appointment.nutritionistId !== userId) {
      throw new BadRequestException(
        'You can only cancel your own appointments',
      );
    }

    if (appointment.status === 'CANCELLED') {
      throw new BadRequestException('Appointment is already cancelled');
    }

    if (appointment.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed appointment');
    }

    appointment.status = 'CANCELLED';
    return await this.appointmentRepository.save(appointment);
  }

  async confirm(id: number, nutritionistId: number): Promise<Appointment> {
    const appointment = await this.findOne(id);

    if (appointment.nutritionistId !== nutritionistId) {
      throw new BadRequestException(
        'You can only confirm appointments assigned to you',
      );
    }

    if (appointment.status !== 'PENDING') {
      throw new BadRequestException('Only pending appointments can be confirmed');
    }

    appointment.status = 'CONFIRMED';
    return await this.appointmentRepository.save(appointment);
  }

  async complete(id: number, nutritionistId: number): Promise<Appointment> {
    const appointment = await this.findOne(id);

    if (appointment.nutritionistId !== nutritionistId) {
      throw new BadRequestException(
        'You can only complete appointments assigned to you',
      );
    }

    if (appointment.status !== 'CONFIRMED') {
      throw new BadRequestException('Only confirmed appointments can be completed');
    }

    appointment.status = 'COMPLETED';
    return await this.appointmentRepository.save(appointment);
  }

  async remove(id: number): Promise<void> {
    const appointment = await this.findOne(id);
    await this.appointmentRepository.remove(appointment);
  }

  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }
}
