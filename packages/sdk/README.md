# @adlign/sdk

SDK officiel pour l'API Adlign - Client TypeScript/JavaScript pour interagir avec les services Adlign.

## 🚀 Installation

```bash
npm install @adlign/sdk
```

## 📖 Utilisation

### Initialisation du client

```typescript
import { AdlignClient } from '@adlign/sdk';

const client = new AdlignClient({
  baseURL: 'https://api.adlign.com',
  timeout: 30000,
  apiKey: 'your-api-key' // optionnel
});
```

### Authentification

```typescript
// Définir le token d'authentification
client.setAuthToken('your-jwt-token');

// Effacer le token
client.clearAuthToken();
```

### Variantes

```typescript
// Créer une variante
const variant = await client.createVariant(
  'gid://shopify/Product/123456789',
  {
    title: {
      type: 'text',
      value: 'Nouveau titre produit',
      priority: 1
    },
    image: {
      type: 'image',
      src: 'https://example.com/image.jpg',
      w: 800,
      h: 600
    }
  },
  'campaign-123'
);

// Récupérer une variante
const variantData = await client.getVariant('variant-handle');

// Lister les variantes
const variants = await client.listVariants({
  page: 1,
  limit: 20,
  search: 'produit'
});
```

### Adaptateurs de thème

```typescript
// Récupérer l'adaptateur de thème
const adapter = await client.getThemeAdapter('product-handle', 'variant-handle');

// Déclencher la génération d'un adaptateur
const job = await client.buildThemeAdapter(
  'https://shop.myshopify.com/products/product-handle',
  'shop-id'
);
```

### Analytics

```typescript
// Tracker un événement
await client.trackEvent({
  event_type: 'variant_view',
  variant_id: 'variant-123',
  product_gid: 'gid://shopify/Product/123456789',
  campaign_ref: 'campaign-123',
  user_agent: navigator.userAgent
});

// Récupérer les performances
const performance = await client.getVariantPerformance('variant-123', 'day');
```

### OAuth

```typescript
// Échanger le code contre un token
const auth = await client.exchangeCodeForToken('auth-code', 'shop.myshopify.com');
```

### Utilitaires

```typescript
// Vérifier la santé de l'API
const health = await client.healthCheck();
```

## 🔧 Configuration

### Options du client

| Option | Type | Défaut | Description |
|--------|------|---------|-------------|
| `baseURL` | `string` | **requis** | URL de base de l'API |
| `timeout` | `number` | `30000` | Timeout en millisecondes |
| `apiKey` | `string` | `undefined` | Clé API optionnelle |

### Gestion des erreurs

Le SDK gère automatiquement :
- Timeouts de requêtes
- Erreurs HTTP
- Parsing JSON
- Authentification

```typescript
try {
  const result = await client.createVariant(/* ... */);
} catch (error) {
  if (error.message.includes('timeout')) {
    // Gérer le timeout
  } else if (error.message.includes('HTTP 401')) {
    // Gérer l'erreur d'authentification
  }
}
```

## 📚 Types TypeScript

Le SDK exporte tous les types nécessaires :

```typescript
import type {
  VariantPayload,
  ThemeAdapter,
  AnalyticsEvent,
  Signed,
  ApiResponse,
  // ... et plus encore
} from '@adlign/sdk';
```

## 🧪 Tests

```bash
npm run build
npm run type-check
npm run lint
```

## 📦 Build

```bash
npm run build
```

Le build génère :
- `dist/index.js` - Bundle JavaScript
- `dist/index.d.ts` - Déclarations TypeScript
- Source maps et métadonnées

## 🤝 Contribution

1. Fork le projet
2. Crée une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvre une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.
