import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './monitoring/sentry';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { validateEnvironment } from './utils/env-validation';

// Valider les variables d'environnement au démarrage
try {
  const env = validateEnvironment();
  console.log('✅ Variables d\'environnement validées avec succès');
  console.log('  APP_URL:', env.APP_URL);
  console.log('  PORT:', env.PORT);
  console.log('  SUPABASE_URL:', env.SUPABASE_URL ? '✅ défini' : '❌ undefined');
  console.log('  SHOPIFY_API_KEY:', env.SHOPIFY_API_KEY ? '✅ défini' : '❌ undefined');
} catch (error: any) {
  console.error('❌ Erreur de validation des variables d\'environnement:', error?.message || String(error));
  process.exit(1);
}

// Routes
import oauthRoutes from './routes/oauth';
import variantsRoutes from './routes/variants';
import analyticsRoutes from './routes/analytics';
import mappingRoutes from './routes/mapping';
import snippetRoutes from './routes/snippet';
import debugRoutes from './routes/debug';
import adlignVariantsRoutes from './routes/adlign-variants';
import productsRoutes from './routes/products';
import aiVariantsRoutes from './routes/ai-variants';
import brandRoutes from './routes/brand';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialiser Sentry
initSentry();

// Middleware
app.use(express.json());

// Configuration CORS pour autoriser Lovable et localhost
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    /^https:\/\/.*\.lovable\.app$/,
    /^https:\/\/.*\.lovable\.dev$/,
    'https://lovable.dev'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Shopify-Access-Token']
};

app.use(cors(corsOptions));
app.use(helmet());

// Handler Sentry pour capturer les requêtes
app.use(sentryRequestHandler());

