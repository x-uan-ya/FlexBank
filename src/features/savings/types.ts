/**
 * Savings Pockets & Goals — domain types.
 *
 * SELF-CONTAINED FEATURE. This intentionally does NOT reuse the minimal
 * `SavingsGoal` in `@/data/insights` (id/label/saved/target) because that type
 * is referenced by existing home content and must stay unchanged. A pocket is a
 * richer, user-created record (category, icon, target date, contribution
 * history) persisted locally.
 *
 * SAFETY: all amounts are SIMULATED. Adding a contribution never moves real
 * money or touches any account balance.
 */

/** Visual/category identifier for a pocket. Maps to an existing Icon glyph. */
export type PocketCategory =
  | 'general'
  | 'holiday'
  | 'emergency'
  | 'gadget'
  | 'education'
  | 'home'
  | 'vehicle';

export interface PocketCategoryMeta {
  key: PocketCategory;
  label: string;
  /** Name of an icon in '@/components' Icon (kept to existing glyphs). */
  icon: string;
}

export const POCKET_CATEGORIES: PocketCategoryMeta[] = [
  { key: 'general', label: 'General', icon: 'goal' },
  { key: 'holiday', label: 'Holiday', icon: 'goal' },
  { key: 'emergency', label: 'Emergency', icon: 'shield' },
  { key: 'gadget', label: 'Gadget', icon: 'cards' },
  { key: 'education', label: 'Education', icon: 'insights' },
  { key: 'home', label: 'Home', icon: 'loans' },
  { key: 'vehicle', label: 'Vehicle', icon: 'transfer' },
];

export function categoryMeta(key: PocketCategory): PocketCategoryMeta {
  return POCKET_CATEGORIES.find((c) => c.key === key) ?? POCKET_CATEGORIES[0];
}

/** A single simulated contribution into a pocket. */
export interface Contribution {
  id: string;
  /** Positive amount in major units (SGD). */
  amount: number;
  /** ISO timestamp. */
  at: string;
  /** Optional short note, e.g. 'Monthly top-up'. */
  note?: string;
}

/** A user-created savings pocket (goal). */
export interface SavingsPocket {
  id: string;
  name: string;
  category: PocketCategory;
  /** Target amount in major units (SGD). > 0. */
  target: number;
  /** ISO date (yyyy-mm-dd) the customer aims to reach the target, or null. */
  targetDate: string | null;
  /** Ordered contribution history (most recent last). */
  contributions: Contribution[];
  /** True for the seeded demo pockets (shown as simulated examples). */
  demo?: boolean;
  /** ISO timestamp of creation. */
  createdAt: string;
}

/** Derived, display-ready figures for a pocket. Pure; no side effects. */
export interface PocketProgress {
  saved: number;
  target: number;
  remaining: number;
  /** 0..1 clamped. */
  fraction: number;
  /** 0..100 rounded. */
  percent: number;
  complete: boolean;
}
