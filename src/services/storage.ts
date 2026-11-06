/**
 * Storage abstraction for the local-first prototype.
 *
 * - SecureStore: sensitive values (session token, credential hashes). Encrypted
 *   at rest by the OS keystore/keychain. Not available on web, so we fall back
 *   to a prefixed localStorage there (prototype only; web is not the target).
 * - AsyncStorage: non-secret records (user directory, profiles, preferences).
 *
 * Everything is namespaced under `flexbank:` so a reset is easy and we never
 * collide with other storage. Swapping to a real backend means replacing the
 * services that USE this file, not this file itself — see BACKEND.md.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const NS = 'flexbank:';

/* ------------------------------- Secure -------------------------------- */

const webSecureAvailable =
  Platform.OS === 'web' && typeof globalThis !== 'undefined' && 'localStorage' in globalThis;

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return webSecureAvailable ? globalThis.localStorage.getItem(NS + key) : null;
    }
    return SecureStore.getItemAsync(sanitize(key));
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (webSecureAvailable) globalThis.localStorage.setItem(NS + key, value);
      return;
    }
    await SecureStore.setItemAsync(sanitize(key), value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (webSecureAvailable) globalThis.localStorage.removeItem(NS + key);
      return;
    }
    await SecureStore.deleteItemAsync(sanitize(key));
  },
};

// SecureStore keys may only contain alphanumerics, ".", "-", and "_".
function sanitize(key: string): string {
  return (NS + key).replace(/[^A-Za-z0-9._-]/g, '_');
}

/* ------------------------------ Non-secret ----------------------------- */

export const jsonStorage = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(NS + key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(NS + key, JSON.stringify(value));
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(NS + key);
  },
};

/** Remove ALL FlexBank-namespaced data (used by the dev reset). */
export async function clearAllFlexBankData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter((k) => k.startsWith(NS));
  if (ours.length) await AsyncStorage.multiRemove(ours);
}
