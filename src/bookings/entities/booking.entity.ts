import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    ManyToOne, 
    Unique,
    CreateDateColumn 
  } from 'typeorm';
  import { Event } from '../../events/entities/event.entity';
  import { IsString, IsInt } from 'class-validator';
  
  @Entity('bookings')
  @Unique(['event_id', 'user_id'])
  export class Booking {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ type: 'int' })
    @IsInt()
    event_id: number;
  
    @Column({ type: 'varchar', length: 255 })
    @IsString()
    user_id: string;
  
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
  
    @ManyToOne(() => Event, event => event.bookings, { onDelete: 'CASCADE' })
    event: Event;
  }