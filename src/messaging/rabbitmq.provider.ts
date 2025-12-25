import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

export const RabbitMQProvider = {
  provide: 'RABBITMQ_CONNECTION',
  useFactory: async (configService: ConfigService) => {
    const url = configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672');
    const connection = await amqp.connect(url);
    return connection;
  },
  inject: [ConfigService],
};
