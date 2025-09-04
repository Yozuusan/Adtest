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

    // S'assurer que la définition de metaobject existe
    await shopifyService.ensureMetaobjectDefinition(shop);

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

    // Récupérer le variant metaobject depuis Shopify
    const variant = await shopifyService.getVariantByHandle(shop, handle);
    
    if (!variant) {
      throw createError(`Variant '${handle}' not found for shop ${shop}`, 404);
    }

    res.json({
      success: true,
      data: {
        handle: variant.handle,
        shop,
        content: variant.content_json ? JSON.parse(variant.content_json) : null,
        product_gid: variant.product_gid,
        created_at: variant.created_at,
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

    // Récupérer tous les variants metaobjects depuis Shopify
    const variants = await shopifyService.getAllVariants(shop);

    res.json({
      success: true,
      data: {
        shop,
        variants: variants.map(variant => ({
          handle: variant.handle,
          product_gid: variant.product_gid,
          content: variant.content_json ? JSON.parse(variant.content_json) : null,
          created_at: variant.created_at
        })),
        count: variants.length,
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

    // Supprimer le variant metaobject depuis Shopify
    const deleted = await shopifyService.deleteVariantByHandle(shop, handle);
    
    if (!deleted) {
      throw createError(`Variant '${handle}' not found for shop ${shop}`, 404);
    }

    console.log(`🗑️ Variant deleted for shop ${shop}: ${handle}`);

    res.json({
      success: true,
      message: 'Variant deleted successfully',
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
