import { Redis } from '@upstash/redis';
import { normalizeShopDomain } from '../utils/shop';
import { supabaseService } from './supabase';

// ⚠️ Ne loggue jamais les valeurs de tokens
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const KEY = (shop: string) => `shop-token:${shop}`;

export type ShopToken = {
  access_token: string;
  scope?: string;
  installedAt?: number;
};

export async function saveShopToken(shopRaw: string, token: ShopToken, ttlDays = 30) {
  const shop = normalizeShopDomain(shopRaw);
  if (!shop) throw new Error('invalid_shop_domain');

  try {
    // Sauvegarder dans Redis (cache principal)
    const value = { ...token, installedAt: token.installedAt ?? Date.now() };
    await redis.set(KEY(shop), value, { ex: ttlDays * 86400 });

    // Sauvegarder dans Supabase (persistence)
    await supabaseService.upsertShop({
      shop_domain: shop, // Changé de 'domain' à 'shop_domain'
      access_token: token.access_token,
      scope: token.scope,
      is_active: true
    });

    const ttl = await redis.ttl(KEY(shop));
    console.log('[Redis+Supabase] saved token', { key: KEY(shop), ttl });
  } catch (error) {
    console.error('[Tokens] Error saving token:', error);
    // Ne pas faire échouer l'opération si Supabase échoue
    // Redis reste le cache principal
  }
}

export async function getShopToken(shopRaw: string): Promise<ShopToken | null> {
  const shop = normalizeShopDomain(shopRaw);
  if (!shop) return null;

  try {
    // Essayer Redis d'abord (plus rapide)
    const key = KEY(shop);
    const raw = await redis.get(key);
    console.log('[Redis] read token', { key, type: typeof raw, present: !!raw });

    if (raw) {
      // Upstash renvoie déjà l'objet
      if (typeof raw === 'object' && raw !== null && 'access_token' in raw) {
        return raw as ShopToken;
      }

      // Cas fallback si une string a été écrite par un autre client
      if (typeof raw === 'string') {
        try {
          const obj = JSON.parse(raw);
          if (obj && typeof obj === 'object' && 'access_token' in obj) return obj as ShopToken;
        } catch {}
      }
    }

    // Fallback vers Supabase si Redis n'a rien
    console.log('[Tokens] Redis miss, trying Supabase...');
    const supabaseShop = await supabaseService.getShopByDomain(shop);
    
    if (supabaseShop && supabaseShop.access_token) {
      // Recharger dans Redis pour les prochaines fois
      const token: ShopToken = {
        access_token: supabaseShop.access_token,
        scope: supabaseShop.scope,
        installedAt: new Date(supabaseShop.created_at).getTime()
      };
      
      // Mettre en cache Redis (async, ne pas attendre)
      redis.set(KEY(shop), token, { ex: 30 * 86400 }).catch(err => 
        console.warn('[Tokens] Failed to cache token in Redis:', err)
      );
      
      console.log('[Tokens] Token loaded from Supabase and cached in Redis');
      return token;
    }

    console.log('[Tokens] No token found in Redis or Supabase');
    return null;
  } catch (error) {
    console.error('[Tokens] Error getting token:', error);
    return null;
  }
}
