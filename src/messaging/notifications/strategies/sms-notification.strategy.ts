import { Injectable, Logger } from '@nestjs/common';
import { INotificationStrategy, NotificationMessage, NotificationType } from '../interfaces/notification-strategy.interface';

@Injectable()
export class SmsNotificationStrategy implements INotificationStrategy {
  private readonly logger = new Logger(SmsNotificationStrategy.name);

  getType(): NotificationType {
    return NotificationType.SMS;
  }

  async send(message: NotificationMessage): Promise<void> {
    this.logger.log(`Отправка уведомления через SMS для пользователя ${message.userId}`);

    // Имитация отправки SMS
    const smsContent = this.buildSmsContent(message);

    this.logger.log(`SMS отправлено: ${smsContent}`);
    this.logger.debug(`Получатель: ${message.userId}`);

    // В реальном приложении здесь был бы вызов SMS сервиса
    // await this.smsService.send(message.userId, smsContent);
  }

  private buildSmsContent(message: NotificationMessage): string {
    const contentMap = {
      booking_created: `Бронирование подтверждено. Событие: ${message.eventId}`,
      booking_cancelled: `Бронирование отменено. Событие: ${message.eventId}`,
      event_reminder: `Напоминание: событие ${message.eventId} скоро состоится`,
    };

    return contentMap[message.type] || 'Уведомление от системы бронирования';
  }
}
