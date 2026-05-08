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

  @Column({ type: 'text', nullable: true })
  password: string | null;

  @Column({ type: 'text', nullable: true, unique: true })
  googleId: string | null;

  @Column({ nullable: true, type: 'text' })
  refreshToken: string | null;

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
