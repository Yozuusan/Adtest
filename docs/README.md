# Adlign – MVP

**Date de référence** : 10 août 2025\
**Rôle** : Jack – CTO & partenaire produit\
**But** : Fiche unique de référence pour le développement du MVP Adlign.

---

## 1) Contexte

Adlign permet de créer des **variantes dynamiques** de pages produit Shopify alignées aux campagnes publicitaires, **sans dupliquer les produits** ni créer de pages CMS, et **sans modifier la page originale** si aucun signal n’est présent.\
Objectif : augmenter les conversions en garantissant la cohérence entre le message publicitaire et la page de destination.

---

## 2) Architecture globale

**Monorepo** (Turborepo + workspaces) avec 4 apps principales et des packages partagés.

```
adlign/
├─ apps/
│  ├─ backend/            # API backend – Cursor
│  ├─ worker-mapping/     # Service de scan & mapping IA – Cursor
│  ├─ shopify-extension/  # Theme App Extension – Cursor
│  └─ web/                # Front SaaS (Next.js) – Lovable
├─ packages/
│  ├─ types/              # Types & interfaces partagées
│  └─ sdk/                # Client API pour le front
├─ infra/
│  └─ supabase/           # Migrations et policies
└─ .github/workflows/     # CI/CD
```

**Répartition des responsabilités**

- **Cursor** : backend, worker mapping, extension Shopify.
- **Lovable** : frontend SaaS avec Supabase.

---

## 3) Principes de fonctionnement (MVP)

- **Signal URL** : `?av=<handle>` déclenche l’injection client (micro-kernel JS).
- **Injection client minimale** : JSON de variante inline + patchs DOM ciblés.
- **Pas de fetch réseau** côté storefront.
- **Mapping IA** avec score de confiance + fallback par élément si doute.
- **Aucun changement** si `?av` absent.
- **Sécurité** : payload signé (HMAC), kill-switch global, tokens chiffrés.

---

## 4) Contrats de données

Types et interfaces définis dans `/packages/types`.\
Exemple d’un `VariantPayload` :

```json
{
  "meta": { "product_gid": "gid://shopify/Product/123", "campaign_ref": "BF-2025" },
  "slots": {
    "title.main":   { "type": "text",  "value": "Titre aligné" },
    "hero.image":   { "type": "image", "src": "https://cdn.shopify.com/image.jpg", "w": 1200, "h": 1200 },
    "cta.primary":  { "type": "text",  "value": "Ajouter au panier" }
  }
}
```

---

## 5) Standards techniques

- **Perf budgets** :
  - CLS Δ ≤ 0.02
  - LCP Δ ≤ 50 ms
  - JS micro-kernel < 10KB gz
- **Sécurité** :
  - Tokens Shopify chiffrés (AES-256)
  - Webhooks vérifiés HMAC
  - CSP stricte
- **Fallback** : élément non mappable → original conservé.

---

## 6) Definition of Done (DoD)

Un module ou fonctionnalité est **terminé** lorsque :

1. Code implémenté avec tests unitaires & d’intégration.
2. CI passe avec succès (lint, typecheck, tests).
3. Documentation minimale ajoutée (README local ou commentaires).
4. Budgets perf et taux d’injection validés sur tests E2E.
5. Aucun fetch réseau non nécessaire sur le storefront.
6. Sentry connecté et alertes configurées.

---

## 7) Jalons MVP

1. **Backend API** (OAuth, CRUD metaobjects, analytics ingest).
2. **Worker Mapping** (scan thème, génération ThemeAdapter).
3. **Shopify Extension** (App Embed, micro-kernel JS).
4. **Front SaaS** (onboarding, CRUD variantes, analytics).
5. **Tests & QA** (unitaires, intégration, E2E Playwright).
6. **CI/CD** (GitHub Actions, déploiements).

---

## 8) Ressources externes

- [Shopify Admin API Docs](https://shopify.dev/docs/api/admin-rest)
- [Shopify Metaobjects](https://shopify.dev/docs/custom-data/metaobjects)
- [Shopify Theme App Extensions](https://shopify.dev/docs/apps/online-store/theme-app-extensions)
- [Supabase Docs](https://supabase.com/docs)
- [Turborepo Docs](https://turbo.build/repo/docs)

