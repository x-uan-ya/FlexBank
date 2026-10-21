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
