import { Router } from 'express';
import { createError } from '../middleware/errorHandler';
import { shopifyService } from '../services/shopify';
import { cacheService } from '../services/cache';
import { supabaseService } from '../services/supabase';

const router = Router();

/**
 * Récupère un adapter de thème depuis Redis avec fallback Supabase
 */
export async function loadThemeAdapter(shop: string, fingerprint: string) {
  // Première tentative : cache Redis
  let adapter = await cacheService.getThemeAdapter(shop, fingerprint);

  // Fallback sur Supabase si l'adapter n'est pas en cache
  if (!adapter) {
    const dbAdapter = await supabaseService.getThemeAdapter(fingerprint);
    if (dbAdapter) {
      adapter = dbAdapter as any;
      // On tente de mettre en cache pour les futures requêtes mais on ignore les erreurs
      try {
        await cacheService.saveThemeAdapter(shop, fingerprint, adapter as any);
      } catch (err) {
        console.warn('⚠️ Failed to cache theme adapter:', err);
      }
    }
  }

  if (!adapter) {
    throw createError('Theme adapter not found', 404);
  }

  return adapter;
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

    // Pour le développement, on désactive l'authentification Shopify
    // const isAuthenticated = await shopifyService.isShopAuthenticated(shop);
    // if (!isAuthenticated) {
    //   throw createError('Shop not authenticated. Please install the app first.', 401);
    // }

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

    const fingerprint = 'theme_123'; // TODO: utiliser la véritable empreinte du thème

    // Récupération de l'adaptateur depuis Redis/Supabase
    const themeAdapter = await loadThemeAdapter(shop, fingerprint);

    const variantPayload = {
      id: `var_${av}`,
      adlign_variant: av,
      shop,
      product_id: "sample_product",
      backend_url: process.env.BACKEND_URL || "https://your-backend.railway.app",
      variant_data: variantContent,
      theme_fingerprint: fingerprint,
      theme_adapter: themeAdapter,
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
