/**
 * Lightweight in-memory sliding-window rate limiter for Next.js API routes.
 * Suitable for multi-tenant protection against endpoint abuse and AI quota exhaustion.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((record, key) => {
      record.timestamps = record.timestamps.filter((t: number) => now - t < 5 * 60 * 1000);
      if (record.timestamps.length === 0) {
        rateLimitMap.delete(key);
      }
    });
  }, 5 * 60 * 1000);
  if (timer.unref) {
    timer.unref();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Checks whether a request with the given key is within the rate limit.
 *
 * @param key Unique identifier (e.g. `ai-scan:${tenantId}` or `ip:${ip}`)
 * @param maxRequests Maximum allowed requests in the window
 * @param windowMs Window duration in milliseconds (default: 60,000ms = 1 minute)
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 5,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now();
  let record = rateLimitMap.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitMap.set(key, record);
  }

  // Filter out timestamps older than the sliding window
  record.timestamps = record.timestamps.filter((t: number) => now - t < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const resetInMs = Math.max(0, windowMs - (now - oldestTimestamp));
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetInSeconds: Math.ceil(resetInMs / 1000),
    };
  }

  record.timestamps.push(now);

  return {
    allowed: true,
    limit: maxRequests,
    remaining: maxRequests - record.timestamps.length,
    resetInSeconds: Math.ceil(windowMs / 1000),
  };
}
