/**
 * Test du déploiement de template Adlign sur Shopify
 * Utilise l'API Shopify directement pour déployer le template product.adlign-savoncoco.liquid
 */

const SHOP = 'adlign';
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN; // Token d'accès depuis les env

console.log('🧪 Test déploiement template Adlign');
console.log(`Shop: ${SHOP}.myshopify.com`);

async function deployAdlignTemplate() {
  try {
    // 1. Récupérer le thème actuel (published)
    console.log('\n📋 1. Récupération du thème publié...');
    
    const themesResponse = await fetch(`https://${SHOP}.myshopify.com/admin/api/2024-07/themes.json`, {
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
      }
    });
    
    const themesData = await themesResponse.json();
    const publishedTheme = themesData.themes.find(theme => theme.role === 'main');
    
    if (!publishedTheme) {
      throw new Error('Aucun thème publié trouvé');
    }
    
    console.log(`✅ Thème publié trouvé: ${publishedTheme.name} (ID: ${publishedTheme.id})`);
    
    // 2. Contenu du template product.adlign-savoncoco.liquid
    const templateContent = `{% comment %}
  Template Auto-généré pour echantillon-savon-a-barres-de-noix-de-coco
  Basé sur le mapping theme detecté
  Généré le: ${new Date().toISOString()}
{% endcomment %}

{% comment %} Récupérer les données du metaobject {% endcomment %}
{% assign adlign_variant = request.query_string | split: 'adlign_variant=' | last | split: '&' | first %}
{% assign variant_metaobject = shop.metaobjects['adlign_variant'][adlign_variant] %}
{% assign content_json = variant_metaobject.content_json.value | parse_json %}

<div class="adlign-product-template" data-template="echantillon-savon-a-barres-de-noix-de-coco" data-theme="dawn">
  
  {% comment %} PRODUCT_TITLE - Confidence: 0.95 {% endcomment %}
  <div class="adlign-product_title" data-adlign-field="product_title">
    <h1 class="product__title">
      {{ content_json.product_title | default: product.title }}
    </h1>
  </div>

  {% comment %} PRODUCT_DESCRIPTION - Confidence: 0.89 {% endcomment %}  
  <div class="adlign-product_description" data-adlign-field="product_description">
    <div class="product__description rte">
      {{ content_json.product_description_html | default: product.description }}
    </div>
  </div>

  {% comment %} HERO_IMAGE - Confidence: 0.85 {% endcomment %}
  <div class="adlign-hero_image" data-adlign-field="hero_image">
    {% if content_json.hero_image %}
      <img src="{{ content_json.hero_image }}" alt="{{ content_json.product_title | default: product.title }}" class="adlign-dynamic-image product__media">
    {% else %}
      {{ product.featured_media | image_url: width: 800 | image_tag: class: 'product__media' }}
    {% endif %}
  </div>

  {% comment %} CTA_PRIMARY - Confidence: 0.92 {% endcomment %}
  <div class="adlign-cta_primary" data-adlign-field="cta_primary">
    <button type="submit" name="add" class="btn product-form__cart-submit">
      <span>{{ content_json.cta_primary | default: 'Add to cart' }}</span>
    </button>
  </div>

  {% comment %} USP_LIST - Confidence: 0.78 {% endcomment %}
  <div class="adlign-usp_list" data-adlign-field="usp_list">
    {% if content_json.usp_list %}
      <ul class="product-benefits">
        {% for item in content_json.usp_list %}
          <li>{{ item }}</li>
        {% endfor %}
      </ul>
    {% endif %}
  </div>

  <!-- Form d'ajout au panier (requis pour Shopify) -->
  {% form 'product', product %}
    <input type="hidden" name="id" value="{{ product.selected_or_first_available_variant.id }}">
    <div style="display: none;">
      <input type="submit" value="Add to cart">
    </div>
  {% endform %}

</div>

{% comment %} CSS pour préserver le style Dawn {% endcomment %}
<style>
  .adlign-product-template {
    /* Styles hérités du thème Dawn */
  }
  
  .adlign-product_title h1 {
    /* Hérite du style de: h1.product__title */
  }
  
  .adlign-product_description {
    /* Hérite du style de: .product__description */
  }
</style>

{% comment %} Include Adlign metaobject injector {% endcomment %}
{% render 'adlign_metaobject_injector' %}`;

    // 3. Déployer le template
    console.log('\n🚀 2. Déploiement du template...');
    
    const deployResponse = await fetch(`https://${SHOP}.myshopify.com/admin/api/2024-07/themes/${publishedTheme.id}/assets.json`, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        asset: {
          key: 'templates/product.adlign-savoncoco.liquid',
          value: templateContent
        }
      })
    });
    
    if (!deployResponse.ok) {
      const errorData = await deployResponse.json();
      throw new Error(`Erreur déploiement: ${JSON.stringify(errorData)}`);
    }
    
    const deployData = await deployResponse.json();
    console.log('✅ Template déployé avec succès:', deployData.asset.key);
    
    // 4. Vérifier la liste des templates
    console.log('\n📝 3. Liste des templates produit disponibles:');
    
    const assetsResponse = await fetch(`https://${SHOP}.myshopify.com/admin/api/2024-07/themes/${publishedTheme.id}/assets.json?asset[key]=templates/`, {
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
      }
    });
    
    const assetsData = await assetsResponse.json();
    const productTemplates = assetsData.assets.filter(asset => 
      asset.key.startsWith('templates/product.')
    );
    
    productTemplates.forEach(template => {
      console.log(`  - ${template.key}`);
    });
    
    console.log('\n🎉 Template Adlign déployé ! Tu peux maintenant:');
    console.log(`   1. Aller dans Admin Shopify > Online Store > Themes`);
    console.log(`   2. Actions > Edit code`);
    console.log(`   3. Templates > product.adlign-savoncoco.liquid (doit apparaître)`);
    console.log(`   4. Ou assigner directement à un produit`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return false;
  }
}

// Test avec variables d'environnement
if (!ACCESS_TOKEN) {
  console.error('❌ SHOPIFY_ACCESS_TOKEN manquant dans .env');
  console.log('Ajoute cette ligne dans ton .env:');
  console.log('SHOPIFY_ACCESS_TOKEN=shpat_xxx...');
} else {
  deployAdlignTemplate();
}