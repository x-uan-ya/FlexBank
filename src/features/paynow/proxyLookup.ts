/**
 * PayNow mobile-number lookup (Developer B).
 *
 * Lets a customer enter a PayNow mobile number instead of tapping the list.
 * This is what makes the "recover from an invalid recipient entry" demo
 * possible: a wrong number gives a friendly message and the customer can fix
 * it without losing the rest of their journey.
 *
 * DEMO ONLY: the numbers below are made-up and only exist to link to the
 * synthetic recipients in src/data. No real people or accounts.
 */

import { MOCK_RECIPIENTS } from '@/data';
import type { Recipient } from '@/types/banking';

/** Demo PayNow numbers -> synthetic recipient ids. */
const DEMO_PROXY_DIRECTORY: Record<string, string> = {
  '90004821': 'rcp-alex',
  '90001293': 'rcp-sarah',
  '90007356': 'rcp-marcus',
  '90009014': 'rcp-priya',
  '90002680': 'rcp-wei',
};

export type ProxyLookupResult =
  | { ok: true; recipient: Recipient }
  | { ok: false; message: string };

/** Removes spaces, dashes and a leading +65 so "+65 9000-4821" becomes "90004821". */
function cleanMobile(input: string): string {
  return input.replace(/[\s-]/g, '').replace(/^\+65/, '');
}

export function lookupRecipientByMobile(input: string): ProxyLookupResult {
  const raw = input.trim();
  if (raw.length === 0) {
    return { ok: false, message: 'Enter a mobile number.' };
  }

  const number = cleanMobile(raw);

  if (!/^\d+$/.test(number)) {
    return { ok: false, message: 'Mobile numbers can only contain digits.' };
  }
  if (number.length !== 8 || !/^[89]/.test(number)) {
    return {
      ok: false,
      message: 'Enter an 8-digit Singapore mobile number starting with 8 or 9.',
    };
  }

  const recipientId = DEMO_PROXY_DIRECTORY[number];
  const recipient = MOCK_RECIPIENTS.find((r) => r.id === recipientId);
  if (!recipient) {
    return {
      ok: false,
      message:
        "We couldn't find a PayNow account for this number. Check the number or choose someone from your list.",
    };
  }

  return { ok: true, recipient };
}
