import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  @Min(1)
  eventId: number;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
