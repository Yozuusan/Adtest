import { Router } from 'express';
import { shopifyService } from '../services/shopify';
import { getShopToken } from '../services/tokens';
import { normalizeShopDomain } from '../utils/shop';
import { createError } from '../middleware/errorHandler';
import { getFrontendUrl as getConfigFrontendUrl } from '../config/urls';
import { supabaseService } from '../services/supabase';

const router = Router();

/**
 * Fonction utilitaire pour détecter l'URL du frontend
 */
function detectFrontendUrl(req: any): string {
  // 1. Essayer de récupérer depuis le header Referer (si la requête vient du frontend)
  const referer = req.headers.referer;
  if (referer) {
    try {
      const url = new URL(referer);
      // Si c'est un domaine Vercel, l'utiliser
      if (url.hostname.includes('vercel.app')) {
        return `${url.protocol}//${url.hostname}`;
      }
    } catch (e) {
      console.log('⚠️ Invalid referer URL:', referer);
    }
  }

  // 2. Essayer de récupérer depuis le header Origin
  const origin = req.headers.origin;
  if (origin) {
    try {
      const url = new URL(origin);
      if (url.hostname.includes('vercel.app')) {
        return origin;
      }
    } catch (e) {
      console.log('⚠️ Invalid origin URL:', origin);
    }
  }

  // 3. Fallback: utiliser la configuration centralisée des URLs
  const fallbackUrl = getConfigFrontendUrl();
  console.log(`🔄 Using fallback frontend URL: ${fallbackUrl}`);
  
  return fallbackUrl;
}

/**
 * Route d'installation - redirige vers Shopify OAuth
 * GET /oauth/install?shop=your-store.myshopify.com
 */
router.get('/install', async (req, res, next) => {
  try {
    console.log('🚀 =========================== OAUTH INSTALL START ===========================');
    console.log('📋 Full request details:');
    console.log('   URL:', req.url);
    console.log('   Method:', req.method);
    console.log('   Headers:', JSON.stringify(req.headers, null, 2));
    console.log('   Query params:', JSON.stringify(req.query, null, 2));
    
    const { shop, user_id } = req.query;
    
    console.log('🔍 Parameter validation:');
    console.log('   shop:', shop, typeof shop);
    console.log('   user_id:', user_id, typeof user_id);
    
    if (!shop || typeof shop !== 'string') {
      console.log('❌ Shop parameter validation failed');
      throw createError('Shop parameter is required', 400);
    }

    if (!user_id || typeof user_id !== 'string') {
      console.log('❌ User ID parameter validation failed');
      throw createError('User ID parameter is required', 400);
    }

    // Valider le format du shop
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
    console.log(`🔍 Shop format validation: ${shop} matches ${shopRegex} = ${shop.match(shopRegex)}`);
    
    if (!shop.match(shopRegex)) {
      console.log('❌ Shop format validation failed');
      throw createError('Invalid shop format. Must be: your-store.myshopify.com', 400);
    }

    console.log('✅ All validations passed, generating install URL...');

    // Générer l'URL d'installation avec le user_id dans le state
    const installUrl = shopifyService.generateInstallUrl(shop, user_id);
    
    console.log(`🔗 Generated OAuth URL: ${installUrl}`);
    console.log(`🔗 Redirecting ${shop} to Shopify OAuth (user: ${user_id})`);
    console.log('🚀 =========================== OAUTH INSTALL END ===========================');
    
    // Rediriger vers Shopify
    res.redirect(installUrl);
  } catch (error) {
    console.error('❌ OAUTH INSTALL ERROR:', error);
    next(error);
  }
});

/**
 * Route de succès OAuth - redirige vers le frontend après installation
 * GET /oauth/success?shop=...&token=...
 */
router.get('/success', async (req, res, next) => {
  try {
    const { shop, token } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    if (!token || typeof token !== 'string') {
      throw createError('Token parameter is required', 400);
    }

    console.log(`✅ OAuth success for shop: ${shop}`);

    // Rediriger vers le frontend avec les paramètres de succès
    const frontendUrl = detectFrontendUrl(req);
    const successUrl = `${frontendUrl}/auth/callback?shop=${shop}&success=true&token=${token}`;
    
    console.log(`🎯 Redirecting to frontend: ${successUrl}`);
    res.redirect(successUrl);
  } catch (error) {
    next(error);
  }
});

/**
 * Callback OAuth - Shopify renvoie le code d'autorisation
 * GET /oauth/callback?code=...&shop=...&state=...
 */
