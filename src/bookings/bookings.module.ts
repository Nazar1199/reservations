import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { Booking } from './entities/booking.entity';
import { Event } from '../events/entities/event.entity';
import { RedisService } from './redis.service';
import { EventAvailabilityService } from './event-availability.service';
import { BookingLockService } from './booking-lock.service';
import { BookingValidationService } from './booking-validation.service';
import { MessagingModule } from '../messaging/messaging.module';

// Создаем провайдер для Redis
export const RedisProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: (configService: ConfigService) => {
    const Redis = require('ioredis');
    return new Redis({
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get('REDIS_PORT', 6379),
      password: configService.get('REDIS_PASSWORD'),
      db: configService.get('REDIS_DB', 0),
    });
  },
  inject: [ConfigService],
};

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Booking, Event]),
    MessagingModule,
  ],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    RedisService,
    RedisProvider,
    EventAvailabilityService,
    BookingLockService,
    BookingValidationService,
  ],
  exports: [BookingsService],
})
export class BookingsModule {}
