# Adlign Theme App Extension - Version Direct Injection

## 🎯 Objectif
Cette extension permet d'injecter dynamiquement du contenu personnalisé dans les pages produits Shopify selon le paramètre `?adlign_variant=` de l'URL, en utilisant un mapping IA pour détecter automatiquement les éléments à modifier.

## 📁 Structure
```
extensions/adlign-app-extension/
├── assets/
│   └── adlign-micro-kernel.js    # JavaScript qui applique l'injection directe
├── snippets/
│   └── adlign_injector.liquid    # Snippet qui injecte le contenu
├── example_metafield_structure.json  # Exemple de structure pour adlign_data.settings
└── README.md                      # Ce fichier
```

## 🚀 Installation

### 1. Utiliser votre metafield existant
L'extension utilise le metafield `adlign_data.settings` que vous avez déjà configuré.

### 2. Structurer les données dans le metafield
Dans le metafield `adlign_data.settings`, ajoutez une structure JSON comme ceci :
```json
{
  "test": {
    "title": "🎯 INJECTION DIRECTE RÉUSSIE - [Nom du produit]",
    "cta": "🎯 INJECTION DIRECTE",
    "description": "<p><strong>✅ Injection directe fonctionnelle !</strong> Plus d'ancien script.</p>"
  },
  "promo": {
    "title": "🔥 OFFRE SPÉCIALE LIMITÉE - 50% DE RÉDUCTION",
    "cta": "🔥 PROFITER DE L'OFFRE",
    "description": "<p><strong>🔥 Promotion exceptionnelle !</strong> Offre valable jusqu'à épuisement des stocks.</p>"
  }
}
```

### 3. Ajouter le snippet dans votre thème
Dans votre template produit (ex: `product.liquid`), ajoutez :
```liquid
{% render 'adlign_injector' %}
```

### 4. Tester
- Page normale : `/products/echantillon-savon-a-barres-de-noix-de-coco`
- Avec variante : `/products/echantillon-savon-a-barres-de-noix-de-coco?adlign_variant=test`

## 🔧 Configuration

### Champs supportés dans chaque variante :
- `title` : Titre principal
- `subtitle` : Sous-titre
- `description_html` : Description en HTML
- `hero_image` : URL de l'image principale
- `usp_list` : Array des arguments de vente
- `cta_primary` : Texte du bouton principal
- `cta_secondary` : Texte du bouton secondaire
- `badges` : Array des badges
- `campaign_ref` : Référence de campagne
- `theme_fingerprint` : Empreinte du thème

### Mapping IA des sélecteurs :
L'extension utilise un mapping intelligent pour détecter automatiquement :
- **Titre** : `h1`, `.product-title`, `.product__title`
- **Image** : `.product__media-item img`, `.product__image img`
- **CTA** : `button[type="submit"]`, `[name="add"]`, `.add-to-cart`
- **Description** : `.product__description`, `.product-description`
- **USP** : `.product__usp`, `.product-usp`, `.product__benefits`
- **Badges** : `.product__badge`, `.product-badge`, `.product__tag`

## 🧪 Test

Une fois le snippet intégré et un metafield de variante créé :

1. **Accédez à une page produit de votre boutique.**
2. **Ajoutez le paramètre `?adlign_variant=` à l'URL :**
   - Exemple : `https://adlign.myshopify.com/products/echantillon-savon-a-barres-de-noix-de-coco?adlign_variant=test`

Vous devriez voir les éléments de la page (titre, CTA, description) se modifier dynamiquement selon les données de votre metafield.

## 🐛 Debug
En mode design, des messages d'information s'affichent pour vous aider à diagnostiquer les problèmes.

### Debug en console :
Tapez `debugAdlignDirect()` dans la console pour voir :
- La variante active
- Le nombre de modifications
- Les éléments marqués
- Le test des sélecteurs

## 📊 Analytics
L'extension envoie automatiquement des événements `variant_view` au backend Adlign.

## 🔒 Sécurité
- Vérification des metafields Shopify
- Pas d'injection de code malveillant
- Fallbacks si les sélecteurs ne sont pas trouvés
- Protection contre la modification des éléments de prix
- MutationObserver pour gérer les changements dynamiques du DOM

## 💡 Avantages de cette approche
- ✅ Réutilise votre metafield existant
- ✅ Mapping IA automatique des sélecteurs
- ✅ Injection directe dans le DOM (comme l'ancien système)
- ✅ Pas de duplication de produits ou de pages
- ✅ Conserve la logique du thème (variants, prix, checkout)
- ✅ Structure JSON flexible et extensible
- ✅ Gestion des mutations DOM (variants, rehydratation)
- ✅ Garde-fou anti-double exécution
- ✅ Nettoyage automatique des anciennes variables

## 🔄 Prochaines étapes
1. **Mapping IA complet** : Remplacer le mapping statique par un mapping généré automatiquement
2. **Analyse de thème** : Détecter automatiquement les sélecteurs CSS pertinents
3. **Gestion des variants** : Réappliquer le contenu lors des changements de variant
4. **Cache et performance** : Optimiser le chargement et l'application des patchs

## 🎯 Compatibilité avec l'ancien système
Cette extension est basée sur l'ancien backend Adlign qui fonctionnait et inclut :
- **Injection directe** dans le DOM
- **Mapping IA** des sélecteurs
- **Garde-fou** anti-double exécution
- **Nettoyage** des anciennes variables
- **Protection** des éléments de prix
- **Animation** des modifications
- **Notification** de succès
- **Debug** complet en console
