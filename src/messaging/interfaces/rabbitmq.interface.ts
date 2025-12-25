export interface IRabbitMQService {
  publishMessage(queue: string, message: any): Promise<void>;
  consumeMessages(queue: string, callback: (message: any) => Promise<void>): Promise<void>;
  close(): Promise<void>;
}

export interface MessageData {
  type: string;
  payload: any;
  timestamp: Date;
  userId?: string;
  eventId?: number;
}
