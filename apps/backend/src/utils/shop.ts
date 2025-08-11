export function normalizeShopDomain(input: string): string {
  const s = String(input || '').trim().toLowerCase();
  if (!s.endsWith('.myshopify.com')) return '';
  return s;
}
