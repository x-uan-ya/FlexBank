import { useCallback, useMemo } from 'react';

import { usePersistedState } from '@/features/shell/usePersistedState';
import { useCurrentUser } from '@/features/shell/useCurrentUser';
import { usePreferences } from '@/state';

import {
  MAX_QUICK_ACTIONS,
  QUICK_ACTIONS,
  addQuickAction,
  getQuickAction,
  moveQuickAction,
  removeQuickAction,
  resolveQuickActionIds,
  type QuickAction,
  type QuickActionId,
} from './quickActions';

/**
 * The signed-in customer's quick actions, saved on this device (the app is
 * local-first). `null` means "never changed", so the defaults follow the banking
 * purposes the customer chose. Every change saves straight away.
 *
 * When the app is connected to the backend, this is the one place to swap the
 * local save for GET/PUT /api/quick-actions (see src/features/quickActions/README.md).
 */
export function useQuickActions() {
  const { id: userId } = useCurrentUser();
  const { bankingPurposes } = usePreferences();
  const [saved, setSaved] = usePersistedState<QuickActionId[] | null>(`quickActions:${userId}`, null);

  const { ids, isDefault } = useMemo(
    () => resolveQuickActionIds(saved, bankingPurposes),
    [saved, bankingPurposes],
  );

  const selected = useMemo(
    () => ids.map((id) => getQuickAction(id)).filter((action): action is QuickAction => action !== undefined),
    [ids],
  );
  const available = useMemo(() => QUICK_ACTIONS.filter((action) => !ids.includes(action.id)), [ids]);

  const add = useCallback((id: QuickActionId) => setSaved(addQuickAction(ids, id)), [ids, setSaved]);
  const remove = useCallback((id: QuickActionId) => setSaved(removeQuickAction(ids, id)), [ids, setSaved]);
  const move = useCallback(
    (id: QuickActionId, direction: -1 | 1) => setSaved(moveQuickAction(ids, id, direction)),
    [ids, setSaved],
  );
  /** Back to the suggested shortcuts. */
  const reset = useCallback(() => setSaved(null), [setSaved]);

  return { selected, available, isDefault, max: MAX_QUICK_ACTIONS, atMax: ids.length >= MAX_QUICK_ACTIONS, add, remove, move, reset };
}
