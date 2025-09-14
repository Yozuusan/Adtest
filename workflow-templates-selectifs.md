# 🎯 Workflow Templates Multiples Sélectifs

## 📋 Concept Business

### **Règle 80/20**
- 12 produits dans la boutique
- 1-2 produits = 80% du CA  
- Templates custom seulement sur les **produits stratégiques**
- Upsells/sous-produits = Templates conditionnels simples ou rien

## 🎮 Interface Utilisateur

### **Étape 1: Sélection Produit Stratégique**
```
┌─────────────────────────────────┐
│ 🏪 Vos Produits                 │
├─────────────────────────────────┤
│ ☐ Savon Premium (850€/mois)     │ ← Produit principal
│ ☐ Baume Hydratant (120€/mois)   │ 
│ ☐ Pack Famille (200€/mois)      │
│ ☐ Échantillons (10€/mois)       │ ← Pas prioritaire
├─────────────────────────────────┤
│ 📊 Templates utilisés: 1/3      │ ← Compteur plan
│ [🎨 Générer Template Custom]    │
└─────────────────────────────────┘
```

### **Étape 2: Configuration Template**
```
┌─────────────────────────────────────┐
│ 🎨 Nouveau Template Custom         │
├─────────────────────────────────────┤
│ Produit: Savon Premium              │
│ Template source: Dawn Product Page  │ ← Choix du template de base
│                                     │
│ Style souhaité:                     │
│ ◉ Hero Premium (hero + USPs)       │
│ ○ Bundle Comparison                 │  
│ ○ Minimal Clean                    │
│ ○ Custom Upload                    │
│                                     │
│ Éléments à mapper:                  │
│ ☑ Titre produit                    │
│ ☑ Description                      │
│ ☑ Image hero                       │
│ ☑ Liste USP                        │
│ ☑ CTA principal                     │
│ ☐ CTA secondaire                    │
│ ☐ Badges                           │
├─────────────────────────────────────┤
│ [❌ Annuler] [🚀 Générer Template]  │
└─────────────────────────────────────┘
```

## 🚀 Backend Workflow

### **API: Génération Template à la Demande**
```javascript
// POST /templates/generate
{
  "shop": "ma-boutique.myshopify.com",
  "product_gid": "gid://shopify/Product/123",
  "template_style": "hero-premium",
  "source_template": "dawn-product", 
  "mapped_elements": [
    "title", "description", "hero_image", "usp_list", "cta_primary"
  ]
}

// Processus:
async function generateCustomTemplate(req, res) {
  const { shop, product_gid, template_style, source_template, mapped_elements } = req.body;
  
  // 1. Vérifier quota plan utilisateur
  const user = await getUserByShop(shop);
  const templatesUsed = await countTemplatesUsed(shop);
  const templateLimit = getTemplateLimit(user.plan); // Basic=1, Pro=5, Business=∞
  
  if (templatesUsed >= templateLimit) {
    return res.status(403).json({ 
      error: 'template_quota_exceeded',
      used: templatesUsed,
      limit: templateLimit,
      upgrade_required: true
    });
  }
  
  // 2. Récupérer template source du thème
  const baseTemplate = await getThemeTemplate(shop, source_template);
  
  // 3. Créer template custom avec mapping
  const customTemplate = await createMappedTemplate(
    baseTemplate, 
    template_style, 
    mapped_elements,
    product_gid
  );
  
  // 4. Générer nom unique
  const templateName = `product.adlign-${template_style}-${Date.now()}`;
  
  // 5. Déployer sur Shopify
  await deployTemplate(shop, templateName, customTemplate);
  
  // 6. Assigner produit au template
  await assignProductToTemplate(shop, product_gid, templateName);
  
  // 7. Incrémenter compteur
  await incrementTemplateUsage(shop, templateName, product_gid);
  
  res.json({
    success: true,
    template_name: templateName,
    templates_used: templatesUsed + 1,
    templates_remaining: templateLimit - templatesUsed - 1,
    product_url: `https://${shop}/products/${await getProductHandle(product_gid)}?adlign_variant=test`
  });
}
```

## 📊 Gestion Quotas & Compteurs

### **Table: template_usage**
```sql
CREATE TABLE template_usage (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255),
  template_name VARCHAR(255),
  product_gid VARCHAR(255),
  template_style VARCHAR(100),
  created_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);
```

### **Fonctions Compteur**
```javascript
async function countTemplatesUsed(shop) {
  const result = await supabase
    .from('template_usage')
    .select('count')
    .eq('shop_domain', shop)
    .eq('is_active', true);
  
  return result.data?.length || 0;
}

function getTemplateLimit(plan) {
  const limits = {
    'basic': 1,
    'pro': 5, 
    'business': 999
  };
  return limits[plan] || 0;
}

async function incrementTemplateUsage(shop, templateName, productGid) {
  await supabase
    .from('template_usage')
    .insert({
      shop_domain: shop,
      template_name: templateName,
      product_gid: productGid,
      template_style: extractStyleFromName(templateName),
      created_at: new Date()
    });
}
```

## 🎯 Interface Dashboard

### **Templates Actifs**
```
┌─────────────────────────────────────────┐
│ 📊 Mes Templates Custom                 │
├─────────────────────────────────────────┤
│ 🎨 Savon Premium (Hero Style)           │
│    ├ Créé: 15/01/2025                   │
│    ├ Vues: 1,247                        │
│    ├ Conversions: 89 (7.1%)             │
│    └ [✏ Modifier] [📊 Stats] [🗑 Suppr] │
│                                         │
│ 🎨 Pack Famille (Bundle Style)          │  
│    ├ Créé: 10/01/2025                   │
│    ├ Vues: 456                          │
│    ├ Conversions: 23 (5.0%)             │
│    └ [✏ Modifier] [📊 Stats] [🗑 Suppr] │
├─────────────────────────────────────────┤
│ 📈 Quota: 2/5 templates (Plan Pro)      │
│ [⬆ Upgrade Business] [🎨 Nouveau Template] │
└─────────────────────────────────────────┘
```

## 🎮 User Experience

### **Workflow Utilisateur**
1. **Analyse produits** → Identifie le produit star
2. **"Générer Template"** → Sélectionne le produit rentable  
3. **Configuration** → Choisit style + éléments
4. **Génération** → Template créé automatiquement
5. **Test & Optimisation** → URL de test générée
6. **Suivi performance** → Dashboard analytics

### **Business Value**
- ✅ **Focus ROI** - Templates sur produits rentables uniquement
- ✅ **Quotas clairs** - Pricing basé sur nombre de templates
- ✅ **Pas de gaspillage** - Pas de templates sur les upsells inutiles  
- ✅ **Upsell naturel** - "Besoin de plus de templates ? Upgrade !"

Cette approche est **beaucoup plus business-oriented** ! 🎯