import { Router } from 'express';
import { shopifyService } from '../services/shopify';
import { getShopToken } from '../services/tokens';
import { normalizeShopDomain } from '../utils/shop';
import { createError } from '../middleware/errorHandler';
import { getFrontendUrl as getConfigFrontendUrl } from '../config/urls';

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
    const { shop } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    // Valider le format du shop
    if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)) {
      throw createError('Invalid shop format. Must be: your-store.myshopify.com', 400);
    }

    // Générer l'URL d'installation
    const installUrl = shopifyService.generateInstallUrl(shop);
    
    console.log(`🔗 Redirecting ${shop} to Shopify OAuth: ${installUrl}`);
    
    // Rediriger vers Shopify
    res.redirect(installUrl);
  } catch (error) {
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
    console.log('🔍 OAuth callback - Query params:', req.query);
    console.log('🔍 OAuth callback - Full URL:', req.url);
    
    const { code, shop, state } = req.query;
    
    if (!code || !shop || !state) {
      console.log('❌ Missing params:', { code: !!code, shop: !!shop, state: !!state });
      throw createError('Missing required OAuth parameters', 400);
    }

    if (typeof shop !== 'string' || typeof code !== 'string') {
      throw createError('Invalid parameter types', 400);
    }

    console.log(`🔄 Processing OAuth callback for shop: ${shop}`);

    // Échanger le code contre un token
    const token = await shopifyService.exchangeCodeForToken(code, shop);
    
    console.log(`✅ OAuth successful for ${shop}. Scopes: ${token.scope}`);

    // 🔧 FIX: Redirection directe vers le frontend Vercel
    const frontendUrl = detectFrontendUrl(req);
    
    console.log(`🎯 Redirecting to frontend: ${frontendUrl}`);
    
    // Rediriger vers la page de succès avec les params
    const successUrl = `${frontendUrl}/auth/callback?shop=${shop}&success=true&token=${token.access_token}`;
    
    res.redirect(successUrl);
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    
    // Détecter l'URL frontend pour l'erreur aussi
    const frontendUrl = detectFrontendUrl(req);
    
    // Rediriger vers une page d'erreur
    const errorUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`;
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
