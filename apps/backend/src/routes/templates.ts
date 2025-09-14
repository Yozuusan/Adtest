import { Router } from 'express';
import { createError } from '../middleware/errorHandler';
import { shopifyService } from '../services/shopify';
import { cacheService } from '../services/cache';

const router = Router();

/**
 * Generate template from existing theme mapping
 * POST /templates/generate-from-mapping
 */
router.post('/generate-from-mapping', async (req, res, next) => {
  try {
    const { shop, product_gid, product_handle, theme_fingerprint } = req.body;
    
    // Validation
    if (!shop || !product_gid || !product_handle) {
      throw createError('Missing required fields: shop, product_gid, product_handle', 400);
    }

    // Vérifier l'authentification
    const isAuthenticated = await shopifyService.isShopAuthenticated(shop);
    if (!isAuthenticated) {
      throw createError('Shop not authenticated', 401);
    }

    console.log(`🎯 Generating template for ${product_handle} using mapping from ${shop}`);

    // 1. Récupérer le ThemeAdapter depuis le cache (généré par le worker mapping)
    const themeAdapter = await getThemeAdapterFromCache(shop, theme_fingerprint);
    if (!themeAdapter) {
      throw createError('No theme mapping found. Please run POST /mapping/build first', 404);
    }

    // 2. Générer le template Liquid
    const templateContent = generateLiquidTemplate(themeAdapter, product_handle);
    
    // 3. Nom du template custom per-product
    const templateName = `templates/product.adlign-${product_handle}.liquid`;
    
    // 4. Déployer sur Shopify
    const deployResult = await shopifyService.deployTemplate(shop, templateName, templateContent);
    
    if (!deployResult.success) {
      throw createError(`Template deployment failed: ${deployResult.error}`, 500);
    }

    // 5. Assigner le produit au template (optionnel - peut être fait manuellement)
    // await assignProductToTemplate(shop, product_gid, `adlign-${product_handle}`);
    
    console.log(`✅ Template ${templateName} created and deployed successfully`);

    res.json({
      success: true,
      message: 'Template generated and deployed successfully',
      data: {
        template_name: templateName,
        product_handle: product_handle,
        product_gid: product_gid,
        theme_fingerprint: themeAdapter.theme_fingerprint,
        confidence_avg: Object.values(themeAdapter.confidence).reduce((a: number, b: number) => a + b) / Object.values(themeAdapter.confidence).length,
        deployed: true
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * List generated templates for a shop
 * GET /templates/list
 */
router.get('/list', async (req, res, next) => {
  try {
    const { shop } = req.query;
    
    if (!shop || typeof shop !== 'string') {
      throw createError('Shop parameter is required', 400);
    }

    const isAuthenticated = await shopifyService.isShopAuthenticated(shop);
    if (!isAuthenticated) {
      throw createError('Shop not authenticated', 401);
    }

    // TODO: Implémenter la liste des templates générés
    // Pour l'instant, retourner une liste vide
    const templates: any[] = [];

    res.json({
      success: true,
      data: {
        shop,
        templates,
        count: templates.length
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Récupérer le ThemeAdapter depuis le cache
 */
async function getThemeAdapterFromCache(shop: string, theme_fingerprint?: string): Promise<any> {
  try {
    if (theme_fingerprint) {
      return await cacheService.getThemeAdapter(shop, theme_fingerprint);
    }
    
    // Si pas de fingerprint spécifique, chercher le plus récent
    // TODO: Implémenter la récupération du mapping le plus récent
    return null;
    
  } catch (error) {
    console.error('Error fetching theme adapter from cache:', error);
    return null;
  }
}

/**
 * Génère un template Liquid à partir du ThemeAdapter
 */
function generateLiquidTemplate(themeAdapter: any, productHandle: string): string {
  const { selectors, strategies, order, confidence } = themeAdapter;
  
  let template = `{% comment %}
  Template Auto-généré pour ${productHandle}
  Basé sur le mapping: ${themeAdapter.theme_fingerprint}
  Généré le: ${new Date().toISOString()}
{% endcomment %}

{% comment %} Récupérer les données du metaobject {% endcomment %}
{% assign adlign_variant = request.query_string | split: 'adlign_variant=' | last | split: '&' | first %}
{% assign variant_metaobject = shop.metaobjects['adlign_variant'][adlign_variant] %}
{% assign content_json = variant_metaobject.content_json.value | parse_json %}

<div class="adlign-product-template" data-template="${productHandle}" data-theme-fingerprint="${themeAdapter.theme_fingerprint}">
`;

  // Générer le HTML pour chaque élément dans l'ordre optimal
  order.forEach((field: string) => {
    if (!selectors[field]) return;
    
    const selector = selectors[field];
    const strategy = strategies[field];
    const fieldConfidence = confidence[field];
    
    // Skip les éléments avec faible confidence
    if (fieldConfidence < 0.7) return;
    
    template += `
  {% comment %} ${field.toUpperCase()} - Confidence: ${fieldConfidence.toFixed(2)} - Selector: ${selector} {% endcomment %}
  <div class="adlign-${field}" data-adlign-field="${field}" data-original-selector="${selector}" data-confidence="${fieldConfidence}">
`;
    
    switch (strategy) {
      case 'text':
        template += `    {{ content_json.${field} | default: product.${field === 'product_title' ? 'title' : field} }}`;
        break;
        
      case 'html':
        template += `    {{ content_json.${field}_html | default: product.${field === 'product_description' ? 'description' : field} }}`;
        break;
        
      case 'image_src':
        template += `    {% if content_json.${field} %}
      <img src="{{ content_json.${field} }}" alt="{{ content_json.product_title | default: product.title }}" class="adlign-dynamic-image">
    {% else %}
      {{ product.featured_media | image_url: width: 800 | image_tag }}
    {% endif %}`;
        break;
        
      case 'list_text':
        template += `    {% if content_json.${field} %}
      <ul class="adlign-${field}">
        {% for item in content_json.${field} %}
          <li>{{ item }}</li>
        {% endfor %}
      </ul>
    {% else %}
      <!-- Fallback: keep original content -->
    {% endif %}`;
        break;
    }
    
    template += `
  </div>
`;
  });

  template += `
</div>

{% comment %} CSS pour préserver le style original {% endcomment %}
<style>
  .adlign-product-template {
    /* Styles hérités du thème original */
  }
  
  ${generateCSSFromSelectors(selectors)}
</style>

{% comment %} Include Adlign metaobject injector {% endcomment %}
{% render 'adlign_metaobject_injector' %}
`;

  return template;
}

/**
 * Génère CSS basé sur les selectors originaux
 */
function generateCSSFromSelectors(selectors: Record<string, string>): string {
  let css = '';
  
  Object.entries(selectors).forEach(([field, selector]) => {
    css += `
  .adlign-${field} {
    /* Hérite du style de: ${selector} */
  }`;
  });
  
  return css;
}

export default router;