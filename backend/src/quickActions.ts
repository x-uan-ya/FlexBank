/**
 * Customisable quick actions: the shortcuts shown at the top of the home screen.
 *
 * Rules:
 * - A quick action only OPENS a screen. It never moves money. PayNow still goes
 *   through recipient, amount and review, and only the customer's own press on
 *   Confirm sends anything.
 * - The customer chooses and orders their own actions. The defaults come only
 *   from the priorities they picked at registration, never from guessing.
 * - The server stores action ids only. The labels and routes live in this list,
 *   and the app keeps a matching copy (src/features/quickActions/quickActions.ts),
 *   so the two ids lists MUST stay the same.
 */

import type { Priority } from './types';

export interface QuickActionDef {
  id: string;
  label: string;
  description: string;
  /** Screen the app opens. Must be an existing route in the app. */
  route: string;
}

export const QUICK_ACTION_CATALOGUE: readonly QuickActionDef[] = [
  { id: 'paynow', label: 'PayNow', description: 'Pay someone with their mobile number.', route: '/paynow' },
  { id: 'scan', label: 'Scan & Pay', description: 'Scan a QR code to pay (preview only).', route: '/scan' },
  { id: 'payHub', label: 'Pay & Transfer', description: 'All the ways to pay, in one place.', route: '/pay' },
  { id: 'bills', label: 'Pay bills', description: 'Pay a biller from your list.', route: '/bills' },
  { id: 'calendar', label: 'Calendar', description: 'See bills, income and savings by date.', route: '/calendar' },
  { id: 'plan', label: 'Plan', description: 'Your goals and money plan.', route: '/plan' },
  { id: 'savings', label: 'Savings Pockets', description: 'Organise your savings into goals.', route: '/savings' },
  { id: 'investments', label: 'Investment Tracker', description: 'Monitor your fixed deposits and bonds.', route: '/investments' },
  { id: 'rewards', label: 'Rewards', description: 'Your rewards and offers.', route: '/rewards' },
  { id: 'concierge', label: 'Ask Concierge', description: 'Plain-language banking help.', route: '/concierge' },
  { id: 'help', label: 'Get help', description: 'See how human help works (simulated).', route: '/human-assistance' },
  { id: 'settings', label: 'Settings', description: 'Text size, language and your account.', route: '/settings' },
];

export const MIN_QUICK_ACTIONS = 1;
export const MAX_QUICK_ACTIONS = 4;
const DEFAULT_COUNT = 3;

const KNOWN_IDS: ReadonlySet<string> = new Set(QUICK_ACTION_CATALOGUE.map((a) => a.id));

export const isKnownQuickAction = (id: string): boolean => KNOWN_IDS.has(id);

const DEFAULT_BY_PRIORITY: Record<Priority, readonly string[]> = {
  transfers: ['paynow', 'scan'],
  billPayments: ['bills', 'calendar'],
  accountOverview: ['calendar', 'plan'],
};

const FILLERS: readonly string[] = ['paynow', 'scan', 'bills', 'calendar'];

/** The starting shortcuts: built from the priorities the customer chose, in their order. */
export function defaultQuickActionIds(priorities: readonly Priority[]): string[] {
  const ids: string[] = [];
  for (const priority of priorities) {
    for (const id of DEFAULT_BY_PRIORITY[priority] ?? []) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  for (const id of FILLERS) {
    if (ids.length >= DEFAULT_COUNT) break;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids.slice(0, DEFAULT_COUNT);
}

export type QuickActionsInput = { ok: true; ids: string[] } | { ok: false; message: string };

/** Checks the list the customer chose. The order they send is the order they see. */
export function readQuickActionIds(value: unknown): QuickActionsInput {
  if (!Array.isArray(value)) {
    return { ok: false, message: 'Choose which shortcuts you want.' };
  }
  if (value.length < MIN_QUICK_ACTIONS) {
    return { ok: false, message: 'Keep at least one shortcut.' };
  }
  if (value.length > MAX_QUICK_ACTIONS) {
    return { ok: false, message: `You can have up to ${MAX_QUICK_ACTIONS} shortcuts.` };
  }
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !isKnownQuickAction(item)) {
      return { ok: false, message: 'One of those shortcuts is not available.' };
    }
    if (ids.includes(item)) {
      return { ok: false, message: 'Each shortcut can only be added once.' };
    }
    ids.push(item);
  }
  return { ok: true, ids };
}
