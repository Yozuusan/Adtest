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

/**
 * Liste tous les utilisateurs et leurs boutiques
 * GET /debug/users
 */
router.get('/users', async (req, res) => {
  try {
    console.log('🔍 Listing all users and their shops...');

    // 1. Récupérer tous les utilisateurs
    const { data: users, error: usersError } = await supabaseService.getClient()
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return res.status(500).json({
        error: 'Failed to fetch users',
        message: usersError.message
      });
    }

    // 2. Récupérer toutes les associations user-shop
    const { data: userShops, error: userShopsError } = await supabaseService.getClient()
      .from('user_shops')
      .select(`
        id,
        user_id,
        shop_id,
        role,
        created_at,
        updated_at,
        shop:shops (
          id,
          domain,
          is_active,
          created_at,
          updated_at
        )
      `)
      .order('created_at', { ascending: false });

    if (userShopsError) {
      console.error('❌ Error fetching user shops:', userShopsError);
      return res.status(500).json({
        error: 'Failed to fetch user shops',
        message: userShopsError.message
      });
    }

    // 3. Organiser les données par utilisateur
    const usersWithShops = users.map((user: any) => {
      const userShopAssociations = userShops.filter((us: any) => us.user_id === user.id);
      return {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        shops: userShopAssociations.map((us: any) => ({
          association_id: us.id,
          shop_id: us.shop_id,
          role: us.role,
          domain: us.shop?.domain,
          is_active: us.shop?.is_active,
          shop_created_at: us.shop?.created_at,
          association_created_at: us.created_at
        }))
      };
    });

    const diagnostic = {
      timestamp: new Date().toISOString(),
      total_users: users.length,
      total_user_shop_associations: userShops.length,
      users: usersWithShops
    };

    console.log(`📊 Users diagnostic: ${users.length} users, ${userShops.length} associations`);

    res.json(diagnostic);
  } catch (error) {
    console.error('❌ Users diagnostic error:', error);
    res.status(500).json({
      error: 'Users diagnostic failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Diagnostic d'authentification pour un utilisateur
 * GET /debug/auth?user_id=user_uuid
 */
router.get('/auth', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ error: 'user_id_required' });
    }

    console.log(`🔍 Diagnostic d'authentification pour user: ${user_id}`);

    // 1. Vérifier l'utilisateur dans Supabase
    const { data: user, error: userError } = await supabaseService.getClient()
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    // 2. Vérifier les associations user-shop
    const { data: userShops, error: userShopsError } = await supabaseService.getClient()
      .from('user_shops')
      .select(`
        id,
        user_id,
        shop_id,
        role,
        created_at,
        updated_at,
        shop:shops (
          id,
          domain,
          is_active,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user_id);

    // 3. Tester les tokens pour chaque shop
    const shopsWithTokens = [];
    if (userShops && !userShopsError) {
      for (const userShop of userShops as any[]) {
        if (userShop.shop?.domain) {
          const token = await getShopToken(userShop.shop.domain);
          shopsWithTokens.push({
            shop_id: userShop.shop_id,
            domain: userShop.shop.domain,
            role: userShop.role,
            is_active: userShop.shop.is_active,
            has_token: !!token?.access_token,
            token_scope: token?.scope
          });
        }
      }
    }

    const diagnostic = {
      user_id,
      timestamp: new Date().toISOString(),
      
      // User info
      user: {
        found: !!user && !userError,
        error: userError?.message,
        email: user?.email,
        created_at: user?.created_at
      },
      
      // User shops
      user_shops: {
        count: userShops?.length || 0,
        error: userShopsError?.message,
        shops: shopsWithTokens
      },
      
      // Résumé
      summary: {
        user_exists: !!user && !userError,
        has_shops: (userShops?.length || 0) > 0,
        active_shops: shopsWithTokens.filter(s => s.is_active).length,
        shops_with_tokens: shopsWithTokens.filter(s => s.has_token).length
      }
    };

    console.log(`📊 Auth diagnostic for user ${user_id}:`, {
      user_exists: !!user && !userError,
      shops_count: userShops?.length || 0,
      active_shops: shopsWithTokens.filter(s => s.is_active).length
    });

    res.json(diagnostic);
  } catch (error) {
    console.error('❌ Auth diagnostic error:', error);
    res.status(500).json({
      error: 'Auth diagnostic failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
