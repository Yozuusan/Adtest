import { Router } from 'express';
import { createError } from '../middleware/errorHandler';
import { shopifyService } from '../services/shopify';

const router = Router();

/**
 * Récupérer le ThemeAdapter depuis la base de données/cache
 */
async function getThemeAdapterForShop(shop: string): Promise<any> {
  try {
    // Étape 1: Essayer de récupérer depuis Redis/cache en premier
    const cachedAdapter = await getCachedThemeAdapter(shop);
    if (cachedAdapter) {
      console.log(`✅ Cached theme adapter found for ${shop}`);
      return cachedAdapter;
    }

    // Étape 2: Récupérer depuis Supabase si pas en cache
    const dbAdapter = await getThemeAdapterFromDatabase(shop);
    if (dbAdapter) {
      console.log(`✅ Database theme adapter found for ${shop}`);
      // Mettre en cache pour les prochaines fois
      await cacheThemeAdapter(shop, dbAdapter);
      return dbAdapter;
    }

    // Étape 3: Générer un adapter intelligent basé sur le shop
    const smartAdapter = await generateSmartAdapter(shop);
    if (smartAdapter) {
      console.log(`✅ Smart theme adapter generated for ${shop}`);
      // Sauvegarder en base et cache
      await saveThemeAdapterToDatabase(shop, smartAdapter);
      await cacheThemeAdapter(shop, smartAdapter);
      return smartAdapter;
    }

    return null; // Vraiment aucun adapter trouvé
  } catch (error) {
    console.error(`❌ Error getting theme adapter for ${shop}:`, error);
    return null;
  }
}

/**
 * Récupérer depuis le cache Redis (implémentation future)
 */
async function getCachedThemeAdapter(shop: string): Promise<any> {
  // TODO: Implémenter avec Redis/Upstash
  // const redis = new Redis(process.env.UPSTASH_REDIS_REST_URL);
  // const cached = await redis.get(`theme_adapter:${shop}`);
  // return cached ? JSON.parse(cached) : null;
  return null;
}

/**
 * Récupérer depuis Supabase
 */
async function getThemeAdapterFromDatabase(shop: string): Promise<any> {
  // TODO: Implémenter avec Supabase client
  // const { data } = await supabase
  //   .from('theme_adapters')
  //   .select('*')
  //   .eq('shop', shop)
  //   .order('created_at', { ascending: false })
  //   .limit(1);
  // return data?.[0] || null;
  return null;
}

/**
 * Générer un adapter intelligent basé sur le domaine du shop
 */
async function generateSmartAdapter(shop: string): Promise<any> {
  // Analyser le nom du shop pour deviner le thème
  const shopName = shop.replace('.myshopify.com', '');
  
  // Adapter intelligent basé sur des patterns communs
  let selectors = {};
  let confidence = 0.7; // Confidence moyenne pour un adapter généré
  
  if (shopName.includes('dawn') || shopName.includes('shopify')) {
    // Dawn theme (thème par défaut Shopify 2.0)
    selectors = {
      title: 'h1.product__title, .product__title h1, h1[class*="title"]',
      description: '.product__description, .product-single__description, .rte:not([class*="price"])',
      price: '.price, .product__price, [class*="price"]:not(.compare)',
      add_to_cart: '.product-form__buttons button, .btn.product-form__cart-submit, [name="add"]',
      promotional_badge: '.badge, .product__badge, [class*="badge"]'
    };
    confidence = 0.9;
  } else if (shopName.includes('debut') || shopName.includes('brooklyn')) {
    // Older Shopify themes
    selectors = {
      title: 'h1.product-single__title, .product-single__title, h1.h2',
      description: '.product-single__description, .product-description, .rte',
      price: '.product__price, .price, .product-single__price',
      add_to_cart: '.btn.product-form__cart-submit, .product-form__buttons .btn',
      promotional_badge: '.product-tag, .product__badge'
    };
    confidence = 0.85;
  } else {
    // Generic fallback pour thèmes inconnus
    selectors = {
      title: 'h1.product-title, h1[class*="product"], h1[class*="title"], .product h1, h1:first-of-type',
      description: '.product-description, .product__description, .rte, [class*="description"]:not([class*="meta"])',
      price: '.product-price, .price, [class*="price"]:not(.compare):not(.was)',
      add_to_cart: 'button[name="add"], .add-to-cart, .product-form button[type="submit"]',
      promotional_badge: '.badge, .tag, [class*="badge"], [class*="tag"]'
    };
    confidence = 0.75;
  }

  return {
    id: `smart_adapter_${shop}_${Date.now()}`,
    shop,
    theme_fingerprint: `detected_${shopName}`,
    selectors,
    strategies: {
      title: 'text',
      description: 'html',
      price: 'text',
      add_to_cart: 'text',
      promotional_badge: 'badge'
    },
    confidence,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source: 'smart_generation'
  };
}

/**
 * Sauvegarder en base de données (implémentation future)
 */
async function saveThemeAdapterToDatabase(shop: string, adapter: any): Promise<void> {
  // TODO: Implémenter avec Supabase
  console.log(`💾 Would save theme adapter for ${shop} to database`);
}

/**
 * Mettre en cache (implémentation future)
 */
async function cacheThemeAdapter(shop: string, adapter: any): Promise<void> {
  // TODO: Implémenter avec Redis
  console.log(`🏪 Would cache theme adapter for ${shop}`);
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
      product_id: realVariantData?.product_gid || "sample_product",
      backend_url: process.env.BACKEND_URL || "https://adtest-production.up.railway.app",
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

    // Ajouter le theme adapter au payload pour le micro-kernel
    const finalPayload = {
      ...variantPayload,
      theme_adapter: themeAdapter
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
${JSON.stringify(finalPayload, null, 2)}
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
        <div style="background: #fff; padding: 15px; border-radius: 6px; margin-top: 10px;">
          <h3 style="margin-top: 0; color: #374151;">Theme Adapter :</h3>
          <p><strong>Source:</strong> ${themeAdapter.source || 'default'}</p>
          <p><strong>Confidence:</strong> ${Math.round((themeAdapter.confidence || 0) * 100)}%</p>
          <p><strong>Sélecteurs:</strong> ${Object.keys(themeAdapter.selectors || {}).length} éléments mappés</p>
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
