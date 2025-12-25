import { Controller, Post, Body, Get, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking } from './entities/booking.entity';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  async create(@Body() createBookingDto: CreateBookingDto): Promise<Booking> {
    return this.bookingsService.createBooking({
      eventId: createBookingDto.eventId,
      userId: createBookingDto.userId,
    });
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string): Promise<Booking[]> {
    return this.bookingsService.findByUserId(userId);
  }

  @Get('event/:eventId')
  async findByEventId(@Param('eventId', ParseIntPipe) eventId: number): Promise<Booking[]> {
    return this.bookingsService.findByEventId(eventId);
  }

  @Delete(':id/user/:userId')
  async cancelBooking(
    @Param('id', ParseIntPipe) bookingId: number,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.bookingsService.cancelBooking(bookingId, userId);
  }
}
