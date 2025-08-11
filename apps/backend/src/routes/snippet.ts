import { Router } from 'express';
import { createError } from '../middleware/errorHandler';
import { shopifyService } from '../services/shopify';

const router = Router();

/**
 * Générer le snippet JSON pour l'extension (SSR)
 * GET /snippet?av=variant-handle&shop=your-store.myshopify.com
 */
router.get('/', async (req, res, next) => {
  try {
    const { av, shop } = req.query;
    
    if (!av || !shop) {
      throw createError('Missing required parameters: av (variant handle) and shop', 400);
    }

    if (typeof av !== 'string' || typeof shop !== 'string') {
      throw createError('Invalid parameter types', 400);
    }

    console.log(`📄 Generating snippet for variant ${av} on shop ${shop}`);

    // Vérifier que la boutique est authentifiée
    const isAuthenticated = await shopifyService.isShopAuthenticated(shop);
    if (!isAuthenticated) {
      throw createError('Shop not authenticated. Please install the app first.', 401);
    }

    // TODO: Récupérer le variant depuis Shopify/Supabase
    // Pour l'instant, on génère des données factices
    const variantPayload = {
      id: `var_${av}`,
      handle: av,
      shop,
      content: {
        title: `Variant ${av}`,
        description: `Description for variant ${av}`,
        images: [],
        price: 29.99,
        compare_at_price: 39.99,
        available: true
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // TODO: Récupérer le theme adapter depuis Redis/Supabase
    // Pour l'instant, on génère des données factices
    const themeAdapter = {
      id: `adapter_${shop}_${Date.now()}`,
      shop,
      theme_fingerprint: 'theme_123',
      selectors: {
        title: '.product-title, h1.product-title, .product__title',
        description: '.product-description, .product__description, .product-details',
        price: '.product-price, .price, .product__price',
        add_to_cart: '.add-to-cart, .product-form__submit, button[type="submit"]',
        images: '.product-images img, .product__media img, .product-gallery img'
      },
      strategies: {
        title: 'text',
        description: 'html',
        price: 'text',
        add_to_cart: 'element',
        images: 'image_src'
      },
      confidence: 0.85,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Créer la signature (pour l'instant factice)
    const signature = {
      payload: variantPayload,
      adapter: themeAdapter,
      signed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 heure
      signature: `sig_${Date.now()}_${Math.random().toString(36).substring(2)}`
    };

    // Définir le type de contenu comme HTML pour l'injection inline
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    // Générer le HTML avec le JSON inline
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Adlign Snippet</title>
    <script id="adlign-data" type="application/json">
${JSON.stringify(signature, null, 2)}
    </script>
</head>
<body>
    <div id="adlign-snippet">
        <p>Variant: ${av}</p>
        <p>Shop: ${shop}</p>
        <p>Generated at: ${new Date().toISOString()}</p>
    </div>
    
    <script>
        // Le micro-kernel Adlign peut maintenant lire les données depuis #adlign-data
        console.log('Adlign snippet loaded for variant:', '${av}');
    </script>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    next(error);
  }
});

/**
 * Vérifier la santé du service de snippet
 * GET /snippet/health
 */
router.get('/health', (req, res) => {
  res.json({
    service: 'snippet-generator',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      variant_loading: 'mock', // TODO: implémenter
      theme_adapter_loading: 'mock', // TODO: implémenter
      signature_generation: 'mock', // TODO: implémenter
      html_generation: 'active'
    }
  });
});

export default router;
