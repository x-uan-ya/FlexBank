/**
 * Action / event model for the shared session reducer.
 *
 * This is a discriminated union so TypeScript can exhaustively check the
 * reducer. Screens NEVER mutate global state directly — they dispatch one of
 * these typed actions. This keeps state transitions understandable and lets
 * four developers reason about changes independently.
 *
 * Ownership of actions (who typically dispatches what):
 * - Dev A (Personalisation): SET_PREFERENCES, SET_HOME_LAYOUT, COMPLETE_ONBOARDING,
 *   RESET_PREFERENCES, SET_INTERACTION_MODE
 * - Dev B (PayNow): START_TRANSFER, SET_RECIPIENT, SET_AMOUNT, SET_TRANSACTION_STEP,
 *   MARK_READY_FOR_REVIEW, CONFIRM_TRANSACTION, FAIL_TRANSACTION, CANCEL_TRANSACTION
 * - Dev C (Concierge): no direct state mutation required (stateless helpers);
 *   may use REQUEST_EXPLANATION as an event hook if needed.
 * - Dev D (Safety): REQUEST_CHECKPOINT, PAUSE_TRANSACTION, RESUME_TRANSACTION,
 *   REQUEST_HUMAN_ASSISTANCE, RESOLVE_HUMAN_ASSISTANCE
 */

import type { HomeWidget } from './home';
import type { CustomerPreferences, DisplayMode, VisualTheme } from './preferences';
import type { InteractionMode } from './session';
import type { Recipient } from './banking';

export type AppAction =
  // --- Personalisation (Dev A) ---
  | { type: 'SET_PREFERENCES'; payload: Partial<CustomerPreferences> }
  | { type: 'SET_DISPLAY_MODE'; payload: DisplayMode }
  | { type: 'SET_VISUAL_THEME'; payload: VisualTheme }
  | { type: 'SET_HOME_LAYOUT'; payload: HomeWidget[] }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'RESET_PREFERENCES' }
  | { type: 'SET_INTERACTION_MODE'; payload: InteractionMode }

  // --- PayNow (Dev B) ---
  | { type: 'START_TRANSFER' }
  | { type: 'SET_RECIPIENT'; payload: Recipient }
  | { type: 'SET_AMOUNT'; payload: number }
  | { type: 'SET_TRANSACTION_STEP'; payload: import('./transaction').TransactionStep }
  | { type: 'MARK_READY_FOR_REVIEW' }
  | { type: 'CONFIRM_TRANSACTION' }
  | { type: 'FAIL_TRANSACTION'; payload: { reason: string } }
  | { type: 'CANCEL_TRANSACTION' }

  // --- Safety (Dev D) ---
  | { type: 'REQUEST_CHECKPOINT' }
  | { type: 'PAUSE_TRANSACTION' }
  | { type: 'RESUME_TRANSACTION' }
  | { type: 'REQUEST_HUMAN_ASSISTANCE' }
  | { type: 'RESOLVE_HUMAN_ASSISTANCE' }

  // --- Concierge (Dev C) — optional event hook, no state mutation required ---
  | { type: 'REQUEST_EXPLANATION'; payload: { context: string } };

/** Convenience union of all action type strings. */
export type AppActionType = AppAction['type'];
