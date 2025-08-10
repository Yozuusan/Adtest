# Arborescence projet – Adlign

Cette structure sert de référence pour l’organisation du monorepo Adlign.

```
adlign/
├─ apps/
│  ├─ backend/              # API backend – Cursor
│  │  └─ src/
│  │     ├─ routes/
│  │     ├─ services/
│  │     ├─ middleware/
│  │     └─ utils/
│  ├─ worker-mapping/       # Service scan & mapping IA – Cursor
│  │  └─ src/
│  │     ├─ jobs/
│  │     ├─ services/
│  │     └─ utils/
│  ├─ shopify-extension/    # Theme App Extension – Cursor
│  │  ├─ assets/
│  │  ├─ blocks/
│  │  └─ snippets/
│  └─ web/                  # Front SaaS (Next.js) – Lovable
│     └─ src/
├─ packages/
│  ├─ types/                # Types & interfaces partagées
│  └─ sdk/                  # Client API pour le front
├─ infra/
│  └─ supabase/             # Migrations, policies, scripts
├─ docs/                    # Documentation projet
│  ├─ README.md              # Contexte & vision produit
│  ├─ cursor_instructions.md # Brief technique pour Cursor
│  └─ project_structure.md   # Ce fichier – structure de référence
└─ .github/workflows/       # Pipelines CI/CD
```

## Notes :
- `apps/` → Contient chaque application indépendante.
- `packages/` → Modules et types réutilisables entre apps.
- `infra/` → Composants d’infrastructure (base de données, déploiement).
- `docs/` → Toute la documentation centrale (README principal, briefs techniques, etc.).
- `.github/workflows/` → Automatisation CI/CD (tests, déploiements).

