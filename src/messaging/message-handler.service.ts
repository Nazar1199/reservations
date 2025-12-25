import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { NotificationService } from './notifications/notification.service';
import { MessageData } from './interfaces/rabbitmq.interface';
import { NotificationType } from './notifications/interfaces/notification-strategy.interface';

@Injectable()
export class MessageHandlerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageHandlerService.name);
  private readonly NOTIFICATION_QUEUE = 'booking_notifications';

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    // Начинаем прослушивание очереди уведомлений
    await this.startConsumingNotifications();
  }

  async onModuleDestroy() {
    // RabbitMQ соединение закроется автоматически через RabbitMQService
  }

  /**
   * Запуск прослушивания очереди уведомлений
   */
  private async startConsumingNotifications(): Promise<void> {
    await this.rabbitMQService.consumeMessages(
      this.NOTIFICATION_QUEUE,
      this.handleNotificationMessage.bind(this)
    );
  }

  /**
   * Обработка входящего сообщения уведомления
   */
  private async handleNotificationMessage(message: MessageData): Promise<void> {
    try {
      this.logger.log(`Processing notification message: ${JSON.stringify(message)}`);

      // Определяем типы уведомлений на основе типа сообщения
      const notificationTypes = this.determineNotificationTypes(message);

      // Создаем сообщение уведомления
      const notificationMessage = {
        userId: message.payload.userId,
        eventId: message.payload.eventId,
        type: message.payload.type,
        data: message.payload,
        timestamp: new Date(message.timestamp),
      };

      // Отправляем уведомления через все определенные каналы
      await this.notificationService.sendMultiChannelNotification(
        notificationMessage,
        notificationTypes
      );

      this.logger.log(`Notification processed successfully for user ${message.payload.userId}`);

    } catch (error) {
      this.logger.error('Error processing notification message', error);
      throw error; // Повторная обработка через RabbitMQ
    }
  }

  /**
   * Определение типов уведомлений на основе типа сообщения
   */
  private determineNotificationTypes(message: MessageData): NotificationType[] {
    const type = message.payload.type;

    // Логика определения каналов уведомлений
    switch (type) {
      case 'booking_created':
        return [NotificationType.EMAIL, NotificationType.PUSH];

      case 'booking_cancelled':
        return [NotificationType.EMAIL, NotificationType.SMS];

      case 'event_reminder':
        return [NotificationType.PUSH, NotificationType.EMAIL];

      default:
        return [NotificationType.EMAIL]; // По умолчанию только email
    }
  }

  /**
   * Отправка тестового уведомления (для отладки)
   */
  async sendTestNotification(userId: string, eventId: number): Promise<void> {
    const testMessage: MessageData = {
      type: 'notification',
      payload: {
        userId,
        eventId,
        type: 'booking_created',
        test: true,
      },
      timestamp: new Date(),
    };

    await this.rabbitMQService.publishMessage(this.NOTIFICATION_QUEUE, testMessage);
    this.logger.log(`Test notification sent to queue for user ${userId}`);
  }
}
