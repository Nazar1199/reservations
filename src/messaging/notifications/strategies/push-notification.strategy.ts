import { Injectable, Logger } from '@nestjs/common';
import { INotificationStrategy, NotificationMessage, NotificationType } from '../interfaces/notification-strategy.interface';

@Injectable()
export class PushNotificationStrategy implements INotificationStrategy {
  private readonly logger = new Logger(PushNotificationStrategy.name);

  getType(): NotificationType {
    return NotificationType.PUSH;
  }

  async send(message: NotificationMessage): Promise<void> {
    this.logger.log(`Отправка уведомления через Push для пользователя ${message.userId}`);

    // Имитация отправки push уведомления
    const pushContent = this.buildPushContent(message);

    this.logger.log(`Push уведомление отправлено: ${pushContent.title}`);
    this.logger.debug(`Содержание: ${pushContent.body}`);

    // В реальном приложении здесь был бы вызов сервиса push уведомлений
    // await this.pushService.send(message.userId, pushContent);
  }

  private buildPushContent(message: NotificationMessage): { title: string; body: string } {
    const titleMap = {
      booking_created: 'Бронирование подтверждено',
      booking_cancelled: 'Бронирование отменено',
      event_reminder: 'Напоминание о событии',
    };

    const bodyMap = {
      booking_created: `Ваше место на событие ${message.eventId} забронировано`,
      booking_cancelled: `Бронирование на событие ${message.eventId} отменено`,
      event_reminder: `Событие ${message.eventId} состоится скоро`,
    };

    return {
      title: titleMap[message.type] || 'Уведомление',
      body: bodyMap[message.type] || 'Уведомление от системы бронирования',
    };
  }
}
