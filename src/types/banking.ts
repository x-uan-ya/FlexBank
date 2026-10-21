/**
 * Core banking domain types (synthetic).
 *
 * Shared read-only reference types for accounts and recipients. Mock data in
 * `src/data` conforms to these. NO real customer data, NO live APIs.
 */

import type { Currency } from './transaction';

/** A customer-owned account shown on the home/accounts widgets. */
export interface Account {
  id: string;
  name: string;
  /** Masked only, e.g. "•••• 2847". */
  maskedNumber: string;
  /** Simulated balance in major units. */
  balance: number;
  currency: Currency;
  type: 'savings' | 'current';
}

/** A saved transfer recipient (synthetic). */
export interface Recipient {
  id: string;
  name: string;
  bank: string;
  /** Masked only, e.g. "•••• 4821". */
  maskedIdentifier: string;
  /** Optional avatar initials for the UI. */
  initials: string;
}
