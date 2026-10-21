/**
 * App session state — the single shared state tree for the whole app.
 *
 * Owner: Integration lead (you). Feature developers read this and dispatch
 * typed actions (see actions.ts); they do not mutate it directly.
 *
 * SAFETY: Stores synthetic data only. No real banking credentials, no PII,
 * no sensitive inferred characteristics.
 */

import type { HomeWidget } from './home';
import type { CustomerPreferences } from './preferences';
import type { TransactionDraft } from './transaction';

/**
 * The current interaction mode of the app. Lightweight UI state that Safety
 * (Dev D) and Concierge (Dev C) can switch to adapt the experience.
 * - normal:     standard banking flow
 * - guided:     extra guidance / checkpoints active
 * - assistance: human assistance has been requested / in progress
 */
export type InteractionMode = 'normal' | 'guided' | 'assistance';

export interface AppSessionState {
  /** Explicit customer choices. Drives theme + personalisation. */
  preferences: CustomerPreferences;
  /** The working PayNow transfer draft. */
  transaction: TransactionDraft;
  /** Ordered homepage layout. Dev A replaces this from preferences. */
  homeLayout: HomeWidget[];
  /** Has the customer finished onboarding? Gates the home route. */
  onboardingCompleted: boolean;
  /** Current interaction mode. */
  interactionMode: InteractionMode;
  /** Is human assistance currently requested? */
  assistanceRequested: boolean;
}
