/**
 * Passwords and login tokens, using only Node's built-in crypto.
 *
 * - Passwords are hashed with scrypt (a slow, salted hash). We never store the password.
 * - Login tokens are standard HS256 signed tokens (JWT format) that expire.
 *
 * For a real bank you would use a vetted auth service. This is fine for a demo.
 */

import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

function scryptHash(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptHash(password, salt);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const salt = Buffer.from(parts[1] ?? '', 'base64');
  const expected = Buffer.from(parts[2] ?? '', 'base64');
  const actual = await scryptHash(password, salt);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

let dummyHash: Promise<string> | undefined;

/**
 * Used when the email is not found, so "unknown email" and "wrong password"
 * take about the same time and give the same message.
 */
export function verifyAgainstDummy(password: string): Promise<boolean> {
  dummyHash ??= hashPassword('this-is-not-a-real-password');
  return dummyHash.then((hash) => verifyPassword(password, hash));
}

const encode = (value: string): string => Buffer.from(value, 'utf8').toString('base64url');
const decode = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');

export function signToken(
  userId: string,
  secret: string,
  ttlSeconds: number,
  nowMs: number = Date.now(),
): string {
  const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const issuedAt = Math.floor(nowMs / 1000);
  const payload = encode(JSON.stringify({ sub: userId, iat: issuedAt, exp: issuedAt + ttlSeconds }));
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

/** Returns the user id if the token is genuine and not expired, otherwise null. */
export function verifyToken(token: string, secret: string, nowMs: number = Date.now()): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  const [header, payload, signature] = parts as [string, string, string];

  const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest();
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }

  try {
    const head = JSON.parse(decode(header)) as { alg?: unknown };
    if (head.alg !== 'HS256') {
      return null;
    }
    const body = JSON.parse(decode(payload)) as { sub?: unknown; exp?: unknown };
    if (typeof body.sub !== 'string' || typeof body.exp !== 'number') {
      return null;
    }
    if (body.exp * 1000 <= nowMs) {
      return null;
    }
    return body.sub;
  } catch {
    return null;
  }
}
