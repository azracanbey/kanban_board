type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Sunucu süreci başına bellek içi sınırlama (serverless çoklu instance'da tam koruma sağlamaz;
 * yine de maliyet ve kötüye kullanımı tek instance / geliştirme ortamında keskin azaltır).
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterMs: Math.max(0, b.resetAt - now) };
  }
  b.count += 1;
  return { ok: true };
}
