export interface INotificationStrategy {
  send(message: NotificationMessage): Promise<void>;
  getType(): NotificationType;
}

export enum NotificationType {
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
  WEBHOOK = 'webhook',
}

export interface NotificationMessage {
  userId: string;
  eventId: number;
  type: 'booking_created' | 'booking_cancelled' | 'event_reminder';
  data: any;
  timestamp: Date;
}
