/**
 * React hook wrapping the savings storage service.
 *
 * Provides the pocket list + loading flag and mutation helpers that persist and
 * then refresh in-memory state. Screens stay declarative; persistence logic
 * lives in storage.ts.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  addContribution as persistContribution,
  deletePocket as persistDelete,
  loadPockets,
  upsertPocket as persistUpsert,
} from './storage';
import type { SavingsPocket } from './types';

export function useSavingsPockets() {
  const [pockets, setPockets] = useState<SavingsPocket[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await loadPockets();
    setPockets(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (pocket: SavingsPocket) => {
    setPockets(await persistUpsert(pocket));
  }, []);

  const remove = useCallback(async (id: string) => {
    setPockets(await persistDelete(id));
  }, []);

  const contribute = useCallback(async (id: string, amount: number, note?: string) => {
    setPockets(await persistContribution(id, amount, note));
  }, []);

  return { pockets, loading, refresh, save, remove, contribute };
}
