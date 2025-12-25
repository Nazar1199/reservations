import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class BookingLockService {
  private readonly logger = new Logger(BookingLockService.name);
  private readonly LOCK_TIMEOUT = 30000; // 30 секунд
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 100; // 100ms

  constructor(private readonly redisService: RedisService) {}

  /**
   * Попытаться получить блокировку для события с retry логикой
   */
  async acquireEventLock(eventId: number): Promise<string | null> {
    const lockKey = `lock:event:${eventId}:booking`;

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      const lockValue = await this.redisService.acquireLock(lockKey, this.LOCK_TIMEOUT);
      
      if (lockValue) {
        this.logger.debug(`Acquired lock for event ${eventId} on attempt ${attempt}`);
        return lockValue;
      }

      if (attempt < this.MAX_RETRY_ATTEMPTS) {
        await this.delay(this.RETRY_DELAY * attempt);
      }
    }

    this.logger.warn(`Failed to acquire lock for event ${eventId} after ${this.MAX_RETRY_ATTEMPTS} attempts`);
    return null;
  }

  /**
   * Освободить блокировку события
   */
  async releaseEventLock(eventId: number, lockValue: string): Promise<boolean> {
    const lockKey = `lock:event:${eventId}:booking`;
    
    const released = await this.redisService.releaseLock(lockKey, lockValue);
    
    if (released) {
      this.logger.debug(`Released lock for event ${eventId}`);
    } else {
      this.logger.warn(`Failed to release lock for event ${eventId} - lock may have expired`);
    }

    return released;
  }

  /**
   * Выполнить операцию с блокировкой
   */
  async executeWithLock<T>(
    eventId: number,
    operation: () => Promise<T>,
  ): Promise<T> {
    const lockValue = await this.acquireEventLock(eventId);
    
    if (!lockValue) {
      throw new Error(`Unable to acquire lock for event ${eventId}`);
    }

    try {
      return await operation();
    } finally {
      await this.releaseEventLock(eventId, lockValue);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
