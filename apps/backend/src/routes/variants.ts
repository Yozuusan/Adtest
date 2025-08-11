import { Router } from 'express';
import { shopifyService } from '../services/shopify';
import { createError } from '../middleware/errorHandler';

const router = Router();

/**
 * Créer un nouveau variant
 * POST /variants
 */
router.post('/', async (req, res, next) => {
  try {
    const { product_gid, handle, content_json, shop } = req.body;
    
    // Validation des champs requis
    if (!product_gid || !content_json || !shop) {
      throw createError('Missing required fields: product_gid, content_json, shop', 400);
    }

    if (typeof shop !== 'string' || typeof product_gid !== 'string') {
      throw createError('Invalid field types', 400);
    }

    // Vérifier que la boutique est authentifiée
    const isAuthenticated = await shopifyService.isShopAuthenticated(shop);
    if (!isAuthenticated) {
      throw createError('Shop not authenticated. Please install the app first.', 401);
    }

    // Créer le metaobject avec le contenu du variant
    const metaobject = await shopifyService.createOrUpdateMetaobject(
      shop,
      'adlign_variant',
      [
        { key: 'product_gid', value: product_gid },
        { key: 'handle', value: handle || `variant_${Date.now()}` },
        { key: 'content_json', value: JSON.stringify(content_json) },
        { key: 'created_at', value: new Date().toISOString() }
      ],
      handle
    );

    console.log(`✅ Variant created for shop ${shop}: ${metaobject.handle}`);

    res.status(201).json({
      success: true,
      data: {
        metaobject_id: metaobject.id,
        handle: metaobject.handle,
        shop,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Récupérer un variant par handle
 * GET /variants/:handle?shop=your-store.myshopify.com
 */
router.get('/:handle', async (req, res, next) => {
  try {
    const { handle } = req.params;
    const { shop } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    // Vérifier que la boutique est authentifiée
    const isAuthenticated = await shopifyService.isShopAuthenticated(shop);
    if (!isAuthenticated) {
      throw createError('Shop not authenticated', 401);
    }

    // TODO: Implémenter la récupération du variant depuis Shopify
    // Pour l'instant, on renvoie une structure de base
    res.json({
      success: true,
      data: {
        handle,
        shop,
        content: null, // À implémenter
        retrieved_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Lister tous les variants d'une boutique
 * GET /variants?shop=your-store.myshopify.com
 */
router.get('/', async (req, res, next) => {
  try {
    const { shop } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    // Vérifier que la boutique est authentifiée
    const isAuthenticated = await shopifyService.isShopAuthenticated(shop);
    if (!isAuthenticated) {
      throw createError('Shop not authenticated', 401);
    }

    // TODO: Implémenter la liste des variants depuis Shopify
    res.json({
      success: true,
      data: {
        shop,
        variants: [], // À implémenter
        count: 0,
        retrieved_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Mettre à jour un variant
 * PUT /variants/:handle
 */
router.put('/:handle', async (req, res, next) => {
  try {
    const { handle } = req.params;
    const { content_json, shop } = req.body;
    
    if (!content_json || !shop) {
      throw createError('Missing required fields: content_json, shop', 400);
    }

    if (typeof shop !== 'string') {
      throw createError('Invalid field types', 400);
    }

    // Vérifier que la boutique est authentifiée
    const isAuthenticated = await shopifyService.isShopAuthenticated(shop);
    if (!isAuthenticated) {
      throw createError('Shop not authenticated', 401);
    }

    // Mettre à jour le metaobject
    const metaobject = await shopifyService.createOrUpdateMetaobject(
      shop,
      'adlign_variant',
      [
        { key: 'content_json', value: JSON.stringify(content_json) },
        { key: 'updated_at', value: new Date().toISOString() }
      ],
      handle
    );

    console.log(`✅ Variant updated for shop ${shop}: ${metaobject.handle}`);

    res.json({
      success: true,
      data: {
        metaobject_id: metaobject.id,
        handle: metaobject.handle,
        shop,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Supprimer un variant
 * DELETE /variants/:handle?shop=your-store.myshopify.com
 */
router.delete('/:handle', async (req, res, next) => {
  try {
    const { handle } = req.params;
    const { shop } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    // Vérifier que la boutique est authentifiée
    const isAuthenticated = await shopifyService.isShopAuthenticated(shop);
    if (!isAuthenticated) {
      throw createError('Shop not authenticated', 401);
    }

    // TODO: Implémenter la suppression du metaobject depuis Shopify
    console.log(`🗑️ Variant deletion requested for shop ${shop}: ${handle}`);

    res.json({
      success: true,
      message: 'Variant deletion requested',
      data: {
        handle,
        shop,
        deleted_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
