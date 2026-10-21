/**
 * PayNow validation (Developer B).
 *
 * Pure, deterministic validation producing CUSTOMER-FRIENDLY messages (never
 * raw errors). Dev B expands these rules. Keeping validation pure makes it easy
 * to unit test and reuse across screens.
 */

import { MOCK_ACCOUNTS, PRIMARY_ACCOUNT_ID } from '@/data';
import type { ValidationResult } from '@/types/contracts';
import type { TransactionDraft } from '@/types/transaction';

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 25_000; // simulated daily PayNow-style cap

export function validateRecipient(draft: TransactionDraft): ValidationResult {
  const messages: string[] = [];
  if (!draft.recipientId) {
    messages.push('Choose who you want to pay.');
  }
  return { valid: messages.length === 0, messages };
}

export function validateAmount(draft: TransactionDraft): ValidationResult {
  const messages: string[] = [];
  const amount = draft.amount;

  if (amount === undefined || Number.isNaN(amount)) {
    messages.push('Enter an amount.');
  } else {
    if (amount < MIN_AMOUNT) {
      messages.push(`Enter at least S$${MIN_AMOUNT.toFixed(2)}.`);
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
