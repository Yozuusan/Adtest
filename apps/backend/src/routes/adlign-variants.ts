import { Router } from 'express';
import { shopifyService } from '../services/shopify';
import { createError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /adlign-variants
 * Ajoute une variante Adlign à un produit
 */
router.post('/', async (req, res, next) => {
  try {
    const { shop, product_id, variant_handle, variant_data } = req.body;

    // Validation des champs requis
    if (!shop || !product_id || !variant_handle || !variant_data) {
      throw createError('Missing required fields: shop, product_id, variant_handle, variant_data', 400);
    }

    // Validation de la structure des données de variante
    if (!variant_data.title || !variant_data.cta_primary || !variant_data.campaign_ref) {
      throw createError('Missing required variant fields: title, cta_primary, campaign_ref', 400);
    }

    console.log(`🎯 [API] Création variante ${variant_handle} pour le produit ${product_id} de ${shop}`);

    // Ajouter la variante via le service Shopify
    const result = await shopifyService.addAdlignVariant(
      shop,
      parseInt(product_id),
      variant_handle,
      variant_data
    );

    res.json({
      success: true,
      message: result.message,
      data: result
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /adlign-variants/:product_id
 * Récupère toutes les variantes Adlign d'un produit
 */
router.get('/:product_id', async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const { shop } = req.query;

    if (!shop) {
      throw createError('Missing required query parameter: shop', 400);
    }

    console.log(`📖 [API] Récupération des variantes pour le produit ${product_id} de ${shop}`);

    // Récupérer les settings depuis Shopify
    const settings = await shopifyService.getProductAdlignSettings(shop as string, parseInt(product_id));

    if (!settings) {
      return res.json({
        success: true,
        message: 'Aucune variante Adlign trouvée pour ce produit',
        data: {}
      });
    }

    res.json({
      success: true,
      message: 'Variantes Adlign récupérées avec succès',
      data: settings
    });

  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /adlign-variants/:product_id/:variant_handle
 * Supprime une variante Adlign spécifique
 */
router.delete('/:product_id/:variant_handle', async (req, res, next) => {
  try {
    const { product_id, variant_handle } = req.params;
    const { shop } = req.query;

    if (!shop) {
      throw createError('Missing required query parameter: shop', 400);
    }

    console.log(`🗑️ [API] Suppression de la variante ${variant_handle} du produit ${product_id} de ${shop}`);

    // Récupérer les settings actuels
    const currentSettings = await shopifyService.getProductAdlignSettings(shop as string, parseInt(product_id));
    
    if (!currentSettings || !currentSettings[variant_handle]) {
      throw createError(`Variante ${variant_handle} non trouvée`, 404);
    }

    // Supprimer la variante
    delete currentSettings[variant_handle];

    // Mettre à jour le metafield
    await shopifyService.updateProductAdlignSettings(shop as string, parseInt(product_id), currentSettings);

    res.json({
      success: true,
      message: `Variante ${variant_handle} supprimée avec succès`,
      data: { deleted_variant: variant_handle }
    });

  } catch (error) {
    next(error);
  }
});

export default router;
