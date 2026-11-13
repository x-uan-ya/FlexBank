/**
 * Pure helpers for Savings Pockets: progress maths, validation, factories.
 *
 * No React, no storage, no side effects — easy to unit test. All money is in
 * major units (SGD) and simulated.
 */

import type {
  Contribution,
  PocketCategory,
  PocketProgress,
  SavingsPocket,
} from './types';

/** Sum of all contributions = amount saved in a pocket. */
export function savedAmount(pocket: Pick<SavingsPocket, 'contributions'>): number {
  return pocket.contributions.reduce((sum, c) => sum + c.amount, 0);
}

/** Derive display-ready progress figures for a pocket. */
export function pocketProgress(pocket: SavingsPocket): PocketProgress {
  const saved = round2(savedAmount(pocket));
  const target = pocket.target;
  const remaining = round2(Math.max(0, target - saved));
  const fraction = target > 0 ? Math.min(1, Math.max(0, saved / target)) : 0;
  return {
    saved,
    target,
    remaining,
    fraction,
    percent: Math.round(fraction * 100),
    complete: target > 0 && saved >= target,
  };
}

/* ------------------------------ Validation ------------------------------ */

export interface FieldErrors {
  name?: string;
  target?: string;
  initial?: string;
  targetDate?: string;
}

export interface PocketFormInput {
  name: string;
  target: string; // raw text from the input
  initial?: string; // optional initial contribution text
  targetDate?: string | null; // yyyy-mm-dd or null
}

const MAX_AMOUNT = 1_000_000; // sane simulated cap

/** Parse a money string to a finite number, or null if invalid. */
export function parseAmount(raw: string | undefined): number | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (t === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null; // digits + up to 2 dp only
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Validate the create/edit form. Returns {} when valid. */
export function validatePocketForm(input: PocketFormInput): FieldErrors {
  const errors: FieldErrors = {};

  if (!input.name.trim()) {
    errors.name = 'Give your pocket a name.';
  } else if (input.name.trim().length > 40) {
    errors.name = 'Keep the name under 40 characters.';
  }

  const target = parseAmount(input.target);
  if (target === null) {
    errors.target = 'Enter a target amount, for example 2000.';
  } else if (target <= 0) {
    errors.target = 'Target must be more than 0.';
  } else if (target > MAX_AMOUNT) {
    errors.target = 'That target is too large for this demo.';
  }

  if (input.initial != null && input.initial.trim() !== '') {
    const initial = parseAmount(input.initial);
    if (initial === null) {
      errors.initial = 'Enter a valid starting amount, or leave it blank.';
    } else if (initial < 0) {
      errors.initial = 'Starting amount cannot be negative.';
    } else if (target !== null && initial > target) {
      errors.initial = 'Starting amount cannot exceed the target.';
    }
  }

  if (input.targetDate) {
    const d = Date.parse(input.targetDate);
    if (Number.isNaN(d)) {
      errors.targetDate = 'Enter a valid date (YYYY-MM-DD).';
    } else if (d < startOfToday()) {
      errors.targetDate = 'Choose today or a future date.';
    }
  }

  return errors;
}

/** Validate a contribution amount against an optional remaining cap. */
export function validateContribution(
  raw: string,
  opts: { remaining?: number } = {},
): { ok: true; amount: number } | { ok: false; message: string } {
  const amount = parseAmount(raw);
  if (amount === null) return { ok: false, message: 'Enter an amount, for example 50.' };
  if (amount <= 0) return { ok: false, message: 'Amount must be more than 0.' };
  if (amount > MAX_AMOUNT) return { ok: false, message: 'That amount is too large for this demo.' };
  return { ok: true, amount: round2(amount) };
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

/* ------------------------------ Factories ------------------------------- */

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function makeContribution(amount: number, note?: string): Contribution {
  return { id: uid('ctr'), amount: round2(amount), at: new Date().toISOString(), note };
}

export function makePocket(params: {
  name: string;
  category: PocketCategory;
  target: number;
  targetDate: string | null;
  initial?: number;
}): SavingsPocket {
  const contributions =
    params.initial && params.initial > 0
      ? [makeContribution(params.initial, 'Starting amount')]
      : [];
  return {
    id: uid('pkt'),
    name: params.name.trim(),
    category: params.category,
    target: round2(params.target),
    targetDate: params.targetDate,
    contributions,
    createdAt: new Date().toISOString(),
  };
}

/* ------------------------------- Utils ---------------------------------- */

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
