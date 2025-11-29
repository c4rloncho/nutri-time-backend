import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AvailabilityBlock } from './entities/availability-block.entity';
import { CreateAvailabilityBlockDto } from './dto/create-availability-block.dto';
import { UpdateAvailabilityBlockDto } from './dto/update-availability-block.dto';
import { User, UserRole } from 'src/user/entities/user.entity';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(AvailabilityBlock)
    private availabilityRepository: Repository<AvailabilityBlock>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

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
      throw new ForbiddenException('Only nutritionists can create availability blocks');
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

  async findAllByNutritionist(nutritionistId: number): Promise<AvailabilityBlock[]> {
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
      throw new ForbiddenException('You can only update your own availability blocks');
    }

    if (updateDto.startTime && updateDto.endTime) {
      if (updateDto.startTime >= updateDto.endTime) {
        throw new BadRequestException('Start time must be before end time');
      }
    }

    Object.assign(block, updateDto);
    return await this.availabilityRepository.save(block);
  }

  async remove(id: number, nutritionistId: number): Promise<void> {
    const block = await this.findOne(id);

    if (block.nutritionistId !== nutritionistId) {
      throw new ForbiddenException('You can only delete your own availability blocks');
    }

    block.isActive = false;
    await this.availabilityRepository.save(block);
  }

  async getAvailableSlots(
    nutritionistId: number,
    date: Date,
  ): Promise<string[]> {
    const dayOfWeek = this.getDayOfWeek(date);

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

    const slots: string[] = [];

    for (const block of blocks) {
      const blockSlots = this.generateTimeSlots(
        block.startTime,
        block.endTime,
        block.slotDuration,
      );
      slots.push(...blockSlots);
    }

    return slots.sort();
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
