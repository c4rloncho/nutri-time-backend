import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from 'src/user/entities/user.entity';
import { Appointment } from 'src/appointment/entities/appointment.entity';
import { UpdatePricesDto } from './dto/update-prices.dto';
import { AppointmentStatus } from 'src/appointment/enums/appointment-status.enum';

@Injectable()
export class NutritionistService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
  ) { }

  async getProfile(nutritionistId: number) {
    const nutritionist = await this.userRepository.findOne({
      where: { id: nutritionistId, role: UserRole.NUTRITIONIST },
    });

    if (!nutritionist) {
      throw new NotFoundException('Nutricionista no encontrado');
    }

    const completedCount = await this.appointmentRepository.count({
      where: { nutritionistId, status: AppointmentStatus.COMPLETED },
    });

    const totalCount = await this.appointmentRepository.count({
      where: { nutritionistId },
    });

    const uniquePatients = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .select('COUNT(DISTINCT appointment.patientId)', 'count')
      .where('appointment.nutritionistId = :nutritionistId', { nutritionistId })
      .andWhere('appointment.status = :status', { status: AppointmentStatus.COMPLETED })
      .getRawOne();

    return {
      id: nutritionist.id,
      fullname: nutritionist.fullname,
      email: nutritionist.email,
      username: nutritionist.username,
      createdAt: nutritionist.createdAt,
      prices: {
        price15: nutritionist.price15,
        price30: nutritionist.price30,
        price45: nutritionist.price45,
        price60: nutritionist.price60,
      },
      stats: {
        completedAppointments: completedCount,
        totalAppointments: totalCount,
        totalPatients: parseInt(uniquePatients?.count || '0', 10),
      },
    };
  }

  async findAll() {
    const nutritionists = await this.userRepository.find({
      where: { role: UserRole.NUTRITIONIST },
      select: ['id', 'fullname', 'username', 'email', 'createdAt', 'price15', 'price30', 'price45', 'price60'],
    });

    return nutritionists;
  }

  async updatePrices(userId: number, updatePricesDto: UpdatePricesDto) {
    const nutritionist = await this.userRepository.findOne({
      where: { id: userId, role: UserRole.NUTRITIONIST },
    });

    if (!nutritionist) {
      throw new BadRequestException('Only nutritionists can update prices');
    }

    // Actualizar solo los campos proporcionados
    if (updatePricesDto.price15 !== undefined) {
      nutritionist.price15 = updatePricesDto.price15;
    }
    if (updatePricesDto.price30 !== undefined) {
      nutritionist.price30 = updatePricesDto.price30;
    }
    if (updatePricesDto.price45 !== undefined) {
      nutritionist.price45 = updatePricesDto.price45;
    }
    if (updatePricesDto.price60 !== undefined) {
      nutritionist.price60 = updatePricesDto.price60;
    }

    await this.userRepository.save(nutritionist);

    return {
      id: nutritionist.id,
      fullname: nutritionist.fullname,
      price15: nutritionist.price15,
      price30: nutritionist.price30,
      price45: nutritionist.price45,
      price60: nutritionist.price60,
    };
  }
}
