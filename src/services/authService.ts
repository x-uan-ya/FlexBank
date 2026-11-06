/**
 * Auth + user persistence service (local-first prototype).
 *
 * Implements `AuthService` using on-device storage. The UI and global state
 * depend ONLY on the `AuthService` interface, so a real backend (Supabase +
 * Express) can replace this implementation later without touching the app —
 * see BACKEND.md for the matching schema/endpoints.
 *
 * SAFETY:
 * - Passwords are salted + SHA-256 hashed; plaintext is never stored or logged.
 * - The session token lives in SecureStore (OS-encrypted).
 * - Each user's profile/preferences are keyed by their own id; callers can only
 *   read the currently-authenticated user's data via `getSession`.
 */

import type {
  AuthError,
  AuthResult,
  CustomerPreferences,
  LoginInput,
  RegisterInput,
  StoredCredential,
  StoredUser,
  UserProfile,
} from '@/types';

import {
  hashPassword,
  makeSalt,
  makeToken,
  userIdForEmail,
  verifyPassword,
} from './crypto';
import { jsonStorage, secureStorage } from './storage';

/* --------------------------- Storage key map --------------------------- */
// Directory of registered emails -> userId (non-secret).
const K_DIRECTORY = 'auth:directory';
// Per-user profile+preferences (non-secret): `user:<id>`.
const kUser = (id: string) => `user:${id}`;
// Per-user credential (secret): `cred:<id>`.
const kCred = (id: string) => `cred:${id}`;
// Active session token (secret) and the signed-in user id (secret).
const K_TOKEN = 'auth:token';
const K_SESSION_USER = 'auth:sessionUser';

type Directory = Record<string, string>; // emailLower -> userId

/** The service contract the app depends on. */
export interface AuthService {
  register(input: RegisterInput): Promise<AuthResult>;
  login(input: LoginInput): Promise<AuthResult>;
  logout(): Promise<void>;
  /** Returns the persisted session if one exists, else null. */
  getSession(): Promise<AuthResult | null>;
  /** Update the signed-in user's preferences; returns the saved copy. */
  updatePreferences(prefs: CustomerPreferences): Promise<CustomerPreferences>;
  /** Does an account exist for this email? (used by demo seeding) */
  hasAccount(email: string): Promise<boolean>;
}

function err(code: AuthError['code'], message: string): AuthError {
  return { code, message };
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function readDirectory(): Promise<Directory> {
  return (await jsonStorage.get<Directory>(K_DIRECTORY)) ?? {};
}

class LocalAuthService implements AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
    const fullName = input.fullName.trim();
    const email = normaliseEmail(input.email);

    if (!fullName) throw err('invalid_input', 'Please enter your full name.');
    if (!isValidEmail(email)) throw err('invalid_input', 'Please enter a valid email address.');
    if (input.password.length < 6)
      throw err('weak_password', 'Password must be at least 6 characters.');

    const directory = await readDirectory();
    if (directory[email]) {
      throw err('email_taken', 'An account with this email already exists.');
    }

    const id = await userIdForEmail(email);
    const salt = await makeSalt();
    const passwordHash = await hashPassword(input.password, salt);

    const profile: UserProfile = {
      id,
      fullName,
      email,
      createdAt: new Date().toISOString(),
    };
    const credential: StoredCredential = { userId: id, email, passwordHash, salt };
    const user: StoredUser = { profile, preferences: input.preferences };

    // Persist: directory + user record + credential.
    directory[email] = id;
    await jsonStorage.set(K_DIRECTORY, directory);
    await jsonStorage.set(kUser(id), user);
    await secureStorage.set(kCred(id), JSON.stringify(credential));

    return this.startSession(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const email = normaliseEmail(input.email);
    if (!isValidEmail(email) || !input.password) {
      throw err('invalid_input', 'Enter your email and password.');
    }

    const directory = await readDirectory();
    const id = directory[email];
    if (!id) throw err('invalid_credentials', 'Incorrect email or password.');

    const credRaw = await secureStorage.get(kCred(id));
    const user = await jsonStorage.get<StoredUser>(kUser(id));
    if (!credRaw || !user) throw err('invalid_credentials', 'Incorrect email or password.');

    const credential = JSON.parse(credRaw) as StoredCredential;
    const ok = await verifyPassword(input.password, credential.salt, credential.passwordHash);
    if (!ok) throw err('invalid_credentials', 'Incorrect email or password.');

    return this.startSession(user);
  }

  async logout(): Promise<void> {
    await secureStorage.remove(K_TOKEN);
    await secureStorage.remove(K_SESSION_USER);
  }

  async getSession(): Promise<AuthResult | null> {
    const token = await secureStorage.get(K_TOKEN);
    const userId = await secureStorage.get(K_SESSION_USER);
    if (!token || !userId) return null;

    const user = await jsonStorage.get<StoredUser>(kUser(userId));
    if (!user) {
      // Session points at a missing user — clear it.
      await this.logout();
      return null;
    }
    return { token, profile: user.profile, preferences: user.preferences };
  }

  async updatePreferences(prefs: CustomerPreferences): Promise<CustomerPreferences> {
    const userId = await secureStorage.get(K_SESSION_USER);
    if (!userId) throw err('not_found', 'You are not signed in.');
    const user = await jsonStorage.get<StoredUser>(kUser(userId));
    if (!user) throw err('not_found', 'Your profile could not be found.');

    const next: StoredUser = { ...user, preferences: prefs };
    await jsonStorage.set(kUser(userId), next);
    return prefs;
  }

  async hasAccount(email: string): Promise<boolean> {
    const directory = await readDirectory();
    return Boolean(directory[normaliseEmail(email)]);
  }

  private async startSession(user: StoredUser): Promise<AuthResult> {
    const token = await makeToken();
    await secureStorage.set(K_TOKEN, token);
    await secureStorage.set(K_SESSION_USER, user.profile.id);
    return { token, profile: user.profile, preferences: user.preferences };
  }
}

/** The single app-wide auth service instance. */
export const authService: AuthService = new LocalAuthService();
