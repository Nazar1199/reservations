import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { IRabbitMQService, MessageData } from './interfaces/rabbitmq.interface';

@Injectable()
export class RabbitMQService implements IRabbitMQService, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  constructor(@Inject('RABBITMQ_CONNECTION') connection: amqp.Connection) {
    this.connection = connection;
  }

  async onModuleDestroy() {
    await this.close();
  }

  /**
   * Инициализация канала
   */
  private async ensureChannel(): Promise<void> {
    if (!this.channel) {
      this.channel = await this.connection.createChannel();
    }
  }

  /**
   * Отправка сообщения в очередь
   */
  async publishMessage(queue: string, message: MessageData): Promise<void> {
    try {
      await this.ensureChannel();

      // Объявляем очередь (если не существует)
      await this.channel.assertQueue(queue, { durable: true });

      // Отправляем сообщение
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const sent = this.channel.sendToQueue(queue, messageBuffer, {
        persistent: true,
      });

      if (sent) {
        this.logger.log(`Message sent to queue ${queue}: ${JSON.stringify(message)}`);
      } else {
        this.logger.warn(`Failed to send message to queue ${queue}`);
      }
    } catch (error) {
      this.logger.error(`Error publishing message to queue ${queue}`, error);
      throw error;
    }
  }

  /**
   * Получение сообщений из очереди
   */
  async consumeMessages(queue: string, callback: (message: MessageData) => Promise<void>): Promise<void> {
    try {
      await this.ensureChannel();

      // Объявляем очередь
      await this.channel.assertQueue(queue, { durable: true });

      // Устанавливаем prefetch для контроля параллелизма
      await this.channel.prefetch(1);

      this.logger.log(`Waiting for messages in queue: ${queue}`);

      await this.channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const messageContent = msg.content.toString();
            const message: MessageData = JSON.parse(messageContent);

            this.logger.debug(`Received message from queue ${queue}: ${messageContent}`);

            // Вызываем callback для обработки сообщения
            await callback(message);

            // Подтверждаем обработку сообщения
            this.channel.ack(msg);

            this.logger.debug(`Message processed and acknowledged from queue ${queue}`);
          } catch (error) {
            this.logger.error(`Error processing message from queue ${queue}`, error);

            // В случае ошибки, отклоняем сообщение (может быть возвращено в очередь)
            this.channel.nack(msg, false, false);
          }
        }
      });

    } catch (error) {
      this.logger.error(`Error consuming messages from queue ${queue}`, error);
      throw error;
    }
  }

  /**
   * Закрытие соединения
   */
  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.logger.log('RabbitMQ channel closed');
      }
      if (this.connection) {
        await this.connection.close();
        this.logger.log('RabbitMQ connection closed');
      }
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection', error);
    }
  }
}
