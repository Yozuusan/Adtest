// Client principal du SDK Adlign

import { HttpClient } from './http-client';
import type {
  VariantPayload,
  ThemeAdapter,
  AnalyticsEvent,
  Signed,
  ApiResponse,
  PaginatedResponse,
  QueryFilters,
} from '@adlign/types';

export interface AdlignClientConfig {
  baseURL: string;
  timeout?: number;
  apiKey?: string;
}

export class AdlignClient {
  private httpClient: HttpClient;
  private config: AdlignClientConfig;

  constructor(config: AdlignClientConfig) {
    this.config = config;
    this.httpClient = new HttpClient({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        ...(config.apiKey && { 'X-API-Key': config.apiKey }),
      },
    });
  }

  /**
   * Définit le token d'authentification
   */
  setAuthToken(token: string): void {
    this.httpClient.setAuthToken(token);
  }

  /**
   * Efface le token d'authentification
   */
  clearAuthToken(): void {
    this.httpClient.clearAuthToken();
  }

  // ===== VARIANTS =====

  /**
   * Crée ou met à jour une variante
   */
  async createVariant(
    productGid: string,
    content: VariantPayload['slots'],
    campaignRef?: string
  ): Promise<ApiResponse<{ metaobject_id: string; handle: string }>> {
    return this.httpClient.post('/variants', {
      product_gid: productGid,
      content_json: JSON.stringify(content),
      campaign_ref: campaignRef,
    });
  }

  /**
   * Récupère une variante par son handle
   */
  async getVariant(handle: string): Promise<ApiResponse<VariantPayload>> {
    return this.httpClient.get(`/variants/${handle}`);
  }

  /**
   * Liste les variantes avec pagination
   */
  async listVariants(filters?: QueryFilters): Promise<ApiResponse<VariantPayload[]>> {
    const query = this.buildQueryString(filters);
    return this.httpClient.get(`/variants${query}`);
  }

  // ===== THEME ADAPTERS =====

  /**
   * Récupère l'adaptateur de thème pour une page produit
   */
  async getThemeAdapter(
    productHandle: string,
    variantHandle?: string
  ): Promise<ApiResponse<Signed<ThemeAdapter>>> {
    const query = variantHandle ? `?av=${variantHandle}` : '';
    return this.httpClient.get(`/theme-adapters/${productHandle}${query}`);
  }

  /**
   * Déclenche la génération d'un adaptateur de thème
   */
  async buildThemeAdapter(
    productUrl: string,
    shopId: string
  ): Promise<ApiResponse<{ job_id: string; status: 'queued' }>> {
    return this.httpClient.post('/mapping/build', {
      product_url: productUrl,
      shop_id: shopId,
    });
  }

  // ===== ANALYTICS =====

  /**
   * Envoie un événement d'analytics
   */
  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<ApiResponse<void>> {
    return this.httpClient.post('/analytics', {
      ...event,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Récupère les performances d'une variante
   */
  async getVariantPerformance(
    variantId: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<ApiResponse<any>> {
    return this.httpClient.get(`/analytics/performance/${variantId}?period=${period}`);
  }

  // ===== OAUTH =====

  /**
   * Échange le code d'autorisation contre un token
   */
  async exchangeCodeForToken(
    code: string,
    shop: string
  ): Promise<ApiResponse<{ access_token: string; scope: string }>> {
    return this.httpClient.post('/oauth/install', { code, shop });
  }

  // ===== UTILITIES =====

  /**
   * Vérifie la santé de l'API
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.httpClient.get('/health');
  }

  /**
   * Construit une chaîne de requête à partir des filtres
   */
  private buildQueryString(filters?: QueryFilters): string {
    if (!filters || Object.keys(filters).length === 0) {
      return '';
    }

    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    return `?${params.toString()}`;
  }
}
