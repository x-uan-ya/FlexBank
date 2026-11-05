/** Member 3's deterministic simulated outcome, integrated from cc99ea5. */
import type { TransactionDraft } from '@/types/transaction';

import { SIMULATED_FAILURE_AMOUNT, validateTransaction } from './validation';

export { SIMULATED_FAILURE_AMOUNT } from './validation';

export type SimulatedOutcome = { ok: true } | { ok: false; reason: string };

/** The authoritative reducer invokes this only after an explicit confirmation. */
export function simulateOutcome(draft: TransactionDraft): SimulatedOutcome {
  const validation = validateTransaction(draft);
  if (!validation.valid) return { ok: false, reason: validation.messages.join(' ') };
  if (draft.amount === SIMULATED_FAILURE_AMOUNT) {
    return {
      ok: false,
      reason: "We couldn't complete this simulated transfer. No money was moved. You can edit the details and try again, or ask for help.",
    };
  }
  return { ok: true };
}
