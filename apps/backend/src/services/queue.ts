import { MappingJob } from '../types';
import { supabaseService } from './supabase';
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';

export class QueueService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });
    
    console.log('✅ Upstash Redis initialized for queue service');
  }

  /**
   * Enqueuer un job de mapping
   */
  async enqueueMappingJob(job: Omit<MappingJob, 'id' | 'created_at'>): Promise<string> {
    try {
      const jobId = uuidv4();
      const fullJob: MappingJob = {
        id: jobId,
        ...job,
        created_at: new Date().toISOString(),
        status: job.status || 'pending',
        priority: job.priority || 'normal',
        progress: 0
      };

      // Enregistrer dans Supabase pour persistance
      const supabaseJob = await supabaseService.createMappingJob({
        shop_id: job.shop_id,
        product_url: job.product_url,
        product_gid: job.product_gid,
        status: 'pending',
        priority: job.priority || 'normal',
        estimated_duration: '5-10 minutes'
      });

      // Utiliser l'ID de Supabase
      fullJob.id = supabaseJob.id;

      // Enqueuer dans Redis pour le worker
      const queueKey = `mapping_queue:${job.shop_id}`;
      const jobKey = `mapping_job:${fullJob.id}`;
      
      // Stocker les détails du job
      await this.redis.set(jobKey, JSON.stringify(fullJob), { ex: 86400 }); // 24h TTL
      
      // Ajouter à la queue de la boutique
      await this.redis.lpush(queueKey, JSON.stringify(fullJob));

      console.log(`✅ Mapping job enqueued: ${fullJob.id} for shop ${job.shop_id}`);
      return fullJob.id;
    } catch (error) {
      console.error('❌ Error enqueueing mapping job:', error);
      throw new Error(`Failed to enqueue mapping job: ${error}`);
    }
  }

  /**
   * Récupérer le statut d'un job
   */
  async getJobStatus(jobId: string): Promise<MappingJob | null> {
    try {
      // D'abord essayer Redis pour les données les plus récentes
      const jobKey = `mapping_job:${jobId}`;
      const redisData = await this.redis.get(jobKey);
      
      if (redisData) {
        return JSON.parse(redisData as string);
      }

      // Sinon, récupérer depuis Supabase
      const supabaseJob = await supabaseService.getMappingJobById(jobId);
      
      if (!supabaseJob) {
        return null;
      }

      // Convertir vers le type MappingJob
      return {
        id: supabaseJob.id,
        shop_id: supabaseJob.shop_id,
        product_handle: supabaseJob.product_url?.split('/').pop() || undefined,
        product_url: supabaseJob.product_url,
        product_gid: supabaseJob.product_gid,
        status: supabaseJob.status === 'running' ? 'processing' : supabaseJob.status,
        created_at: supabaseJob.created_at,
        started_at: supabaseJob.started_at,
        completed_at: supabaseJob.completed_at,
        result: supabaseJob.result,
        error: supabaseJob.error,
        priority: supabaseJob.priority as 'low' | 'normal' | 'high'
      };
    } catch (error) {
      console.error('❌ Error getting job status:', error);
      throw new Error(`Failed to get job status: ${error}`);
    }
  }

  /**
   * Lister les jobs d'une boutique
   */
  async listShopJobs(shopId: string, status: string = 'all', limit: number = 50, offset: number = 0): Promise<{
    jobs: MappingJob[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      has_more: boolean;
    };
  }> {
    try {
      const { jobs: supabaseJobs, total } = await supabaseService.getShopMappingJobs(shopId, status, limit, offset);

      // Convertir vers le type MappingJob
      const jobs: MappingJob[] = supabaseJobs.map(supabaseJob => ({
        id: supabaseJob.id,
        shop_id: supabaseJob.shop_id,
        product_handle: supabaseJob.product_url?.split('/').pop() || undefined,
        product_url: supabaseJob.product_url,
        product_gid: supabaseJob.product_gid,
        theme_id: undefined, // Optionnel dans le type MappingJob
        status: supabaseJob.status === 'running' ? 'processing' : supabaseJob.status,
        created_at: supabaseJob.created_at,
        started_at: supabaseJob.started_at,
        completed_at: supabaseJob.completed_at,
        result: supabaseJob.result,
        error: supabaseJob.error,
        priority: supabaseJob.priority as 'low' | 'normal' | 'high'
      }));

      return {
        jobs,
        pagination: {
          limit,
          offset,
          total,
          has_more: total > offset + limit
        }
      };
    } catch (error) {
      console.error('❌ Error listing shop jobs:', error);
      throw new Error(`Failed to list shop jobs: ${error}`);
    }
  }

  /**
   * Annuler un job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      // Mettre à jour le statut du job dans Supabase
      await supabaseService.updateMappingJobStatus(jobId, 'failed', undefined, 'Job cancelled by user');
      
      console.log(`✅ Job cancelled in Supabase: ${jobId}`);
      return true;
    } catch (error) {
      console.error('❌ Error cancelling job:', error);
      throw new Error(`Failed to cancel job: ${error}`);
    }
  }

  /**
   * Mettre à jour le statut d'un job
   */
  async updateJobStatus(jobId: string, status: MappingJob['status'], result?: any, error?: string): Promise<void> {
    try {
      await supabaseService.updateMappingJobStatus(jobId, status, result, error);
      console.log(`✅ Job status updated in Supabase: ${jobId} -> ${status}`);
    } catch (error) {
      console.error('❌ Error updating job status:', error);
      throw new Error(`Failed to update job status: ${error}`);
    }
  }

  /**
   * Nettoyer les jobs terminés
   */
  async cleanupCompletedJobs(): Promise<void> {
    try {
      // Pour l'instant, on ne supprime pas les jobs terminés
      // On pourrait ajouter une logique de nettoyage automatique plus tard
      console.log('ℹ️ Cleanup completed jobs: not implemented yet');
    } catch (error) {
      console.error('❌ Error cleaning up completed jobs:', error);
      // Ne pas faire échouer l'opération
    }
  }

  /**
   * Fermer le service
   */
  async close(): Promise<void> {
    try {
      // Upstash Redis doesn't need explicit closing
      await supabaseService.close();
      console.log('✅ Queue service closed');
    } catch (error) {
      console.error('❌ Error closing queue service:', error);
    }
  }
}
