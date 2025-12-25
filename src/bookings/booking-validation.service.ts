import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { EventAvailabilityService } from './event-availability.service';

export interface CreateBookingData {
  eventId: number;
  userId: string;
}

@Injectable()
export class BookingValidationService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly eventAvailabilityService: EventAvailabilityService,
  ) {}

  /**
   * Валидировать данные для создания бронирования
   */
  async validateBookingData(data: CreateBookingData): Promise<void> {
    await this.validateEventExists(data.eventId);
    await this.validateUserNotAlreadyBooked(data.eventId, data.userId);
    await this.validateSeatsAvailable(data.eventId);
  }

  /**
   * Проверить существование события
   */
  private async validateEventExists(eventId: number): Promise<void> {
    try {
      await this.eventAvailabilityService.getEventAvailability(eventId);
    } catch (error) {
      throw new BadRequestException('Event not found');
    }
  }

  /**
   * Проверить, что пользователь еще не забронировал место на это событие
   */
  private async validateUserNotAlreadyBooked(eventId: number, userId: string): Promise<void> {
    const existingBooking = await this.bookingRepository.findOne({
      where: {
        event: { id: eventId },
        user_id: userId,
      },
    });

    if (existingBooking) {
      throw new ConflictException('User has already booked a seat for this event');
    }
  }

  /**
   * Проверить доступность мест
   */
  private async validateSeatsAvailable(eventId: number): Promise<void> {
    const isAvailable = await this.eventAvailabilityService.checkAvailability(eventId);
    
    if (!isAvailable) {
      throw new ConflictException('No seats available for this event');
    }
  }
}
