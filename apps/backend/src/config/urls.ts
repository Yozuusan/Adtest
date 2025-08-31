/**
 * Configuration centralisée des URLs de l'application
 * Toutes les URLs sont configurables via des variables d'environnement
 */

export interface AppUrls {
  // Backend API
  backend: string;
  
  // Frontend web app
  frontend: string;
  
  // Shopify app extension
  shopifyExtension: string;
}

/**
 * Récupère la configuration des URLs depuis les variables d'environnement
 */
export function getAppUrls(): AppUrls {
  return {
    // Backend API - Railway ou local
    backend: process.env.APP_URL || process.env.BACKEND_URL || 'http://localhost:3001',
    
    // Frontend web app - Vercel ou local
    frontend: process.env.FRONTEND_URL || process.env.WEB_URL || 'https://adtest-web.vercel.app',
    
    // Shopify app extension - Vercel ou local
    shopifyExtension: process.env.SHOPIFY_EXTENSION_URL || process.env.FRONTEND_URL || 'http://localhost:3000'
  };
}

/**
 * Récupère l'URL du frontend pour les redirections OAuth
 */
export function getFrontendUrl(): string {
  return getAppUrls().frontend;
}

/**
 * Récupère l'URL du backend pour les appels API
 */
export function getBackendUrl(): string {
  return getAppUrls().backend;
}

/**
 * Récupère l'URL de redirection OAuth Shopify
 */
export function getShopifyRedirectUrl(): string {
  return `${getFrontendUrl()}/auth/callback`;
}

/**
 * Log la configuration des URLs pour le debug
 */
export function logUrlConfig(): void {
  const urls = getAppUrls();
  console.log('🌐 App URLs Configuration:');
  console.log('  Backend:', urls.backend);
  console.log('  Frontend:', urls.frontend);
  console.log('  Shopify Extension:', urls.shopifyExtension);
  console.log('  Shopify Redirect:', getShopifyRedirectUrl());
}
