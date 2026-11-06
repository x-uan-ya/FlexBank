/**
 * Auth + profile types.
 *
 * SAFETY: this is a prototype using LOCAL, on-device persistence only. We store
 * a salted password HASH (never plaintext) and a session token on the device.
 * No real banking credentials, no live banking systems. The service layer is
 * written behind interfaces so a real backend (e.g. Supabase) can replace the
 * local implementation later without touching the UI — see BACKEND.md.
 */

import type { CustomerPreferences } from './preferences';

/** A customer profile (synthetic, prototype). */
export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

/** Stored credential record (password is hashed, never plaintext). */
export interface StoredCredential {
  userId: string;
  email: string;
  /** Salted hash of the password. */
  passwordHash: string;
  salt: string;
}

/** A persisted user record = profile + preferences. */
export interface StoredUser {
  profile: UserProfile;
  preferences: CustomerPreferences;
}

/** Input for registration. */
export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  preferences: CustomerPreferences;
}

/** Input for login. */
export interface LoginInput {
  email: string;
  password: string;
}

/** The result of a successful auth operation. */
export interface AuthResult {
  token: string;
  profile: UserProfile;
  preferences: CustomerPreferences;
}

/** Auth status for the session state machine. */
export type AuthStatus =
  | 'loading' // checking persisted session on boot
  | 'signedOut'
  | 'signedIn';

/** A friendly, typed auth error (never raw). */
export interface AuthError {
  code:
    | 'invalid_credentials'
    | 'email_taken'
    | 'weak_password'
    | 'invalid_input'
    | 'not_found'
    | 'unknown';
  message: string;
}
