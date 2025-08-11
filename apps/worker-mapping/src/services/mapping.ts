import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

export interface MappingJob {
  id: string;
  shop_id: string;
  product_url?: string;
  product_gid?: string;
  priority: 'low' | 'normal' | 'high';
  options: {
    extract_images?: boolean;
    extract_usp?: boolean;
    extract_badges?: boolean;
    confidence_threshold?: number;
  };
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  created_at: string;
  updated_at: string;
  result?: any;
  error?: string;
}

export class MappingService {
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
      logger.info('✅ Redis connected for mapping service');
      this.isConnected = true;
    });

    this.redis.on('disconnect', () => {
      logger.info('❌ Redis disconnected from mapping service');
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

  async updateJobStatus(jobId: string, status: string, data: any = {}): Promise<void> {
    try {
      const key = `mapping_job:${jobId}`;
      const existingJob = await this.redis.get(key);
      
      if (existingJob) {
        const job: MappingJob = JSON.parse(existingJob);
        const updatedJob: MappingJob = {
          ...job,
          status: status as MappingJob['status'],
          updated_at: new Date().toISOString(),
          ...data
        };
        
        await this.redis.set(key, JSON.stringify(updatedJob), { EX: 86400 }); // 24 hours TTL
        logger.info(`📊 Job ${jobId} status updated to ${status}`);
      } else {
        logger.warn(`⚠️ Job ${jobId} not found for status update`);
      }
    } catch (error) {
              logger.error(`Failed to update job ${jobId} status:`, { error: String(error) });
    }
  }

  async getJobStatus(jobId: string): Promise<MappingJob | null> {
    try {
      const key = `mapping_job:${jobId}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
              logger.error(`Failed to get job ${jobId} status:`, { error: String(error) });
      return null;
    }
  }

  async getShopJobs(shopId: string, limit: number = 50): Promise<MappingJob[]> {
    try {
      const pattern = `mapping_job:*`;
      const keys = await this.redis.keys(pattern);
      const jobs: MappingJob[] = [];

      for (const key of keys.slice(0, limit)) {
        const data = await this.redis.get(key);
        if (data) {
          const job: MappingJob = JSON.parse(data);
          if (job.shop_id === shopId) {
            jobs.push(job);
          }
        }
      }

      // Sort by created_at descending
      return jobs.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
              logger.error(`Failed to get jobs for shop ${shopId}:`, { error: String(error) });
      return [];
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const key = `mapping_job:${jobId}`;
      const existingJob = await this.redis.get(key);
      
      if (existingJob) {
        const job: MappingJob = JSON.parse(existingJob);
        if (job.status === 'pending' || job.status === 'running') {
          await this.updateJobStatus(jobId, 'cancelled');
          
          // Remove from queue if still pending
          if (job.status === 'pending') {
            const queueKey = `mapping_queue:${job.shop_id}`;
            await this.redis.lRem(queueKey, 1, JSON.stringify(job));
          }
          
          logger.info(`🚫 Job ${jobId} cancelled successfully`);
          return true;
        } else {
          logger.warn(`⚠️ Cannot cancel job ${jobId} with status ${job.status}`);
          return false;
        }
      } else {
        logger.warn(`⚠️ Job ${jobId} not found for cancellation`);
        return false;
      }
    } catch (error) {
              logger.error(`Failed to cancel job ${jobId}:`, { error: String(error) });
      return false;
    }
  }

  async getJobStats(shopId?: string): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    try {
      const pattern = `mapping_job:*`;
      const keys = await this.redis.keys(pattern);
      const stats = {
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0
      };

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const job: MappingJob = JSON.parse(data);
          if (!shopId || job.shop_id === shopId) {
            stats.total++;
            stats[job.status]++;
          }
        }
      }

      return stats;
    } catch (error) {
              logger.error('Failed to get job stats:', { error: String(error) });
      return {
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0
      };
    }
  }

  async cleanupOldJobs(maxAgeHours: number = 24): Promise<number> {
    try {
      const pattern = `mapping_job:*`;
      const keys = await this.redis.keys(pattern);
      const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const job: MappingJob = JSON.parse(data);
          if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
            if (new Date(job.updated_at) < cutoff) {
              await this.redis.del(key);
              cleanedCount++;
            }
          }
        }
      }

      logger.info(`🧹 Cleaned up ${cleanedCount} old completed/failed jobs`);
      return cleanedCount;
    } catch (error) {
              logger.error('Failed to cleanup old jobs:', { error: String(error) });
      return 0;
    }
  }
}

export const mappingService = new MappingService();
