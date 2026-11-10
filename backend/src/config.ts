/**
 * Reads settings from environment variables (the ".env" file).
 * Secrets live ONLY here, never in the app or in Git.
 */

import { randomBytes } from 'node:crypto';

export interface Config {
  port: number;
  jwtSecret: string;
  tokenTtlSeconds: number;
  corsOrigins: string[];
  demoKey: string | undefined;
  /** Friendly notes to print at startup (for example, a missing secret). */
  warnings: string[];
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const warnings: string[] = [];

  let jwtSecret = clean(env.JWT_SECRET);
  if (!jwtSecret || jwtSecret.length < 16) {
    jwtSecret = randomBytes(32).toString('hex');
    warnings.push(
      'JWT_SECRET is missing or shorter than 16 characters. Using a temporary secret, so everyone is logged out each time the server restarts.',
    );
  }

  let port = Number(clean(env.PORT) ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    warnings.push('PORT is not a valid port number. Using 4000.');
    port = 4000;
  }

  const corsOrigins = (clean(env.CORS_ORIGINS) ?? 'http://localhost:8081,http://localhost:19006')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    port,
    jwtSecret,
    tokenTtlSeconds: 60 * 60 * 8,
    corsOrigins,
    demoKey: clean(env.DEMO_KEY),
    warnings,
  };
}
