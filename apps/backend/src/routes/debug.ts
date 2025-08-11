import { Router } from 'express';
import { normalizeShopDomain } from '../utils/shop';
import { Redis } from '@upstash/redis';

const router = Router();
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const KEY = (s: string) => `shop-token:${s}`;

router.get('/redis', async (req, res) => {
  const shop = normalizeShopDomain(String(req.query.shop || ''));
  if (!shop) return res.status(400).json({ error: 'invalid_shop_param' });

  const key = KEY(shop);
  const raw = await redis.get(key);
  const ttl = await redis.ttl(key);

  res.json({
    shop, key, present: !!raw, ttl,
    head: raw ? String(raw).slice(0, 16) : null, // jamais la valeur complète
  });
});

export default router;
