/**
 * Transaction domain types for the PayNow journey.
 *
 * Owner: Developer B (PayNow). The PayNow developer can consume and modify the
 * TransactionDraft via session actions without understanding the rest of the
 * app.
 *
 * SAFETY PRINCIPLES baked in here:
 * - `status` can become `reviewRequired` when important details change, forcing
 *   a fresh review before confirmation (see REVIEW_TRIGGERS).
 * - Only an explicit customer action may move status to `confirmed`. AI must
 *   never set this (Dev C / Dev D must go through the safety contract).
 * - All data is synthetic. No real account numbers or PII.
 */

export type Currency = 'SGD';

/**
 * Lifecycle status of the transaction draft.
 * - idle:           no active transfer
 * - editing:        customer is entering details
 * - readyForReview: all required fields valid, can proceed to review
 * - reviewRequired: details changed after review; must be re-reviewed
 * - confirmed:      explicitly confirmed by the customer (terminal, success)
 * - failed:         a simulated failure occurred (recoverable, see Dev D)
 * - cancelled:      customer abandoned the transfer (terminal)
 */
export type TransactionStatus =
  | 'idle'
  | 'editing'
  | 'readyForReview'
  | 'reviewRequired'
  | 'confirmed'
  | 'failed'
  | 'cancelled';

/**
 * The step the customer is currently on. Maps to the PayNow route stack.
 * `checkpoint` is a Safety (Dev D) interstitial that can appear before
 * confirmation.
 */
export type TransactionStep =
  | 'recipient'
  | 'amount'
  | 'review'
  | 'checkpoint'
  | 'confirmation';

/**
 * The working draft of a transfer. Fields are optional until the customer
 * provides them; validation (Dev B) decides when the draft is review-ready.
 */
export interface TransactionDraft {
  recipientId?: string;
  recipientName?: string;
  recipientBank?: string;
  /** Masked identifier only, e.g. "•••• 4821". Never a full account number. */
  recipientIdentifier?: string;
  /** Amount in major units (e.g. dollars). Undefined until entered. */
  amount?: number;
  currency: Currency;
  status: TransactionStatus;
  currentStep: TransactionStep;
  /** ISO timestamp of the last successful validation, or null. */
  lastValidatedAt: string | null;
  /** True when details changed and a fresh review is required before confirm. */
  requiresReview: boolean;
  /** Customer-friendly note about a failure, set by Dev B/Dev D on failure. */
  failureReason?: string;
}

/** A fresh, empty draft. */
export const EMPTY_DRAFT: TransactionDraft = {
  currency: 'SGD',
  status: 'idle',
  currentStep: 'recipient',
  lastValidatedAt: null,
  requiresReview: false,
};

/**
 * Fields whose change after a review should trigger a `reviewRequired` state.
 * Dev B/Dev D can reference this so the review-required rule stays consistent.
 */
export const REVIEW_TRIGGERS: (keyof TransactionDraft)[] = [
  'recipientId',
  'recipientIdentifier',
  'amount',
];

/**
 * A completed/simulated transaction record (for history / success screen).
 * Separate from the draft so history is immutable.
 */
export interface TransactionRecord {
  id: string;
  recipientName: string;
  recipientBank: string;
  recipientIdentifier: string;
  amount: number;
  currency: Currency;
  /** ISO timestamp. */
  completedAt: string;
  status: Extract<TransactionStatus, 'confirmed' | 'failed' | 'cancelled'>;
  reference: string;
}
