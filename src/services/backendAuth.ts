import { DEMO_ACCOUNTS } from '@/data';
import type {
  AuthError,
  AuthResult,
  CustomerPreferences,
  LoginInput,
  RegisterInput,
} from '@/types';

import { api, setAuthToken } from './backend';
import {
  loginWithBackend,
  registerWithBackend,
  savePreferencesToBackend,
} from './backendEndpoints';
import { authResultFromBackend, preferencesToBackend } from './backendMappers';
import type { AuthService } from './authService';
import { secureStorage } from './storage';

// Our own storage key. The on-device service keeps its keys untouched.
const K_BACKEND_SESSION = 'auth:backendSession';

function apiStatus(e: unknown): number | null {
  const err = e as { name?: unknown; status?: unknown } | null;
  return err && err.name === 'ApiError' && typeof err.status === 'number'
    ? err.status
    : null;
}

/** True when the server could not be reached or had an internal problem. */
function serverUnavailable(e: unknown): boolean {
  const status = apiStatus(e);
  return status === 0 || (status !== null && status >= 500);
}

function authError(code: AuthError['code'], message: string): AuthError {
  return { code, message };
}

/** The built-in demo accounts are seeded on this device only. */
function isDemoEmail(email: string): boolean {
  return DEMO_ACCOUNTS.some((d) => d.email.trim().toLowerCase() === email);
}

/**
 * Backend-first auth. If the backend is down or does not know the account, we
 * fall back to the on-device service, so the app always works offline.
 */
class BackendAuthService implements AuthService {
  private readonly local: AuthService;

  constructor(local: AuthService) {
    this.local = local;
  }

  async login(input: LoginInput): Promise<AuthResult> {
    let result: AuthResult;
    try {
      const res = await loginWithBackend(
        input.email.trim().toLowerCase(),
        input.password,
      );
      result = authResultFromBackend(res);
    } catch (e) {
      return this.loginOnDevice(input, serverUnavailable(e));
    }
    await this.rememberBackendSession(result);
    return result;
  }

  private async loginOnDevice(
    input: LoginInput,
    serverDown: boolean,
  ): Promise<AuthResult> {
    try {
      const result = await this.local.login(input);
      setAuthToken(null);
      await this.forgetBackendSession();
      return result;
    } catch (e) {
      if (serverDown && (e as AuthError | null)?.code === 'invalid_credentials') {
        throw authError(
          'invalid_credentials',
          'Incorrect email or password, or we could not reach the server.',
        );
      }
      throw e;
    }
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    // Seeded demo accounts never go to the server.
    if (isDemoEmail(email)) return this.local.register(input);

    let created: AuthResult;
    try {
      const res = await registerWithBackend({
        name: input.fullName.trim(),
        email,
        password: input.password,
        preferences: preferencesToBackend(input.preferences),
      });
      created = authResultFromBackend(res);
    } catch (e) {
      // Server down: register on this device so the app still works offline.
      if (serverUnavailable(e)) return this.local.register(input);
      const message =
        (e as { message?: string } | null)?.message ??
        'We could not create your account. Please try again.';
      throw authError(apiStatus(e) === 409 ? 'email_taken' : 'invalid_input', message);
    }

    // Keep exactly what the customer chose (the server may not store every field).
    const result: AuthResult = { ...created, preferences: input.preferences };
    await this.rememberBackendSession(result);

    // Best effort: also keep an on-device copy so this account works offline.
    try {
      await this.local.register(input);
    } catch {
      // Already on this device, or storage unavailable. Not fatal.
    }
    return result;
  }

  async logout(): Promise<void> {
    setAuthToken(null);
    await this.forgetBackendSession();
    await this.local.logout();
  }

  async getSession(): Promise<AuthResult | null> {
    const stored = await this.readBackendSession();
    if (stored) {
      setAuthToken(stored.token);
      try {
        await api.get('/api/me'); // is the token still accepted?
        return stored;
      } catch (e) {
        if (serverUnavailable(e)) return stored; // stay signed in while offline
        await this.forgetBackendSession(); // token rejected, so sign in again
        setAuthToken(null);
      }
    }
    return this.local.getSession();
  }

  async updatePreferences(prefs: CustomerPreferences): Promise<CustomerPreferences> {
    const stored = await this.readBackendSession();
    if (!stored) return this.local.updatePreferences(prefs);

    setAuthToken(stored.token);
    try {
      await savePreferencesToBackend(preferencesToBackend(prefs));
    } catch {
      // The server did not take it. The choice is still kept on this device.
    }
    await this.rememberBackendSession({ ...stored, preferences: prefs });
    return prefs;
  }

  hasAccount(email: string): Promise<boolean> {
    return this.local.hasAccount(email);
  }

  private async readBackendSession(): Promise<AuthResult | null> {
    try {
      const raw = await secureStorage.get(K_BACKEND_SESSION);
      return raw ? (JSON.parse(raw) as AuthResult) : null;
    } catch {
      return null;
    }
  }

  private async rememberBackendSession(result: AuthResult): Promise<void> {
    try {
      await secureStorage.set(K_BACKEND_SESSION, JSON.stringify(result));
    } catch {
      // Not saved: the customer stays signed in for this run only.
    }
  }

  private async forgetBackendSession(): Promise<void> {
    try {
      await secureStorage.remove(K_BACKEND_SESSION);
    } catch {
      // Nothing to remove.
    }
  }
}

export function createBackendAuthService(local: AuthService): AuthService {
  return new BackendAuthService(local);
}