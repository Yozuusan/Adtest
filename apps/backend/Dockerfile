# Dockerfile pour Railway - Backend Adlign
FROM node:20-alpine AS builder

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./
COPY tsconfig.json ./

# Installer toutes les dépendances (production + dev pour le build)
RUN npm install

# Copier le code source
COPY src/ ./src/

# Build de l'application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer seulement les dépendances de production
RUN npm install --only=production && npm cache clean --force

# Copier les fichiers buildés depuis le stage builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Changer vers l'utilisateur non-root
USER nodejs

# Exposer le port
EXPOSE 3001

# Variable d'environnement pour le port
ENV PORT=3001

# Commande de démarrage
CMD ["node", "dist/main.js"]
