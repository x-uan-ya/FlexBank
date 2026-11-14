/**
 * Customisable quick actions: the shortcuts at the top of the home screen.
 *
 * PURE and UI-free (no React, no storage), so it is easy to test.
 *
 * SAFETY:
 * - A quick action only OPENS a screen. It never starts, approves or confirms a
 *   transfer. PayNow is still entered through its Start screen, so the usual
 *   recipient, amount and review steps cannot be skipped.
 * - The customer picks and orders their own actions. The starting list comes only
 *   from the banking purposes they chose, never from guessing.
 * - Whatever is chosen, every feature stays reachable from the tabs and More.
 *
 * The backend keeps a matching list in backend/src/quickActions.ts (same ids).
 */

import type { IconName } from '@/components';
import type { BankingPurpose } from '@/types/preferences';

export type QuickActionId =
  | 'paynow'
  | 'scan'
  | 'payHub'
  | 'bills'
  | 'calendar'
  | 'plan'
  | 'savings'
  | 'investments'
  | 'rewards'
  | 'concierge'
  | 'help'
  | 'settings';

/** Screens a quick action can open. Each one must exist in src/app. */
export type QuickActionRoute =
  | '/paynow'
  | '/scan'
  | '/pay'
  | '/bills'
  | '/calendar'
  | '/plan'
  | '/savings'
  | '/investments'
  | '/rewards'
  | '/concierge'
  | '/human-assistance'
  | '/settings';

export interface QuickAction {
  id: QuickActionId;
  label: string;
  description: string;
  route: QuickActionRoute;
  /** Drawn by HomeIcon (the home screen's icon set). */
  icon: IconName | 'message';
  /** Short honest note shown under the row when this action is on it. */
  note?: string;
}

export const QUICK_ACTIONS: readonly QuickAction[] = [
  { id: 'paynow', label: 'PayNow', description: 'Pay someone with their mobile number.', route: '/paynow', icon: 'paynow' },
  {
    id: 'scan', label: 'Scan & Pay', description: 'Scan a QR code to pay (preview only).',
    route: '/scan', icon: 'scan', note: 'Scan & Pay: preview only.',
  },
  { id: 'payHub', label: 'Pay & Transfer', description: 'All the ways to pay, in one place.', route: '/pay', icon: 'transfer' },
  { id: 'bills', label: 'Pay bills', description: 'Pay a biller from your list.', route: '/bills', icon: 'bill' },
  { id: 'calendar', label: 'Calendar', description: 'See bills, income and savings by date.', route: '/calendar', icon: 'bell' },
  { id: 'plan', label: 'Plan', description: 'Your goals and money plan.', route: '/plan', icon: 'goal' },
  { id: 'savings', label: 'Savings Pockets', description: 'Organise your savings into goals.', route: '/savings', icon: 'goal' },
  {
    id: 'investments', label: 'Investment Tracker', description: 'Monitor your fixed deposits and bonds.',
    route: '/investments', icon: 'investments',
  },
  { id: 'rewards', label: 'Rewards', description: 'Your rewards and offers.', route: '/rewards', icon: 'cards' },
  { id: 'concierge', label: 'Ask Concierge', description: 'Plain-language banking help.', route: '/concierge', icon: 'message' },
  { id: 'help', label: 'Get help', description: 'See how human help works (simulated).', route: '/human-assistance', icon: 'help' },
  { id: 'settings', label: 'Settings', description: 'Text size, language and your account.', route: '/settings', icon: 'settings' },
];

export const MIN_QUICK_ACTIONS = 1;
export const MAX_QUICK_ACTIONS = 4;
const DEFAULT_COUNT = 3;

export function getQuickAction(id: string): QuickAction | undefined {
  return QUICK_ACTIONS.find((action) => action.id === id);
}

/** What each banking purpose the customer chose puts within reach first. */
const DEFAULTS_BY_PURPOSE: Record<BankingPurpose, readonly QuickActionId[]> = {
  everyday: ['paynow', 'scan', 'bills'],
  managing: ['calendar', 'plan'],
  saving: ['savings', 'calendar'],
  fixedDeposits: ['investments', 'calendar'],
  investments: ['investments', 'plan'],
  learning: ['concierge', 'help'],
};

const FILLERS: readonly QuickActionId[] = ['paynow', 'scan', 'bills', 'calendar'];

/** The starting shortcuts: built from the customer's chosen purposes, in their order. */
export function defaultQuickActionIds(purposes: readonly BankingPurpose[]): QuickActionId[] {
  const ids: QuickActionId[] = [];
  for (const purpose of purposes) {
    for (const id of DEFAULTS_BY_PURPOSE[purpose] ?? []) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  for (const id of FILLERS) {
    if (ids.length >= DEFAULT_COUNT) break;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids.slice(0, DEFAULT_COUNT);
}

/**
 * Cleans a saved list: drops unknown ids and repeats, and keeps at most four.
 * Saved data can be old or damaged, so this never trusts it.
 */
export function normaliseQuickActionIds(value: unknown): QuickActionId[] {
  if (!Array.isArray(value)) return [];
  const ids: QuickActionId[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const action = getQuickAction(item);
    if (action && !ids.includes(action.id)) ids.push(action.id);
  }
  return ids.slice(0, MAX_QUICK_ACTIONS);
}

/** The list to show: the customer's saved choice if it is usable, otherwise the defaults. */
export function resolveQuickActionIds(
  saved: unknown,
  purposes: readonly BankingPurpose[],
): { ids: QuickActionId[]; isDefault: boolean } {
  const ids = normaliseQuickActionIds(saved);
  return ids.length >= MIN_QUICK_ACTIONS
    ? { ids, isDefault: false }
    : { ids: defaultQuickActionIds(purposes), isDefault: true };
}

export function addQuickAction(ids: readonly QuickActionId[], id: QuickActionId): QuickActionId[] {
  if (ids.includes(id) || ids.length >= MAX_QUICK_ACTIONS) return [...ids];
  return [...ids, id];
}

/** Always keeps at least one shortcut. */
export function removeQuickAction(ids: readonly QuickActionId[], id: QuickActionId): QuickActionId[] {
  if (ids.length <= MIN_QUICK_ACTIONS) return [...ids];
  return ids.filter((item) => item !== id);
}

export function moveQuickAction(ids: readonly QuickActionId[], id: QuickActionId, direction: -1 | 1): QuickActionId[] {
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= ids.length) return [...ids];
  const next = [...ids];
  const moved = next.splice(from, 1)[0];
  if (moved === undefined) return [...ids];
  next.splice(to, 0, moved);
  return next;
}
