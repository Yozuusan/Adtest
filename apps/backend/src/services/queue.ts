import { MappingJob } from '../types';
import { supabaseService } from './supabase';

export class QueueService {
  /**
   * Enqueuer un job de mapping
   */
  async enqueueMappingJob(job: Omit<MappingJob, 'id' | 'created_at'>): Promise<string> {
    try {
      // Créer le job dans Supabase
      const supabaseJob = await supabaseService.createMappingJob({
        shop_id: 'unknown', // TODO: Ajouter shop_id au type MappingJob
        product_url: undefined,
        product_gid: undefined,
        status: 'pending',
        priority: 'normal',
        estimated_duration: '5-10 minutes'
      });

      console.log(`✅ Mapping job enqueued in Supabase: ${supabaseJob.id}`);
      return supabaseJob.id;
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
      // Récupérer le job depuis Supabase
      const supabaseJob = await supabaseService.getMappingJobById(jobId);
      
      if (!supabaseJob) {
        return null;
      }

      // Convertir vers le type MappingJob
      return {
        id: supabaseJob.id,
        product_handle: 'unknown', // TODO: Ajouter au type Supabase
        theme_id: 'unknown', // TODO: Ajouter au type Supabase
        status: supabaseJob.status === 'running' ? 'processing' : supabaseJob.status, // Map 'running' vers 'processing'
        created_at: supabaseJob.created_at,
        started_at: supabaseJob.started_at,
        completed_at: supabaseJob.completed_at,
        result: supabaseJob.result,
        error: supabaseJob.error
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
        product_handle: 'unknown', // TODO: Ajouter au type Supabase
        theme_id: 'unknown', // TODO: Ajouter au type Supabase
        status: supabaseJob.status === 'running' ? 'processing' : supabaseJob.status, // Map 'running' vers 'processing'
        created_at: supabaseJob.created_at,
        started_at: supabaseJob.started_at,
        completed_at: supabaseJob.completed_at,
        result: supabaseJob.result,
        error: supabaseJob.error
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
      await supabaseService.close();
      console.log('✅ Queue service closed');
    } catch (error) {
      console.error('❌ Error closing queue service:', error);
    }
  }
}
