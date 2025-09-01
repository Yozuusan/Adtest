import { Router } from 'express';
import { normalizeShopDomain } from '../utils/shop';
import { Redis } from '@upstash/redis';
import { getShopToken } from '../services/tokens';
import { supabaseService } from '../services/supabase';

const router = Router();
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const KEY = (s: string) => `shop-token:${s}`;

router.get('/redis', async (req, res) => {
  const shop = normalizeShopDomain(String(req.query.shop || ''));
  if (!shop) return res.status(400).json({ error: 'invalid_shop_param' });

  const key = KEY(shop);
  const raw = await redis.get(key);
  const ttl = await redis.ttl(key);

  res.json({
    shop, key, present: !!raw, ttl,
    head: raw ? String(raw).slice(0, 16) : null, // jamais la valeur complète
  });
});

/**
 * Diagnostic complet pour une boutique
 * GET /debug/shop?shop=store.myshopify.com
 */
router.get('/shop', async (req, res) => {
  try {
    const shop = normalizeShopDomain(String(req.query.shop || ''));
    if (!shop) {
      return res.status(400).json({ error: 'invalid_shop_param' });
    }

    console.log(`🔍 Diagnostic complet pour ${shop}`);

    // 1. Vérifier Redis
    const key = KEY(shop);
    const redisToken = await redis.get(key);
    const redisTtl = await redis.ttl(key);

    // 2. Vérifier Supabase
    const supabaseShop = await supabaseService.getShopByDomain(shop);

    // 3. Vérifier le service tokens
    const serviceToken = await getShopToken(shop);

    // 4. Tester l'API Shopify si on a un token
    let shopifyTest = null;
    if (serviceToken?.access_token) {
      try {
        const response = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
          headers: {
            'X-Shopify-Access-Token': serviceToken.access_token,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const shopData = await response.json() as { shop: { name: string; email: string; domain: string; plan_name: string } };
          shopifyTest = {
            success: true,
            shop_name: shopData.shop.name,
            email: shopData.shop.email,
            domain: shopData.shop.domain,
            plan: shopData.shop.plan_name
          };
        } else {
          shopifyTest = {
            success: false,
            status: response.status,
            statusText: response.statusText
          };
        }
      } catch (error) {
        shopifyTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    const diagnostic = {
      shop,
      timestamp: new Date().toISOString(),
      
      // Redis
      redis: {
        key,
        present: !!redisToken,
        ttl: redisTtl,
        has_token: redisToken && typeof redisToken === 'object' && 'access_token' in redisToken
      },
      
      // Supabase
      supabase: {
        shop_found: !!supabaseShop,
        shop_id: supabaseShop?.id,
        domain: supabaseShop?.domain,
        is_active: supabaseShop?.is_active,
        has_token: !!supabaseShop?.access_token,
        created_at: supabaseShop?.created_at,
        updated_at: supabaseShop?.updated_at
      },
      
      // Service tokens
      service_token: {
        found: !!serviceToken,
        has_access_token: !!serviceToken?.access_token,
        scope: serviceToken?.scope,
        installed_at: serviceToken?.installedAt
      },
      
      // Test Shopify API
      shopify_test: shopifyTest,
      
      // Résumé
      summary: {
        has_valid_token: !!serviceToken?.access_token,
        can_access_shopify: shopifyTest?.success === true,
        shop_connected: !!supabaseShop?.is_active
      }
    };

    console.log(`📊 Diagnostic ${shop}:`, {
      redis_token: !!redisToken,
      supabase_shop: !!supabaseShop,
      service_token: !!serviceToken,
      shopify_accessible: shopifyTest?.success
    });

    res.json(diagnostic);
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    res.status(500).json({
      error: 'Diagnostic failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
