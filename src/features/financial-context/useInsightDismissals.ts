import { useCallback, useEffect, useState } from 'react';

import { jsonStorage } from '@/services';

import { dismissalsKey, normaliseDismissedIds } from './panelLogic';

export function useInsightDismissals(userId: string | null) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(userId !== null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setDismissedIds([]);
      setLoading(false);
      setError(null);
      return () => { active = false; };
    }
    setLoading(true);
    setError(null);
    void jsonStorage.get<unknown>(dismissalsKey(userId)).then((saved) => {
      if (active) setDismissedIds(normaliseDismissedIds(saved));
    }).catch(() => {
      if (active) setError('Saved dismissals could not be loaded. Suggestions are still available.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [userId, revision]);

  const persist = useCallback(async (next: string[]) => {
    if (!userId) return;
    try {
      await jsonStorage.set(dismissalsKey(userId), next);
      setError(null);
    } catch {
      setError('This change works for now but could not be saved on this device.');
    }
  }, [userId]);

  const dismiss = useCallback((id: string) => {
    setDismissedIds((current) => {
      const next = normaliseDismissedIds([...current, id]);
      void persist(next);
      return next;
    });
  }, [persist]);

  const clear = useCallback(() => {
    setDismissedIds([]);
    void persist([]);
  }, [persist]);

  const retry = useCallback(() => setRevision((value) => value + 1), []);

  return { dismissedIds, loading, error, dismiss, clear, retry };
}
