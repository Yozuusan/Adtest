// Configuration des URLs API selon l'environnement

const API_URLS = {
  development: 'http://localhost:3001',
  production: 'https://adtest-production.up.railway.app'
} as const;

// Détecter l'environnement
const isDevelopment = import.meta.env.DEV;

// URL de base de l'API
export const API_BASE_URL = isDevelopment 
  ? API_URLS.development 
  : API_URLS.production;

// Helper pour construire les URLs complètes
export const buildApiUrl = (endpoint: string): string => {
  // S'assurer que l'endpoint commence par /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

// URLs spécifiques pour les templates
export const TEMPLATE_API = {
  generateTemplate: buildApiUrl('/auto-deploy/generate-template'),
  getQuota: (shop: string) => buildApiUrl(`/auto-deploy/quota/${shop}`),
  getProducts: (shop: string) => buildApiUrl(`/auto-deploy/products/${shop}`),
  upgradePlan: buildApiUrl('/auto-deploy/upgrade-plan'),
  deleteTemplate: (templateId: string) => buildApiUrl(`/auto-deploy/template/${templateId}`)
} as const;

// Log de l'environnement en développement
if (isDevelopment) {
  console.log('🔧 API Configuration:', {
    environment: 'development',
    baseUrl: API_BASE_URL
  });
} else {
  console.log('🚀 API Configuration:', {
    environment: 'production', 
    baseUrl: API_BASE_URL
  });
}