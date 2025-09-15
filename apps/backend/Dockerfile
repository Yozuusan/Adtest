# Dockerfile optimisé pour Railway - Backend Adlign
FROM node:20-alpine

# Optimisations pour accélérer les builds
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV NPM_CONFIG_CACHE=".npm-cache"
ENV CI=true

WORKDIR /app

# Copier package files et installer deps en une seule couche (cache layer)
COPY package*.json ./
RUN npm ci --only=production --no-optional --no-audit --no-fund --silent

# Copier tsconfig pour le build
COPY tsconfig.json ./

# Installer deps de dev temporairement pour le build
RUN npm install typescript --no-save --silent

# Copier source et builder en une seule étape
COPY src/ ./src/
RUN npm run build && npm uninstall typescript && npm cache clean --force

# Setup utilisateur et permissions
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# Variables d'environnement
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

# Démarrage direct (plus rapide que multi-stage)
CMD ["node", "dist/main.js"]
