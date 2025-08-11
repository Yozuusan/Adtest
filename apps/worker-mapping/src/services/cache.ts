import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

export interface ThemeAdapter {
  selectors: Record<string, string>;
  order: string[];
  confidence: Record<string, number>;
  theme_fingerprint: string;
  created_at: string;
  updated_at: string;
}

export class CacheService {
  private redis: RedisClientType;
  private isConnected = false;

  constructor() {
    this.redis = createClient({
      url: process.env.REDIS_URL
    });

    this.redis.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    this.redis.on('connect', () => {
      logger.info('✅ Redis connected for cache service');
      this.isConnected = true;
    });

    this.redis.on('disconnect', () => {
      logger.info('❌ Redis disconnected from cache service');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.redis.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.redis.quit();
    }
  }

  async setThemeAdapter(shopId: string, fingerprint: string, adapter: ThemeAdapter): Promise<void> {
    try {
      const key = `adapter:${shopId}:${fingerprint}`;
      await this.redis.set(key, JSON.stringify(adapter), { EX: 86400 * 7 }); // 7 days TTL
      logger.info(`✅ Theme adapter cached for shop ${shopId}, fingerprint ${fingerprint}`);
    } catch (error) {
              logger.error('Failed to cache theme adapter:', { error: String(error) });
      throw error;
    }
  }

  async getThemeAdapter(shopId: string, fingerprint: string): Promise<ThemeAdapter | null> {
    try {
      const key = `adapter:${shopId}:${fingerprint}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
              logger.error('Failed to get theme adapter:', { error: String(error) });
      return null;
    }
  }

  async invalidateThemeAdapter(shopId: string, fingerprint: string): Promise<void> {
    try {
      const key = `adapter:${shopId}:${fingerprint}`;
      await this.redis.del(key);
      logger.info(`🗑️ Theme adapter invalidated for shop ${shopId}, fingerprint ${fingerprint}`);
    } catch (error) {
              logger.error('Failed to invalidate theme adapter:', { error: String(error) });
    }
  }

  async clearShopCache(shopId: string): Promise<void> {
    try {
      const keys = await this.redis.keys(`adapter:${shopId}:*`);
      if (keys.length > 0) {
        await this.redis.del(keys);
        logger.info(`🗑️ Cleared ${keys.length} theme adapters for shop ${shopId}`);
      }
    } catch (error) {
              logger.error('Failed to clear shop cache:', { error: String(error) });
    }
  }

  async getStats(): Promise<{ totalAdapters: number; totalKeys: number }> {
    try {
      const adapterKeys = await this.redis.keys('adapter:*');
      const totalKeys = await this.redis.dbSize();
      
      return {
        totalAdapters: adapterKeys.length,
        totalKeys
      };
    } catch (error) {
              logger.error('Failed to get cache stats:', { error: String(error) });
      return { totalAdapters: 0, totalKeys: 0 };
    }
  }
}

export const cacheService = new CacheService();
