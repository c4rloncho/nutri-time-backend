import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateGuestAppointmentDto } from './dto/create-guest-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Appointment } from './entities/appointment.entity';
import { AvailabilityService } from 'src/availability/availability.service';
import { User, UserRole } from 'src/user/entities/user.entity';
import { AvailabilityBlock } from 'src/availability/entities/availability-block.entity';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { MailService, AppointmentEmailData } from 'src/mail/mail.service';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AvailabilityBlock)
    private availabilityBlockRepository: Repository<AvailabilityBlock>,
    private availabilityService: AvailabilityService,
    private mailService: MailService,
  ) { }

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
        `Selected time slot "${createDto.startTime}" is not available. Available slots: ${availableSlots.join(', ')}`,
      );
    }

    // Encontrar el bloque de disponibilidad correspondiente
    const availabilityBlock = await this.findAvailabilityBlockForSlot(
      createDto.nutritionistId,
      appointmentDate,
      createDto.startTime,
    );

    // Usar la duración del bloque de disponibilidad
    const duration = availabilityBlock.slotDuration;
    const endTime = this.calculateEndTime(createDto.startTime, duration);

    const conflictingAppointment = await this.appointmentRepository.findOne({
      where: [
        {
          nutritionistId: createDto.nutritionistId,
          date: createDto.date,
          startTime: createDto.startTime,
          status: AppointmentStatus.CONFIRMED,
        },
        {
          nutritionistId: createDto.nutritionistId,
          date: createDto.date,
          startTime: createDto.startTime,
          status: AppointmentStatus.PENDING,
        },
      ],
    });

    if (conflictingAppointment) {
      throw new ConflictException('This time slot is already booked');
    }

    // Calcular precio basado en la duración específica
    let price: number | null = null;
    switch (duration) {
      case 15:
        price = nutritionist.price15;
        break;
      case 30:
        price = nutritionist.price30;
        break;
      case 45:
        price = nutritionist.price45;
        break;
      case 60:
        price = nutritionist.price60;
        break;
      default:
        price = null;
    }

    // Convertir fecha a string YYYY-MM-DD para evitar problemas de zona horaria
    const dateString = createDto.date; // Ya viene en formato YYYY-MM-DD del frontend

    const appointment = this.appointmentRepository.create({
      patientId,
      nutritionistId: createDto.nutritionistId,
      date: dateString, // Guardar como string en vez de Date object
      startTime: createDto.startTime,
      endTime,
      duration,
      price,
      status: AppointmentStatus.PENDING,
    });

    const saved = await this.appointmentRepository.save(appointment);

    const patient = await this.userRepository.findOne({ where: { id: patientId } });
    this.mailService.sendAppointmentCreated(
      this.buildEmailData(patient!, nutritionist, saved),
    );

    return saved;
  }

  async createGuest(createDto: CreateGuestAppointmentDto): Promise<Appointment> {
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
        `Selected time slot "${createDto.startTime}" is not available. Available slots: ${availableSlots.join(', ')}`,
      );
    }

    const availabilityBlock = await this.findAvailabilityBlockForSlot(
      createDto.nutritionistId,
      appointmentDate,
      createDto.startTime,
    );

    const duration = availabilityBlock.slotDuration;
    const endTime = this.calculateEndTime(createDto.startTime, duration);

    const conflictingAppointment = await this.appointmentRepository.findOne({
      where: [
        {
          nutritionistId: createDto.nutritionistId,
          date: createDto.date,
          startTime: createDto.startTime,
          status: AppointmentStatus.CONFIRMED,
        },
        {
          nutritionistId: createDto.nutritionistId,
          date: createDto.date,
          startTime: createDto.startTime,
          status: AppointmentStatus.PENDING,
        },
      ],
    });

    if (conflictingAppointment) {
      throw new ConflictException('This time slot is already booked');
    }

    let price: number | null = null;
    switch (duration) {
      case 15: price = nutritionist.price15; break;
      case 30: price = nutritionist.price30; break;
      case 45: price = nutritionist.price45; break;
      case 60: price = nutritionist.price60; break;
    }

    const appointment = this.appointmentRepository.create({
      patientId: null,
      guestName: createDto.guestName,
      guestEmail: createDto.guestEmail,
      nutritionistId: createDto.nutritionistId,
      date: createDto.date,
      startTime: createDto.startTime,
      endTime,
      duration,
      price,
      status: AppointmentStatus.PENDING,
    });

    const saved = await this.appointmentRepository.save(appointment);

    this.mailService.sendAppointmentCreated(
      this.buildEmailData(null, nutritionist, saved),
    );

    return saved;
  }

  async findAll(
    userId: number,
    page: number = 1,
    limit: number = 10,
    status?: AppointmentStatus,
  ): Promise<{
    data: Appointment[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;

    // Usar QueryBuilder para ordenamiento personalizado
    const queryBuilder = this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('appointment.nutritionist', 'nutritionist')
      .where('(appointment.patientId = :userId OR appointment.nutritionistId = :userId)', { userId });

    // Aplicar filtro de status si se proporciona
    if (status) {
      queryBuilder.andWhere('appointment.status = :status', { status });
    }

    // Ordenar por prioridad de status, luego por fecha
    // Prioridad: PENDING > CONFIRMED > COMPLETED > CANCELLED
    queryBuilder
      .orderBy(
        `CASE
          WHEN appointment.status = '${AppointmentStatus.PENDING}' THEN 1
          WHEN appointment.status = '${AppointmentStatus.CONFIRMED}' THEN 2
          WHEN appointment.status = '${AppointmentStatus.COMPLETED}' THEN 3
          WHEN appointment.status = '${AppointmentStatus.CANCELLED}' THEN 4
          ELSE 5
        END`,
        'ASC',
      )
      .addOrderBy('appointment.date', 'DESC')
      .addOrderBy('appointment.startTime', 'DESC');

    // Obtener total y datos paginados
    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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

  async update(
    id: number,
    userId: number,
    updateDto: UpdateAppointmentDto,
  ): Promise<Appointment> {
    const appointment = await this.findOne(id);

    if (
      appointment.patientId !== userId &&
      appointment.nutritionistId !== userId
    ) {
      throw new BadRequestException(
        'You can only update your own appointments',
      );
    }

    Object.assign(appointment, updateDto);
    return await this.appointmentRepository.save(appointment);
  }

  async cancel(id: number, userId: number): Promise<Appointment> {
    const appointment = await this.findOne(id);

    if (
      appointment.patientId !== userId &&
      appointment.nutritionistId !== userId
    ) {
      throw new BadRequestException(
        'You can only cancel your own appointments',
      );
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled');
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed appointment');
    }

    appointment.status = AppointmentStatus.CANCELLED;
    const saved = await this.appointmentRepository.save(appointment);

    const cancelledBy = appointment.patientId === userId ? 'patient' : 'nutritionist';
    this.mailService.sendAppointmentCancelled(
      this.buildEmailData(saved.patient, saved.nutritionist, saved),
      cancelledBy,
    );

    return saved;
  }

  async confirm(id: number, nutritionistId: number): Promise<Appointment> {
    const appointment = await this.findOne(id);

    if (appointment.nutritionistId !== nutritionistId) {
      throw new BadRequestException(
        'You can only confirm appointments assigned to you',
      );
    }

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException(
        'Only pending appointments can be confirmed',
      );
    }

    appointment.status = AppointmentStatus.CONFIRMED;
    const saved = await this.appointmentRepository.save(appointment);

    this.mailService.sendAppointmentConfirmed(
      this.buildEmailData(saved.patient, saved.nutritionist, saved),
    );

    return saved;
  }

  async complete(id: number, nutritionistId: number): Promise<Appointment> {
    const appointment = await this.findOne(id);

    if (appointment.nutritionistId !== nutritionistId) {
      throw new BadRequestException(
        'You can only complete appointments assigned to you',
      );
    }

    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException(
        'Only confirmed appointments can be completed',
      );
    }

    appointment.status = AppointmentStatus.COMPLETED;
    const saved = await this.appointmentRepository.save(appointment);

    this.mailService.sendAppointmentCompleted(
      this.buildEmailData(saved.patient, saved.nutritionist, saved),
    );

    return saved;
  }

  async remove(id: number, userId: number): Promise<void> {
    const appointment = await this.findOne(id);

    if (
      appointment.patientId !== userId &&
      appointment.nutritionistId !== userId
    ) {
      throw new BadRequestException(
        'You can only delete your own appointments',
      );
    }

    await this.appointmentRepository.remove(appointment);
  }

  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }

  private buildEmailData(patient: User | null, nutritionist: User, appointment: Appointment): AppointmentEmailData {
    return {
      patientName: patient?.fullname ?? appointment.guestName ?? 'Invitado',
      patientEmail: patient?.email ?? appointment.guestEmail ?? '',
      nutritionistName: nutritionist.fullname,
      nutritionistEmail: nutritionist.email,
      date: appointment.date,
      startTime: appointment.startTime.substring(0, 5),
      endTime: appointment.endTime.substring(0, 5),
      duration: appointment.duration,
      price: appointment.price,
    };
  }

  private getDayOfWeek(date: Date): string {
    const days = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];
    return days[date.getUTCDay()]; // Usar UTC para consistencia
  }

  private async findAvailabilityBlockForSlot(
    nutritionistId: number,
    date: Date,
    startTime: string,
  ): Promise<AvailabilityBlock> {
    const dayOfWeek = this.getDayOfWeek(date);

    const blocks = await this.availabilityBlockRepository.find({
      where: {
        nutritionistId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (blocks.length === 0) {
      throw new NotFoundException('No availability blocks found for this day');
    }

    // Encontrar el bloque que contiene el startTime seleccionado
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startTimeMinutes = startHour * 60 + startMinute;

    for (const block of blocks) {
      // Normalizar formato de hora (la BD puede devolver "09:00:00")
      const blockStart = block.startTime.substring(0, 5);
      const blockEnd = block.endTime.substring(0, 5);

      const [blockStartHour, blockStartMinute] = blockStart
        .split(':')
        .map(Number);
      const [blockEndHour, blockEndMinute] = blockEnd.split(':').map(Number);

      const blockStartMinutes = blockStartHour * 60 + blockStartMinute;
      const blockEndMinutes = blockEndHour * 60 + blockEndMinute;

      // Verificar si el slot está dentro del bloque
      if (
        startTimeMinutes >= blockStartMinutes &&
        startTimeMinutes < blockEndMinutes
      ) {
        return block;
      }
    }

    throw new BadRequestException(
      'Selected time slot does not match any availability block',
    );
  }
}
