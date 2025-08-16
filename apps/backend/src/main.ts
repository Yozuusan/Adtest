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
