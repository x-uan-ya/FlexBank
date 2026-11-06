/**
 * Synthetic money-management + security content for the home screen.
 * CLEARLY fake demo data. No real customer information.
 */

export interface SpendingCategory {
  id: string;
  label: string;
  amount: number;
  /** Share of monthly spend, 0..1 (for the simple bar). */
  share: number;
}

export interface SavingsGoal {
  id: string;
  label: string;
  saved: number;
  target: number;
}

export interface SecurityTip {
  id: string;
  title: string;
  body: string;
}

/** This month's simulated spending by category. */
export const MOCK_SPENDING: {
  month: string;
  total: number;
  categories: SpendingCategory[];
} = {
  month: 'October',
  total: 1284.4,
  categories: [
    { id: 'sp-food', label: 'Food & dining', amount: 486.2, share: 0.38 },
    { id: 'sp-transport', label: 'Transport', amount: 231.1, share: 0.18 },
    { id: 'sp-shopping', label: 'Shopping', amount: 334.0, share: 0.26 },
    { id: 'sp-bills', label: 'Bills & utilities', amount: 233.1, share: 0.18 },
  ],
};

export const MOCK_GOALS: SavingsGoal[] = [
  { id: 'goal-trip', label: 'Japan trip', saved: 1800, target: 4000 },
  { id: 'goal-fund', label: 'Rainy-day fund', saved: 5200, target: 6000 },
];

export const MOCK_SECURITY_TIPS: SecurityTip[] = [
  {
    id: 'tip-otp',
    title: 'FlexBank never asks for your OTP',
    body: 'We will never call or message you to ask for a one-time password. If someone does, it is a scam.',
  },
  {
    id: 'tip-verify',
    title: 'Check before you send',
    body: 'Always confirm the recipient and amount on the review screen before you confirm a transfer.',
  },
];

/* ----------------------- Fixed deposits (synthetic) ---------------------- */

export interface FixedDeposit {
  id: string;
  nickname: string;
  principal: number;
  rate: number; // annual %, e.g. 3.25
  tenureMonths: number;
  maturityDate: string; // ISO
}

export const MOCK_FIXED_DEPOSITS: FixedDeposit[] = [
  {
    id: 'fd-1',
    nickname: '12-month FD',
    principal: 10000,
    rate: 3.25,
    tenureMonths: 12,
    maturityDate: '2027-06-01T00:00:00.000Z',
  },
];

/** Indicative board rates (synthetic) for the FD section. */
export const MOCK_FD_RATES: { tenureMonths: number; rate: number }[] = [
  { tenureMonths: 3, rate: 2.8 },
  { tenureMonths: 6, rate: 3.0 },
  { tenureMonths: 12, rate: 3.25 },
  { tenureMonths: 24, rate: 3.4 },
];

/* ----------------------- Bonds & investments (synthetic) ------------------ */

export interface BondHolding {
  id: string;
  name: string;
  faceValue: number;
  couponRate: number; // annual %
  nextCouponDate: string; // ISO
  maturityDate: string; // ISO
}

export const MOCK_BONDS: BondHolding[] = [
  {
    id: 'bond-sgs',
    name: 'SG Gov Bond 2030',
    faceValue: 5000,
    couponRate: 2.75,
    nextCouponDate: '2026-12-01T00:00:00.000Z',
    maturityDate: '2030-06-01T00:00:00.000Z',
  },
  {
    id: 'bond-corp',
    name: 'FlexCorp Note 2028',
    faceValue: 3000,
    couponRate: 4.1,
    nextCouponDate: '2026-11-15T00:00:00.000Z',
    maturityDate: '2028-03-01T00:00:00.000Z',
  },
];

export const MOCK_PORTFOLIO = {
  investedValue: 8000,
  currentValue: 8240,
};

/* ----------------------------- Budgeting --------------------------------- */

export const MOCK_BUDGET = {
  month: 'October',
  limit: 1600,
  spent: 1284.4,
};

/* ----------------------- Learning / education ---------------------------- */

export interface LearningItem {
  id: string;
  term: string;
  explanation: string;
}

export const MOCK_LEARNING: LearningItem[] = [
  {
    id: 'learn-fd',
    term: 'What is a fixed deposit?',
    explanation:
      'You lock away a sum for a set time and earn a fixed interest rate. You get your money plus interest at the end (maturity).',
  },
  {
    id: 'learn-coupon',
    term: 'What is a bond coupon?',
    explanation:
      'A coupon is the regular interest a bond pays you while you hold it, usually a fixed percentage of the bond’s face value.',
  },
  {
    id: 'learn-emergency',
    term: 'What is an emergency fund?',
    explanation:
      'Money set aside for surprises like repairs or medical bills — often 3 to 6 months of expenses, kept easy to access.',
  },
];
