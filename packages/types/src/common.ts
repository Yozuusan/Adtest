// Types communs et utilitaires

/**
 * Interface de base pour tous les objets avec ID et timestamps
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Interface pour les réponses d'API standardisées
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  request_id?: string;
}

/**
 * Interface pour les réponses paginées
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

/**
 * Interface pour les filtres de requête
 */
export interface QueryFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
  [key: string]: any;
}

/**
 * Interface pour les métadonnées
 */
export interface Metadata {
  [key: string]: string | number | boolean | null;
}

/**
 * Type pour les identifiants Shopify (GID)
 */
export type ShopifyGID = string;

/**
 * Type pour les handles de produits
 */
export type ProductHandle = string;

/**
 * Type pour les domaines de boutiques
 */
export type ShopDomain = string;

/**
 * Type pour les URLs
 */
export type URL = string;

/**
 * Type pour les timestamps ISO
 */
export type ISOTimestamp = string;

/**
 * Type pour les UUIDs
 */
export type UUID = string;

/**
 * Type pour les hashes
 */
export type Hash = string;

/**
 * Type pour les signatures HMAC
 */
export type HMACSignature = string;
