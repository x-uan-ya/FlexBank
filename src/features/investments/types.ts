/**
 * Investment Maturity Tracker — domain types.
 *
 * SELF-CONTAINED FEATURE. Does NOT reuse the minimal `FixedDeposit` /
 * `BondHolding` in `@/data/insights` (those are referenced by existing home
 * content and must stay unchanged). These richer records carry start dates,
 * coupon frequency, status and are persisted locally.
 *
 * SAFETY: all values are SIMULATED. Nothing here is a real OCBC product, a real
 * market rate, or personalised investment advice.
 */

export type InvestmentKind = 'fixedDeposit' | 'bond';

export type CouponFrequency = 'annual' | 'semiAnnual' | 'quarterly' | 'monthly';

export const COUPON_FREQUENCY_LABELS: Record<CouponFrequency, string> = {
  annual: 'Annual',
  semiAnnual: 'Semi-annual',
  quarterly: 'Quarterly',
  monthly: 'Monthly',
};

/** Number of coupon payments per year for each frequency. */
export const COUPONS_PER_YEAR: Record<CouponFrequency, number> = {
  annual: 1,
  semiAnnual: 2,
  quarterly: 4,
  monthly: 12,
};

interface InvestmentBase {
  id: string;
  name: string;
  /** Money invested (major units, SGD). */
  principal: number;
  /** Annual rate as a percent, e.g. 2.5 means 2.5% p.a. */
  rate: number;
  /** ISO date (yyyy-mm-dd). */
  startDate: string;
  /** ISO date (yyyy-mm-dd). */
  maturityDate: string;
  /** True for seeded demo records (shown as simulated examples). */
  demo?: boolean;
  createdAt: string;
}

/** A simulated fixed deposit. */
export interface FixedDepositInvestment extends InvestmentBase {
  kind: 'fixedDeposit';
}

/** A simulated bond holding. */
export interface BondInvestment extends InvestmentBase {
  kind: 'bond';
  /** Face value repaid at maturity (major units, SGD). */
  faceValue: number;
  couponFrequency: CouponFrequency;
}

export type Investment = FixedDepositInvestment | BondInvestment;

/** A single dated event on the maturity timeline. */
export interface TimelineEvent {
  id: string;
  investmentId: string;
  investmentName: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  type: 'coupon' | 'maturity';
  kind: InvestmentKind;
  /** The money amount associated with this event (coupon payout / maturity value). */
  amount: number;
  /** True when the date is today or in the future. */
  upcoming: boolean;
}

/** In-app reminder preference (how many days before an event to flag it). */
export interface ReminderPrefs {
  /** Days before a maturity/coupon date to surface a reminder. */
  daysBefore: number;
}

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = { daysBefore: 7 };

export const REMINDER_DAY_OPTIONS = [3, 7, 14, 30] as const;
