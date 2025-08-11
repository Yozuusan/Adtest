// Types de sécurité et de signature

/**
 * Type générique pour les payloads signés
 * Permet de vérifier l'authenticité des données
 */
export interface Signed<T> {
  payload: T;
  signature: string;
  nonce: string;
  timestamp: number;
  algorithm: 'HMAC-SHA256';
}

/**
 * Interface pour les tokens d'authentification
 */
export interface AuthToken {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  scope: string;
  shop_id: string;
}

/**
 * Interface pour les en-têtes d'authentification
 */
export interface AuthHeaders {
  'Authorization': string;
  'X-Shopify-Shop-Domain'?: string;
  'X-Request-Id'?: string;
}

/**
 * Interface pour la vérification des signatures
 */
export interface SignatureVerification {
  isValid: boolean;
  reason?: string;
  timestamp: number;
  nonce: string;
}

/**
 * Interface pour les clés de chiffrement
 */
export interface EncryptionKeys {
  public_key: string;
  encrypted_private_key: string;
  algorithm: 'AES-256-GCM';
  salt: string;
}
