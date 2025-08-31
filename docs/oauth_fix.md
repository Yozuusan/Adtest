# 🔧 Fix OAuth Shopify - Problème de redirection Vercel

## 🚨 Problème identifié

**Symptôme :** Erreur 404 lors de la connexion Shopify à l'application web

**Cause :** Mismatch entre les URLs Vercel :
- **Frontend** : `adtest-3bnygornxu-younes-projects-b6b2fe62.vercel.app`
- **Backend** : `https://adtest-production.up.railway.app`
- **Redirection hardcodée** : `https://adtest-web.vercel.app` ❌

## 🛠️ Solution implémentée

### 1. Détection dynamique de l'URL frontend

Remplacement des URLs hardcodées par une fonction intelligente qui :
- Détecte l'URL depuis les headers `Referer` ou `Origin`
- Utilise une variable d'environnement `FRONTEND_URL` comme fallback
- S'adapte automatiquement aux différents environnements Vercel

### 2. Configuration des variables d'environnement

```bash
# Dans le backend (.env ou variables Railway)
FRONTEND_URL=https://adtest-3bnygornxu-younes-projects-b6b2fe62.vercel.app
```

### 3. Code modifié

**Avant (hardcodé) :**
```typescript
const frontendUrl = 'https://adtest-web.vercel.app';
```

**Après (dynamique) :**
```typescript
const frontendUrl = getFrontendUrl(req);
```

## 📋 Checklist de déploiement

### Backend (Railway)
- [ ] Ajouter `FRONTEND_URL` dans les variables d'environnement
- [ ] Redéployer l'application
- [ ] Vérifier les logs pour confirmer l'URL utilisée

### Frontend (Vercel)
- [ ] Vérifier que l'URL dans `vercel.json` pointe vers le bon backend
- [ ] Confirmer que l'URL de l'app correspond à celle configurée

### Shopify Partner Dashboard
- [ ] **App URL** = URL du frontend Vercel
- [ ] **Allowed redirection URLs** = `https://adtest-3bnygornxu-younes-projects-b6b2fe62.vercel.app/auth/callback`

## 🔍 Debug

### Logs à vérifier
```bash
# Dans les logs du backend
🎯 Redirecting to frontend: https://adtest-3bnygornxu-younes-projects-b6b2fe62.vercel.app
🔄 Using fallback frontend URL: https://adtest-3bnygornxu-younes-projects-b6b2fe62.vercel.app
```

### Test manuel
1. Aller sur `https://adtest-3bnygornxu-younes-projects-b6b2fe62.vercel.app`
2. Cliquer "Connect Store"
3. Vérifier que la redirection se fait vers le bon domaine

## 🎯 Résultat attendu

- ✅ L'OAuth Shopify fonctionne sans erreur 404
- ✅ Les redirections se font vers le bon frontend Vercel
- ✅ L'application s'adapte automatiquement aux changements d'URL
- ✅ Plus de problème de mismatch entre les environnements

## 📚 Références

- [Documentation Shopify OAuth](https://shopify.dev/docs/apps/auth/oauth)
- [Configuration Vercel](https://vercel.com/docs/projects/environment-variables)
- [Configuration Railway](https://docs.railway.app/develop/variables)
