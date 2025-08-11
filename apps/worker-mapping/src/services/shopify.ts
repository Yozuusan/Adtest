import { logger } from '../utils/logger';

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  status: string;
  published_at?: string;
}

export class ShopifyService {
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = process.env.SHOPIFY_API_KEY || '';
    this.apiSecret = process.env.SHOPIFY_API_SECRET || '';
  }

  /**
   * Convert a Shopify product GID to a public product URL
   * GID format: gid://shopify/Product/123456789
   */
  convertProductGidToUrl(productGid: string, shopDomain: string): string {
    try {
      // Extract the numeric ID from the GID
      const match = productGid.match(/gid:\/\/shopify\/Product\/(\d+)/);
      if (!match) {
        throw new Error(`Invalid product GID format: ${productGid}`);
      }

      const productId = match[1];
      const cleanDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      
      return `https://${cleanDomain}/products/${productId}`;
    } catch (error) {
      logger.error('Failed to convert product GID to URL:', { productGid, shopDomain, error });
      throw error;
    }
  }

  /**
   * Extract shop domain from a product URL
   */
  extractShopDomainFromUrl(productUrl: string): string {
    try {
      const url = new URL(productUrl);
      return url.hostname;
    } catch (error) {
      logger.error('Failed to extract shop domain from URL:', { productUrl, error });
      throw error;
    }
  }

  /**
   * Validate if a URL is a valid Shopify product page
   */
  isValidShopifyProductUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.includes('/products/') && 
             (urlObj.hostname.includes('.myshopify.com') || 
              urlObj.hostname.includes('.shopify.com'));
    } catch {
      return false;
    }
  }

  /**
   * Get the product handle from a Shopify product URL
   */
  extractProductHandleFromUrl(productUrl: string): string | null {
    try {
      const url = new URL(productUrl);
      const match = url.pathname.match(/\/products\/([^\/\?]+)/);
      return match ? match[1] : null;
    } catch (error) {
      logger.error('Failed to extract product handle from URL:', { productUrl, error });
      return null;
    }
  }

  /**
   * Build a canonical product URL from shop domain and product handle
   */
  buildCanonicalProductUrl(shopDomain: string, productHandle: string): string {
    const cleanDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${cleanDomain}/products/${productHandle}`;
  }

  /**
   * Check if a shop domain is valid
   */
  isValidShopDomain(domain: string): boolean {
    const validPatterns = [
      /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.myshopify\.com$/,
      /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.shopify\.com$/
    ];

    return validPatterns.some(pattern => pattern.test(domain));
  }

  /**
   * Get the shop name from a shop domain
   */
  extractShopNameFromDomain(domain: string): string {
    const match = domain.match(/^([^.]+)\.(myshopify|shopify)\.com$/);
    return match ? match[1] : domain;
  }
}

export const shopifyService = new ShopifyService();
