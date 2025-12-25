import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * Атомарная проверка и инкремент счетчика бронирований
   */
  async incrementBookingCount(eventId: number, maxSeats: number): Promise<boolean> {
    const key = `event:${eventId}:bookings`;
    
    try {
      // Используем Lua скрипт для атомарной операции
      const script = `
        local current = redis.call('GET', KEYS[1])
        if not current then
          current = '0'
        end
        local count = tonumber(current)
        if count >= ${maxSeats} then
          return 0
        end
        redis.call('INCR', KEYS[1])
        return 1
      `;
      
      const result = await this.redis.eval(script, 1, key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to increment booking count for event ${eventId}`, error);
      throw error;
    }
  }

  /**
   * Получить текущее количество бронирований
   */
  async getBookingCount(eventId: number): Promise<number> {
    const key = `event:${eventId}:bookings`;
    try {
      const count = await this.redis.get(key);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      this.logger.error(`Failed to get booking count for event ${eventId}`, error);
      throw error;
    }
  }

  /**
   * Распределенная блокировка с таймаутом
   */
  async acquireLock(lockKey: string, ttlMs: number = 10000): Promise<string | null> {
    const lockValue = `${Date.now()}-${Math.random()}`;
    
    try {
      const result = await this.redis.set(lockKey, lockValue, 'PX', ttlMs, 'NX');
      return result === 'OK' ? lockValue : null;
    } catch (error) {
      this.logger.error(`Failed to acquire lock for key ${lockKey}`, error);
      return null;
    }
  }

  /**
   * Освободить блокировку
   */
  async releaseLock(lockKey: string, lockValue: string): Promise<boolean> {
    try {
      const script = `
        if redis.call('GET', KEYS[1]) == ARGV[1] then
          return redis.call('DEL', KEYS[1])
        else
          return 0
        end
      `;
      
      const result = await this.redis.eval(script, 1, lockKey, lockValue);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to release lock for key ${lockKey}`, error);
      return false;
    }
  }

  /**
   * Очистить счетчик бронирований (для тестирования или админ операций)
   */
  async resetBookingCount(eventId: number): Promise<void> {
    const key = `event:${eventId}:bookings`;
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to reset booking count for event ${eventId}`, error);
      throw error;
    }
  }

  /**
   * Декремент счетчика (для отмены бронирования)
   */
  async decrementBookingCount(eventId: number): Promise<boolean> {
    const key = `event:${eventId}:bookings`;

    try {
      const script = `
        local current = redis.call('GET', KEYS[1])
        if not current or current == '0' then
          return 0
        end
        redis.call('DECR', KEYS[1])
        return 1
      `;

      const result = await this.redis.eval(script, 1, key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to decrement booking count for event ${eventId}`, error);
      throw error;
    }
  }
}
