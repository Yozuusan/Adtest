import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
});

export interface ThemeAdapter {
  selectors: Record<string, string>;
  order: string[];
  confidence: number;
  theme_fingerprint: string;
  created_at: string;
}

export interface VariantData {
  id: string;
  handle: string;
  shop: string;
  product_gid: string;
  content_json: any;
  created_at: string;
  updated_at: string;
}

export class CacheService {
  private readonly TTL_DAYS = 30;
  private readonly TTL_SECONDS = this.TTL_DAYS * 24 * 60 * 60;

  /**
   * Sauvegarder un adaptateur de thème
   */
  async saveThemeAdapter(shopId: string, fingerprint: string, adapter: ThemeAdapter): Promise<void> {
    try {
      const key = `adapter:${shopId}:${fingerprint}`;
      await redis.set(key, adapter, { ex: this.TTL_SECONDS });
      console.log(`✅ Theme adapter cached: ${key}`);
    } catch (error) {
      console.error('❌ Error caching theme adapter:', error);
      throw new Error(`Failed to cache theme adapter: ${error}`);
    }
  }

  /**
   * Récupérer un adaptateur de thème
   */
  async getThemeAdapter(shopId: string, fingerprint: string): Promise<ThemeAdapter | null> {
    try {
      const key = `adapter:${shopId}:${fingerprint}`;
      const adapter = await redis.get(key);
      
      if (adapter && typeof adapter === 'object' && 'selectors' in adapter) {
        console.log(`✅ Theme adapter retrieved from cache: ${key}`);
        return adapter as ThemeAdapter;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error retrieving theme adapter:', error);
      return null;
    }
  }

  /**
   * Sauvegarder un variant
   */
  async saveVariant(shopId: string, handle: string, variant: VariantData): Promise<void> {
    try {
      const key = `variant:${shopId}:${handle}`;
      await redis.set(key, variant, { ex: this.TTL_SECONDS });
      console.log(`✅ Variant cached: ${key}`);
    } catch (error) {
      console.error('❌ Error caching variant:', error);
      throw new Error(`Failed to cache variant: ${error}`);
    }
  }

  /**
   * Récupérer un variant
   */
  async getVariant(shopId: string, handle: string): Promise<VariantData | null> {
    try {
      const key = `variant:${shopId}:${handle}`;
      const variant = await redis.get(key);
      
      if (variant && typeof variant === 'object' && 'handle' in variant) {
        console.log(`✅ Variant retrieved from cache: ${key}`);
        return variant as VariantData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error retrieving variant:', error);
      return null;
    }
  }

  /**
   * Supprimer un variant du cache
   */
  async deleteVariant(shopId: string, handle: string): Promise<boolean> {
    try {
      const key = `variant:${shopId}:${handle}`;
      const deleted = await redis.del(key);
      console.log(`🗑️ Variant deleted from cache: ${key}`);
      return deleted > 0;
    } catch (error) {
      console.error('❌ Error deleting variant from cache:', error);
      return false;
    }
  }

  /**
   * Supprimer un adaptateur de thème du cache
   */
  async deleteThemeAdapter(shopId: string, fingerprint: string): Promise<boolean> {
    try {
      const key = `adapter:${shopId}:${fingerprint}`;
      const deleted = await redis.del(key);
      console.log(`🗑️ Theme adapter deleted from cache: ${key}`);
      return deleted > 0;
    } catch (error) {
      console.error('❌ Error deleting theme adapter from cache:', error);
      return false;
    }
  }

  /**
   * Lister toutes les clés d'une boutique
   */
  async listShopKeys(shopId: string): Promise<string[]> {
    try {
      // Note: Upstash Redis ne supporte pas KEYS, on utilise SCAN
      // Pour l'instant, on retourne une liste vide
      // TODO: Implémenter avec SCAN si nécessaire
      return [];
    } catch (error) {
      console.error('❌ Error listing shop keys:', error);
      return [];
    }
  }

  /**
   * Nettoyer le cache d'une boutique
   */
  async clearShopCache(shopId: string): Promise<number> {
    try {
      const keys = await this.listShopKeys(shopId);
      if (keys.length === 0) return 0;

      const deleted = await redis.del(...keys);
      console.log(`🧹 Cleared ${deleted} keys for shop ${shopId}`);
      return deleted;
    } catch (error) {
      console.error('❌ Error clearing shop cache:', error);
      return 0;
    }
  }

  /**
   * Vérifier la santé du cache
   */
  async healthCheck(): Promise<boolean> {
    try {
      await redis.ping();
      return true;
    } catch (error) {
      console.error('❌ Cache health check failed:', error);
      return false;
    }
  }

  /**
   * Obtenir des statistiques du cache
   */
  async getStats(): Promise<{
    connected: boolean;
    memory_usage?: string;
    keys_count?: number;
  }> {
    try {
      const connected = await this.healthCheck();
      
      if (!connected) {
        return { connected: false };
      }

      // Note: Upstash Redis a des limitations sur INFO
      // On retourne des stats basiques
      return {
        connected: true,
        keys_count: 0 // TODO: Implémenter si nécessaire
      };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return { connected: false };
    }
  }
}

export const cacheService = new CacheService();
