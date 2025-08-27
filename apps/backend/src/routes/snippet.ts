import { Router } from 'express';
import { createError } from '../middleware/errorHandler';
import { shopifyService } from '../services/shopify';

const router = Router();

/**
 * Récupérer le ThemeAdapter depuis la base de données/cache
 * TODO: Implémenter la connexion avec Supabase/Redis pour persister les adapters
 */
async function getThemeAdapterForShop(shop: string): Promise<any> {
  // Pour l'instant, retourner null pour forcer l'utilisation du fallback
  // Dans une vraie implémentation, on récupérerait depuis Supabase :
  // - Theme fingerprint du shop
  // - Sélecteurs mappés par le worker-mapping
  // - Stratégies d'injection
  
  // Exemple de structure attendue:
  // return {
  //   id: 'adapter_123',
  //   shop,
  //   theme_fingerprint: 'dawn_v2.1',
  //   selectors: { ... },
  //   strategies: { ... },
  //   confidence: 0.95,
  //   created_at: '2024-01-01T00:00:00Z',
  //   updated_at: '2024-01-01T00:00:00Z'
  // };

  return null; // Force fallback pour l'instant
}

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

    // Essayer de récupérer la variante depuis Shopify
    let variantContent = null;
    let realVariantData = null;

    try {
      // Vérifier l'authentification pour les vraies données
      const isAuthenticated = await shopifyService.isShopAuthenticated(shop);
      if (isAuthenticated) {
        realVariantData = await shopifyService.getVariantByHandle(shop, av);
        if (realVariantData && realVariantData.content_json) {
          variantContent = JSON.parse(realVariantData.content_json);
          console.log(`✅ Real variant data loaded for ${av}`);
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not load real variant data, using fallback for ${av}:`, error);
    }

    // Fallback vers des données simulées si pas de vraies données
    if (!variantContent) {
      console.log(`🎭 Using mock variant data for ${av}`);
      if (av.includes('savon') || av.includes('anti-demangeaison')) {
        variantContent = {
          title: "🌿 SAVON ANTI-DÉMANGEAISON - Soulagement Naturel",
          description_html: "<strong>Nouveau !</strong> Savon naturel spécialement formulé pour apaiser les démangeaisons et irritations cutanées. <br><br>✨ <strong>Bénéfices :</strong><br>• Soulage instantanément les démangeaisons<br>• Ingrédients 100% naturels<br>• Convient aux peaux sensibles<br>• Action apaisante longue durée",
          cta_primary: "🛒 Soulager mes démangeaisons",
          promotional_badge: "🌿 NOUVEAU - Action Apaisante",
        };
      } else {
        variantContent = {
          title: `🔥 Variant ${av} - Offre Spéciale`,
          description_html: `<strong>Découvrez notre variant ${av}</strong><br>Produit optimisé pour une expérience client exceptionnelle.`,
          cta_primary: "🛒 Découvrir maintenant",
          promotional_badge: "✨ OFFRE SPÉCIALE",
        };
      }
    }

    const variantPayload = {
      id: `var_${av}`,
      adlign_variant: av,
      shop,
      product_id: "sample_product",
      backend_url: process.env.BACKEND_URL || "https://your-backend.railway.app",
      variant_data: variantContent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Récupérer le theme adapter depuis le worker-mapping ou fallback
    let themeAdapter = null;
    
    try {
      // Essayer de récupérer l'adapter depuis le cache/base de données
      themeAdapter = await getThemeAdapterForShop(shop);
      if (themeAdapter) {
        console.log(`✅ Real theme adapter loaded for ${shop}`);
      }
    } catch (error) {
      console.log(`⚠️ Could not load theme adapter for ${shop}, using default:`, error);
    }

    // Fallback vers un adapter par défaut si aucun trouvé
    if (!themeAdapter) {
      console.log(`🎭 Using default theme adapter for ${shop}`);
      themeAdapter = {
        id: `adapter_${shop}_${Date.now()}`,
        shop,
        theme_fingerprint: 'default_theme',
        selectors: {
          title: '.product-title, h1.product-title, .product__title, h1',
          description: '.product-description, .product__description, .product-details, .rte:not(.price)',
          price: '.product-price, .price, .product__price, .money',
          add_to_cart: '.add-to-cart, .product-form__submit, button[type="submit"]',
          promotional_badge: '.product__badge, .badge, .tag'
        },
        strategies: {
          title: 'text',
          description: 'html',
          price: 'text',
          add_to_cart: 'text',
          promotional_badge: 'badge'
        },
      confidence: 0.85,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Définir le type de contenu comme HTML pour l'injection inline
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Générer le HTML avec le JSON inline et le micro-kernel
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Adlign Variant - ${av}</title>
    <script id="adlign-data" type="application/json">
${JSON.stringify(variantPayload, null, 2)}
    </script>
</head>
<body>
    <div id="adlign-snippet" style="padding: 20px; background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; margin: 20px; font-family: sans-serif;">
        <h2 style="color: #0ea5e9; margin-top: 0;">🎯 Adlign Variant Chargée</h2>
        <p><strong>Variant:</strong> ${av}</p>
        <p><strong>Shop:</strong> ${shop}</p>
        <p><strong>Générée à:</strong> ${new Date().toISOString()}</p>
        <div style="background: #fff; padding: 15px; border-radius: 6px; margin-top: 15px;">
          <h3 style="margin-top: 0; color: #374151;">Contenu du variant :</h3>
          <p><strong>Titre:</strong> ${variantContent.title}</p>
          <p><strong>CTA:</strong> ${variantContent.cta_primary}</p>
          <p><strong>Badge:</strong> ${variantContent.promotional_badge}</p>
        </div>
        <div id="adlign-status" style="margin-top: 15px; padding: 10px; background: #fef3c7; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px;">⏳ Chargement du micro-kernel...</p>
        </div>
    </div>
    
    <script>
        console.log('🚀 [ADLIGN SNIPPET] Variant chargée:', '${av}');
        console.log('📊 [ADLIGN SNIPPET] Données disponibles:', JSON.parse(document.getElementById('adlign-data').textContent));
        
        // Simuler le chargement du micro-kernel après 1 seconde
        setTimeout(() => {
          const statusDiv = document.getElementById('adlign-status');
          if (statusDiv) {
            statusDiv.innerHTML = '<p style="margin: 0; font-size: 14px; color: #059669;">✅ Micro-kernel chargé - Injection en cours...</p>';
            statusDiv.style.background = '#d1fae5';
          }
        }, 1000);
    </script>
    
    <!-- Chargement du micro-kernel -->
    <script src="https://your-cdn.com/adlign-micro-kernel.js"></script>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    next(error);
  }
});

/**
 * Endpoint JSON pour le micro-kernel
 * GET /api/variant-data?av=variant-handle&shop=your-store.myshopify.com
 */
router.get('/api/variant-data', async (req, res, next) => {
  try {
    const { av, shop } = req.query;
    
    if (!av || !shop) {
      throw createError('Missing required parameters: av (variant handle) and shop', 400);
    }

    if (typeof av !== 'string' || typeof shop !== 'string') {
      throw createError('Invalid parameter types', 400);
    }

    console.log(`📊 Generating JSON data for variant ${av} on shop ${shop}`);

    // Générer des données de variant réalistes selon le handle
    let variantContent;
    if (av.includes('savon') || av.includes('anti-demangeaison')) {
      variantContent = {
        title: "🌿 SAVON ANTI-DÉMANGEAISON - Soulagement Naturel",
        description_html: "<strong>Nouveau !</strong> Savon naturel spécialement formulé pour apaiser les démangeaisons et irritations cutanées. <br><br>✨ <strong>Bénéfices :</strong><br>• Soulage instantanément les démangeaisons<br>• Ingrédients 100% naturels<br>• Convient aux peaux sensibles<br>• Action apaisante longue durée",
        cta_primary: "🛒 Soulager mes démangeaisons",
        promotional_badge: "🌿 NOUVEAU - Action Apaisante",
      };
    } else {
      variantContent = {
        title: `🔥 Variant ${av} - Offre Spéciale`,
        description_html: `<strong>Découvrez notre variant ${av}</strong><br>Produit optimisé pour une expérience client exceptionnelle.`,
        cta_primary: "🛒 Découvrir maintenant",
        promotional_badge: "✨ OFFRE SPÉCIALE",
      };
    }

    const variantPayload = {
      id: `var_${av}`,
      adlign_variant: av,
      shop,
      product_id: "sample_product",
      backend_url: process.env.BACKEND_URL || "http://localhost:3001",
      variant_data: variantContent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Headers CORS pour le micro-kernel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json(variantPayload);
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
