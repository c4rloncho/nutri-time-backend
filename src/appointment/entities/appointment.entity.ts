// src/appointments/entities/appointment.entity.ts
import { User } from 'src/user/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';


@Entity('appointments')
export class Appointment {
    @PrimaryGeneratedColumn()
    id: number;

    // Fecha específica: 2025-11-25
    @Column({ type: 'date' })
    date: Date;

    // Hora inicio: '10:00'
    @Column({ type: 'time' })
    startTime: string;

    // Hora fin: '11:00'
    @Column({ type: 'time' })
    endTime: string;

    @Column({
        type: 'enum',
        enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
        default: 'PENDING'
    })
    status: string;

    @Column()
    patientId: number;

    @Column()
    nutritionistId: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @ManyToOne(() => User, user => user.appointmentsAsPatient)
    @JoinColumn({ name: 'patientId' })
    patient: User;

    // Relación con la nutricionista
    @ManyToOne(() => User, user => user.appointmentsAsNutritionist)
    @JoinColumn({ name: 'nutritionistId' })
    nutritionist: User;
}
