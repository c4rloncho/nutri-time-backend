import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('weight_goals')
export class WeightGoal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  patientId: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  startWeight: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  goalWeight: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: User;
}
