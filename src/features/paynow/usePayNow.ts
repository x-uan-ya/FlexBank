import { useMemo } from 'react';

import { useAppDispatch, useTransaction } from '@/state';
import type { PayNowContract, ValidationResult } from '@/types/contracts';
import type { Recipient } from '@/types/banking';
import type { TransactionDraft } from '@/types/transaction';

import { validateTransaction } from './validation';

/** Additive PayNow-only methods; shared callers keep the existing contract. */
export type PayNowApi = PayNowContract & {
  draft: TransactionDraft;
  cancelTransfer(): void;
  failTransfer(reason: string): void;
};

/**
 * PayNow feature API (Developer B), exposed as a hook so it can dispatch typed
 * actions. Implements `PayNowContract`. Screens call these methods instead of
 * dispatching actions directly, so the PayNow state machine lives in one place.
 *
 * SAFETY (principles 1 & 2): `confirmTransaction` must only ever be called as a
 * direct result of an explicit customer press. AI / Concierge must never call
 * it. The reducer additionally refuses to confirm unless the draft is
 * review-ready and has no pending re-review.
 */
export function usePayNow(): PayNowApi {
  const dispatch = useAppDispatch();
  const draft = useTransaction();

  return useMemo(
    () => ({
      draft,
      startTransfer() {
        dispatch({ type: 'START_TRANSFER' });
      },
      setRecipient(recipient: Recipient) {
        dispatch({ type: 'SET_RECIPIENT', payload: recipient });
      },
      setAmount(amount: number) {
        dispatch({ type: 'SET_AMOUNT', payload: amount });
      },
      validateTransaction(d: TransactionDraft): ValidationResult {
        return validateTransaction(d);
      },
      requestReview() {
        dispatch({ type: 'MARK_READY_FOR_REVIEW' });
      },
      confirmTransaction() {
        // Explicit customer action only. Reducer validates and simulates outcome.
        dispatch({ type: 'CONFIRM_TRANSACTION' });
      },
      cancelTransfer() {
        dispatch({ type: 'CANCEL_TRANSACTION' });
      },
      failTransfer(reason: string) {
        dispatch({ type: 'FAIL_TRANSACTION', payload: { reason } });
      },
    }),
    [dispatch, draft],
  );
}
