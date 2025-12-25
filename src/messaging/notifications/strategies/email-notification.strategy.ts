import { Injectable, Logger } from '@nestjs/common';
import { INotificationStrategy, NotificationMessage, NotificationType } from '../interfaces/notification-strategy.interface';

@Injectable()
export class EmailNotificationStrategy implements INotificationStrategy {
  private readonly logger = new Logger(EmailNotificationStrategy.name);

  getType(): NotificationType {
    return NotificationType.EMAIL;
  }

  async send(message: NotificationMessage): Promise<void> {
    this.logger.log(`Отправка уведомления через Email для пользователя ${message.userId}`);

    // Имитация отправки email
    const emailContent = this.buildEmailContent(message);

    this.logger.log(`Email отправлен: ${emailContent.subject}`);
    this.logger.debug(`Содержание: ${emailContent.body}`);

    // В реальном приложении здесь был бы вызов сервиса отправки email
    // await this.emailService.send(emailContent);
  }

  private buildEmailContent(message: NotificationMessage): { subject: string; body: string } {
    const subjectMap = {
      booking_created: 'Подтверждение бронирования',
      booking_cancelled: 'Отмена бронирования',
      event_reminder: 'Напоминание о событии',
    };

    const bodyMap = {
      booking_created: `Здравствуйте! Ваше бронирование на событие ${message.eventId} подтверждено.`,
      booking_cancelled: `Здравствуйте! Ваше бронирование на событие ${message.eventId} отменено.`,
      event_reminder: `Напоминание: событие ${message.eventId} состоится скоро.`,
    };

    return {
      subject: subjectMap[message.type] || 'Уведомление',
      body: bodyMap[message.type] || 'Уведомление от системы бронирования',
    };
  }
}
