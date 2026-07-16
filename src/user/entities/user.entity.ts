import { Appointment } from 'src/appointment/entities/appointment.entity';
import { AvailabilityBlock } from 'src/availability/entities/availability-block.entity';
import { TimeBlock } from 'src/availability/entities/time-block.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  PATIENT = 'patient',
  NUTRITIONIST = 'nutritionist',

}
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullname: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  /**
   * URL publica de la foto de perfil en R2.
   * ponytail: guardamos la URL absoluta, asi que queda acoplada al host de R2_PUBLIC_URL.
   * Hoy apunta al subdominio r2.dev (sin CDN ni cache, con rate limits). Al migrar a dominio
   * propio hay que reescribir las existentes:
   *   UPDATE users SET avatar = replace(avatar, '<host-viejo>', '<host-nuevo>');
   * Si esto se hace habitual, guardar solo la key y componer la URL al leer.
   */
  @Column({ type: 'text', nullable: true })
  avatar: string | null;

  @Column({ type: 'text', nullable: true })
  password: string | null;

  @Column({ type: 'text', nullable: true, unique: true })
  googleId: string | null;

  @Column({ nullable: true, type: 'text' })
  refreshToken: string | null;

  @Column({ nullable: true, type: 'text' })
  googleCalendarAccessToken: string | null;

  @Column({ nullable: true, type: 'text' })
  googleCalendarRefreshToken: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  googleCalendarTokenExpiry: Date | null;

  @Column({ nullable: true, type: 'text' })
  resetPasswordToken: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  resetPasswordExpires: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PATIENT,
  })
  role: UserRole;

  // Solo si es NUTRITIONIST - precios por duración de cita
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price15: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price30: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price45: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price60: number | null;

  // Solo si es NUTRITIONIST - bloques de horarios
  @OneToMany(() => AvailabilityBlock, block => block.nutritionist)
  availabilityBlocks: AvailabilityBlock[];

  // Solo si es NUTRITIONIST - bloqueos de tiempo específicos
  @OneToMany(() => TimeBlock, block => block.nutritionist)
  timeBlocks: TimeBlock[];

  // Si es NUTRITIONIST - citas que debe atender
  @OneToMany(() => Appointment, appointment => appointment.nutritionist)
  appointmentsAsNutritionist: Appointment[];

  // Si es PATIENT - citas que ha reservado
  @OneToMany(() => Appointment, appointment => appointment.patient)
  appointmentsAsPatient: Appointment[];
}
