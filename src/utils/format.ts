/**
 * Small, dependency-free formatting helpers shared across features.
 */

import type { Currency } from '@/types/transaction';

/** Format a money amount, e.g. formatMoney(45, 'SGD') -> "S$45.00". */
export function formatMoney(amount: number, currency: Currency = 'SGD'): string {
  const symbol = currency === 'SGD' ? 'S$' : '';
  return `${symbol}${amount.toFixed(2)}`;
}

/** Format an ISO timestamp as a short, human-readable date. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Generate a simple synthetic transaction reference for the demo. */
export function makeReference(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `FB-${y}${m}${d}-${rand}`;
}
