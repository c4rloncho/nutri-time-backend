import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from 'src/user/entities/user.entity';
import { Appointment } from 'src/appointment/entities/appointment.entity';

@Injectable()
export class NutritionistService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
  ) {}

  async getProfile(nutritionistId: number) {
    const nutritionist = await this.userRepository.findOne({
      where: { id: nutritionistId, role: UserRole.NUTRITIONIST },
    });

    if (!nutritionist) {
      throw new NotFoundException('Nutricionista no encontrado');
    }

    const completedCount = await this.appointmentRepository.count({
      where: { nutritionistId, status: 'COMPLETED' },
    });

    const totalCount = await this.appointmentRepository.count({
      where: { nutritionistId },
    });

    const uniquePatients = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .select('COUNT(DISTINCT appointment.patientId)', 'count')
      .where('appointment.nutritionistId = :nutritionistId', { nutritionistId })
      .where('appointment.status = :status', { status: 'COMPLETED' })
      .getRawOne();

    return {
      id: nutritionist.id,
      fullname: nutritionist.fullname,
      email: nutritionist.email,
      username: nutritionist.username,
      createdAt: nutritionist.createdAt,
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
      select: ['id', 'fullname', 'username', 'email', 'createdAt'],
    });

    return nutritionists;
  }
}
