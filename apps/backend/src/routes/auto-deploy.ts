import { Router } from 'express';
import { createError } from '../middleware/errorHandler';
import { shopifyService } from '../services/shopify';
import { cacheService } from '../services/cache';
import { quotaService } from '../services/quotaService';

const router = Router();

/**
 * AUTO-DEPLOY: Workflow complet automatisé
 * POST /auto-deploy/generate-template
 * 
 * 1. Map la page produit (si pas déjà fait)
 * 2. Génère le template basé sur le mapping
 * 3. Déploie automatiquement sur Shopify
 * 4. Retourne l'URL de test
 */
router.post('/generate-template', async (req, res, next) => {
  try {
    const { shop, product_gid, product_handle, force_remapping = false } = req.body;
    
    // Validation
    if (!shop || !product_gid || !product_handle) {
      throw createError('Missing required fields: shop, product_gid, product_handle', 400);
    }

    // Vérifier l'authentification
    const isAuthenticated = await shopifyService.isShopAuthenticated(shop);
    if (!isAuthenticated) {
      throw createError('Shop not authenticated. Please reconnect your Shopify store.', 401);
    }

    console.log(`🚀 AUTO-DEPLOY: Starting complete workflow for ${product_handle} on ${shop}`);

    // ===== ÉTAPE 0: VÉRIFICATION QUOTAS & EXISTING TEMPLATE =====
    console.log('📊 Step 0: Check quotas and existing templates...');
    
    // Vérifier si le produit a déjà un template
    if (!force_remapping) {
      const existingTemplate = await quotaService.hasProductTemplate(shop, product_gid);
      if (existingTemplate) {
        console.log(`✅ Template already exists for product: ${existingTemplate.template_name}`);
        return res.json({
          success: true,
          message: 'Template already exists for this product',
          data: {
            template_name: existingTemplate.template_name,
            product_handle: existingTemplate.product_handle,
            product_gid: existingTemplate.product_gid,
            test_url: existingTemplate.test_url,
            theme_fingerprint: existingTemplate.theme_fingerprint,
            confidence_avg: existingTemplate.confidence_avg,
            mapping_elements: existingTemplate.mapping_elements,
            deployed: existingTemplate.deployment_status === 'deployed',
            deployment_time: existingTemplate.deployed_at,
            existing: true
          }
        });
      }
    }
    
    // Vérifier le quota disponible
    const quotaInfo = await quotaService.checkQuota(shop);
    if (quotaInfo.quota_exceeded) {
      throw createError(
        `Template quota exceeded. Plan: ${quotaInfo.plan_type} (${quotaInfo.templates_used}/${quotaInfo.templates_limit}). Please upgrade your plan.`, 
        403
      );
    }
    
    console.log(`📈 Quota check: ${quotaInfo.templates_used}/${quotaInfo.templates_limit} templates used (${quotaInfo.plan_type} plan)`);

    // ===== ÉTAPE 1: MAPPING (si nécessaire) =====
    console.log('📊 Step 1: Check existing mapping...');
    let themeAdapter = null;
    
    if (!force_remapping) {
      // Chercher un mapping existant
      const existingMappings = await searchExistingMappings(shop, product_handle);
      if (existingMappings.length > 0) {
        themeAdapter = existingMappings[0];
        console.log(`✅ Found existing mapping: ${themeAdapter.theme_fingerprint}`);
      }
    }
    
    if (!themeAdapter) {
      console.log('🔍 No existing mapping found, starting new mapping...');
      
      // Déclencher le mapping via le worker
      const mappingResult = await triggerMappingJob(shop, product_gid, product_handle);
      
      if (!mappingResult.success) {
        throw createError(`Mapping failed: ${mappingResult.error}`, 500);
      }
      
      // Attendre que le mapping soit terminé (avec timeout)
      themeAdapter = await waitForMappingCompletion(mappingResult.job_id, 180000); // 3 minutes max
      
      if (!themeAdapter) {
        throw createError('Mapping timeout or failed. Please try again.', 500);
      }
    }

    // ===== ÉTAPE 2: GÉNÉRATION TEMPLATE =====
    console.log('🎨 Step 2: Generate Liquid template...');
    const templateContent = generateLiquidTemplate(themeAdapter, product_handle);
    const templateName = `templates/product.adlign-${product_handle}.liquid`;

    // ===== ÉTAPE 3: DÉPLOIEMENT AUTOMATIQUE =====
    console.log('🚀 Step 3: Deploy to Shopify...');
    const deployResult = await shopifyService.deployTemplate(shop, templateName, templateContent);
    
    if (!deployResult.success) {
      throw createError(`Template deployment failed: ${deployResult.error}`, 500);
    }

    // ===== ÉTAPE 4: GÉNÉRATION URL DE TEST =====
    const testUrl = `https://${shop}/products/${product_handle}?template_suffix=adlign-${product_handle}`;
    
    // ===== ÉTAPE 5: LOGGING & ANALYTICS =====
    await logTemplateGeneration(shop, product_handle, templateName, themeAdapter.theme_fingerprint);

    // ===== ÉTAPE 6: MISE À JOUR QUOTAS & ENREGISTREMENT =====
    console.log('💾 Step 6: Update quotas and record usage...');
    
    const confidenceValues = Object.values(themeAdapter.confidence) as number[];
    const confidenceAvg = confidenceValues.length > 0 ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length : 0;
    const mappingElements = Object.keys(themeAdapter.selectors).length;
    
    // Incrémenter le quota
    const quotaIncremented = await quotaService.incrementUsage(shop);
    if (!quotaIncremented) {
      console.warn('⚠️ Failed to increment quota, but template was deployed successfully');
    }
    
    // Enregistrer l'usage du template
    const templateUsageId = await quotaService.recordTemplateUsage({
      shop_domain: shop,
      template_name: templateName,
      product_gid: product_gid,
      product_handle: product_handle,
      template_style: 'auto-generated',
      theme_fingerprint: themeAdapter.theme_fingerprint,
      shopify_template_key: templateName,
      deployment_status: 'deployed',
      confidence_avg: confidenceAvg,
      mapping_elements: mappingElements,
      test_url: testUrl
    });
    
    // Récupérer le nouveau quota
    const updatedQuota = await quotaService.checkQuota(shop);

    console.log(`✅ AUTO-DEPLOY: Complete workflow finished for ${product_handle}`);
    console.log(`📊 Updated quota: ${updatedQuota.templates_used}/${updatedQuota.templates_limit} templates used`);

    res.json({
      success: true,
      message: 'Template generated and deployed successfully',
      data: {
        template_name: templateName,
        product_handle: product_handle,
        product_gid: product_gid,
        test_url: testUrl,
        theme_fingerprint: themeAdapter.theme_fingerprint,
        confidence_avg: confidenceAvg,
        mapping_elements: mappingElements,
        deployed: true,
        deployment_time: new Date().toISOString(),
        template_usage_id: templateUsageId,
        quota_info: {
          plan_type: updatedQuota.plan_type,
          templates_used: updatedQuota.templates_used,
          templates_limit: updatedQuota.templates_limit,
          templates_remaining: updatedQuota.templates_remaining
        }
      }
    });

  } catch (error) {
    console.error('❌ AUTO-DEPLOY failed:', error);
    next(error);
  }
});

