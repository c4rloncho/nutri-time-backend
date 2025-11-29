import { User } from 'src/user/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('availability_blocks')
export class AvailabilityBlock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nutritionistId: number;

  @Column({
    type: 'enum',
    enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
  })
  dayOfWeek: string;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ type: 'int', default: 60 })
  slotDuration: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.availabilityBlocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nutritionistId' })
  nutritionist: User;
}
