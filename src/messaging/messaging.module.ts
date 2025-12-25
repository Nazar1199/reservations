import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQProvider } from './rabbitmq.provider';
import { RabbitMQService } from './rabbitmq.service';
import { MessageHandlerService } from './message-handler.service';

// Notifications
import { NotificationService } from './notifications/notification.service';
import { EmailNotificationStrategy } from './notifications/strategies/email-notification.strategy';
import { PushNotificationStrategy } from './notifications/strategies/push-notification.strategy';
import { SmsNotificationStrategy } from './notifications/strategies/sms-notification.strategy';

@Module({
  imports: [ConfigModule],
  providers: [
    // RabbitMQ
    RabbitMQProvider,
    RabbitMQService,

    // Message Handler
    MessageHandlerService,

    // Notification Strategies
    EmailNotificationStrategy,
    PushNotificationStrategy,
    SmsNotificationStrategy,

    // Notification Service
    NotificationService,
  ],
  exports: [
    RabbitMQService,
    MessageHandlerService,
    NotificationService,
  ],
})
export class MessagingModule {}
