import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './events/events.module';
import { BookingsModule } from './bookings/bookings.module';

@Module({
  imports: [EventsModule, BookingsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