// Routes API
app.use('/oauth', oauthRoutes);
app.use('/variants', variantsRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/mapping', mappingRoutes);
app.use('/snippet', snippetRoutes);
app.use('/debug', debugRoutes);
app.use('/adlign-variants', adlignVariantsRoutes);
app.use('/products', productsRoutes);
app.use('/ai-variants', aiVariantsRoutes);
app.use('/brand', brandRoutes);

// Route API directe pour le micro-kernel (évite les problèmes de routage)
app.get('/api/variant-data', async (req, res) => {
  try {
    const { av, shop } = req.query;
    
    if (!av || !shop) {
      return res.status(400).json({ error: 'Missing required parameters: av and shop' });
    }

    console.log(`📊 API: Generating JSON data for variant ${av} on shop ${shop}`);

    // Générer des données de variant réalistes selon le handle
    let variantContent;
    if (String(av).includes('savon') || String(av).includes('anti-demangeaison')) {
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
    console.error('❌ API: Erreur variant-data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint pour servir le micro-kernel mis à jour (SaaS scalable)
app.get('/micro-kernel.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache'); // Toujours la dernière version
  
  const microKernelCode = `
/**
 * Adlign Micro Kernel - Version SaaS Scalable
 * Auto-mise à jour via backend Railway
 */
(function() {
  'use strict';

  // Vérifier qu'on est bien sur une page produit
  if (!window.location.pathname.includes('/products/')) {
    return;
  }
  
  console.log('🚀 [ADLIGN SaaS] === MICRO-KERNEL AUTO-LOADING ===');
  
  // Garde-fou anti-double exécution
  if (window.AdlignSaaSActive) {
    console.log('🔄 [ADLIGN SaaS] Déjà actif - skip');
    return;
  }
  window.AdlignSaaSActive = true;

  window.AdlignSaaS = {
    data: null,
    mapping: null,
    appliedPatches: [],

    init: async function() {
      await this.loadData();
      if (this.data && this.data.variant_data) {
        this.loadMapping();
        this.applyInjection();
        console.log('✅ [ADLIGN SaaS] Variante appliquée automatiquement');
      } else {
        console.log('ℹ️ [ADLIGN SaaS] Aucune variante détectée');
      }
    },

    loadData: async function() {
      // 1. Essayer de charger depuis le script tag (metafield ou fallback)
      const dataScript = document.getElementById('adlign-data');
      if (dataScript) {
        try {
          this.data = JSON.parse(dataScript.textContent);
          console.log('📖 [ADLIGN SaaS] Données lues depuis le script tag:', this.data);
          
          // Si c'est un fallback API, charger depuis l'API
          if (this.data.fallback_to_api && this.data.variant_data === null) {
            console.log('🔄 [ADLIGN SaaS] Fallback API détecté, chargement depuis Railway...');
            await this.loadFromAPI();
          }
          return;
        } catch (e) {
          console.error('❌ [ADLIGN SaaS] Erreur parsing des données:', e);
        }
      }

      // 2. Fallback: charger directement depuis l'URL si pas de script tag
      const urlParams = new URLSearchParams(window.location.search);
      const variantHandle = urlParams.get('adlign_variant');
      
      if (!variantHandle) {
        console.log('ℹ️ [ADLIGN SaaS] Pas de paramètre adlign_variant');
        return;
      }

      await this.loadFromAPI();
    },

    loadFromAPI: async function() {
      const urlParams = new URLSearchParams(window.location.search);
      const variantHandle = urlParams.get('adlign_variant');
      
      if (!variantHandle) return;

      try {
        console.log('🔍 [ADLIGN SaaS] Chargement API pour variant:', variantHandle);
        const shopDomain = window.location.hostname;
        const apiUrl = 'https://adtest-production.up.railway.app/api/variant-data';
        
        const response = await fetch(apiUrl + '?av=' + variantHandle + '&shop=' + shopDomain);
        if (response.ok) {
          const apiData = await response.json();
          // Merger les données API avec les données existantes du script tag
          if (this.data) {
            this.data.variant_data = apiData.variant_data;
          } else {
            this.data = apiData;
          }
          console.log('📖 [ADLIGN SaaS] Données API chargées:', this.data);
        } else {
          console.error('❌ [ADLIGN SaaS] Erreur API:', response.status);
        }
      } catch (error) {
        console.error('❌ [ADLIGN SaaS] Erreur réseau:', error);
      }
    },

    loadMapping: function() {
      this.mapping = {
        title: {
          selectors: ['h1', '.product-title', '.product__title', '.product__heading h1'],
          strategy: 'text'
        },
        description_html: {
          selectors: ['.product__description', '.product-description', '.rte:not(.price)'],
          strategy: 'html'
        },
        cta_primary: {
          selectors: ['button[type="submit"]', '.add-to-cart', '.product__cta'],
          strategy: 'text'
        },
        promotional_badge: {
          selectors: ['.product__badge', '.badge', '.tag'],
          strategy: 'badge'
        }
      };
    },

    applyInjection: function() {
      if (!this.mapping || !this.data.variant_data) return;

      console.log('🎯 [ADLIGN SaaS] Application des modifications...');
      let modificationsAppliquees = 0;

      Object.entries(this.mapping).forEach(([type, mappingItem]) => {
        const variantValue = this.data.variant_data[type];
        if (!variantValue) return;

        const element = this.findElement(mappingItem.selectors);
        if (element) {
          // Sécurité : ne pas modifier les éléments prix
          if (this.isPriceElement(element)) {
            console.log('⚠️ [ADLIGN SaaS] Élément prix ignoré:', type);
            return;
          }

          // Marquer et modifier
          element.setAttribute('data-adlign-saas', 'true');
          element.setAttribute('data-adlign-variant', this.data.adlign_variant);
          
          this.patchElement(element, mappingItem.strategy, variantValue);
          
          // Animation visuelle
          element.style.background = 'rgba(34, 197, 94, 0.2)';
          element.style.transition = 'all 0.5s ease';
          setTimeout(() => element.style.background = '', 2000);

          modificationsAppliquees++;
          console.log('✨ [ADLIGN SaaS] ' + type + ' modifié');
        }
      });

      if (modificationsAppliquees > 0) {
        this.showSuccessNotification(modificationsAppliquees);
        console.log('🎉 [ADLIGN SaaS] ' + modificationsAppliquees + ' modifications appliquées');
      }
    },

    findElement: function(selectors) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) return element;
      }
      return null;
    },

    isPriceElement: function(element) {
      return element.closest('.price') || 
             element.classList.contains('price') || 
             element.classList.contains('money') ||
             element.textContent.includes('€') || 
             element.textContent.includes('$');
    },

    patchElement: function(element, strategy, value) {
      try {
        switch (strategy) {
          case 'text':
            element.textContent = value;
            break;
          case 'html':
            element.innerHTML = value;
            break;
          case 'badge':
            element.textContent = value;
            element.style.cssText += 'display: inline-block; background: #dc3545; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; margin: 5px 0;';
            break;
        }
      } catch (error) {
        console.error('❌ [ADLIGN SaaS] Erreur patch:', error);
      }
    },

    showSuccessNotification: function(count) {
      const notification = document.createElement('div');
      notification.innerHTML = 
        '<strong>🚀 Adlign SaaS Actif</strong><br>' +
        '<small>' + count + ' éléments optimisés</small><br>' +
        '<small>⚡ ' + this.data.adlign_variant + '</small>';
      notification.style.cssText = 
        'position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 15px 20px; border-radius: 12px; font-weight: 600; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
      document.body.appendChild(notification);
      setTimeout(() => {
        if (document.body.contains(notification)) {
          notification.style.opacity = '0';
          setTimeout(() => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          }, 300);
        }
      }, 5000);
    }
  };

  // Auto-initialisation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AdlignSaaS.init());
  } else {
    window.AdlignSaaS.init();
  }

  console.log('🎯 [ADLIGN SaaS] === MICRO-KERNEL CHARGÉ ===');
})();
`;

  res.send(microKernelCode);
});

// DEBUG: Lister toutes les routes enregistrées
console.log('🔍 Routes enregistrées:');
app._router.stack.forEach((middleware: any) => {
  if (middleware.route) {
    console.log(`  ${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    console.log(`  Router: ${middleware.regexp}`);
  }
});

// Route de santé
app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    services: {
      oauth: 'active',
      variants: 'active',
      analytics: 'active',
      mapping: 'active',
      snippet: 'active',
      adlign_variants: 'active',
      products: 'active',
      ai_variants: 'active',
      brand: 'active'
    }
  });
});

// Route racine avec documentation
app.get('/', (req, res) => {
  res.json({
    name: 'Adlign Backend API',
    version: '1.0.0',
    description: 'Backend API pour l\'application Adlign Shopify',
    endpoints: {
      health: '/health',
      oauth: {
        install: '/oauth/install?shop=your-store.myshopify.com',
        callback: '/oauth/callback',
        status: '/oauth/status?shop=your-store.myshopify.com'
      },
      variants: {
        create: 'POST /variants',
        get: 'GET /variants/:handle',
        list: 'GET /variants?shop=your-store.myshopify.com',
        update: 'PUT /variants/:handle',
        delete: 'DELETE /variants/:handle'
      },
      analytics: {
        track: 'POST /analytics',
        stats: 'GET /analytics/stats?shop=your-store.myshopify.com',
        events: 'GET /analytics/events?shop=your-store.myshopify.com'
      },
      mapping: {
        build: 'POST /mapping/build',
        status: 'GET /mapping/status/:job_id',
        jobs: 'GET /mapping/jobs?shop_id=your-shop-id'
      },
      snippet: {
        generate: 'GET /snippet?av=variant-handle&shop=your-store.myshopify.com'
      },
      adlign_variants: {
        create: 'POST /adlign-variants',
        get: 'GET /adlign-variants/:product_id?shop=your-store.myshopify.com',
        delete: 'DELETE /adlign-variants/:product_id/:variant_handle?shop=your-store.myshopify.com'
      },
      products: {
        list: 'GET /products?shop=your-store.myshopify.com&search=term&limit=20',
        details: 'GET /products/:product_id?shop=your-store.myshopify.com'
      },
      ai_variants: {
        generate: 'POST /ai-variants/generate (FormData: creative_file, product_data, campaign_context, tone_of_voice, variant_handle)'
      },
      brand: {
        analyze: 'GET /brand/analyze?shop=your-store.myshopify.com',
        upload_doc: 'POST /brand/upload-doc (FormData: brand_document, shop, document_type)',
        save_info: 'POST /brand/save-info (JSON: shop, brand_info)',
        summary: 'GET /brand/summary?shop=your-store.myshopify.com'
      }
    },
    documentation: 'Voir les routes individuelles pour plus de détails'
  });
});

// Handler Sentry pour capturer les erreurs
app.use(sentryErrorHandler());

// Handler 404
app.use(notFoundHandler);

// Handler d'erreurs générique
app.use(errorHandler);

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Backend démarré sur le port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 OAuth install: http://localhost:${PORT}/oauth/install?shop=your-store.myshopify.com`);
  console.log(`📄 Snippet test: http://localhost:${PORT}/snippet?av=test&shop=your-store.myshopify.com`);
});

export default app;
