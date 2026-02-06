import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AvailabilityBlock } from './entities/availability-block.entity';
import { TimeBlock } from './entities/time-block.entity';
import { CreateAvailabilityBlockDto } from './dto/create-availability-block.dto';
import { UpdateAvailabilityBlockDto } from './dto/update-availability-block.dto';
import { CreateTimeBlockDto } from './dto/create-time-block.dto';
import { UpdateTimeBlockDto } from './dto/update-time-block.dto';
import { User, UserRole } from 'src/user/entities/user.entity';
import { Appointment } from 'src/appointment/entities/appointment.entity';

export type SlotStatus = 'available' | 'booked' | 'blocked';

export interface SlotInfo {
  time: string;
  status: SlotStatus;
  reason?: string;
}

export interface DayCalendar {
  date: string;
  dayOfWeek: string;
  isWorkDay: boolean;
  isFullDayBlocked: boolean;
  blockReason?: string;
  slots: SlotInfo[];
}

export interface CalendarResponse {
  nutritionistId: number;
  startDate: string;
  endDate: string;
  days: DayCalendar[];
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(AvailabilityBlock)
    private availabilityRepository: Repository<AvailabilityBlock>,
    @InjectRepository(TimeBlock)
    private timeBlockRepository: Repository<TimeBlock>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
  ) { }

  async create(
    nutritionistId: number,
    createDto: CreateAvailabilityBlockDto,
  ): Promise<AvailabilityBlock> {
    const nutritionist = await this.userRepository.findOne({
      where: { id: nutritionistId },
    });

    if (!nutritionist) {
      throw new NotFoundException('Nutritionist not found');
    }

    if (nutritionist.role !== UserRole.NUTRITIONIST) {
      throw new ForbiddenException(
        'Only nutritionists can create availability blocks',
      );
    }

    if (createDto.startTime >= createDto.endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    const existingBlock = await this.availabilityRepository.findOne({
      where: {
        nutritionistId,
        dayOfWeek: createDto.dayOfWeek,
        isActive: true,
      },
    });

    if (existingBlock) {
      throw new BadRequestException(
        `Availability block already exists for ${createDto.dayOfWeek}`,
      );
    }

    const block = this.availabilityRepository.create({
      ...createDto,
      nutritionistId,
      slotDuration: createDto.slotDuration || 60,
    });

    return await this.availabilityRepository.save(block);
  }

  async findAllByNutritionist(
    nutritionistId: number,
  ): Promise<AvailabilityBlock[]> {
    return await this.availabilityRepository.find({
      where: { nutritionistId, isActive: true },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async findOne(id: number): Promise<AvailabilityBlock> {
    const block = await this.availabilityRepository.findOne({ where: { id } });
    if (!block) {
      throw new NotFoundException('Availability block not found');
    }
    return block;
  }

  async update(
    id: number,
    nutritionistId: number,
    updateDto: UpdateAvailabilityBlockDto,
  ): Promise<AvailabilityBlock> {
    const block = await this.findOne(id);

    if (block.nutritionistId !== nutritionistId) {
      throw new ForbiddenException(
        'You can only update your own availability blocks',
      );
    }

    const newStartTime = updateDto.startTime || block.startTime;
    const newEndTime = updateDto.endTime || block.endTime;

    if (newStartTime >= newEndTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    Object.assign(block, updateDto);
    return await this.availabilityRepository.save(block);
  }

  async remove(id: number, nutritionistId: number): Promise<void> {
    const block = await this.findOne(id);

    if (block.nutritionistId !== nutritionistId) {
      throw new ForbiddenException(
        'You can only delete your own availability blocks',
      );
    }

    block.isActive = false;
    await this.availabilityRepository.save(block);
  }

  async getAvailableSlots(
    nutritionistId: number,
    date: Date,
  ): Promise<string[]> {
    const dayOfWeek = this.getDayOfWeek(date);
    const dateString = this.formatDateToString(date);

    const blocks = await this.availabilityRepository.find({
      where: {
        nutritionistId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (blocks.length === 0) {
      return [];
    }

    // Verificar si hay un bloqueo de día completo
    const timeBlocks = await this.timeBlockRepository.find({
      where: {
        nutritionistId,
        date: dateString as any,
        isActive: true,
      },
    });

    const fullDayBlock = timeBlocks.find((tb) => tb.allDay);
    if (fullDayBlock) {
      return [];
    }

    const slots: string[] = [];

    for (const block of blocks) {
      // Normalizar formato de hora (la BD puede devolver "09:00:00")
      const startTime = block.startTime.substring(0, 5);
      const endTime = block.endTime.substring(0, 5);

      const blockSlots = this.generateTimeSlots(
        startTime,
        endTime,
        block.slotDuration,
      );
      slots.push(...blockSlots);
    }

    const existingAppointments = await this.appointmentRepository.find({
      where: {
        nutritionistId,
        date: dateString as any,
        status: In(['PENDING', 'CONFIRMED']),
      },
    });

    // Normalizar formato de hora (la BD puede devolver "09:00:00", los slots son "09:00")
    const bookedSlots = existingAppointments.map((apt) =>
      apt.startTime.substring(0, 5),
    );

    // Filtrar slots bloqueados por TimeBlocks parciales
    const blockedSlots = this.getBlockedSlots(
      timeBlocks,
      blocks[0]?.slotDuration || 60,
    );

    const availableSlots = slots.filter(
      (slot) => !bookedSlots.includes(slot) && !blockedSlots.includes(slot),
    );

    return availableSlots.sort();
  }

  async getCalendar(
    nutritionistId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarResponse> {
    const days: DayCalendar[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayCalendar = await this.getDayCalendar(
        nutritionistId,
        new Date(currentDate),
      );
      days.push(dayCalendar);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      nutritionistId,
      startDate: this.formatDateToString(startDate),
      endDate: this.formatDateToString(endDate),
      days,
    };
  }

  private async getDayCalendar(
    nutritionistId: number,
    date: Date,
  ): Promise<DayCalendar> {
    const dayOfWeek = this.getDayOfWeek(date);
    const dateString = this.formatDateToString(date);

    // Obtener bloques de disponibilidad para este día
    const availabilityBlocks = await this.availabilityRepository.find({
      where: {
        nutritionistId,
        dayOfWeek,
        isActive: true,
      },
    });

    // Si no hay disponibilidad configurada para este día
    if (availabilityBlocks.length === 0) {
      return {
        date: dateString,
        dayOfWeek,
        isWorkDay: false,
        isFullDayBlocked: false,
        slots: [],
      };
    }

    // Obtener TimeBlocks para esta fecha - usar dateString para comparar correctamente
    const timeBlocks = await this.timeBlockRepository.find({
      where: {
        nutritionistId,
        date: dateString as any,
        isActive: true,
      },
    });

    // Verificar si hay bloqueo de día completo
    const fullDayBlock = timeBlocks.find((tb) => tb.allDay);
    if (fullDayBlock) {
      return {
        date: dateString,
        dayOfWeek,
        isWorkDay: true,
        isFullDayBlocked: true,
        blockReason: fullDayBlock.reason || undefined,
        slots: [],
      };
    }

    // Generar todos los slots del día
    const allSlots: string[] = [];
    const slotDuration = availabilityBlocks[0]?.slotDuration || 60;

    for (const block of availabilityBlocks) {
      // Normalizar formato de hora (la BD puede devolver "09:00:00")
      const startTime = block.startTime.substring(0, 5);
      const endTime = block.endTime.substring(0, 5);

      const blockSlots = this.generateTimeSlots(
        startTime,
        endTime,
        block.slotDuration,
      );
      allSlots.push(...blockSlots);
    }

    // Obtener citas existentes - usar dateString para comparar correctamente
    const appointments = await this.appointmentRepository.find({
      where: {
        nutritionistId,
        date: dateString as any,
        status: In(['PENDING', 'CONFIRMED']),
      },
    });

    // Normalizar formato de hora (la BD puede devolver "09:00:00", los slots son "09:00")
    const bookedSlots = appointments.map((apt) =>
      apt.startTime.substring(0, 5),
    );

    // Obtener slots bloqueados por TimeBlocks parciales
    const blockedSlotsMap = this.getBlockedSlotsWithReason(
      timeBlocks,
      slotDuration,
    );

    // Construir la información de cada slot
    const slots: SlotInfo[] = allSlots.sort().map((time) => {
      if (bookedSlots.includes(time)) {
        return { time, status: 'booked' as SlotStatus };
      }

      const blockInfo = blockedSlotsMap.get(time);
      if (blockInfo) {
        return {
          time,
          status: 'blocked' as SlotStatus,
          reason: blockInfo.reason,
        };
      }

      return { time, status: 'available' as SlotStatus };
    });

    return {
      date: dateString,
      dayOfWeek,
      isWorkDay: true,
      isFullDayBlocked: false,
      slots,
    };
  }

  private getBlockedSlotsWithReason(
    timeBlocks: TimeBlock[],
    slotDuration: number,
  ): Map<string, { reason?: string }> {
    const blockedSlotsMap = new Map<string, { reason?: string }>();

    for (const timeBlock of timeBlocks) {
      if (timeBlock.allDay || !timeBlock.startTime || !timeBlock.endTime) {
        continue;
      }

      // Normalizar formato de hora (la BD puede devolver "09:00:00")
      const startTime = timeBlock.startTime.substring(0, 5);
      const endTime = timeBlock.endTime.substring(0, 5);

      const slots = this.generateTimeSlots(startTime, endTime, slotDuration);

      for (const slot of slots) {
        blockedSlotsMap.set(slot, { reason: timeBlock.reason || undefined });
      }
    }

    return blockedSlotsMap;
  }

  private getBlockedSlots(
    timeBlocks: TimeBlock[],
    slotDuration: number,
  ): string[] {
    const blockedSlots: string[] = [];

    for (const timeBlock of timeBlocks) {
      if (timeBlock.allDay || !timeBlock.startTime || !timeBlock.endTime) {
        continue;
      }

      // Normalizar formato de hora (la BD puede devolver "09:00:00")
      const startTime = timeBlock.startTime.substring(0, 5);
      const endTime = timeBlock.endTime.substring(0, 5);

      const slots = this.generateTimeSlots(startTime, endTime, slotDuration);
      blockedSlots.push(...slots);
    }

    return blockedSlots;
  }

  // ========== TIME BLOCK METHODS ==========

  async createTimeBlock(
    nutritionistId: number,
    createDto: CreateTimeBlockDto,
  ): Promise<TimeBlock> {
    const nutritionist = await this.userRepository.findOne({
      where: { id: nutritionistId },
    });

    if (!nutritionist) {
      throw new NotFoundException('Nutritionist not found');
    }

    if (nutritionist.role !== UserRole.NUTRITIONIST) {
      throw new ForbiddenException('Only nutritionists can create time blocks');
    }

    if (!createDto.allDay) {
      if (!createDto.startTime || !createDto.endTime) {
        throw new BadRequestException(
          'startTime and endTime are required when allDay is false',
        );
      }
      if (createDto.startTime >= createDto.endTime) {
        throw new BadRequestException('Start time must be before end time');
      }
    }

    const timeBlock = this.timeBlockRepository.create({
      ...createDto,
      nutritionistId,
      allDay: createDto.allDay || false,
    });

    return await this.timeBlockRepository.save(timeBlock);
  }

  async findAllTimeBlocksByNutritionist(
    nutritionistId: number,
  ): Promise<TimeBlock[]> {
    return await this.timeBlockRepository.find({
      where: { nutritionistId, isActive: true },
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }

  async findOneTimeBlock(id: number): Promise<TimeBlock> {
    const timeBlock = await this.timeBlockRepository.findOne({ where: { id } });
    if (!timeBlock) {
      throw new NotFoundException('Time block not found');
    }
    return timeBlock;
  }

  async updateTimeBlock(
    id: number,
    nutritionistId: number,
    updateDto: UpdateTimeBlockDto,
  ): Promise<TimeBlock> {
    const timeBlock = await this.findOneTimeBlock(id);

    if (timeBlock.nutritionistId !== nutritionistId) {
      throw new ForbiddenException('You can only update your own time blocks');
    }

    const newStartTime = updateDto.startTime || timeBlock.startTime;
    const newEndTime = updateDto.endTime || timeBlock.endTime;
    const isAllDay = updateDto.allDay ?? timeBlock.allDay;

    if (!isAllDay && newStartTime && newEndTime && newStartTime >= newEndTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    Object.assign(timeBlock, updateDto);
    return await this.timeBlockRepository.save(timeBlock);
  }

  async removeTimeBlock(id: number, nutritionistId: number): Promise<void> {
    const timeBlock = await this.findOneTimeBlock(id);

    if (timeBlock.nutritionistId !== nutritionistId) {
      throw new ForbiddenException('You can only delete your own time blocks');
    }

    timeBlock.isActive = false;
    await this.timeBlockRepository.save(timeBlock);
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
    return days[date.getDay()];
  }

  private formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private generateTimeSlots(
    startTime: string,
    endTime: string,
    slotDuration: number,
  ): string[] {
    const slots: string[] = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    let currentMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    while (currentMinutes + slotDuration <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      slots.push(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
      );
      currentMinutes += slotDuration;
    }

    return slots;
  }
}
