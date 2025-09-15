# 🚀 Déploiement Automatique de Templates Adlign

## 🎯 Vision Business Scalable

L'objectif : **Zéro intervention manuelle** pour l'utilisateur. Workflow 100% automatisé.

### 📋 Workflow Utilisateur Final (UX optimale)

```
Utilisateur Adlign:
1. Se connecte à son compte Adlign
2. Sélectionne un produit dans sa liste
3. Clique "Générer Template IA" 
4. ⏳ 2-3 minutes d'attente (mapping + génération + déploiement)
5. ✅ "Template déployé ! Testez votre produit optimisé"
6. Reçoit le lien direct du produit avec template
```

**L'utilisateur ne touche JAMAIS à Shopify directement.**

## 🔧 Architecture Technique

### Phase 1: Authentication Shopify (Une seule fois)
```javascript
// L'utilisateur connecte son store via OAuth
GET /oauth/install?shop=boutique-client.myshopify.com

// Adlign obtient les permissions nécessaires:
- read_themes / write_themes (pour déployer templates)
- read_products (pour lister les produits)
- write_script_tags (pour injecter le micro-kernel)
```

### Phase 2: Workflow Automatisé
```javascript
// 1. Utilisateur clique "Générer Template"
POST /templates/auto-generate
{
  "shop": "boutique-client.myshopify.com",
  "product_gid": "gid://shopify/Product/123456789"
}

// 2. Backend Adlign fait TOUT automatiquement:
async function autoGenerateTemplate(shop, productGid) {
  // A. Mapping de la page produit (existing worker)
  const mappingJob = await POST /mapping/build
  
  // B. Attendre que le mapping soit terminé
  await waitForMappingComplete(mappingJob.id)
  
  // C. Générer le template basé sur le mapping
  const template = await generateLiquidTemplate(themeAdapter, productHandle)
  
  // D. Déployer automatiquement sur Shopify
  await shopifyAPI.deployTemplate(shop, templateName, template)
  
  // E. Assigner le template au produit (optionnel)
  await shopifyAPI.assignProductToTemplate(productGid, templateName)
  
  // F. Retourner l'URL de test
  return {
    success: true,
    test_url: `https://${shop}/products/${productHandle}?template_suffix=adlign-${productHandle}`,
    template_name: templateName
  }
}
```

## 🏗️ Implémentation Concrète

### 1. Permissions Shopify Requises

```javascript
// Dans notre OAuth, demander ces scopes:
const REQUIRED_SCOPES = [
  'read_themes',      // Lire les thèmes existants
  'write_themes',     // Déployer nos templates
  'read_products',    // Lister les produits du client
  'write_script_tags' // Injecter notre micro-kernel (optionnel)
];
```

### 2. API de Déploiement Shopify

```javascript
// shopifyService.deployTemplate() - déjà implémenté !
async deployTemplate(shop, templateKey, templateContent) {
  // 1. Récupérer le thème publié
  const themes = await fetch(`https://${shop}/admin/api/2024-07/themes.json`)
  const publishedTheme = themes.find(t => t.role === 'main')
  
  // 2. Déployer le template
  const response = await fetch(
    `https://${shop}/admin/api/2024-07/themes/${publishedTheme.id}/assets.json`,
    {
      method: 'PUT',
      headers: { 'X-Shopify-Access-Token': token },
      body: JSON.stringify({
        asset: {
          key: templateKey,                    // "templates/product.adlign-savoncoco.liquid"
          value: templateContent               // Notre template généré
        }
      })
    }
  )
  
  return { success: true, template_key: templateKey }
}
```

### 3. Template Suffix automatique

```javascript
// Shopify utilise automatiquement le template si le suffix match
// Produit: "savon-coco" 
// Template: "product.adlign-savoncoco.liquid"
// URL automatique: /products/savon-coco?template_suffix=adlign-savoncoco

// L'utilisateur reçoit directement cette URL pour tester
```

## 💼 Business Model Integration

### Pricing Tiers avec Quotas Templates

```javascript
const PRICING_LIMITS = {
  'starter': { 
    templates_per_month: 3,
    price: '$29/month' 
  },
  'business': { 
    templates_per_month: 15,
    price: '$99/month' 
  },
  'enterprise': { 
    templates_per_month: 100,
    price: '$299/month' 
  }
}

// Avant génération, vérifier le quota
if (user.templates_used_this_month >= user.plan.templates_per_month) {
  return { error: 'Quota dépassé. Upgradez votre plan.' }
}
```

### Multi-produits Automatisé

```javascript
// L'utilisateur peut sélectionner plusieurs produits
POST /templates/bulk-generate
{
  "shop": "boutique-client.myshopify.com",
  "product_gids": [
    "gid://shopify/Product/123456789",
    "gid://shopify/Product/987654321",
    "gid://shopify/Product/555666777"
  ]
}

// Backend traite en parallèle ou en série
async function bulkGenerateTemplates(shop, productGids) {
  const results = []
  
  for (const productGid of productGids) {
    try {
      const result = await autoGenerateTemplate(shop, productGid)
      results.push({ productGid, success: true, ...result })
    } catch (error) {
      results.push({ productGid, success: false, error: error.message })
    }
  }
  
  return {
    total: productGids.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  }
}
```

## 🎉 Expérience Utilisateur Final

### Dashboard Adlign
```
┌─────────────────────────────────────┐
│ 📊 Mes Templates Générés            │
├─────────────────────────────────────┤
│ ✅ Savon Coco        | Actif         │
│ ⏳ Crème Visage      | En cours...   │
│ ❌ Huile Argan       | Échec mapping │
│                                     │
│ [Générer Nouveau Template]          │
│                                     │
│ Quota: 2/15 templates ce mois       │
└─────────────────────────────────────┘
```

### Sélection Produit
```
┌─────────────────────────────────────┐
│ 🛍️ Choisissez vos produits          │
├─────────────────────────────────────┤
│ ☑️ Savon à la noix de coco          │
│ ☐ Crème hydratante bio             │
│ ☐ Huile d'argan pure               │
│ ☐ Shampoing naturel                │
│                                     │
│ [Générer Templates] (1 sélectionné) │
│ Coût: 1 template de votre quota     │
└─────────────────────────────────────┘
```

## 🔮 Vision Long Terme

1. **IA Prédictive**: "Nous recommandons de créer un template pour 'Crème Visage' car il a 85% de potentiel d'amélioration"

2. **A/B Testing Automatique**: "Template vs Original - +12.3% conversion après 7 jours"

3. **Templates Saisonniers**: "Voulez-vous activer le template Black Friday pour tous vos produits?"

4. **Analytics Avancées**: "Vos templates ont généré +€2,847 de revenus supplémentaires ce mois"

## ✅ Action Items

1. **Finaliser l'API de déploiement automatique** (quasi fini)
2. **Tester le workflow complet end-to-end**
3. **Intégrer les quotas dans le dashboard**
4. **UX/UI pour la sélection multi-produits**

**L'utilisateur final ne voit que : "Choisir produits → Cliquer générer → Recevoir liens de test"**

Tout le reste (mapping, génération, déploiement) est invisible et automatique.