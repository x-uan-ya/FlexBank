/**
 * Transfer rules. These mirror the rules in the app (src/features/paynow/validation.ts)
 * so the SERVER is the final judge even if the app is bypassed.
 * All messages are customer-friendly, never raw errors.
 */

export const MIN_AMOUNT = 1;
export const MAX_AMOUNT = 25_000; // simulated daily PayNow-style cap
export const SIMULATED_FAILURE_AMOUNT = 13.13;
export const SIMULATED_FAILURE_REASON =
  "We couldn't complete this transfer right now. No money was moved. You can try again or ask for help.";

export interface ValidationResult {
  valid: boolean;
  messages: string[];
}

/** True if the number has more than 2 decimal places (e.g. 10.999). */
function hasTooManyDecimals(amount: number): boolean {
  return Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6;
}

/** DEMO ONLY: exactly S$13.13 simulates a failed transfer so the failure journey can be shown on demand. */
export function isSimulatedFailureAmount(amount: number): boolean {
  return Math.round(amount * 100) === Math.round(SIMULATED_FAILURE_AMOUNT * 100);
}

export function validateTransfer(input: {
  recipientChosen: boolean;
  recipientFound: boolean;
  amount: unknown;
  balance: number;
}): ValidationResult {
  const messages: string[] = [];

  if (!input.recipientChosen) {
    messages.push('Choose who you want to pay.');
  } else if (!input.recipientFound) {
    messages.push("We couldn't find this recipient. Please choose someone from your list.");
  }

  const amount = input.amount;
  if (amount === undefined || amount === null) {
    messages.push('Enter an amount.');
  } else if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    messages.push('Enter a valid amount.');
  } else {
    if (amount < MIN_AMOUNT) {
      messages.push(`Enter at least S$${MIN_AMOUNT.toFixed(2)}.`);
    }
    if (hasTooManyDecimals(amount)) {
      messages.push('Use at most 2 decimal places, for example 12.50.');
    }
    if (amount > MAX_AMOUNT) {
      messages.push(`For this demo the limit is S$${MAX_AMOUNT.toLocaleString('en-US')}.`);
    }
    if (amount > input.balance) {
      messages.push('This is more than your available balance.');
    }
  }

  return { valid: messages.length === 0, messages };
}

export type MobileParse = { ok: true; mobile: string } | { ok: false; message: string };

/** Cleans a typed PayNow mobile number ("+65 9000-4821" becomes "90004821") and checks its format. */
export function parseMobile(input: unknown): MobileParse {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (raw.length === 0) {
    return { ok: false, message: 'Enter a mobile number.' };
  }

  const mobile = raw.replace(/[\s-]/g, '').replace(/^\+65/, '');

  if (!/^\d+$/.test(mobile)) {
    return { ok: false, message: 'Mobile numbers can only contain digits.' };
  }
  if (mobile.length !== 8 || !/^[89]/.test(mobile)) {
    return { ok: false, message: 'Enter an 8-digit Singapore mobile number starting with 8 or 9.' };
  }
  return { ok: true, mobile };
}

export const MOBILE_NOT_FOUND_MESSAGE =
  "We couldn't find a PayNow account for this number. Check the number or choose someone from your list.";
