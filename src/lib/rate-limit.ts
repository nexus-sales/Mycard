/**
 * Sliding-window rate limiter en memoria.
 * Adecuado para una sola instancia; en despliegues horizontales debe
 * sustituirse por un almacén compartido como Redis.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const globalForRateLimit = globalThis as unknown as {
  rateLimitStore?: Map<string, RateLimitEntry>;
  rateLimitCleanupTimer?: ReturnType<typeof setInterval>;
};

const store = globalForRateLimit.rateLimitStore ?? new Map<string, RateLimitEntry>();
globalForRateLimit.rateLimitStore = store;

// Una única limpieza periódica, incluso con hot reload en desarrollo.
if (!globalForRateLimit.rateLimitCleanupTimer) {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      const newest = entry.timestamps.at(-1) ?? 0;
      if (now - newest > 15 * 60 * 1000) store.delete(key);
    }
  }, 5 * 60 * 1000);

  cleanupTimer.unref?.();
  globalForRateLimit.rateLimitCleanupTimer = cleanupTimer;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const entry = store.get(key) ?? { timestamps: [] };

  entry.timestamps = entry.timestamps.filter((timestamp) => timestamp > windowStart);

  const remaining = Math.max(0, config.max - entry.timestamps.length - 1);
  const resetAt = entry.timestamps.length > 0
    ? entry.timestamps[0] + config.windowMs
    : now + config.windowMs;

  if (entry.timestamps.length >= config.max) {
    store.set(key, entry);
    return { allowed: false, remaining: 0, resetAt };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { allowed: true, remaining, resetAt };
}

export const RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, max: 5 },
  invite: { windowMs: 60 * 60 * 1000, max: 10 },
  cardView: { windowMs: 60 * 1000, max: 60 },
  vcard: { windowMs: 60 * 1000, max: 20 },
} satisfies Record<string, RateLimitConfig>;
