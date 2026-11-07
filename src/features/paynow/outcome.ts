/**
 * Simulated transfer outcome (Developer B / Member 3).
 *
 * Decides, after the customer has EXPLICITLY confirmed, whether the SIMULATED
 * transfer succeeds or fails. No real money is ever involved. The authoritative
 * reducer invokes this only after an explicit confirmation.
 *
 * DEMO TRIGGER: a transfer of exactly S$13.13 simulates a failure, so the team
 * can show the "what happens when something goes wrong" journey on demand.
 * Every other valid amount succeeds. The failure amount is defined once in
 * `validation.ts` so there is a single source of truth.
 */

import type { TransactionDraft } from '@/types/transaction';

import { SIMULATED_FAILURE_AMOUNT, validateTransaction } from './validation';

export { SIMULATED_FAILURE_AMOUNT } from './validation';

export type SimulatedOutcome = { ok: true } | { ok: false; reason: string };

export function simulateOutcome(draft: TransactionDraft): SimulatedOutcome {
  const validation = validateTransaction(draft);
  if (!validation.valid) return { ok: false, reason: validation.messages.join(' ') };
  if (draft.amount === SIMULATED_FAILURE_AMOUNT) {
    return {
      ok: false,
      reason:
        "We couldn't complete this simulated transfer. No money was moved. You can edit the details and try again, or ask for help.",
    };
  }
  return { ok: true };
}
