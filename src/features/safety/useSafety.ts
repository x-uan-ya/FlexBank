import { useMemo } from 'react';

import { useAppDispatch } from '@/state';
import type { SafetyContract } from '@/types/contracts';

/**
 * Safety / UX feature API (Developer D), exposed as a hook so it can dispatch
 * typed actions. Implements `SafetyContract`.
 *
 * SAFETY: these controls change pacing and routing (checkpoints, pause/resume,
 * human handoff). They must NEVER confirm a transaction and must never remove
 * access to banking functionality — they only add safeguards.
 */
export function useSafety(): SafetyContract {
  const dispatch = useAppDispatch();

  return useMemo(
    () => ({
      requestCheckpoint() {
        dispatch({ type: 'REQUEST_CHECKPOINT' });
      },
      pauseTransaction() {
        dispatch({ type: 'PAUSE_TRANSACTION' });
      },
      resumeTransaction() {
        dispatch({ type: 'RESUME_TRANSACTION' });
      },
      requestHumanAssistance() {
        dispatch({ type: 'REQUEST_HUMAN_ASSISTANCE' });
      },
    }),
    [dispatch],
  );
}
