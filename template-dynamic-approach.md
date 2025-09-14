# 🎯 Solution Hybride: Templates Conditionnels Scalables

## 📋 Approche Recommandée

### 1. **Template Principal avec Variations Conditionnelles**

```liquid
{% comment %} 
  Template: product.adlign.liquid
  Gère différents types de produits via content_json.template_type
{% endcomment %}

{% assign template_type = content_json.template_type | default: 'standard' %}

{% case template_type %}
  {% when 'hero-product' %}
    {% comment %} Produit principal avec tout le contenu {% endcomment %}
    {% render 'adlign-hero-section', content: content_json %}
    {% render 'adlign-usp-section', content: content_json %}
    {% render 'adlign-comparison-section', content: content_json %}
    
  {% when 'upsell' %}
    {% comment %} Produit upsell simplifié {% endcomment %}
    {% render 'adlign-simple-hero', content: content_json %}
    {% render 'adlign-single-cta', content: content_json %}
    
  {% when 'bundle' %}
    {% comment %} Produit bundle avec comparatif {% endcomment %}
    {% render 'adlign-bundle-hero', content: content_json %}
    {% render 'adlign-bundle-comparison', content: content_json %}
    {% render 'adlign-multiple-ctas', content: content_json %}
    
  {% else %}
    {% comment %} Template standard par défaut {% endcomment %}
    {% render 'adlign-standard-layout', content: content_json %}
{% endcase %}
```

### 2. **Metaobjects avec Type de Template**

```json
{
  "handle": "hero-product-bf-2025",
  "content_json": {
    "template_type": "hero-product",
    "title": "🔥 PRODUIT PHARE - Black Friday",
    "hero_image": "https://...",
    "usp_list": ["50% OFF", "Livraison gratuite", "Garantie 30j"],
    "cta_primary": "ACHETER MAINTENANT",
    "cta_secondary": "Voir les détails",
    "badges": ["BESTSELLER", "LIMITED"],
    "comparison_table": {...}
  }
}
```

```json
{
  "handle": "simple-upsell-bf-2025", 
  "content_json": {
    "template_type": "upsell",
    "title": "Complétez avec cet addon",
    "cta_primary": "Ajouter +5€",
    "price_highlight": "+5€ seulement"
  }
}
```

### 3. **Assignment Intelligent**

```javascript
async function createVariantWithTemplateDetection(req, res) {
  const { shop, product_gid, content_json } = req.body;
  
  // 1. Analyser le type de contenu demandé
  const templateType = content_json.template_type || detectTemplateType(content_json);
  
  // 2. S'assurer que le template existe
  await deployAdlignTemplateIfNeeded(shop);
  
  // 3. Assigner le produit au template (même template pour tous)
  await assignProductToAdlignTemplate(shop, product_gid);
  
  // 4. Le template se charge du rendering conditionnel
  res.json({ 
    success: true, 
    template_type: templateType,
    template_assigned: 'product.adlign' 
  });
}

function detectTemplateType(content_json) {
  if (content_json.comparison_table) return 'bundle';
  if (content_json.usp_list && content_json.hero_image) return 'hero-product'; 
  if (!content_json.hero_image && content_json.cta_primary) return 'upsell';
  return 'standard';
}
```

## 🔄 **Avantages de cette Approche**

### ✅ **Scalable**
- 1 template gérant N types de produits
- Ajout de nouveaux types via snippets
- Pas de duplication de code

### ✅ **Flexible** 
- Chaque produit a sa structure optimisée
- Hero-products vs Upsells vs Bundles
- Personnalisation fine par type

### ✅ **Maintenable**
- Modifications centralisées
- Debug simplifié 
- Rollback facile

### ✅ **Performance**
- Pas de templates multiples
- Cache Shopify optimisé
- Rendering conditionnel léger

## 🎯 **Structure de Fichiers**

```
templates/
├── product.adlign.liquid          # Template principal
└── snippets/
    ├── adlign-hero-section.liquid     # Pour hero-products
    ├── adlign-simple-hero.liquid      # Pour upsells  
    ├── adlign-bundle-hero.liquid      # Pour bundles
    ├── adlign-usp-section.liquid      # USPs détaillés
    ├── adlign-comparison-section.liquid # Comparatifs
    └── adlign-multiple-ctas.liquid    # CTAs multiples
```

## 📊 **Exemple Concret: Boutique 4 Produits**

| Produit | Type | Template | Snippets Utilisés |
|---------|------|----------|-------------------|
| Savon Premium | `hero-product` | `product.adlign` | hero-section + usp-section + badges |
| Addon Baume | `upsell` | `product.adlign` | simple-hero + single-cta |
| Pack Famille | `bundle` | `product.adlign` | bundle-hero + comparison + multiple-ctas |
| Savon Basic | `standard` | `product.adlign` | standard-layout |

### Résultat: **1 template, 4 renderings différents** 🎯

## 🚀 **Implémentation Progressive**

### Phase 1: Template de Base
```liquid
<!-- Version simple pour commencer -->
{% case template_type %}
  {% when 'hero' %}
    <!-- Layout complexe -->
  {% else %}
    <!-- Layout standard -->
{% endcase %}
```

### Phase 2: Snippets Spécialisés
```liquid
<!-- Extraction en snippets réutilisables -->
{% render 'adlign-' | append: template_type | append: '-layout', content: content_json %}
```

### Phase 3: Auto-détection Intelligente
```javascript
// Backend détecte automatiquement le type optimal
const templateType = analyzeContentStructure(content_json);
```

Cette approche combine **scalabilité** et **flexibilité** sans exploser le nombre de templates ! 🎯