import { Router } from 'express';
import { shopifyService } from '../services/shopify';
import { getShopToken } from '../services/tokens';
import { normalizeShopDomain } from '../utils/shop';
import { createError } from '../middleware/errorHandler';

const router = Router();

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

    // Rediriger vers une page de succès ou l'admin Shopify
    const successUrl = `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`;
    
    res.redirect(successUrl);
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    
    // Rediriger vers une page d'erreur
    const errorUrl = `${process.env.APP_URL}/oauth/error?message=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`;
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
