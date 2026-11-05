/**
 * PayNow validation (Developer B).
 *
 * Pure, deterministic validation producing CUSTOMER-FRIENDLY messages (never
 * raw errors). Shared by the screens and the authoritative reducer so direct
 * actions receive the same canonical-identity, currency and amount checks.
 */

import { MOCK_ACCOUNTS, PRIMARY_ACCOUNT_ID } from '@/data/accounts';
import { MOCK_RECIPIENTS } from '@/data/recipients';
import type { ValidationResult } from '@/types/contracts';
import type { TransactionDraft } from '@/types/transaction';

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 25_000; // simulated daily PayNow-style cap
/** Shared by outcome simulation and the defensive receipt guard. */
export const SIMULATED_FAILURE_AMOUNT = 13.13;

export function validateRecipient(draft: TransactionDraft): ValidationResult {
  const messages: string[] = [];
  if (!draft.recipientId) {
    messages.push('Choose who you want to pay.');
  } else {
    const recipient = MOCK_RECIPIENTS.find((item) => item.id === draft.recipientId);
    if (!recipient) {
      messages.push("We couldn't find this recipient. Please choose someone from your list.");
    } else if (
      draft.recipientName !== recipient.name ||
      draft.recipientBank !== recipient.bank ||
      draft.recipientIdentifier !== recipient.maskedIdentifier
    ) {
      messages.push('The recipient details do not match. Please choose the recipient again.');
    }
  }
  return { valid: messages.length === 0, messages };
}

export function validateAmount(draft: TransactionDraft): ValidationResult {
  const messages: string[] = [];
  const amount = draft.amount;

  if (amount === undefined || Number.isNaN(amount)) {
    messages.push('Enter an amount.');
  } else if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    messages.push('Enter a valid amount.');
  } else {
    if (amount < MIN_AMOUNT) {
      messages.push(`Enter at least S$${MIN_AMOUNT.toFixed(2)}.`);
    }
    if (amount > MAX_AMOUNT) {
      messages.push(`For this demo the limit is S$${MAX_AMOUNT.toLocaleString()}.`);
    }
    // Require the exact canonical cent value. An epsilon could accept e.g.
    // 13.1300000001, which displays as 13.13 but misses the failure trigger.
    if (amount !== Number(amount.toFixed(2))) {
      messages.push('Use at most 2 decimal places, for example 12.50.');
    }
    const account = MOCK_ACCOUNTS.find((a) => a.id === PRIMARY_ACCOUNT_ID);
    if (!account || !Number.isFinite(account.balance)) {
      messages.push('Your demo account is unavailable. Please try again.');
    } else if (amount > account.balance) {
      messages.push('This is more than your available balance.');
    }
  }

  return { valid: messages.length === 0, messages };
}

/** Full validation used before review. */
export function validateTransaction(draft: TransactionDraft): ValidationResult {
  const recipient = validateRecipient(draft);
  const amount = validateAmount(draft);
  return {
    valid: recipient.valid && amount.valid && draft.currency === 'SGD',
    messages: [
      ...recipient.messages,
      ...amount.messages,
      ...(draft.currency === 'SGD' ? [] : ['This demo supports transfers in Singapore dollars only.']),
    ],
  };
}

function hasValidatedTimestamp(draft: TransactionDraft): boolean {
  return typeof draft.lastValidatedAt === 'string' &&
    Number.isFinite(Date.parse(draft.lastValidatedAt));
}

/** Shared UI/reducer predicate; only the reducer can authorise the transition. */
export function canConfirmTransaction(draft: TransactionDraft): boolean {
  return draft.status === 'readyForReview' && !draft.requiresReview &&
    hasValidatedTimestamp(draft) && validateTransaction(draft).valid;
}

/** Direct links or corrupted/incomplete state must never produce a success receipt. */
export function canShowSuccessfulReceipt(draft: TransactionDraft): boolean {
  return draft.status === 'confirmed' && !draft.requiresReview &&
    !draft.failureReason && draft.amount !== SIMULATED_FAILURE_AMOUNT &&
    hasValidatedTimestamp(draft) && validateTransaction(draft).valid;
}
