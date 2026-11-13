import { useEffect, useState } from 'react';

import { jsonStorage } from '@/services/storage';

/** useState that is also saved on this device under `key` (best effort). */
export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await jsonStorage.get<T>(key);
        if (active) setValue(saved !== null && saved !== undefined ? saved : initial);
      } catch {
        // Start from the default.
      }
      if (active) setLoadedFor(key);
    })();
    return () => {
      active = false;
    };
  }, [key]);

  useEffect(() => {
    if (loadedFor !== key) return; // never save before this key has loaded
    (async () => {
      try {
        await jsonStorage.set(key, value);
      } catch {
        // Not saved: the value still works for this run.
      }
    })();
  }, [value, loadedFor, key]);

  return [value, setValue];
}