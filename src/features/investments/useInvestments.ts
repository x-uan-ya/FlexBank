/**
 * React hook over the investment storage service: list + reminder prefs with
 * mutation helpers that persist then refresh in-memory state.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  deleteInvestment as persistDelete,
  loadInvestments,
  loadReminderPrefs,
  saveReminderPrefs,
  upsertInvestment as persistUpsert,
} from './storage';
import { DEFAULT_REMINDER_PREFS, type Investment, type ReminderPrefs } from './types';

export function useInvestments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [reminderPrefs, setReminderPrefs] = useState<ReminderPrefs>(DEFAULT_REMINDER_PREFS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [list, prefs] = await Promise.all([loadInvestments(), loadReminderPrefs()]);
    setInvestments(list);
    setReminderPrefs(prefs);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (inv: Investment) => {
    setInvestments(await persistUpsert(inv));
  }, []);

  const remove = useCallback(async (id: string) => {
    setInvestments(await persistDelete(id));
  }, []);

  const updateReminderPrefs = useCallback(async (prefs: ReminderPrefs) => {
    setReminderPrefs(await saveReminderPrefs(prefs));
  }, []);

  return { investments, reminderPrefs, loading, refresh, save, remove, updateReminderPrefs };
}
