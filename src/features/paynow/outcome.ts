/**
 * Simulated transfer outcome (Developer B).
 *
 * Decides, after the customer has explicitly confirmed, whether the SIMULATED
 * transfer succeeds or fails. No real money is ever involved.
 *
 * DEMO TRIGGER: a transfer of exactly S$13.13 simulates a failure, so the team
 * can show the "what happens when something goes wrong" journey on demand.
 * Every other valid amount succeeds.
 */

import type { TransactionDraft } from '@/types/transaction';

export const SIMULATED_FAILURE_AMOUNT = 13.13;

export type SimulatedOutcome = { ok: true } | { ok: false; reason: string };

export function simulateOutcome(draft: TransactionDraft): SimulatedOutcome {
  if (draft.amount === SIMULATED_FAILURE_AMOUNT) {
    return {
      ok: false,
      reason:
        "We couldn't complete this transfer right now. No money was moved. You can try again or ask for help.",
    };
  }
  return { ok: true };
}
