/**
 * Server configuration, loaded from the environment (.env).
 *
 * The Gemini API key lives ONLY here, server-side. It is never sent to the
 * client and never logged.
 */

import 'dotenv/config';

export interface Config {
  port: number;
  corsOrigin: string;
  geminiApiKey: string | undefined;
  geminiModel: string;
  /** Hard cap on model output so we stay comfortably inside the free tier. */
  maxOutputTokens: number;
  /** Per-IP request budget per window (courtesy guard, below Gemini's limits). */
  rateLimitMax: number;
  rateLimitWindowMs: number;
  /** Upstream call timeout. */
  requestTimeoutMs: number;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config: Config = {
  port: intEnv('PORT', 8787),
  corsOrigin: process.env.CORS_ORIGIN?.trim() || '*',
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || undefined,
  geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash-lite',
  maxOutputTokens: intEnv('GEMINI_MAX_OUTPUT_TOKENS', 512),
  rateLimitMax: intEnv('RATE_LIMIT_MAX', 20),
  rateLimitWindowMs: intEnv('RATE_LIMIT_WINDOW_MS', 60_000),
  requestTimeoutMs: intEnv('REQUEST_TIMEOUT_MS', 15_000),
};

/** True when a Gemini key is configured. When false, routes return 503. */
export function isAiConfigured(): boolean {
  return Boolean(config.geminiApiKey);
}
