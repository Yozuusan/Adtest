import { Router } from 'express';
import { shopifyService } from '../services/shopify';
import { createError } from '../middleware/errorHandler';

const router = Router();

/**
 * Installation automatique des metaobjects
 * POST /install/setup
 */
router.post('/setup', async (req, res, next) => {
  try {
    const { shop } = req.body;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    // Vérifier que la boutique est authentifiée
    const isAuthenticated = await shopifyService.isShopAuthenticated(shop);
    if (!isAuthenticated) {
      throw createError('Shop not authenticated. Please install the app first.', 401);
    }

    console.log(`🚀 Starting Adlign setup for shop: ${shop}`);

    // 1. Créer la définition de metaobject
    const definitionCreated = await shopifyService.ensureMetaobjectDefinition(shop);
    
    if (!definitionCreated) {
      throw createError('Failed to create metaobject definition', 500);
    }

    console.log(`✅ Adlign setup completed for shop: ${shop}`);

    res.json({
      success: true,
      message: 'Adlign setup completed successfully',
      data: {
        shop,
        metaobject_definition_created: definitionCreated,
        setup_completed_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Vérifier l'état de l'installation
 * GET /install/status?shop=your-store.myshopify.com
 */
router.get('/status', async (req, res, next) => {
  try {
    const { shop } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    // Vérifier l'authentification
    const isAuthenticated = await shopifyService.isShopAuthenticated(shop);
    
    if (!isAuthenticated) {
      res.json({
        success: true,
        data: {
          shop,
          authenticated: false,
          setup_required: true,
          install_url: shopifyService.generateInstallUrl(shop)
        }
      });
      return;
    }

    // Vérifier si les metaobjects sont configurés
    // (on pourrait ajouter une vérification plus poussée ici)
    
    res.json({
      success: true,
      data: {
        shop,
        authenticated: true,
        setup_required: false,
        ready_for_variants: true,
        checked_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Créer des variants de démonstration
 * POST /install/demo-variants
 */
router.post('/demo-variants', async (req, res, next) => {
  try {
    const { shop, product_gid } = req.body;
    
    if (!shop || !product_gid) {
      throw createError('Missing required fields: shop, product_gid', 400);
    }

    // Vérifier l'authentification
    const isAuthenticated = await shopifyService.isShopAuthenticated(shop);
    if (!isAuthenticated) {
      throw createError('Shop not authenticated', 401);
    }

    // S'assurer que la définition existe
    await shopifyService.ensureMetaobjectDefinition(shop);

    // Créer des variants de démonstration
    const demoVariants = [
      {
        handle: 'demo-black-friday',
        content: {
          title: '🔥 BLACK FRIDAY - 50% OFF',
          subtitle: 'Offre limitée - Dépêchez-vous !',
          description_html: '<p><strong>🔥 OFFRE EXCEPTIONNELLE BLACK FRIDAY !</strong></p><p>Profitez de 50% de réduction sur ce produit premium. Offre valable jusqu\'à épuisement des stocks.</p><ul><li>✅ Qualité garantie</li><li>🚚 Livraison rapide</li><li>↩️ Retour facile</li></ul>',
          cta_primary: '🔥 -50% MAINTENANT !',
          cta_secondary: 'Voir les détails',
          usp_list: ['🔥 -50% de réduction', '🚚 Livraison gratuite', '↩️ Retour 30 jours', '💳 Paiement sécurisé'],
          badges: ['BLACK FRIDAY', 'PROMO', '-50%'],
          campaign_ref: 'BF-2025-DEMO',
          theme_fingerprint: 'auto-detected'
        }
      },
      {
        handle: 'demo-summer-collection',
        content: {
          title: '☀️ COLLECTION ÉTÉ 2025',
          subtitle: 'Nouveautés exclusives disponibles',
          description_html: '<p><strong>☀️ DÉCOUVREZ NOTRE COLLECTION ÉTÉ 2025 !</strong></p><p>Des créations uniques et tendances pour un été stylé. Matériaux durables et confort optimal.</p><ul><li>🌿 Matériaux éco-responsables</li><li>✨ Design exclusif</li><li>💫 Confort premium</li></ul>',
          cta_primary: '☀️ DÉCOUVRIR LA COLLECTION',
          cta_secondary: 'Précommander',
          usp_list: ['☀️ Collection exclusive', '🌿 Éco-responsable', '✨ Design unique', '💫 Confort optimal'],
          badges: ['NOUVEAUTÉ', 'ÉTÉ 2025', 'EXCLUSIF'],
          campaign_ref: 'SUMMER-2025-DEMO',
          theme_fingerprint: 'auto-detected'
        }
      }
    ];

    const createdVariants = [];
    
    for (const variant of demoVariants) {
      try {
        const metaobject = await shopifyService.createOrUpdateMetaobject(
          shop,
          'adlign_variant',
          [
            { key: 'product_gid', value: product_gid },
            { key: 'handle', value: variant.handle },
            { key: 'content_json', value: JSON.stringify(variant.content) },
            { key: 'created_at', value: new Date().toISOString() }
          ],
          variant.handle
        );
        
        createdVariants.push({
          handle: variant.handle,
          metaobject_id: metaobject.id,
          test_url: `${shop}/products/[PRODUCT-HANDLE]?adlign_variant=${variant.handle}`
        });
      } catch (error) {
        console.error(`Failed to create demo variant ${variant.handle}:`, error);
      }
    }

    res.json({
      success: true,
      message: 'Demo variants created successfully',
      data: {
        shop,
        product_gid,
        variants_created: createdVariants,
        total_created: createdVariants.length,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;