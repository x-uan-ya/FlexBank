/**
 * Minimal in-memory, per-IP rate limiter.
 *
 * A courtesy guard so a single client can't burn the shared free-tier quota.
 * In-memory is fine for a single-instance prototype; a real deployment would
 * use a shared store. Not a security control.
 */

import { config } from './config.js';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateResult {
  allowed: boolean;
  retryAfterSec?: number;
}

export function checkRateLimit(key: string): RateResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + config.rateLimitWindowMs });
    return { allowed: true };
  }

  if (existing.count >= config.rateLimitMax) {
    return { allowed: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true };
}

/** Periodically drop expired buckets so the map doesn't grow unbounded. */
export function startRateLimitCleanup(): NodeJS.Timeout {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(key);
    }
  }, 60_000);
  // Don't keep the process alive just for cleanup.
  timer.unref?.();
  return timer;
}
