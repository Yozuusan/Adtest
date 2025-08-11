import { createError } from '../middleware/errorHandler';
import { Redis } from '@upstash/redis';
import { saveShopToken, getShopToken, type ShopToken } from './tokens';

// Types Shopify
interface ShopifyToken {
  access_token: string;
  scope: string;
  shop: string;
  expires_in?: number;
}

interface ShopifyMetaobject {
  id: string;
  handle: string;
  type: string;
  fields: Array<{
    key: string;
    value: string | number | boolean;
  }>;
}

interface ShopifyFile {
  id: string;
  url: string;
  alt?: string;
}

export class ShopifyService {
  private redis: Redis;
  private _apiKey: string | undefined;
  private _apiSecret: string | undefined;
  private _appUrl: string | undefined;

  constructor() {
    console.log('🔧 ShopifyService constructor - Variables d\'environnement:');
    console.log('  SHOPIFY_API_KEY:', process.env.SHOPIFY_API_KEY ? '✅ défini' : '❌ undefined');
    console.log('  SHOPIFY_API_SECRET:', process.env.SHOPIFY_API_SECRET ? '✅ défini' : '❌ undefined');
    console.log('  APP_URL:', process.env.APP_URL ? '✅ défini' : '❌ undefined');
    console.log('  UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? '✅ défini' : '❌ undefined');
    
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });
  }

  private get apiKey(): string {
    if (!this._apiKey) {
      this._apiKey = process.env.SHOPIFY_API_KEY;
      if (!this._apiKey) {
        throw new Error('SHOPIFY_API_KEY environment variable is not defined');
      }
    }
    return this._apiKey;
  }

  private get apiSecret(): string {
    if (!this._apiSecret) {
      this._apiSecret = process.env.SHOPIFY_API_SECRET;
      if (!this._apiSecret) {
        throw new Error('SHOPIFY_API_SECRET environment variable is not defined');
      }
    }
    return this._apiSecret;
  }

  private get appUrl(): string {
    if (!this._appUrl) {
      // Pour les tests, on peut utiliser une URL qui fonctionne
      this._appUrl = process.env.APP_URL || 'https://api.adlign.com';
      if (!this._appUrl) {
        throw new Error('APP_URL environment variable is not defined');
      }
    }
    return this._appUrl;
  }

  /**
   * Génère l'URL d'installation OAuth
   */
  generateInstallUrl(shop: string, scopes: string[] = ['read_products', 'write_products']): string {
    const scope = scopes.join(',');
    const redirectUri = `${this.appUrl}/oauth/callback`;
    
    const params = new URLSearchParams({
      client_id: this.apiKey,
      scope,
      redirect_uri: redirectUri,
      state: this.generateState(shop)
    });

    return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
  }

  /**
   * Échange le code d'autorisation contre un token
   */
  async exchangeCodeForToken(code: string, shop: string): Promise<ShopifyToken> {
    try {
      const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          code,
        }),
      });

      if (!response.ok) {
        throw new Error(`Shopify OAuth error: ${response.statusText}`);
      }

      const tokenData = await response.json() as ShopifyToken;
      
      console.log(`🔑 Token received from Shopify:`, JSON.stringify(tokenData, null, 2));
      
      // Stocker le token en cache
      await this.storeToken(shop, tokenData);
      
      return tokenData;
    } catch (error) {
      throw createError(`Failed to exchange code for token: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Crée ou met à jour un metaobject
   */
  async createOrUpdateMetaobject(
    shop: string,
    type: string,
    fields: Array<{ key: string; value: string | number | boolean }>,
    handle?: string
  ): Promise<ShopifyMetaobject> {
    try {
      const token = await this.getToken(shop);
      if (!token) {
        throw createError('Shop not authenticated', 401);
      }

      const url = `https://${shop}/admin/api/2024-01/metafields.json`;
      const payload = {
        metafield: {
          namespace: 'adlign',
          key: handle || 'variant',
          value: JSON.stringify(fields),
          type: 'json_string'
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Shopify API error: ${error}`);
      }

      const result = await response.json() as any;
      return {
        id: result.metafield.id,
        handle: result.metafield.key,
        type: result.metafield.type,
        fields
      };
    } catch (error) {
      throw createError(`Failed to create/update metaobject: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Upload un fichier vers Shopify
   */
  async uploadFileToShopify(
    shop: string,
    fileUrl: string,
    alt?: string
  ): Promise<ShopifyFile> {
    try {
      const token = await this.getToken(shop);
      if (!token) {
        throw createError('Shop not authenticated', 401);
      }

      const url = `https://${shop}/admin/api/2024-01/files.json`;
      const payload = {
        file: {
          url: fileUrl,
          alt: alt || 'Adlign generated image'
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token.access_token,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Shopify API error: ${error}`);
      }

      const result = await response.json() as any;
      return {
        id: result.file.id,
        url: result.file.url,
        alt: result.file.alt
      };
    } catch (error) {
      throw createError(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Vérifie si une boutique est authentifiée
   */
  async isShopAuthenticated(shop: string): Promise<boolean> {
    const token = await getShopToken(shop);
    return !!token;
  }

  /**
   * Récupère le token d'une boutique
   */
  private async getToken(shop: string): Promise<ShopifyToken | null> {
    const token = await getShopToken(shop);
    if (!token) return null;
    
    // Convertir ShopToken vers ShopifyToken
    return {
      access_token: token.access_token,
      scope: token.scope || '',
      shop: shop,
      expires_in: token.expires_in
    };
  }

  /**
   * Stocke le token d'une boutique
   */
  private async storeToken(shop: string, token: ShopifyToken): Promise<void> {
    await saveShopToken(shop, token);
  }

  /**
   * Génère un state sécurisé pour OAuth
   */
  private generateState(shop: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `${shop}_${timestamp}_${random}`;
  }
}

// Instance singleton
export const shopifyService = new ShopifyService();
