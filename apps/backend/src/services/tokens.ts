import { Redis } from '@upstash/redis';
import { normalizeShopDomain } from '../utils/shop';

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

  // Upstash sérialise tout seul : on peut stocker l'objet directement
  const value = { ...token, installedAt: token.installedAt ?? Date.now() };
  await redis.set(KEY(shop), value, { ex: ttlDays * 86400 });

  const ttl = await redis.ttl(KEY(shop));
  console.log('[Redis] saved token', { key: KEY(shop), ttl });
}

export async function getShopToken(shopRaw: string): Promise<ShopToken | null> {
  const shop = normalizeShopDomain(shopRaw);
  if (!shop) return null;

  const key = KEY(shop);
  const raw = await redis.get(key); // <- renvoie l'objet directement si on a set un objet
  console.log('[Redis] read token', { key, type: typeof raw, present: !!raw });

  if (!raw) return null;

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

  console.warn('[Redis] unexpected value shape', { key, preview: JSON.stringify(raw).slice(0, 32) });
  return null;
}
