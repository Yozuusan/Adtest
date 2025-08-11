# @adlign/types

Types TypeScript partagés pour le projet Adlign - Source de vérité pour toutes les interfaces et types.

## 🚀 Installation

```bash
npm install @adlign/types
```

## 📚 Types disponibles

### 🔐 Sécurité et Authentification

```typescript
import type { Signed, AuthToken, AuthHeaders } from '@adlign/types';

// Type générique pour les payloads signés
interface Signed<T> {
  payload: T;
  signature: string;
  nonce: string;
  timestamp: number;
  algorithm: 'HMAC-SHA256';
}

// Token d'authentification
interface AuthToken {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  scope: string;
  shop_id: string;
}
```

### 🛍️ Variantes et Produits

```typescript
import type { VariantPayload, VariantSlot, VariantMeta } from '@adlign/types';

// Payload d'une variante
interface VariantPayload {
  meta: {
    product_gid: string;
    campaign_ref: string;
    created_at: string;
    expires_at?: string;
  };
  slots: {
    [key: string]: VariantSlot;
  };
}

// Slot d'une variante
interface VariantSlot {
  type: 'text' | 'image' | 'cta' | 'usp' | 'badge';
  value: string;
  src?: string;
  w?: number;
  h?: number;
  priority?: number;
}
```

### 🎨 Adaptateurs de Thème

```typescript
import type { ThemeAdapter, ElementSelector } from '@adlign/types';

// Adaptateur de thème
interface ThemeAdapter {
  id: string;
  theme_id: string;
  product_handle: string;
  selectors: ElementSelector[];
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

// Sélecteur d'élément
interface ElementSelector {
  key: string;
  selector: string;
  type: 'text' | 'image' | 'cta' | 'usp' | 'badge';
  fallback_selector?: string;
  confidence_score: number;
  order: number;
  attributes?: Record<string, string>;
}
```

### 📊 Analytics

```typescript
import type { AnalyticsEvent, VariantPerformance } from '@adlign/types';

// Événement d'analytics
interface AnalyticsEvent {
  id: string;
  event_type: 'variant_view' | 'variant_click' | 'variant_conversion';
  variant_id: string;
  product_gid: string;
  campaign_ref: string;
  user_agent?: string;
  ip_address?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Performance d'une variante
interface VariantPerformance {
  variant_id: string;
  views: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversion_rate: number;
  revenue: number;
  period: 'day' | 'week' | 'month';
  start_date: string;
  end_date: string;
}
```

### 🏪 Shopify

```typescript
import type { 
  ShopifyOAuthResponse, 
  ShopifyMetaobject, 
  ShopifyProduct 
} from '@adlign/types';

// Réponse OAuth Shopify
interface ShopifyOAuthResponse {
  access_token: string;
  scope: string;
  expires_in: number;
  associated_user_scope?: string;
  associated_user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    account_owner: boolean;
    locale: string;
    collaborator: boolean;
    email_verified: boolean;
  };
}

// Metaobject Shopify
interface ShopifyMetaobject {
  id: string;
  type: string;
  fields: MetaobjectField[];
  handle: string;
  created_at: string;
  updated_at: string;
}
```

### 🔧 Types Communs

```typescript
import type { 
  ApiResponse, 
  PaginatedResponse, 
  QueryFilters,
  BaseEntity 
} from '@adlign/types';

// Réponse d'API standardisée
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  request_id?: string;
}

// Réponse paginée
interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Filtres de requête
interface QueryFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
  [key: string]: any;
}
```

## 🎯 Types utilitaires

```typescript
import type {
  ShopifyGID,
  ProductHandle,
  ShopDomain,
  URL,
  ISOTimestamp,
  UUID,
  Hash,
  HMACSignature
} from '@adlign/types';

// Types alias pour une meilleure lisibilité
type ShopifyGID = string;        // Identifiant Shopify (GID)
type ProductHandle = string;     // Handle de produit
type ShopDomain = string;        // Domaine de boutique
type URL = string;               // URL
type ISOTimestamp = string;      // Timestamp ISO
type UUID = string;              // UUID
type Hash = string;              // Hash
type HMACSignature = string;     // Signature HMAC
```

## 🧪 Utilisation

### Import des types

```typescript
// Import de tous les types
import type * as AdlignTypes from '@adlign/types';

// Import spécifique
import type { VariantPayload, ThemeAdapter } from '@adlign/types';

// Import avec alias
import type { VariantPayload as VP } from '@adlign/types';
```

### Exemple d'utilisation

```typescript
import type { VariantPayload, Signed, ApiResponse } from '@adlign/types';

// Fonction qui utilise les types
async function createVariant(
  payload: VariantPayload
): Promise<ApiResponse<Signed<VariantPayload>>> {
  // Logique de création
  return {
    success: true,
    data: {
      payload,
      signature: 'hmac-signature',
      nonce: 'unique-nonce',
      timestamp: Date.now(),
      algorithm: 'HMAC-SHA256'
    },
    timestamp: new Date().toISOString()
  };
}
```

## 🔧 Build

```bash
npm run build
```

Le build génère :
- `dist/index.js` - Bundle JavaScript
- `dist/index.d.ts` - Déclarations TypeScript
- Source maps et métadonnées

## 🧪 Tests

```bash
npm run type-check
npm run lint
```

## 📦 Structure des fichiers

```
src/
├── common.ts      # Types communs et utilitaires
├── security.ts    # Types de sécurité et signature
├── variant.ts     # Types de variantes
├── mapping.ts     # Types d'adaptateurs de thème
├── analytics.ts   # Types d'analytics
├── shopify.ts     # Types Shopify
└── index.ts       # Point d'entrée principal
```

## 🤝 Contribution

1. Fork le projet
2. Crée une branche feature (`git checkout -b feature/new-type`)
3. Commit les changements (`git commit -m 'Add new type'`)
4. Push vers la branche (`git push origin feature/new-type`)
5. Ouvre une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.
