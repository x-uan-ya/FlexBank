/**
 * Password hashing helpers (prototype-grade).
 *
 * Uses expo-crypto SHA-256 with a per-user random salt. We NEVER store or log
 * plaintext passwords. This is a client-side prototype: a production system
 * would hash server-side with a slow KDF (bcrypt/argon2). See BACKEND.md.
 */

import * as Crypto from 'expo-crypto';

/** Generate a random salt (hex). */
export async function makeSalt(bytes = 16): Promise<string> {
  const random = await Crypto.getRandomBytesAsync(bytes);
  return Array.from(random)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Hash a password with a salt using SHA-256. */
export async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`,
  );
}

/** Constant-ish comparison (string compare is fine for this prototype). */
export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const actual = await hashPassword(password, salt);
  return actual === expectedHash;
}

/** Generate an opaque session token. */
export async function makeToken(): Promise<string> {
  const random = await Crypto.getRandomBytesAsync(24);
  return Array.from(random)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** A stable id derived from an email (lowercased) for the prototype. */
export async function userIdForEmail(email: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    email.trim().toLowerCase(),
  );
  return `usr_${hash.slice(0, 16)}`;
}
