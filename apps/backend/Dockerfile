# Dockerfile optimisé pour Railway - Backend Adlign
FROM node:20-alpine

# Optimisations pour accélérer les builds
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV NPM_CONFIG_CACHE=".npm-cache"
ENV CI=true

WORKDIR /app

# Copier package files et installer toutes les deps (prod + dev pour build)
COPY package*.json ./
RUN npm install --no-optional --no-audit --no-fund --silent

# Copier tsconfig et source pour le build
COPY tsconfig.json ./
COPY src/ ./src/

# Build et cleanup des deps dev
RUN npm run build && npm prune --production && npm cache clean --force

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