router.get('/callback', async (req, res, next) => {
  try {
    console.log('🔄 =========================== OAUTH CALLBACK START ===========================');
    console.log('📋 Full callback request details:');
    console.log('   URL:', req.url);
    console.log('   Method:', req.method);
    console.log('   Headers:', JSON.stringify(req.headers, null, 2));
    console.log('   Query params:', JSON.stringify(req.query, null, 2));
    
    const { code, shop, state } = req.query;
    
    console.log('🔍 Parameter extraction:');
    console.log('   code:', code ? `Present (${code.toString().substring(0, 10)}...)` : 'Missing');
    console.log('   shop:', shop);
    console.log('   state:', state);
    
    if (!code || !shop || !state) {
      console.log('❌ Missing required parameters:');
      console.log(`   code: ${!!code}`);
      console.log(`   shop: ${!!shop}`);
      console.log(`   state: ${!!state}`);
      throw createError('Missing required OAuth parameters', 400);
    }

    if (typeof shop !== 'string' || typeof code !== 'string' || typeof state !== 'string') {
      console.log('❌ Invalid parameter types:');
      console.log(`   shop type: ${typeof shop}`);
      console.log(`   code type: ${typeof code}`);
      console.log(`   state type: ${typeof state}`);
      throw createError('Invalid parameter types', 400);
    }

    // Extraire le user_id du state (assumant qu'il est passé comme state)
    const userId = state;
    console.log(`🔄 Processing OAuth callback for shop: ${shop}, user: ${userId}`);

    console.log('🔄 Step 1: Exchange code for token...');
    // Échanger le code contre un token
    const token = await shopifyService.exchangeCodeForToken(code, shop);
    
    console.log(`✅ Step 1 completed - OAuth successful for ${shop}`);
    console.log(`   Scopes: ${token.scope}`);
    console.log(`   Token: ${token.access_token.substring(0, 10)}...`);

    console.log('🔄 Step 2: Upsert shop in Supabase...');
    // Créer ou mettre à jour la boutique dans Supabase
    const shopData = await supabaseService.upsertShop({
      domain: shop,
      access_token: token.access_token,
      scope: token.scope,
      is_active: true
    });

    console.log(`✅ Step 2 completed - Shop upserted in Supabase:`);
    console.log(`   Shop ID: ${shopData.id}`);
    console.log(`   Shop Domain: ${shopData.domain}`);

    console.log('🔄 Step 3: Create user-shop association...');
    // Créer l'association utilisateur-boutique
    await supabaseService.createUserShopAssociation(userId, shopData.id, 'owner');
    
    console.log(`✅ Step 3 completed - User-shop association created`);

    console.log('🔄 Step 4: Prepare frontend redirect...');
    // Redirection vers le frontend
    const frontendUrl = detectFrontendUrl(req);
    
    console.log(`🎯 Frontend URL detected: ${frontendUrl}`);
    
    // Rediriger vers la page de succès avec les params
    const successUrl = `${frontendUrl}/auth/callback?shop=${shop}&success=true&token=${token.access_token.substring(0, 10)}...`;
    
    console.log(`🎯 Redirecting to success page: ${successUrl}`);
    console.log('✅ =========================== OAUTH CALLBACK SUCCESS ===========================');
    
    res.redirect(`${frontendUrl}/auth/callback?shop=${shop}&success=true&token=${token.access_token}`);
  } catch (error) {
    console.error('❌ =========================== OAUTH CALLBACK ERROR ===========================');
    console.error('❌ OAuth callback error details:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Détecter l'URL frontend pour l'erreur aussi
    const frontendUrl = detectFrontendUrl(req);
    
    console.log(`🎯 Redirecting to error page with frontend URL: ${frontendUrl}`);
    
    // Rediriger vers une page d'erreur
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}`;
    
    console.log(`🎯 Error redirect URL: ${errorUrl}`);
    console.error('❌ =========================== OAUTH CALLBACK ERROR END ===========================');
    
    res.redirect(errorUrl);
  }
});

/**
 * Vérifier le statut d'authentification d'une boutique
 * GET /oauth/status?shop=your-store.myshopify.com
 */
router.get('/status', async (req, res, next) => {
  try {
    const shop = normalizeShopDomain(String(req.query.shop || ''));
    if (!shop) {
      return res.status(400).json({ error: 'invalid_shop_param' });
    }

    const token = await getShopToken(shop);
    const authenticated = !!(token && token.access_token);

    return res.json({
      shop,
      authenticated,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Déconnecter une boutique (supprimer le token)
 * POST /oauth/logout
 */
router.post('/logout', async (req, res, next) => {
  try {
    const { shop } = req.body;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    // TODO: Implémenter la suppression du token
    console.log(`🚪 Logging out shop: ${shop}`);
    
    res.json({
      message: 'Logged out successfully',
      shop,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
