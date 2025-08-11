import { Router } from 'express';
import { createError } from '../middleware/errorHandler';
import { analyticsService } from '../services/analytics';
import { AnalyticsEvent } from '@adlign/types';

const router = Router();

/**
 * Enregistrer un événement analytics
 * POST /analytics
 */
router.post('/', async (req, res, next) => {
  try {
    const { event_type, shop, variant_handle, product_gid, user_agent, timestamp } = req.body;
    
    // Validation des champs requis
    if (!event_type || !shop) {
      throw createError('Missing required fields: event_type, shop', 400);
    }

    if (typeof shop !== 'string' || typeof event_type !== 'string') {
      throw createError('Invalid field types', 400);
    }

    // Valider le type d'événement
    const validEventTypes = ['variant_view', 'variant_click', 'variant_conversion', 'page_view'];
    if (!validEventTypes.includes(event_type)) {
      throw createError(`Invalid event_type. Must be one of: ${validEventTypes.join(', ')}`, 400);
    }

    // Créer l'événement analytics
    const analyticsEvent: AnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      event_type: event_type as 'variant_view' | 'variant_click' | 'variant_conversion',
      variant_id: variant_handle || 'unknown',
      product_gid: product_gid || 'unknown',
      campaign_ref: 'unknown', // À remplacer par la vraie valeur
      user_agent: user_agent || req.get('User-Agent') || undefined,
      timestamp: timestamp || new Date().toISOString(),
      metadata: {
        shop,
        variant_handle: variant_handle || null,
        created_at: new Date().toISOString()
      }
    };

    console.log(`📊 Analytics event: ${event_type} for shop ${shop}`);

    // Sauvegarder l'événement en base de données
    await analyticsService.saveEvent(analyticsEvent);

    res.status(201).json({
      success: true,
      data: {
        event_id: analyticsEvent.id,
        event_type: analyticsEvent.event_type,
        shop: analyticsEvent.metadata?.shop,
        timestamp: analyticsEvent.timestamp
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Récupérer les statistiques d'une boutique
 * GET /analytics/stats?shop=your-store.myshopify.com&period=7d
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { shop, period = '7d' } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    // Valider la période
    const validPeriods = ['1d', '7d', '30d', '90d'];
    if (!validPeriods.includes(period as string)) {
      throw createError(`Invalid period. Must be one of: ${validPeriods.join(', ')}`, 400);
    }

    // Récupérer les stats depuis la base de données
    const stats = await analyticsService.getStats(shop as string, period as string);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Récupérer les événements d'une boutique
 * GET /analytics/events?shop=your-store.myshopify.com&limit=50&offset=0
 */
router.get('/events', async (req, res, next) => {
  try {
    const { shop, limit = '50', offset = '0' } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    if (isNaN(limitNum) || isNaN(offsetNum) || limitNum < 1 || limitNum > 100 || offsetNum < 0) {
      throw createError('Invalid pagination parameters', 400);
    }

    // Récupérer les événements depuis la base de données
    const eventsData = await analyticsService.getEvents(shop, limitNum, offsetNum);

    res.json({
      success: true,
      data: eventsData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Récupérer les performances d'un variant
 * GET /analytics/variant/:handle?shop=your-store.myshopify.com&period=7d
 */
router.get('/variant/:handle', async (req, res, next) => {
  try {
    const { handle } = req.params;
    const { shop, period = '7d' } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    // Récupérer les performances du variant depuis la base de données
    const performance = await analyticsService.getVariantPerformance(shop as string, handle, period as string);

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    next(error);
  }
});

export default router;
