import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { Event } from '../events/entities/event.entity';
import { RedisService } from './redis.service';
import { EventAvailabilityService } from './event-availability.service';
import { BookingLockService } from './booking-lock.service';
import { BookingValidationService, CreateBookingData } from './booking-validation.service';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { MessageData } from '../messaging/interfaces/rabbitmq.interface';
import { groupBy } from 'rxjs';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly redisService: RedisService,
    private readonly eventAvailabilityService: EventAvailabilityService,
    private readonly bookingLockService: BookingLockService,
    private readonly bookingValidationService: BookingValidationService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  /**
   * Создать новое бронирование с защитой от гонки состояний
   */
  async createBooking(createBookingData: CreateBookingData): Promise<Booking> {
    const { eventId, userId } = createBookingData;

    // Валидация входных данных без блокировки
    await this.bookingValidationService.validateBookingData(createBookingData);

    // Выполняем операцию с блокировкой
    return this.bookingLockService.executeWithLock(eventId, async () => {
      // Повторная валидация внутри блокировки (double-check pattern)
      await this.bookingValidationService.validateBookingData(createBookingData);

      // Атомарное инкрементирование счетчика в Redis
      const event = await this.eventAvailabilityService.getEventAvailability(eventId);
      const incremented = await this.redisService.incrementBookingCount(eventId, event.event.total_seats);

      if (!incremented) {
        throw new BadRequestException('No seats available for this event');
      }

      // Создание бронирования в базе данных
      try {
        const booking = this.bookingRepository.create({
          user_id: userId,
          event: { id: eventId } as Event,
        });

        const savedBooking = await this.bookingRepository.save(booking);
        this.logger.log(`Booking created: user ${userId} for event ${eventId}`);

        // Отправляем уведомление асинхронно (fire-and-forget)
        this.sendBookingNotificationAsync(savedBooking, 'booking_created');

        return savedBooking;
      } catch (error) {
        // Откатываем счетчик в Redis в случае ошибки сохранения
        await this.redisService.resetBookingCount(eventId);
        this.logger.error(`Failed to save booking, rolled back Redis counter for event ${eventId}`, error);
        throw error;
      }
    });
  }

  /**
   * Получить все бронирования пользователя
   */
  async findByUserId(userId: string): Promise<Booking[]> {
    return this.bookingRepository.find({
      where: { user_id: userId },
      relations: ['event'],
      order: { created_at: 'DESC' },
    });
  }

  async findTop(filter: string): Promise<any> {
    const topUsers = await this.bookingRepository      
      .createQueryBuilder('booking')
      .select('booking.user_id', 'user_id')
      .addSelect('COUNT(booking.id)', 'count')
      .groupBy('booking.user_id')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();
      
    const res = topUsers.map((u, index) => ({
    user_id: u.user_id,
    count: parseInt(u.count),
    place: index + 1,
  }));

  return res;
  }

  /**
   * Получить все бронирования для события
   */
  async findByEventId(eventId: number): Promise<Booking[]> {
    return this.bookingRepository.find({
      where: { event: { id: eventId } },
      relations: ['event'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Отменить бронирование
   */
  async cancelBooking(bookingId: number, userId: string): Promise<void> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId, user_id: userId },
      relations: ['event'],
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    // Выполняем отмену с блокировкой
    await this.bookingLockService.executeWithLock(booking.event.id, async () => {
      await this.bookingRepository.remove(booking);
      
      // Уменьшаем счетчик в Redis (атомарно)
      const currentCount = await this.redisService.getBookingCount(booking.event.id);
      if (currentCount > 0) {
        // Redis не имеет атомарного DECR с проверкой, поэтому используем Lua
        const script = `
          local current = redis.call('GET', KEYS[1])
          if current and tonumber(current) > 0 then
            redis.call('DECR', KEYS[1])
            return 1
          end
          return 0
        `;
        await (this.redisService as any).redis.eval(script, 1, `event:${booking.event.id}:bookings`);
      }
    });

    this.logger.log(`Booking cancelled: ${bookingId} for user ${userId}`);

    // Отправляем уведомление асинхронно (fire-and-forget)
    this.sendBookingNotificationAsync(booking, 'booking_cancelled');
  }

  /**
   * Асинхронная отправка уведомления о бронировании (fire-and-forget)
   */
  private sendBookingNotificationAsync(booking: Booking, type: 'booking_created' | 'booking_cancelled'): void {
    // Не ждем завершения - отправляем и забываем
    setImmediate(async () => {
      try {
        const message: MessageData = {
          type: 'notification',
          payload: {
            userId: booking.user_id,
            eventId: booking.event.id,
            bookingId: booking.id,
            type,
          },
          timestamp: new Date(),
        };

        await this.rabbitMQService.publishMessage('booking_notifications', message);
        this.logger.debug(`Notification sent for ${type}: user ${booking.user_id}`);
      } catch (error) {
        this.logger.error(`Failed to send ${type} notification to queue`, error);
        // В fire-and-forget режиме мы просто логируем ошибку
        // и не прерываем основной поток
      }
    });
  }
}
