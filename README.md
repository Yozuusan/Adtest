# Adlign

**MVP - Variantes dynamiques de pages produit Shopify alignées aux campagnes publicitaires**

## 🚀 Vue d'ensemble

Adlign permet de créer des **variantes dynamiques** de pages produit Shopify alignées aux campagnes publicitaires, **sans dupliquer les produits** ni créer de pages CMS, et **sans modifier la page originale** si aucun signal n'est présent.

Objectif : augmenter les conversions en garantissant la cohérence entre le message publicitaire et la page de destination.

## 📁 Structure du projet

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
├─ docs/                  # Documentation projet
└─ .github/workflows/     # CI/CD
```

## 🎯 Répartition des responsabilités

- **Cursor** : backend, worker mapping, extension Shopify
- **Lovable** : frontend SaaS avec Supabase

## 📚 Documentation

- [README principal](docs/README.md) - Contexte & vision produit
- [Brief technique Cursor](docs/cursor_instructions.md) - Instructions de développement
- [Structure du projet](docs/project_structure.md) - Organisation des dossiers

## 🛠️ Démarrage rapide

1. **Backend API** : OAuth Shopify, CRUD metaobjects, analytics
2. **Worker Mapping** : scan thème, génération ThemeAdapter
3. **Shopify Extension** : App Embed, micro-kernel JS
4. **Front SaaS** : onboarding, CRUD variantes, analytics

## 🔧 Technologies

- **Backend** : TypeScript, Node.js, Express/NestJS
- **Worker** : TypeScript, Playwright, OpenAI API
- **Extension** : Shopify Theme App Extension
- **Frontend** : Next.js, Supabase
- **Infra** : Turborepo, Redis (Upstash)

## 📊 Standards techniques

- **Performance** : CLS Δ ≤ 0.02, LCP Δ ≤ 50ms
- **Sécurité** : Tokens chiffrés (AES-256), HMAC validation
- **Micro-kernel** : < 10KB gz, aucun fetch réseau côté client

---

**Date de référence** : 10 août 2025  
**Rôle** : Jack – CTO & partenaire produit
