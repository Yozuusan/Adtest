# Cursor – Brief technique Adlign

## Objectif
Implémenter les composants backend, worker et Shopify extension du MVP Adlign.

---

## 1) Backend (apps/backend)
- **Langage** : TypeScript (Node.js, Express ou NestJS)
- **Fonctions principales** :
  - **POST /oauth/install** → OAuth Shopify, stockage token chiffré (AES-256)
  - **POST /variants** → création/MAJ metaobject `adlign_variant` + stockage JSON
  - **POST /analytics** → ingestion d'événements analytics (vers Supabase)
  - **POST /mapping/build** → push job au worker mapping
- **Services à créer** :
  - `ShopifyService` : OAuth, API Admin, CRUD Metaobjects, Files API
  - `CacheService` : Redis (Upstash)
  - `SecurityService` : signature et validation HMAC
- **Middlewares** :
  - Authentification via Supabase JWT
  - Rate limiting (Redis token bucket)

---

## 2) Worker Mapping (apps/worker-mapping)
- **Langage** : TypeScript
- **Outils** : Playwright + API OpenAI
- **Tâches** :
  - Charger la page produit
  - Identifier les éléments modifiables (titre, sous-titre, image, CTA, USP, badges)
  - Générer un `ThemeAdapter` JSON (selectors, ordre, scores)
  - Sauvegarder dans Redis et Supabase

---

## 3) Shopify Extension (apps/shopify-extension)
- **Type** : Theme App Extension (App Embed)
- **Micro-kernel JS** (<10KB gz) :
  - Lecture de `#adlign-data` (JSON signé inline)
  - Application des patchs DOM selon `ThemeAdapter`
  - Aucun fetch réseau côté client
  - Fallback si sélecteur manquant

---

## 4) Contraintes techniques
- Pas de dépendance runtime externe sur storefront
- Tokens Shopify toujours chiffrés
- CLS Δ ≤ 0.02, LCP Δ ≤ 50ms

---

## 5) Ordre de livraison recommandé
1. Implémenter **ShopifyService** avec OAuth et CRUD metaobjects
2. Créer endpoint `/variants` avec validation et stockage JSON
3. Implémenter worker mapping (Playwright + IA) avec sauvegarde adapter
4. Créer App Embed minimal injectant un JSON signé
5. Étendre micro-kernel JS pour appliquer mapping complet

---

## 6) Structure des répertoires
```
apps/
  backend/
    src/
      routes/
      services/
      middleware/
      utils/
  worker-mapping/
    src/
      jobs/
      services/
      utils/
  shopify-extension/
    assets/
    blocks/
    snippets/
packages/
  types/
  sdk/
```

---

## 7) Prompts utiles pour développement assisté par IA
- *Implémenter un service Shopify avec OAuth et stockage token chiffré*.
- *Créer un endpoint Express `/variants` avec validation Zod et enregistrement metaobject*.
- *Coder un worker Playwright qui mappe les éléments d'une page produit Shopify*.
- *Développer un micro-kernel JS qui applique un mapping DOM à partir d’un JSON inline*.

