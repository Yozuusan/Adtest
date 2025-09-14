/**
 * Template Generator - Utilise le mapping existant pour créer des templates custom
 * Basé sur le système de mapping worker existant
 */

// Exemple de ThemeAdapter généré par le worker mapping existant
const exampleThemeAdapter = {
  "selectors": {
    "title": "h1.product-title",
    "description": ".product-description p",
    "cta_primary": ".btn-add-to-cart",
    "hero_image": ".product-image img",
    "usp_list": ".product-features ul",
    "badges": ".product-badges .badge"
  },
  "order": ["title", "hero_image", "description", "usp_list", "cta_primary", "badges"],
  "confidence": {
    "title": 0.95,
    "description": 0.89,
    "cta_primary": 0.92,
    "hero_image": 0.85,
    "usp_list": 0.78,
    "badges": 0.65
  },
  "strategies": {
    "title": "text",
    "description": "html", 
    "cta_primary": "text",
    "hero_image": "image_src",
    "usp_list": "list_text",
    "badges": "text"
  },
  "theme_fingerprint": "dawn-v2.1.0-product-page",
  "created_at": "2025-01-15T10:00:00Z"
};

/**
 * Génère un template Liquid à partir du ThemeAdapter
 */
function generateLiquidTemplate(themeAdapter, productHandle) {
  const { selectors, strategies, order } = themeAdapter;
  
  let template = `{% comment %}
  Template Auto-généré pour ${productHandle}
  Basé sur le mapping: ${themeAdapter.theme_fingerprint}
  Généré le: ${new Date().toISOString()}
{% endcomment %}

{% comment %} Récupérer les données du metaobject {% endcomment %}
{% assign adlign_variant = request.query_string | split: 'adlign_variant=' | last | split: '&' | first %}
{% assign variant_metaobject = shop.metaobjects['adlign_variant'][adlign_variant] %}
{% assign content_json = variant_metaobject.content_json.value | parse_json %}

<div class="adlign-product-template" data-template="${productHandle}">
`;

  // Générer le HTML pour chaque élément dans l'ordre optimal
  order.forEach(field => {
    if (!selectors[field]) return;
    
    const selector = selectors[field];
    const strategy = strategies[field];
    const confidence = themeAdapter.confidence[field];
    
    // Skip les éléments avec faible confidence
    if (confidence < 0.7) return;
    
    template += `
  {% comment %} ${field.toUpperCase()} - Confidence: ${confidence.toFixed(2)} {% endcomment %}
  <div class="adlign-${field}" data-adlign-field="${field}" data-original-selector="${selector}">
`;
    
    switch (strategy) {
      case 'text':
        template += `    {{ content_json.${field} | default: product.${field === 'title' ? 'title' : field} }}`;
        break;
        
      case 'html':
        template += `    {{ content_json.${field}_html | default: product.${field === 'description' ? 'description' : field} }}`;
        break;
        
      case 'image_src':
        template += `    {% if content_json.${field} %}
      <img src="{{ content_json.${field} }}" alt="{{ content_json.title | default: product.title }}" class="adlign-dynamic-image">
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
    /* Styles copiés depuis le thème original */
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
function generateCSSFromSelectors(selectors) {
  let css = '';
  
  Object.entries(selectors).forEach(([field, selector]) => {
    css += `
  .adlign-${field} {
    /* Hérite du style de: ${selector} */
  }`;
  });
  
  return css;
}

/**
 * API Function: Génère template pour un produit
 */
async function generateTemplateForProduct(shop, productGid, productHandle) {
  try {
    // 1. Récupérer le ThemeAdapter depuis le cache (déjà généré par le worker)
    const themeAdapter = await cacheService.getThemeAdapter(shop, 'theme_fingerprint');
    
    if (!themeAdapter) {
      throw new Error('Aucun mapping trouvé. Lancez d\'abord POST /mapping/build');
    }
    
    // 2. Générer le template Liquid
    const templateContent = generateLiquidTemplate(themeAdapter, productHandle);
    
    // 3. Nom du template custom
    const templateName = `templates/product.adlign-${productHandle}.liquid`;
    
    // 4. Déployer sur Shopify
    await shopifyService.deployTemplate(shop, templateName, templateContent);
    
    // 5. Assigner le produit au template
    await shopifyService.assignProductToTemplate(shop, productGid, `adlign-${productHandle}`);
    
    // 6. Incrémenter le compteur de templates
    await incrementTemplateUsage(shop, templateName, productGid);
    
    return {
      success: true,
      template_name: templateName,
      product_handle: productHandle,
      theme_fingerprint: themeAdapter.theme_fingerprint,
      confidence_avg: Object.values(themeAdapter.confidence).reduce((a, b) => a + b) / Object.values(themeAdapter.confidence).length
    };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Workflow complet:
 * 1. POST /mapping/build (existant) - Map la page
 * 2. POST /templates/generate-from-mapping (nouveau) - Génère template custom
 */

module.exports = {
  generateLiquidTemplate,
  generateTemplateForProduct,
  generateCSSFromSelectors
};