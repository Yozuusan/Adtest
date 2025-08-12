import { Router } from 'express';
import { createError } from '../middleware/errorHandler';
import { QueueService } from '../services/queue';

const router = Router();
const queueService = new QueueService();

/**
 * Enqueuer un job de mapping
 * POST /mapping/build
 */
router.post('/build', async (req, res, next) => {
  try {
    const { shop_id, product_url, product_gid } = req.body;
    
    // Validation des champs requis
    if (!shop_id) {
      throw createError('Missing required field: shop_id', 400);
    }

    if (!product_url && !product_gid) {
      throw createError('Either product_url or product_gid is required', 400);
    }

    if (typeof shop_id !== 'string') {
      throw createError('Invalid field types', 400);
    }

    // Valider l'URL si fournie
    if (product_url && typeof product_url === 'string') {
      try {
        new URL(product_url);
      } catch {
        throw createError('Invalid product_url format', 400);
      }
    }

    console.log(`🔍 Mapping job enqueued for shop ${shop_id}`);

    // Enqueuer le job dans la queue
    const jobId = await queueService.enqueueMappingJob({
      product_handle: product_url || product_gid || 'unknown',
      theme_id: 'unknown', // Sera déterminé lors du mapping
      status: 'pending'
    });

    res.status(202).json({
      success: true,
      message: 'Mapping job enqueued successfully',
      data: {
        job_id: jobId,
        shop_id: shop_id,
        status: 'pending',
        estimated_duration: '5-10 minutes',
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Vérifier le statut d'un job de mapping
 * GET /mapping/status/:job_id
 */
router.get('/status/:job_id', async (req, res, next) => {
  try {
    const { job_id } = req.params;
    const { shop_id } = req.query;
    
    if (!shop_id || typeof shop_id !== 'string') {
      throw createError('Shop ID parameter is required', 400);
    }

    // Récupérer le statut depuis la queue
    const jobStatus = await queueService.getJobStatus(job_id);
    
    if (!jobStatus) {
      throw createError('Job not found', 404);
    }

    // TODO: Ajouter shop_id au type MappingJob pour cette vérification
    // if (jobStatus.shop_id !== shop_id) {
    //   throw createError('Job does not belong to this shop', 403);
    // }

    res.json({
      success: true,
      data: jobStatus
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Lister les jobs de mapping d'une boutique
 * GET /mapping/jobs?shop_id=your-shop-id&status=all&limit=50
 */
router.get('/jobs', async (req, res, next) => {
  try {
    const { shop_id, status = 'all', limit = '50', offset = '0' } = req.query;
    
    if (!shop_id || typeof shop_id !== 'string') {
      throw createError('Shop ID parameter is required', 400);
    }

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    if (isNaN(limitNum) || isNaN(offsetNum) || limitNum < 1 || limitNum > 100 || offsetNum < 0) {
      throw createError('Invalid pagination parameters', 400);
    }

    // Valider le filtre de statut
    const validStatuses = ['all', 'pending', 'processing', 'completed', 'failed'];
    if (!validStatuses.includes(status as string)) {
      throw createError(`Invalid status filter. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    // Récupérer les jobs depuis BullMQ
    const jobsData = await queueService.listShopJobs(shop_id, status as string, limitNum, offsetNum);

    res.json({
      success: true,
      data: {
        shop_id,
        jobs: jobsData.jobs,
        pagination: jobsData.pagination,
        filters: {
          status: status as string
        },
        retrieved_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Annuler un job de mapping
 * DELETE /mapping/cancel/:job_id
 */
router.delete('/cancel/:job_id', async (req, res, next) => {
  try {
    const { job_id } = req.params;
    const { shop_id } = req.query;
    
    if (!shop_id || typeof shop_id !== 'string') {
      throw createError('Shop ID parameter is required', 400);
    }

    // Annuler le job dans BullMQ
    const cancelled = await queueService.cancelJob(job_id);
    
    if (!cancelled) {
      throw createError('Job not found or already completed', 404);
    }
    
    console.log(`❌ Mapping job cancelled: ${job_id} for shop ${shop_id}`);

    res.json({
      success: true,
      message: 'Job cancellation requested',
      data: {
        job_id,
        shop_id,
        cancelled_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
