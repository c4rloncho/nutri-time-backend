import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface MealItem {
  time: string;
  label: string;
  foods: string;
}

@Entity('meal_plans')
export class MealPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nutritionistId: number;

  @Column()
  patientId: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'jsonb' })
  meals: MealItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nutritionistId' })
  nutritionist: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: User;
}
