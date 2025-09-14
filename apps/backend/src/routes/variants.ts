import { Router } from 'express';
import { shopifyService } from '../services/shopify';
import { supabaseService } from '../services/supabase';
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

    // Générer le handle du variant s'il n'est pas fourni
    const variantHandle = handle || `variant_${Date.now()}`;
    
    // 1. Sauvegarder le variant dans les metafields du produit (MVP - Shopify storage)
    const productId = product_gid;
    const saved = await shopifyService.setProductMetafield(
      shop, 
      productId, 
      'adlign', 
      variantHandle, 
      JSON.stringify(content_json)
    );

    if (!saved) {
      throw createError('Failed to save variant to product metafields', 500);
    }

    // 2. ALSO save to Supabase for proper database storage and Variants tab
    try {
      const supabaseVariant = await supabaseService.saveAdlignVariant({
        shop_domain: shop, // Using correct column name
        product_gid: product_gid,
        variant_handle: variantHandle,
        variant_data: content_json, // Using correct column name
        is_active: true
      });
      console.log(`✅ Variant saved to Supabase: ${variantHandle}`, supabaseVariant.id);
    } catch (supabaseError) {
      console.error('⚠️ Failed to save to Supabase, but metafields saved:', supabaseError);
      // Don't fail the request if Supabase fails - metafields is the primary storage for MVP
    }

    console.log(`✅ Variant saved in metafields for shop ${shop}: ${variantHandle}`);

    res.status(201).json({
      success: true,
      data: {
        id: variantHandle, // Frontend expects 'id' field
        handle: variantHandle,
        variant_handle: variantHandle, // Also provide this for consistency
        shop,
        shop_domain: shop,
        product_id: productId,
        product_gid: product_gid,
        storage_type: 'dual', // Both metafields and Supabase
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

    // Récupérer le variant depuis les metafields du produit (approche MVP)
    const variant = await shopifyService.getVariantByHandleFromMetafields(shop, handle);
    
    if (!variant) {
      throw createError(`Variant '${handle}' not found for shop ${shop}`, 404);
    }

    res.json({
      success: true,
      data: {
        handle: variant.handle,
        shop,
        content: variant.content_json,
        product_gid: variant.product_gid,
        storage_type: variant.storage_type,
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

    // Try to get variants from Supabase first (new storage)
    let variants = [];
    try {
      // Get all variants for this shop from Supabase using a general query
      const { data: supabaseVariants, error } = await supabaseService.getClient()
        .from('adlign_variants')
        .select('*')
        .eq('shop_domain', shop)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!error && supabaseVariants) {
        console.log(`✅ Found ${supabaseVariants.length} variants in Supabase for ${shop}`);
        variants = supabaseVariants.map(variant => ({
          id: variant.id,
          variant_handle: variant.variant_handle,
          handle: variant.variant_handle, // Alias for compatibility
          product_gid: variant.product_gid,
          content: variant.variant_data,
          product_title: 'Unknown Product', // We'd need to join with products table or get from Shopify
          status: variant.is_active ? 'active' : 'inactive',
          created_at: variant.created_at,
          updated_at: variant.updated_at,
          storage_source: 'supabase'
        }));
      } else {
        console.log('No variants found in Supabase, falling back to Shopify metaobjects');
        // Fallback to Shopify metaobjects if Supabase is empty or fails
        const shopifyVariants = await shopifyService.getAllVariants(shop);
        variants = shopifyVariants.map(variant => ({
          handle: variant.handle,
          variant_handle: variant.handle,
          product_gid: variant.product_gid,
          content: variant.content_json ? JSON.parse(variant.content_json) : null,
          created_at: variant.created_at,
          storage_source: 'shopify_metaobjects'
        }));
      }
    } catch (supabaseError) {
      console.error('⚠️ Supabase query failed, using Shopify fallback:', supabaseError);
      // Fallback to Shopify metaobjects
      const shopifyVariants = await shopifyService.getAllVariants(shop);
      variants = shopifyVariants.map(variant => ({
        handle: variant.handle,
        variant_handle: variant.handle,
        product_gid: variant.product_gid,
        content: variant.content_json ? JSON.parse(variant.content_json) : null,
        created_at: variant.created_at,
        storage_source: 'shopify_metaobjects'
      }));
    }

    res.json({
      success: true,
      data: variants, // Send variants directly as expected by frontend
      shop,
      count: variants.length,
      retrieved_at: new Date().toISOString()
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
    const metaobject = await shopifyService.createOrUpdateMetaobject(shop, {
      handle: handle,
      fields: {
        content_json: JSON.stringify(content_json),
        updated_at: new Date().toISOString()
      }
    });

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