/**
 * AUTO-DEPLOY: Génération en lot pour plusieurs produits
 * POST /auto-deploy/bulk-generate
 */
router.post('/bulk-generate', async (req, res, next) => {
  try {
    const { shop, products, max_concurrent = 3 } = req.body;
    
    // Validation
    if (!shop || !Array.isArray(products) || products.length === 0) {
      throw createError('Missing required fields: shop, products array', 400);
    }

    if (products.length > 20) {
      throw createError('Maximum 20 products per bulk operation', 400);
    }

    const isAuthenticated = await shopifyService.isShopAuthenticated(shop);
    if (!isAuthenticated) {
      throw createError('Shop not authenticated', 401);
    }

    console.log(`🚀 BULK AUTO-DEPLOY: Processing ${products.length} products for ${shop}`);

    // Traitement par lots pour éviter de surcharger Shopify API
    const results = [];
    const chunks = chunkArray(products, max_concurrent);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`📦 Processing chunk ${i + 1}/${chunks.length} (${chunk.length} products)`);
      
      const chunkPromises = chunk.map(async (product) => {
        try {
          const result = await processSingleProduct(shop, product);
          return { ...product, success: true, ...result };
        } catch (error) {
          console.error(`❌ Failed to process ${product.product_handle}:`, error);
          return { 
            ...product, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
      
      // Pause entre les chunks pour respecter les rate limits
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const summary = {
      total: products.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };

    console.log(`✅ BULK AUTO-DEPLOY: Completed ${summary.successful}/${summary.total} products`);

    res.json({
      success: true,
      message: `Bulk template generation completed: ${summary.successful}/${summary.total} successful`,
      data: summary
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /auto-deploy/quota/:shop - Vérifier le quota d'une boutique
 */
router.get('/quota/:shop', async (req, res, next) => {
  try {
    const { shop } = req.params;
    
    if (!shop) {
      throw createError('Shop parameter required', 400);
    }

    const quotaInfo = await quotaService.checkQuota(shop);
    const templateUsage = await quotaService.getTemplateUsage(shop);
    
    res.json({
      success: true,
      data: {
        quota: quotaInfo,
        templates: templateUsage.map(template => ({
          id: template.id,
          template_name: template.template_name,
          product_handle: template.product_handle,
          deployment_status: template.deployment_status,
          confidence_avg: template.confidence_avg,
          test_url: template.test_url,
          created_at: template.created_at,
          deployed_at: template.deployed_at
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auto-deploy/upgrade-plan - Mettre à jour le plan d'une boutique
 */
router.post('/upgrade-plan', async (req, res, next) => {
  try {
    const { shop, plan_type } = req.body;
    
    if (!shop || !plan_type) {
      throw createError('Missing required fields: shop, plan_type', 400);
    }

    const validPlans = ['basic', 'pro', 'business', 'enterprise'];
    if (!validPlans.includes(plan_type)) {
      throw createError(`Invalid plan type. Must be one of: ${validPlans.join(', ')}`, 400);
    }

    const updated = await quotaService.updateUserPlan(shop, plan_type);
    if (!updated) {
      throw createError('Failed to update user plan', 500);
    }

    const updatedQuota = await quotaService.checkQuota(shop);
    
    res.json({
      success: true,
      message: `Plan updated to ${plan_type}`,
      data: {
        quota: updatedQuota
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /auto-deploy/template/:templateId - Désactiver un template
 */
router.delete('/template/:templateId', async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const { shop } = req.body;
    
    if (!templateId || !shop) {
      throw createError('Missing required fields: templateId, shop', 400);
    }

    const deactivated = await quotaService.deactivateTemplate(shop, templateId);
    if (!deactivated) {
      throw createError('Failed to deactivate template', 500);
    }

    const updatedQuota = await quotaService.checkQuota(shop);
    
    res.json({
      success: true,
      message: 'Template deactivated successfully',
      data: {
        quota: updatedQuota
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Chercher les mappings existants pour un produit
 */
async function searchExistingMappings(shop: string, productHandle: string): Promise<any[]> {
  try {
    // TODO: Chercher dans le cache Redis les mappings existants
    // Pour l'instant, retourner vide - sera implémenté quand on aura des mappings
    return [];
  } catch (error) {
    console.error('Error searching existing mappings:', error);
    return [];
  }
}

/**
 * Déclencher un job de mapping
 */
async function triggerMappingJob(shop: string, productGid: string, productHandle: string): Promise<any> {
  try {
    // Construire l'URL du produit
    const productUrl = `https://${shop}/products/${productHandle}`;
    
    // Déclencher le mapping job (API existante)
    const response = await fetch(`http://localhost:3001/mapping/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop_id: shop,
        product_url: productUrl,
        product_gid: productGid
      })
    });
    
    if (!response.ok) {
      throw new Error(`Mapping API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error triggering mapping job:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Attendre la completion du mapping avec polling
 */
async function waitForMappingCompletion(jobId: string, timeoutMs: number = 180000): Promise<any> {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 secondes
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      // Vérifier le statut du job
      const response = await fetch(`http://localhost:3001/mapping/status/${jobId}?shop_id=${jobId.split('-')[0]}`);
      
      if (response.ok) {
        const status = await response.json() as any;
        
        if (status.data?.status === 'completed' && status.data?.result) {
          console.log(`✅ Mapping completed for job ${jobId}`);
          return status.data.result.adapter;
        }
        
        if (status.data?.status === 'failed') {
          throw new Error(`Mapping job failed: ${status.data?.error}`);
        }
        
        console.log(`⏳ Mapping in progress... Status: ${status.data?.status}, Progress: ${status.data?.progress || 0}%`);
      }
      
      // Attendre avant le prochain poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
    } catch (error) {
      console.error('Error polling mapping status:', error);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
  
  console.error(`⏰ Mapping timeout after ${timeoutMs}ms for job ${jobId}`);
  return null;
}

/**
 * Générer le template Liquid (réutilise la logique existante)
 */
function generateLiquidTemplate(themeAdapter: any, productHandle: string): string {
  const { selectors, strategies, order, confidence } = themeAdapter;
  
  let template = `{% comment %}
  Template Auto-généré pour ${productHandle}
  Basé sur le mapping: ${themeAdapter.theme_fingerprint}
  Généré le: ${new Date().toISOString()}
  AUTO-DEPLOY: Generated via Adlign API
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
  <div class="adlign-${field}" data-adlign-field="${field}" data-original-selector="${selector}">
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
</style>

{% comment %} Include Adlign metaobject injector {% endcomment %}
{% render 'adlign_metaobject_injector' %}
`;

  return template;
}

/**
 * Traiter un seul produit pour le bulk
 */
async function processSingleProduct(shop: string, product: any): Promise<any> {
  // Réutiliser la logique du endpoint principal
  // Pour simplifier, on fait un appel à notre propre API
  const response = await fetch(`http://localhost:3001/auto-deploy/generate-template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shop,
      product_gid: product.product_gid,
      product_handle: product.product_handle,
      force_remapping: product.force_remapping || false
    })
  });
  
  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(error.error?.message || 'Failed to process product');
  }
  
  const result = await response.json() as any;
  return result.data;
}

/**
 * Logger la génération de template pour analytics
 */
async function logTemplateGeneration(shop: string, productHandle: string, templateName: string, themeFingerprint: string): Promise<void> {
  try {
    // TODO: Implémenter logging dans Supabase pour analytics
    console.log(`📊 ANALYTICS: Template generated - Shop: ${shop}, Product: ${productHandle}, Template: ${templateName}`);
  } catch (error) {
    console.error('Error logging template generation:', error);
  }
}

/**
 * Diviser un array en chunks
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export default router;