import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { IsString, IsInt } from 'class-validator';

@Entity('bookings')
@Unique(['event', 'user_id'])
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  user_id: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;


  @ManyToOne(() => Event, (event) => event.bookings, { 
    onDelete: 'CASCADE',
    nullable: false
  })
  @JoinColumn({ name: "event_id" })
  event: Event;
}