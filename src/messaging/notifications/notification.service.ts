import { Injectable, Logger } from '@nestjs/common';
import { INotificationStrategy, NotificationMessage, NotificationType } from './interfaces/notification-strategy.interface';
import { EmailNotificationStrategy } from './strategies/email-notification.strategy';
import { PushNotificationStrategy } from './strategies/push-notification.strategy';
import { SmsNotificationStrategy } from './strategies/sms-notification.strategy';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private strategies: Map<NotificationType, INotificationStrategy> = new Map();

  constructor(
    private readonly emailStrategy: EmailNotificationStrategy,
    private readonly pushStrategy: PushNotificationStrategy,
    private readonly smsStrategy: SmsNotificationStrategy,
  ) {
    // Регистрируем все доступные стратегии
    this.strategies.set(NotificationType.EMAIL, emailStrategy);
    this.strategies.set(NotificationType.PUSH, pushStrategy);
    this.strategies.set(NotificationType.SMS, smsStrategy);
  }

  /**
   * Отправка уведомления с выбором стратегии
   */
  async sendNotification(message: NotificationMessage, notificationType: NotificationType): Promise<void> {
    try {
      const strategy = this.strategies.get(notificationType);

      if (!strategy) {
        throw new Error(`Notification strategy for type ${notificationType} not found`);
      }

      this.logger.log(`Sending ${notificationType} notification for user ${message.userId}`);
      await strategy.send(message);

    } catch (error) {
      this.logger.error(`Failed to send ${notificationType} notification`, error);
      throw error;
    }
  }

  /**
   * Отправка уведомлений через несколько каналов
   */
  async sendMultiChannelNotification(
    message: NotificationMessage,
    notificationTypes: NotificationType[]
  ): Promise<void> {
    const promises = notificationTypes.map(type =>
      this.sendNotification(message, type).catch(error => {
        this.logger.warn(`Failed to send ${type} notification, continuing with others`, error);
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Получение доступных типов уведомлений
   */
  getAvailableTypes(): NotificationType[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Проверка доступности типа уведомления
   */
  isTypeAvailable(notificationType: NotificationType): boolean {
    return this.strategies.has(notificationType);
  }
}
