import { Appointment } from 'src/appointment/entities/appointment.entity';
import { AvailabilityBlock } from 'src/availability/entities/availability-block.entity';
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

  @Column()
  password: string;

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

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ nullable: true })
  avatarPublicId?: string;

  // Solo si es NUTRITIONIST - bloques de horarios
  @OneToMany(() => AvailabilityBlock, block => block.nutritionist)
  availabilityBlocks: AvailabilityBlock[];

  // Si es NUTRITIONIST - citas que debe atender
  @OneToMany(() => Appointment, appointment => appointment.nutritionist)
  appointmentsAsNutritionist: Appointment[];

  // Si es PATIENT - citas que ha reservado
  @OneToMany(() => Appointment, appointment => appointment.patient)
  appointmentsAsPatient: Appointment[];
}
