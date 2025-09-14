import { Router } from 'express';
import { normalizeShopDomain } from '../utils/shop';
import { Redis } from '@upstash/redis';
import { getShopToken } from '../services/tokens';
import { supabaseService } from '../services/supabase';
import { shopifyService } from '../services/shopify';

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
 * Test simple de l'état de l'authentification
 * GET /debug/test
 */
router.get('/test', async (req, res) => {
  try {
    console.log('🔍 Simple authentication test...');

    // 1. Test de connexion Supabase
    const { data: testData, error: testError } = await supabaseService.getClient()
      .from('user_shops')
      .select('count')
      .limit(1);

    if (testError) {
      return res.json({
        status: 'error',
        message: 'Supabase connection failed',
        error: testError.message
      });
    }

    // 2. Compter les utilisateurs uniques
    const { data: uniqueUsers, error: usersError } = await supabaseService.getClient()
      .from('user_shops')
      .select('user_id')
      .limit(1000);

    const userCount = uniqueUsers ? new Set(uniqueUsers.map(u => u.user_id)).size : 0;

    // 3. Compter les boutiques
    const { count: shopCount } = await supabaseService.getClient()
      .from('shops')
      .select('*', { count: 'exact', head: true });

    // 4. Compter les associations user-shop
    const { count: associationCount } = await supabaseService.getClient()
      .from('user_shops')
      .select('*', { count: 'exact', head: true });

    // 5. Lister les utilisateurs récents
    const { data: recentUserShops } = await supabaseService.getClient()
      .from('user_shops')
      .select('user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const recentUsers = recentUserShops ? recentUserShops.map(us => ({
      id: us.user_id,
      created_at: us.created_at
    })) : [];

    // 6. Lister les boutiques récentes
    const { data: recentShops } = await supabaseService.getClient()
      .from('shops')
      .select('id, domain, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const diagnostic = {
      status: 'success',
      timestamp: new Date().toISOString(),
      counts: {
        users: userCount,
        shops: shopCount,
        user_shop_associations: associationCount
      },
      recent_users: recentUsers || [],
      recent_shops: recentShops || [],
      message: 'Authentication test completed successfully'
    };

    console.log(`📊 Test diagnostic: ${userCount} users, ${shopCount} shops, ${associationCount} associations`);

    res.json(diagnostic);
  } catch (error) {
    console.error('❌ Test diagnostic error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Test diagnostic failed',
      error: error instanceof Error ? error.message : 'Unknown error'
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

    // 1. Récupérer tous les utilisateurs uniques depuis user_shops
    const { data: userShops, error: userShopsError } = await supabaseService.getClient()
      .from('user_shops')
      .select('user_id, created_at')
      .order('created_at', { ascending: false });

    if (userShopsError) {
      console.error('❌ Error fetching user shops:', userShopsError);
      return res.status(500).json({
        error: 'Failed to fetch user shops',
        message: userShopsError.message
      });
    }

    // Extraire les utilisateurs uniques
    const uniqueUsers = userShops ? Array.from(new Set(userShops.map(us => us.user_id))).map(userId => ({
      id: userId,
      created_at: userShops.find(us => us.user_id === userId)?.created_at
    })) : [];



    // 2. Récupérer toutes les associations user-shop avec les détails des boutiques
    const { data: allUserShops, error: allUserShopsError } = await supabaseService.getClient()
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

    if (allUserShopsError) {
      console.error('❌ Error fetching all user shops:', allUserShopsError);
      return res.status(500).json({
        error: 'Failed to fetch all user shops',
        message: allUserShopsError.message
      });
    }

    // 3. Organiser les données par utilisateur
    const usersWithShops = uniqueUsers.map((user: any) => {
      const userShopAssociations = allUserShops.filter((us: any) => us.user_id === user.id);
      return {
        user: {
          id: user.id,
          created_at: user.created_at
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
      total_users: uniqueUsers.length,
      total_user_shop_associations: allUserShops.length,
      users: usersWithShops
    };

    console.log(`📊 Users diagnostic: ${uniqueUsers.length} users, ${allUserShops.length} associations`);

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
 * Forcer la suppression du token en cache Redis
 * DELETE /debug/clear-token?shop=store.myshopify.com
 */
router.delete('/clear-token', async (req, res) => {
  try {
    const shop = normalizeShopDomain(String(req.query.shop || ''));
    if (!shop) {
      return res.status(400).json({ error: 'invalid_shop_param' });
    }

    console.log(`🗑️ Clearing cached token for ${shop}`);

    const key = KEY(shop);
    const existed = await redis.get(key);
    const deleteResult = await redis.del(key);

    console.log(`✅ Token cleared for ${shop}:`, { existed: !!existed, deleted: deleteResult });

    res.json({
      shop,
      key,
      token_existed: !!existed,
      deleted: deleteResult > 0,
      timestamp: new Date().toISOString(),
      message: `Token cache cleared for ${shop}`
    });
  } catch (error) {
    console.error('❌ Error clearing token cache:', error);
    res.status(500).json({
      error: 'Failed to clear token cache',
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

    // 1. Vérifier si l'utilisateur a des associations de boutiques
    const { data: userShops, error: userShopsError } = await supabaseService.getClient()
      .from('user_shops')
      .select('user_id')
      .eq('user_id', user_id)
      .limit(1);

    const userExists = userShops && userShops.length > 0;

    // 2. Vérifier toutes les associations user-shop
    const { data: allUserShops, error: allUserShopsError } = await supabaseService.getClient()
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
    if (allUserShops && !allUserShopsError) {
      for (const userShop of allUserShops as any[]) {
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
        found: userExists,
        error: userShopsError?.message,
        user_id: user_id
      },
      
      // User shops
      user_shops: {
        count: allUserShops?.length || 0,
        error: allUserShopsError?.message,
        shops: shopsWithTokens
      },
      
      // Résumé
      summary: {
        user_exists: userExists,
        has_shops: (allUserShops?.length || 0) > 0,
        active_shops: shopsWithTokens.filter(s => s.is_active).length,
        shops_with_tokens: shopsWithTokens.filter(s => s.has_token).length
      }
    };

    console.log(`📊 Auth diagnostic for user ${user_id}:`, {
      user_exists: userExists,
      shops_count: allUserShops?.length || 0,
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

/**
 * DANGER: Supprimer complètement un shop de la base pour forcer réinstallation OAuth
 * DELETE /debug/reset-shop?shop=store.myshopify.com
 */
router.delete('/reset-shop', async (req, res) => {
  try {
    const shop = normalizeShopDomain(String(req.query.shop || ''));
    if (!shop) {
      return res.status(400).json({ error: 'invalid_shop_param' });
    }

    console.log(`🗑️ DANGER: Resetting shop completely for OAuth reinstall: ${shop}`);

    // 1. Clear Redis cache
    const redisKey = KEY(shop);
    const redisDeleted = await redis.del(redisKey);

    // 2. Delete from Supabase - Get shop info first
    const shopData = await supabaseService.getShopByDomain(shop);
    if (!shopData) {
      return res.json({
        shop,
        message: 'Shop not found in database',
        redis_cleared: redisDeleted > 0
      });
    }

    // 3. Delete user_shop associations
    const { error: userShopError } = await supabaseService.getClient()
      .from('user_shops')
      .delete()
      .eq('shop_id', shopData.id);

    // 4. Delete shop record
    const { error: shopError } = await supabaseService.getClient()
      .from('shops')
      .delete()
      .eq('id', shopData.id);

    if (userShopError || shopError) {
      console.error('❌ Database deletion errors:', { userShopError, shopError });
      return res.status(500).json({
        error: 'Database deletion failed',
        userShopError: userShopError?.message,
        shopError: shopError?.message
      });
    }

    console.log(`✅ Shop ${shop} completely reset - ready for fresh OAuth installation`);

    res.json({
      shop,
      message: `Shop ${shop} completely removed - OAuth can now reinstall with new scopes`,
      actions: {
        redis_cleared: redisDeleted > 0,
        user_shop_associations_deleted: true,
        shop_record_deleted: true
      },
      next_step: `Visit /oauth/install?shop=${shop}&user_id=USER_ID for fresh installation`
    });

  } catch (error) {
    console.error('❌ Reset shop error:', error);
    res.status(500).json({
      error: 'Reset shop failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Vérifier si le snippet Adlign est déployé sur un shop
 * GET /debug/check-snippet?shop=store.myshopify.com
 */
router.get('/check-snippet', async (req, res) => {
  try {
    const shop = normalizeShopDomain(String(req.query.shop || ''));
    if (!shop) {
      return res.status(400).json({ error: 'invalid_shop_param' });
    }

    console.log(`🔍 Checking Adlign snippet deployment for ${shop}`);

    const status = await shopifyService.isAdlignSnippetDeployed(shop);

    res.json({
      shop,
      timestamp: new Date().toISOString(),
      snippet_status: status,
      message: status.deployed 
        ? 'Adlign snippet is deployed and ready'
        : `Adlign snippet missing: ${status.missingFiles?.join(', ')}`
    });
  } catch (error) {
    console.error('❌ Error checking snippet:', error);
    res.status(500).json({
      error: 'Failed to check snippet deployment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Déployer automatiquement le snippet Adlign sur un shop
 * POST /debug/deploy-snippet?shop=store.myshopify.com
 */
router.post('/deploy-snippet', async (req, res) => {
  try {
    const shop = normalizeShopDomain(String(req.query.shop || ''));
    if (!shop) {
      return res.status(400).json({ error: 'invalid_shop_param' });
    }

    console.log(`🚀 Deploying Adlign snippet to ${shop}`);

    const deployment = await shopifyService.deployAdlignSnippet(shop);

    if (deployment.success) {
      res.json({
        shop,
        timestamp: new Date().toISOString(),
        deployment,
        message: `Adlign snippet deployed successfully! Files: ${deployment.deployedFiles?.join(', ') || 'already installed'}`
      });
    } else {
      res.status(500).json({
        shop,
        timestamp: new Date().toISOString(),
        deployment,
        error: 'Deployment failed',
        message: deployment.error
      });
    }
  } catch (error) {
    console.error('❌ Error deploying snippet:', error);
    res.status(500).json({
      error: 'Failed to deploy snippet',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Auto-déployer le snippet si nécessaire (appelé lors de création de variante)
 * POST /debug/auto-deploy-snippet?shop=store.myshopify.com
 */
router.post('/auto-deploy-snippet', async (req, res) => {
  try {
    const shop = normalizeShopDomain(String(req.query.shop || ''));
    if (!shop) {
      return res.status(400).json({ error: 'invalid_shop_param' });
    }

    console.log(`🔧 Auto-deploying Adlign snippet if needed for ${shop}`);

    const success = await shopifyService.autoDeploySnippetIfNeeded(shop);

    res.json({
      shop,
      timestamp: new Date().toISOString(),
      auto_deploy: {
        success,
        message: success 
          ? 'Snippet is deployed and ready' 
          : 'Auto-deployment failed'
      }
    });
  } catch (error) {
    console.error('❌ Error in auto-deployment:', error);
    res.status(500).json({
      error: 'Auto-deployment failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Deploy a template file to Shopify theme
 * POST /debug/deploy-template
 */
router.post('/deploy-template', async (req, res) => {
  try {
    const { shop, template_key, file_path, template_content } = req.body;
    
    if (!shop) {
      return res.status(400).json({ error: 'shop_required' });
    }
    
    if (!template_key) {
      return res.status(400).json({ error: 'template_key_required' });
    }
    
    const normalizedShop = normalizeShopDomain(shop);
    
    let content: string;
    
    // If template_content is provided directly, use it
    if (template_content) {
      content = template_content;
      console.log(`🚀 Deploying template ${template_key} with inline content to ${normalizedShop}`);
    } else if (file_path) {
      // Otherwise read from file
      console.log(`🚀 Deploying template ${template_key} from ${file_path} to ${normalizedShop}`);
      
      const fs = require('fs');
      try {
        content = fs.readFileSync(file_path, 'utf8');
      } catch (error) {
        console.error('❌ Error reading template file:', error);
        return res.status(400).json({
          error: 'file_read_error',
          message: `Could not read template file: ${file_path}`,
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      return res.status(400).json({ 
        error: 'content_required', 
        message: 'Either file_path or template_content must be provided' 
      });
    }
    
    const deployment = await shopifyService.deployTemplate(normalizedShop, template_key, content);
    
    if (deployment.success) {
      res.json({
        shop: normalizedShop,
        template_key,
        source: template_content ? 'inline_content' : file_path,
        timestamp: new Date().toISOString(),
        deployment,
        message: `Template ${template_key} deployed successfully`
      });
    } else {
      res.status(500).json({
        shop: normalizedShop,
        template_key,
        source: template_content ? 'inline_content' : file_path,
        timestamp: new Date().toISOString(),
        deployment,
        error: 'Deployment failed',
        message: deployment.error
      });
    }
  } catch (error) {
    console.error('❌ Error deploying template:', error);
    res.status(500).json({
      error: 'Failed to deploy template',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Diagnostiquer les permissions et l'accès au thème
 * GET /debug/theme-access?shop=store.myshopify.com
 */
router.get('/theme-access', async (req, res) => {
  try {
    const shop = normalizeShopDomain(String(req.query.shop || ''));
    if (!shop) {
      return res.status(400).json({ error: 'invalid_shop_param' });
    }

    console.log(`🔍 Diagnosing theme access for ${shop}`);

    const token = await getShopToken(shop);
    if (!token?.access_token) {
      return res.status(401).json({
        error: 'No access token found',
        message: 'Shop is not authenticated'
      });
    }

    const diagnostic: any = {
      shop,
      timestamp: new Date().toISOString(),
      token_info: {
        has_token: true,
        scope: token.scope,
        installed_at: token.installedAt
      }
    };

    try {
      // 1. Test basic shop access
      console.log('🔍 Testing basic shop access...');
      const shopResponse = await fetch(`https://${shop}/admin/api/2024-07/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': token.access_token,
          'Content-Type': 'application/json',
        },
      });

      diagnostic.shop_access = {
        status: shopResponse.status,
        success: shopResponse.ok,
        error: shopResponse.ok ? null : await shopResponse.text()
      };

      // 2. Test themes access
      console.log('🔍 Testing themes access...');
      const themesResponse = await fetch(`https://${shop}/admin/api/2024-07/themes.json`, {
        headers: {
          'X-Shopify-Access-Token': token.access_token,
          'Content-Type': 'application/json',
        },
      });

      const themesResult: any = {
        status: themesResponse.status,
        success: themesResponse.ok
      };

      if (themesResponse.ok) {
        const themesData = await themesResponse.json();
        const mainTheme = themesData.themes.find((theme: any) => theme.role === 'main');
        themesResult.themes_count = themesData.themes.length;
        themesResult.main_theme = mainTheme ? {
          id: mainTheme.id,
          name: mainTheme.name,
          role: mainTheme.role,
          created_at: mainTheme.created_at
        } : null;
      } else {
        themesResult.error = await themesResponse.text();
      }

      diagnostic.themes_access = themesResult;

      // 3. Test theme assets access (if we have a main theme)
      if (themesResult.main_theme) {
        console.log(`🔍 Testing theme assets access for theme ${themesResult.main_theme.id}...`);
        const assetsResponse = await fetch(`https://${shop}/admin/api/2024-07/themes/${themesResult.main_theme.id}/assets.json`, {
          headers: {
            'X-Shopify-Access-Token': token.access_token,
            'Content-Type': 'application/json',
          },
        });

        const assetsResult: any = {
          status: assetsResponse.status,
          success: assetsResponse.ok
        };

        if (assetsResponse.ok) {
          const assetsData = await assetsResponse.json();
          assetsResult.assets_count = assetsData.assets.length;
          
          // Check for existing Adlign files
          const adlignFiles = assetsData.assets.filter((asset: any) => 
            asset.key.includes('adlign') || 
            asset.key === 'snippets/adlign_metaobject_injector.liquid' ||
            asset.key === 'assets/adlign-micro-kernel.js'
          );
          
          assetsResult.existing_adlign_files = adlignFiles.map((asset: any) => asset.key);
        } else {
          assetsResult.error = await assetsResponse.text();
        }

        diagnostic.theme_assets_access = assetsResult;
      }

      // 4. Check token scopes
      const requiredScopes = ['write_themes', 'read_themes'];
      const tokenScopes = token.scope ? token.scope.split(',').map(s => s.trim()) : [];
      
      diagnostic.permissions = {
        token_scopes: tokenScopes,
        required_scopes: requiredScopes,
        has_write_themes: tokenScopes.includes('write_themes'),
        has_read_themes: tokenScopes.includes('read_themes'),
        missing_scopes: requiredScopes.filter(scope => !tokenScopes.includes(scope))
      };

      // 5. Summary
      diagnostic.summary = {
        can_read_shop: diagnostic.shop_access.success,
        can_read_themes: diagnostic.themes_access.success,
        can_read_theme_assets: diagnostic.theme_assets_access?.success || false,
        has_required_permissions: diagnostic.permissions.missing_scopes.length === 0,
        ready_for_deployment: diagnostic.shop_access.success && 
                            diagnostic.themes_access.success && 
                            (diagnostic.theme_assets_access?.success || false) &&
                            diagnostic.permissions.has_write_themes
      };

    } catch (error) {
      diagnostic.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'network_or_api_error'
      };
    }

    res.json(diagnostic);
  } catch (error) {
    console.error('❌ Theme access diagnostic error:', error);
    res.status(500).json({
      error: 'Theme access diagnostic failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
