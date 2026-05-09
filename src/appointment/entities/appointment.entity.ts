// src/appointments/entities/appointment.entity.ts
import { User } from 'src/user/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AppointmentStatus } from '../enums/appointment-status.enum';


@Entity('appointments')
export class Appointment {
    @PrimaryGeneratedColumn()
    id: number;

    // Fecha específica: 2025-11-25
    @Column({ type: 'date' })
    date: string;

    // Hora inicio: '10:00'
    @Column({ type: 'time' })
    startTime: string;

    // Hora fin: '11:00'
    @Column({ type: 'time' })
    endTime: string;

    // Duración de la cita en minutos (15, 30, 45, 60)
    @Column({ type: 'int' })
    duration: number;

    // Precio de la cita calculado al momento de creación
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    price: number | null;

    @Column({
        type: 'enum',
        enum: AppointmentStatus,
        default: AppointmentStatus.PENDING
    })
    status: AppointmentStatus;

    @Column({ nullable: true })
    patientId: number | null;

    @Column({ type: 'varchar', nullable: true })
    guestName: string | null;

    @Column({ type: 'varchar', nullable: true })
    guestEmail: string | null;

    @Column()
    nutritionistId: number;

    @Column({ type: 'boolean', default: false })
    isOnline: boolean;

    @Column({ type: 'varchar', nullable: true })
    meetLink: string | null;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @ManyToOne(() => User, user => user.appointmentsAsPatient, { nullable: true })
    @JoinColumn({ name: 'patientId' })
    patient: User | null;

    // Relación con la nutricionista
    @ManyToOne(() => User, user => user.appointmentsAsNutritionist)
    @JoinColumn({ name: 'nutritionistId' })
    nutritionist: User;
}
