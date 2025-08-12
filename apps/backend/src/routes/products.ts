// apps/backend/src/routes/products.ts
// NOUVEAU ENDPOINT pour récupérer les produits Shopify

import { Router } from 'express';
import { shopifyService } from '../services/shopify';
import { getShopToken } from '../services/tokens';
import { createError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /products?shop=store.myshopify.com&search=term&limit=20
 * Récupère la liste des produits Shopify avec recherche
 */
router.get('/', async (req, res, next) => {
  try {
    const { shop, search = '', limit = 20, status = 'active' } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    // Vérifier l'authentification
    const token = await getShopToken(shop);
    if (!token) {
      throw createError('Shop not authenticated', 401);
    }

    console.log(`🛍️ Fetching products for ${shop}, search: "${search}"`);

    // Construire l'URL Shopify API
    const searchParams = new URLSearchParams();
    if (search) searchParams.set('title', search as string);
    searchParams.set('limit', Math.min(Number(limit), 50).toString()); // Max 50 par Shopify
    searchParams.set('status', status as string);
    searchParams.set('fields', 'id,title,handle,status,product_type,vendor,created_at,updated_at,images');

    const apiUrl = `https://${shop}/admin/api/2024-01/products.json?${searchParams.toString()}`;

    const response = await fetch(apiUrl, {
      headers: {
        'X-Shopify-Access-Token': token.access_token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    
    // Formatter les produits pour le frontend
    const formattedProducts = data.products.map((product: any) => ({
      id: product.id,
      gid: `gid://shopify/Product/${product.id}`,
      title: product.title,
      handle: product.handle,
      status: product.status,
      product_type: product.product_type,
      vendor: product.vendor,
      image_url: product.images?.[0]?.src || null,
      created_at: product.created_at,
      updated_at: product.updated_at,
      // URL de la page produit
      product_url: `https://${shop}/products/${product.handle}`
    }));

    res.json({
      success: true,
      data: {
        products: formattedProducts,
        total: formattedProducts.length,
        shop,
        search: search || null,
        has_more: formattedProducts.length === Number(limit) // Indicateur s'il y a plus de résultats
      }
    });

  } catch (error) {
    console.error('❌ Error fetching products:', error);
    next(error);
  }
});

/**
 * GET /products/:product_id?shop=store.myshopify.com
 * Récupère les détails d'un produit spécifique
 */
router.get('/:product_id', async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const { shop } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    const token = await getShopToken(shop);
    if (!token) {
      throw createError('Shop not authenticated', 401);
    }

    const apiUrl = `https://${shop}/admin/api/2024-01/products/${product_id}.json`;

    const response = await fetch(apiUrl, {
      headers: {
        'X-Shopify-Access-Token': token.access_token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw createError('Product not found', 404);
      }
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const product = data.product;

    const formattedProduct = {
      id: product.id,
      gid: `gid://shopify/Product/${product.id}`,
      title: product.title,
      handle: product.handle,
      description: product.body_html,
      status: product.status,
      product_type: product.product_type,
      vendor: product.vendor,
      tags: product.tags ? product.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
      images: product.images.map((img: any) => ({
        id: img.id,
        src: img.src,
        alt: img.alt,
        width: img.width,
        height: img.height
      })),
      variants: product.variants.map((variant: any) => ({
        id: variant.id,
        title: variant.title,
        price: variant.price,
        sku: variant.sku,
        inventory_quantity: variant.inventory_quantity
      })),
      created_at: product.created_at,
      updated_at: product.updated_at,
      product_url: `https://${shop}/products/${product.handle}`
    };

    res.json({
      success: true,
      data: formattedProduct
    });

  } catch (error) {
    console.error('❌ Error fetching product details:', error);
    next(error);
  }
});

export default router;
