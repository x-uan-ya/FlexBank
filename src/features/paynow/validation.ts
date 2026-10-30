/**
 * PayNow validation (Developer B).
 *
 * Pure, deterministic validation producing CUSTOMER-FRIENDLY messages (never
 * raw errors). Keeping validation pure makes it easy to unit test and reuse
 * across screens.
 *
 * Rules checked before a transfer can move to review:
 *  - A recipient is chosen AND exists in the synthetic recipient list.
 *  - The amount is a real number, at least the minimum, at most the demo cap,
 *    has no more than 2 decimal places, and is within the available balance.
 */

import { MOCK_ACCOUNTS, MOCK_RECIPIENTS, PRIMARY_ACCOUNT_ID } from '@/data';
import type { ValidationResult } from '@/types/contracts';
import type { TransactionDraft } from '@/types/transaction';

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 25_000; // simulated daily PayNow-style cap

/** True if the number has more than 2 decimal places (e.g. 10.999). */
function hasTooManyDecimals(amount: number): boolean {
  return Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6;
}

export function validateRecipient(draft: TransactionDraft): ValidationResult {
  const messages: string[] = [];

  if (!draft.recipientId) {
    messages.push('Choose who you want to pay.');
  } else if (!MOCK_RECIPIENTS.some((r) => r.id === draft.recipientId)) {
    messages.push("We couldn't find this recipient. Please choose someone from your list.");
  }

  return { valid: messages.length === 0, messages };
}

export function validateAmount(draft: TransactionDraft): ValidationResult {
  const messages: string[] = [];
  const amount = draft.amount;

  if (amount === undefined || Number.isNaN(amount)) {
    messages.push('Enter an amount.');
  } else if (!Number.isFinite(amount)) {
    messages.push('Enter a valid amount.');
  } else {
    if (amount < MIN_AMOUNT) {
      messages.push(`Enter at least S$${MIN_AMOUNT.toFixed(2)}.`);
    }
    if (hasTooManyDecimals(amount)) {
      messages.push('Use at most 2 decimal places, for example 12.50.');
    }
    if (amount > MAX_AMOUNT) {
      messages.push(`For this demo the limit is S$${MAX_AMOUNT.toLocaleString()}.`);
    }
    const account = MOCK_ACCOUNTS.find((a) => a.id === PRIMARY_ACCOUNT_ID);
    if (account && amount > account.balance) {
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
    valid: recipient.valid && amount.valid,
    messages: [...recipient.messages, ...amount.messages],
  };
}
