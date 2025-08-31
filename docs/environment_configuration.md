# 🌐 Configuration des Variables d'Environnement

## 🎯 **Objectif**
Rendre l'application **100% configurable** et **scalable** pour différents environnements (dev, staging, prod) et différentes boutiques Shopify.

## 📋 **Variables d'Environnement Requises**

### **Configuration du Serveur**
```bash
PORT=3001
```

### **URLs de l'Application (Configurables)**

#### **Backend API**
```bash
# URL principale du backend (Railway, Heroku, etc.)
APP_URL=https://adtest-production.up.railway.app

# Alternative pour le backend
BACKEND_URL=https://adtest-production.up.railway.app
```

#### **Frontend Web App**
```bash
# URL du frontend principal (Vercel, Netlify, etc.)
FRONTEND_URL=https://adtest-web-git-main-younes-projects-b6b2fe62.vercel.app

# Alternative pour le frontend
WEB_URL=https://adtest-web-git-main-younes-projects-b6b2fe62.vercel.app
```

#### **Shopify App Extension**
```bash
# URL de l'extension Shopify (généralement la même que le frontend)
SHOPIFY_EXTENSION_URL=https://adtest-web-git-main-younes-projects-b6b2fe62.vercel.app
```

### **Base de Données (Supabase)**
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SUPABASE_SECRET=your_jwt_secret
```

### **Shopify API**
```bash
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
```

### **OpenAI API**
```bash
OPENAI_API_KEY=your_openai_api_key
```

### **Cache Redis**
```bash
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### **Sécurité**
```bash
ENCRYPTION_KEY=your_32_character_encryption_key
```

### **Monitoring (Optionnel)**
```bash
SENTRY_DSN=your_sentry_dsn
```

## 🚀 **Configuration par Environnement**

### **Développement Local**
```bash
# .env.local
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
SHOPIFY_EXTENSION_URL=http://localhost:3000
```

### **Staging/Preview**
```bash
# Variables Vercel/Railway
APP_URL=https://adtest-staging.up.railway.app
FRONTEND_URL=https://adtest-preview.vercel.app
SHOPIFY_EXTENSION_URL=https://adtest-preview.vercel.app
```

### **Production**
```bash
# Variables Vercel/Railway
APP_URL=https://adtest-production.up.railway.app
FRONTEND_URL=https://adtest-web-git-main-younes-projects-b6b2fe62.vercel.app
SHOPIFY_EXTENSION_URL=https://adtest-web-git-main-younes-projects-b6b2fe62.vercel.app
```

## 🔧 **Utilisation dans le Code**

### **Import de la Configuration**
```typescript
import { getAppUrls, getFrontendUrl, getBackendUrl, getShopifyRedirectUrl } from '../config/urls';

// Récupérer toutes les URLs
const urls = getAppUrls();

// Récupérer une URL spécifique
const frontendUrl = getFrontendUrl();
const backendUrl = getBackendUrl();
const shopifyRedirect = getShopifyRedirectUrl();
```

### **Log de la Configuration**
```typescript
import { logUrlConfig } from '../config/urls';

// Afficher la configuration au démarrage
logUrlConfig();
```

## 📱 **Configuration Shopify Partner Dashboard**

### **App URL**
```
https://adtest-web-git-main-younes-projects-b6b2fe62.vercel.app
```

### **Allowed Redirection URLs**
```
https://adtest-web-git-main-younes-projects-b6b2fe62.vercel.app/auth/callback
```

## ✅ **Avantages de cette Approche**

1. **🔧 Configurable** : Toutes les URLs sont dans des variables d'environnement
2. **🚀 Scalable** : Facile d'ajouter de nouveaux environnements
3. **🏪 Multi-boutiques** : Fonctionne avec n'importe quelle boutique Shopify
4. **🔄 Déploiement** : Pas de code à modifier entre les environnements
5. **🐛 Debug** : Configuration claire et logs détaillés

## 🚨 **Points d'Attention**

- **Jamais d'URLs hardcodées** dans le code
- **Toujours utiliser** les fonctions de configuration
- **Vérifier** que toutes les variables sont définies
- **Tester** la configuration avant le déploiement
- **Documenter** les changements d'URLs

## 🔍 **Debug de la Configuration**

### **Vérifier les Variables**
```bash
# Dans les logs du backend
🌐 App URLs Configuration:
  Backend: https://adtest-production.up.railway.app
  Frontend: https://adtest-web-git-main-younes-projects-b6b2fe62.vercel.app
  Shopify Extension: https://adtest-web-git-main-younes-projects-b6b2fe62.vercel.app
  Shopify Redirect: https://adtest-web-git-main-younes-projects-b6b2fe62.vercel.app/auth/callback
```

### **Vérifier les Variables d'Environnement**
```bash
# Dans Railway
railway variables list

# Dans Vercel
vercel env ls
```
