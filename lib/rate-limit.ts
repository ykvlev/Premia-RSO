/**
 * Простой in-memory rate-limiter (скользящее окно) для защиты форм от флуда.
 * Для одного инстанса (systemd) достаточно; при рестарте счётчики обнуляются.
 */

const hits = new Map<string, number[]>();

/** true — можно (в пределах лимита), false — превышено. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  // лёгкая уборка, чтобы Map не рос бесконечно
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t > windowMs)) hits.delete(k);
    }
  }
  return true;
}
