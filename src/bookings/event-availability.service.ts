import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../events/entities/event.entity';
import { RedisService } from './redis.service';

@Injectable()
export class EventAvailabilityService {
  private readonly logger = new Logger(EventAvailabilityService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Проверить существование события и получить информацию о местах
   */
  async getEventAvailability(eventId: number): Promise<{
    event: Event;
    availableSeats: number;
    currentBookings: number;
  }> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const currentBookings = await this.redisService.getBookingCount(eventId);
    const availableSeats = Math.max(0, event.total_seats - currentBookings);

    return {
      event,
      availableSeats,
      currentBookings,
    };
  }

  /**
   * Проверить доступность места для бронирования
   */
  async checkAvailability(eventId: number): Promise<boolean> {
    const { availableSeats } = await this.getEventAvailability(eventId);
    return availableSeats > 0;
  }
}
