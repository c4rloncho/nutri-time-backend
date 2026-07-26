import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Appointment } from 'src/appointment/entities/appointment.entity';
import { AppointmentStatus } from 'src/appointment/enums/appointment-status.enum';
import { User, UserRole } from 'src/user/entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

/** Claves 'YYYY-MM' de los ultimos n meses, del mas viejo al actual. */
export function lastMonths(n: number, from: Date = new Date()): string[] {
  return Array.from({ length: n }, (_, i) =>
    new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - (n - 1 - i), 1))
      .toISOString()
      .slice(0, 7),
  );
}

// El usuario relacionado se expone solo con estos campos: el resto son secretos
// (password, refreshToken, tokens de Google).
const PUBLIC_USER_FIELDS = ['id', 'fullname', 'username', 'email', 'avatar', 'role', 'createdAt'];

const num = (v: unknown) => Number(v ?? 0);

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
  ) { }

  /** Todo lo que pinta el panel de inicio, en una sola llamada. */
  async stats() {
    const months = lastMonths(6);
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = `${today.slice(0, 7)}-01`;
    const in7days = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

    const [byRole, byStatus, monthly, totals, todayCount, weekCount, recentUsers] =
      await Promise.all([
        this.users
          .createQueryBuilder('u')
          .select('u.role', 'role')
          .addSelect('COUNT(*)', 'count')
          .groupBy('u.role')
          .getRawMany<{ role: string; count: string }>(),

        this.appointments
          .createQueryBuilder('a')
          .select('a.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('a.status')
          .getRawMany<{ status: string; count: string }>(),

        this.appointments
          .createQueryBuilder('a')
          .select("to_char(a.date, 'YYYY-MM')", 'month')
          .addSelect('COUNT(*)', 'count')
          .addSelect(
            `COALESCE(SUM(CASE WHEN a.status = '${AppointmentStatus.COMPLETED}' THEN a.price ELSE 0 END), 0)`,
            'income',
          )
          .where('a.date >= :from', { from: `${months[0]}-01` })
          .groupBy('month')
          .getRawMany<{ month: string; count: string; income: string }>(),

        this.appointments
          .createQueryBuilder('a')
          .select(
            `COALESCE(SUM(CASE WHEN a.status = '${AppointmentStatus.COMPLETED}' THEN a.price ELSE 0 END), 0)`,
            'total',
          )
          .addSelect(
            `COALESCE(SUM(CASE WHEN a.status = '${AppointmentStatus.COMPLETED}' AND a.date >= '${monthStart}' THEN a.price ELSE 0 END), 0)`,
            'month',
          )
          .getRawOne<{ total: string; month: string }>(),

        this.appointments.count({ where: { date: today } }),

        this.appointments
          .createQueryBuilder('a')
          .where('a.date BETWEEN :today AND :in7days', { today, in7days })
          .andWhere('a.status IN (:...open)', {
            open: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
          })
          .getCount(),

        this.users.find({
          select: PUBLIC_USER_FIELDS as (keyof User)[],
          order: { createdAt: 'DESC' },
          take: 5,
        }),
      ]);

    const roleCount = (role: UserRole) =>
      num(byRole.find((r) => r.role === role)?.count);
    const statusCount = (status: AppointmentStatus) =>
      num(byStatus.find((s) => s.status === status)?.count);

    return {
      users: {
        total: byRole.reduce((sum, r) => sum + num(r.count), 0),
        patients: roleCount(UserRole.PATIENT),
        nutritionists: roleCount(UserRole.NUTRITIONIST),
        admins: roleCount(UserRole.ADMIN),
      },
      appointments: {
        total: byStatus.reduce((sum, s) => sum + num(s.count), 0),
        pending: statusCount(AppointmentStatus.PENDING),
        confirmed: statusCount(AppointmentStatus.CONFIRMED),
        completed: statusCount(AppointmentStatus.COMPLETED),
        cancelled: statusCount(AppointmentStatus.CANCELLED),
        today: todayCount,
        next7days: weekCount,
      },
      income: {
        month: num(totals?.month),
        total: num(totals?.total),
      },
      // serie completa: los meses sin citas tambien salen, si no el grafico miente
      monthly: months.map((month) => {
        const row = monthly.find((m) => m.month === month);
        return {
          month,
          appointments: num(row?.count),
          income: num(row?.income),
        };
      }),
      recentUsers,
    };
  }

  async findUsers(
    page = 1,
    limit = 20,
    search?: string,
    role?: UserRole,
  ) {
    const qb = this.users
      .createQueryBuilder('u')
      .select(PUBLIC_USER_FIELDS.map((f) => `u.${f}`))
      // las citas cuelgan de dos relaciones distintas: se devuelven ambas y el front suma
      .loadRelationCountAndMap('u.appointmentsAsPatientCount', 'u.appointmentsAsPatient')
      .loadRelationCountAndMap('u.appointmentsAsNutritionistCount', 'u.appointmentsAsNutritionist')
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (role) qb.andWhere('u.role = :role', { role });
    if (search?.trim()) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('u.fullname ILIKE :q')
            .orWhere('u.email ILIKE :q')
            .orWhere('u.username ILIKE :q'),
        ),
        { q: `%${search.trim()}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateUser(id: number, dto: UpdateUserDto) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.email && dto.email !== user.email) {
      const taken = await this.users.findOne({ where: { email: dto.email } });
      if (taken) throw new BadRequestException('Ese correo ya esta en uso');
    }
    if (dto.username && dto.username !== user.username) {
      const taken = await this.users.findOne({ where: { username: dto.username } });
      if (taken) throw new BadRequestException('Ese usuario ya esta en uso');
    }

    Object.assign(user, dto);
    await this.users.save(user);
    return this.findUserSafe(id);
  }

  /**
   * Borrado duro. Progreso, planes y bloques de horario caen por CASCADE;
   * las citas no, y ahi si se pierde historial de la nutricionista.
   * ponytail: si tiene citas se rechaza y el admin decide que hacer con ellas.
   */
  async removeUser(id: number, requesterId: number) {
    if (id === requesterId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta');
    }

    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const citas = await this.appointments
      .createQueryBuilder('a')
      .where('a.patientId = :id OR a.nutritionistId = :id', { id })
      .getCount();

    if (citas > 0) {
      throw new BadRequestException(
        `No se puede eliminar: el usuario tiene ${citas} cita(s) asociada(s). Eliminalas primero.`,
      );
    }

    await this.users.remove(user);
    return { deleted: true };
  }

  async findAppointments(
    page = 1,
    limit = 20,
    status?: AppointmentStatus,
    search?: string,
  ) {
    const publicFields = (alias: string) =>
      ['id', 'fullname', 'username', 'email', 'avatar'].map((f) => `${alias}.${f}`);

    const qb = this.appointments
      .createQueryBuilder('a')
      .leftJoin('a.patient', 'patient')
      .addSelect(publicFields('patient'))
      .leftJoin('a.nutritionist', 'nutritionist')
      .addSelect(publicFields('nutritionist'))
      .orderBy('a.date', 'DESC')
      .addOrderBy('a.startTime', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('a.status = :status', { status });
    if (search?.trim()) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('patient.fullname ILIKE :q')
            .orWhere('patient.email ILIKE :q')
            .orWhere('a.guestName ILIKE :q')
            .orWhere('a.guestEmail ILIKE :q')
            .orWhere('nutritionist.fullname ILIKE :q'),
        ),
        { q: `%${search.trim()}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * ponytail: el admin borra; cancelar (que avisa por correo al paciente)
   * sigue siendo cosa de la nutricionista desde su propio panel.
   */
  async removeAppointment(id: number) {
    const appointment = await this.appointments.findOne({ where: { id } });
    if (!appointment) throw new NotFoundException('Cita no encontrada');
    await this.appointments.remove(appointment);
    return { deleted: true };
  }

  private findUserSafe(id: number) {
    return this.users.findOne({
      where: { id },
      select: PUBLIC_USER_FIELDS as (keyof User)[],
    });
  }
}
