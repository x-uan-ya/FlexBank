import type { BankingPurpose } from '@/types/preferences';

export type FinancialLifestyle =
  | 'socialSpender'
  | 'goalOrientedSaver'
  | 'investmentExplorer';

export type InsightType =
  | 'spending-summary'
  | 'category-change'
  | 'recurring-expense'
  | 'goal-progress'
  | 'goal-coaching'
  | 'maturity-reminder'
  | 'risk-explanation';

export interface InsightDataSource {
  kind: 'synthetic-transactions' | 'savings-goal' | 'investment-holding';
  label: string;
  recordIds: string[];
  /** Demo data must remain distinguishable from future customer-provided data. */
  synthetic: boolean;
}

export interface RelatedAction {
  id: string;
  label: string;
  /** A navigation hint only. The engine never executes banking actions. */
  destination: string;
}

export interface FinancialInsight {
  id: string;
  type: InsightType;
  title: string;
  explanation: string;
  relatedAction?: RelatedAction;
  dataSource: InsightDataSource;
}

export interface PrioritisedInsight extends FinancialInsight {
  priority: {
    score: number;
    matchedPurposes: BankingPurpose[];
    reason: string;
  };
}

export interface SpendingTransaction {
  id: string;
  occurredAt: string;
  merchant: string;
  category: string;
  /** Positive major-unit amount. Invalid and non-positive values are ignored. */
  amount: number;
  direction: 'debit' | 'credit';
  synthetic?: boolean;
}

export interface MonthlySpending {
  month: string;
  total: number;
  categoryTotals: Record<string, number>;
  transactionIds: string[];
}

export interface CategoryChange {
  category: string;
  fromMonth: string;
  toMonth: string;
  previousAmount: number;
  currentAmount: number;
  absoluteChange: number;
  /** Null when the prior month was zero, avoiding an unsupported percentage. */
  percentageChange: number | null;
  transactionIds: string[];
}

export interface RecurringExpense {
  merchant: string;
  category: string;
  amount: number;
  months: string[];
  transactionIds: string[];
}

export interface GoalContextRecord {
  id: string;
  name: string;
  target: number;
  saved: number;
  monthlyContribution: number;
  targetDate?: string | null;
  synthetic?: boolean;
  sourceRecordIds?: string[];
}

export interface GoalCoachingResult {
  valid: boolean;
  completionPercentage: number;
  remainingAmount: number;
  estimatedMonthsToGoal: number | null;
  requiredMonthlySaving: number | null;
  monthsUntilTarget: number | null;
  targetDateStatus: 'missing' | 'valid' | 'passed' | 'invalid';
  invalidReasons: string[];
}
