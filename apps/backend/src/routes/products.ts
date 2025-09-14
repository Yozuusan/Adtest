// apps/backend/src/routes/products.ts
// NOUVEAU ENDPOINT pour récupérer les produits Shopify

import { Router } from 'express';
import { shopifyService } from '../services/shopify';
import { getShopToken } from '../services/tokens';
import { createError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /products?shop=store.myshopify.com&search=term&limit=20
 * Récupère la liste des produits Shopify avec recherche (GraphQL)
 */
router.get('/', async (req, res, next) => {
  try {
    const { shop, search = '', limit = 20 } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    console.log(`🛍️ Fetching products for ${shop}, search: "${search}" (GraphQL)`);

    // Utiliser le service Shopify modernisé avec GraphQL
    const products = await shopifyService.getProducts(shop as string, Number(limit));

    res.json({
      success: true,
      data: {
        products,
        total: products.length,
        shop,
        search: search || null,
        has_more: products.length === Number(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching products:', error);
    next(error);
  }
});

/**
 * GET /products/:product_id?shop=store.myshopify.com
 * Récupère les détails d'un produit spécifique (GraphQL)
 */
router.get('/:product_id', async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const { shop } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    console.log(`📦 Fetching product ${product_id} for ${shop} (GraphQL)`);

    // Utiliser le service Shopify modernisé avec GraphQL
    const product = await shopifyService.getProduct(shop as string, product_id);

    if (!product) {
      throw createError('Product not found', 404);
    }

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('❌ Error fetching product details:', error);
    next(error);
  }
});

export default router;
