/**
 * Pure helpers for the Investment Maturity Tracker.
 *
 * No React, no storage, no side effects. All money is simulated SGD. These
 * calculations are simple, clearly-labelled estimates — not advice, not real
 * product terms.
 */

import {
  COUPONS_PER_YEAR,
  type BondInvestment,
  type FixedDepositInvestment,
  type Investment,
  type ReminderPrefs,
  type TimelineEvent,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Whole months between two ISO dates (approx; good enough for an estimate). */
export function monthsBetween(startISO: string, endISO: string): number {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const months =
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return Math.max(0, months);
}

/** Years between two ISO dates as a fraction (for interest estimates). */
export function yearsBetween(startISO: string, endISO: string): number {
  const s = Date.parse(startISO);
  const e = Date.parse(endISO);
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 0;
  return (e - s) / (365.25 * DAY_MS);
}

/**
 * Estimated maturity value of a fixed deposit using SIMPLE interest:
 *   principal + principal * rate% * years.
 * Clearly an estimate; real products may compound.
 */
export function fixedDepositMaturityValue(fd: FixedDepositInvestment): number {
  const years = yearsBetween(fd.startDate, fd.maturityDate);
  const interest = fd.principal * (fd.rate / 100) * years;
  return round2(fd.principal + interest);
}

/** A single bond coupon payout = faceValue * couponRate% / couponsPerYear. */
export function bondCouponAmount(bond: BondInvestment): number {
  const perYear = COUPONS_PER_YEAR[bond.couponFrequency];
  return round2((bond.faceValue * (bond.rate / 100)) / perYear);
}

/** Total simulated value of an investment as of maturity (for summaries). */
export function estimatedMaturityValue(inv: Investment): number {
  if (inv.kind === 'fixedDeposit') return fixedDepositMaturityValue(inv);
  return round2(inv.faceValue); // bond returns face value at maturity (coupons separate)
}

/** The current value we count toward "total tracked" — principal while active. */
export function trackedValue(inv: Investment): number {
  return round2(inv.principal);
}

export type InvestmentStatus = 'active' | 'matured';

export function statusOf(inv: Investment, now: Date = new Date()): InvestmentStatus {
  return Date.parse(inv.maturityDate) <= now.getTime() ? 'matured' : 'active';
}

/**
 * Build the coupon payment dates for a bond, stepping by the coupon frequency
 * from the (first) nextCoupon anchor up to and including maturity.
 *
 * We derive coupon dates from startDate forward so the schedule is stable and
 * testable regardless of "now".
 */
export function bondCouponDates(bond: BondInvestment): string[] {
  const perYear = COUPONS_PER_YEAR[bond.couponFrequency];
  const stepMonths = 12 / perYear;
  const start = new Date(bond.startDate);
  const maturity = new Date(bond.maturityDate);
  const dates: string[] = [];

  // First coupon one period after start; continue until maturity (inclusive).
  const cursor = new Date(start);
  cursor.setMonth(cursor.getMonth() + stepMonths);
  // Guard against pathological inputs.
  let guard = 0;
  while (cursor <= maturity && guard < 600) {
    dates.push(toISODate(cursor));
    cursor.setMonth(cursor.getMonth() + stepMonths);
    guard += 1;
  }
  return dates;
}

/**
 * All timeline events for a set of investments, sorted ascending by date.
 * - Fixed deposit → one 'maturity' event (value = estimated maturity amount).
 * - Bond → one 'coupon' event per scheduled coupon (value = coupon amount),
 *   plus one 'maturity' event (value = face value) at maturity.
 */
export function buildTimeline(
  investments: Investment[],
  now: Date = new Date(),
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const todayStart = startOfDay(now).getTime();

  for (const inv of investments) {
    if (inv.kind === 'fixedDeposit') {
      events.push({
        id: `${inv.id}-maturity`,
        investmentId: inv.id,
        investmentName: inv.name,
        date: inv.maturityDate,
        type: 'maturity',
        kind: 'fixedDeposit',
        amount: fixedDepositMaturityValue(inv),
        upcoming: Date.parse(inv.maturityDate) >= todayStart,
      });
    } else {
      const coupon = bondCouponAmount(inv);
      for (const date of bondCouponDates(inv)) {
        // The coupon that coincides with maturity is represented by the
        // maturity event's own payout note; keep coupon events strictly before.
        if (date === inv.maturityDate) continue;
        events.push({
          id: `${inv.id}-coupon-${date}`,
          investmentId: inv.id,
          investmentName: inv.name,
          date,
          type: 'coupon',
          kind: 'bond',
          amount: coupon,
          upcoming: Date.parse(date) >= todayStart,
        });
      }
      events.push({
        id: `${inv.id}-maturity`,
        investmentId: inv.id,
        investmentName: inv.name,
        date: inv.maturityDate,
        type: 'maturity',
        kind: 'bond',
        amount: round2(inv.faceValue),
        upcoming: Date.parse(inv.maturityDate) >= todayStart,
      });
    }
  }

  return events.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

/** Upcoming events only (today or later), ascending. */
export function upcomingEvents(
  investments: Investment[],
  now: Date = new Date(),
): TimelineEvent[] {
  return buildTimeline(investments, now).filter((e) => e.upcoming);
}

/** The next coupon date for a bond on/after `now`, or null if none remain. */
export function nextCouponDate(bond: BondInvestment, now: Date = new Date()): string | null {
  const todayStart = startOfDay(now).getTime();
  return (
    bondCouponDates(bond).find(
      (d) => d !== bond.maturityDate && Date.parse(d) >= todayStart,
    ) ?? null
  );
}

/** Days from `now` until an ISO date (negative if past). */
export function daysUntil(dateISO: string, now: Date = new Date()): number {
  const diff = startOfDay(new Date(dateISO)).getTime() - startOfDay(now).getTime();
  return Math.round(diff / DAY_MS);
}

/** Events that fall within the reminder window (0..daysBefore from now). */
export function dueReminders(
  investments: Investment[],
  prefs: ReminderPrefs,
  now: Date = new Date(),
): TimelineEvent[] {
  return upcomingEvents(investments, now).filter((e) => {
    const d = daysUntil(e.date, now);
    return d >= 0 && d <= prefs.daysBefore;
  });
}

/* ------------------------------ Validation ------------------------------ */

export interface InvestmentFieldErrors {
  name?: string;
  principal?: string;
  rate?: string;
  startDate?: string;
  maturityDate?: string;
  faceValue?: string;
}

export function parseAmount(raw: string | undefined): number | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (t === '' || !/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parseRate(raw: string | undefined): number | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (t === '' || !/^\d+(\.\d{1,3})?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

function isISODate(s: string | undefined): boolean {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export interface InvestmentFormInput {
  kind: 'fixedDeposit' | 'bond';
  name: string;
  principal: string;
  rate: string;
  startDate: string;
  maturityDate: string;
  faceValue?: string;
}

export function validateInvestmentForm(input: InvestmentFormInput): InvestmentFieldErrors {
  const errors: InvestmentFieldErrors = {};

  if (!input.name.trim()) errors.name = 'Give this investment a name.';
  else if (input.name.trim().length > 50) errors.name = 'Keep the name under 50 characters.';

  const principal = parseAmount(input.principal);
  if (principal === null || principal <= 0) errors.principal = 'Enter a principal greater than 0.';

  if (parseRate(input.rate) === null) errors.rate = 'Enter a rate between 0 and 100 (e.g. 2.5).';

  if (!isISODate(input.startDate)) errors.startDate = 'Enter a valid start date (YYYY-MM-DD).';
  if (!isISODate(input.maturityDate)) {
    errors.maturityDate = 'Enter a valid maturity date (YYYY-MM-DD).';
  } else if (isISODate(input.startDate) && Date.parse(input.maturityDate) <= Date.parse(input.startDate)) {
    errors.maturityDate = 'Maturity must be after the start date.';
  }

  if (input.kind === 'bond') {
    const face = parseAmount(input.faceValue);
    if (face === null || face <= 0) errors.faceValue = 'Enter a face value greater than 0.';
  }

  return errors;
}

export function hasErrors(e: InvestmentFieldErrors): boolean {
  return Object.values(e).some(Boolean);
}

/* ------------------------------- Utils ---------------------------------- */

let counter = 0;
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
