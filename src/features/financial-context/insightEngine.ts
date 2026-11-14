import type { Investment } from '@/features/investments/types';
import { BANKING_PURPOSE_LABELS, type BankingPurpose } from '@/types/preferences';

import { calculateGoalCoaching } from './goals';
import {
  calculateMonthlySpending,
  calculateMonthToMonthChanges,
  detectRecurringExpenses,
} from './spending';
import type {
  FinancialInsight,
  FinancialLifestyle,
  GoalContextRecord,
  InsightType,
  PrioritisedInsight,
  SpendingTransaction,
} from './types';

export interface FinancialContextInput {
  transactions?: SpendingTransaction[];
  goals?: GoalContextRecord[];
  investments?: Investment[];
  asOf: string | Date;
  /** Must be explicit so demo records cannot be mistaken for customer data. */
  synthetic: boolean;
}

const TYPE_PURPOSES: Record<InsightType, BankingPurpose[]> = {
  'spending-summary': ['everyday', 'managing'],
  'category-change': ['managing', 'everyday'],
  'recurring-expense': ['managing', 'everyday'],
  'goal-progress': ['saving'],
  'goal-coaching': ['saving'],
  'maturity-reminder': ['fixedDeposits', 'investments'],
  'risk-explanation': ['investments', 'learning'],
};

const LIFESTYLE_PURPOSES: Record<FinancialLifestyle, BankingPurpose[]> = {
  socialSpender: ['everyday', 'managing'],
  goalOrientedSaver: ['saving'],
  investmentExplorer: ['investments', 'fixedDeposits'],
};

/** Generates facts from supplied records. It does not infer a customer lifestyle. */
export function generateFinancialInsights(input: FinancialContextInput): FinancialInsight[] {
  return [
    ...buildSpendingInsights(input.transactions ?? [], input.synthetic),
    ...buildGoalInsights(input.goals ?? [], input.asOf, input.synthetic),
    ...buildInvestmentInsights(input.investments ?? [], input.asOf, input.synthetic),
  ];
}

/**
 * Stable, non-destructive prioritisation from explicit purposes. Every insight
 * remains in the result; this never touches widgets, quick actions or access.
 */
export function prioritiseInsights(
  insights: FinancialInsight[],
  bankingPurposes: BankingPurpose[],
): PrioritisedInsight[] {
  const uniquePurposes = bankingPurposes.filter(
    (purpose, index) => bankingPurposes.indexOf(purpose) === index,
  );
  return insights
    .map((insight, originalIndex) => {
      const matchedPurposes = uniquePurposes.filter((purpose) =>
        TYPE_PURPOSES[insight.type].includes(purpose),
      );
      const score = matchedPurposes.reduce((total, purpose) => {
        const rank = uniquePurposes.indexOf(purpose);
        return total + (uniquePurposes.length - rank) * 100;
      }, 0);
      return {
        ...insight,
        priority: {
          score,
          matchedPurposes,
          reason:
            matchedPurposes.length > 0
              ? `Prioritised because you selected ${matchedPurposes
                  .map((purpose) => BANKING_PURPOSE_LABELS[purpose])
                  .join(' and ')}.`
              : 'Kept available even though it does not match a selected banking purpose.',
        },
        originalIndex,
      };
    })
    .sort((a, b) => b.priority.score - a.priority.score || a.originalIndex - b.originalIndex)
    .map(({ originalIndex: _originalIndex, ...insight }) => insight);
}

export function generatePrioritisedInsights(
  input: FinancialContextInput,
  bankingPurposes: BankingPurpose[],
): PrioritisedInsight[] {
  return prioritiseInsights(generateFinancialInsights(input), bankingPurposes);
}

/** Maps explicit purposes to a demo lifestyle label; it never examines behaviour. */
export function lifestyleFromPurposes(
  bankingPurposes: BankingPurpose[],
): FinancialLifestyle | null {
  for (const purpose of bankingPurposes) {
    const match = (Object.keys(LIFESTYLE_PURPOSES) as FinancialLifestyle[]).find((lifestyle) =>
      LIFESTYLE_PURPOSES[lifestyle].includes(purpose),
    );
    if (match) return match;
  }
  return null;
}

function buildSpendingInsights(
  transactions: SpendingTransaction[],
  synthetic: boolean,
): FinancialInsight[] {
  const monthly = calculateMonthlySpending(transactions);
  const latest = monthly.at(-1);
  const insights: FinancialInsight[] = [];
  if (latest) {
    const leadingCategory = Object.entries(latest.categoryTotals).sort((a, b) => b[1] - a[1])[0];
    insights.push({
      id: `spending-summary-${latest.month}`,
      type: 'spending-summary',
      title: `${latest.month} spending summary`,
      explanation: leadingCategory
        ? `Recorded spending was S$${money(latest.total)}. ${leadingCategory[0]} was the largest category at S$${money(leadingCategory[1])}.`
        : `Recorded spending was S$${money(latest.total)}.`,
      relatedAction: { id: 'view-spending', label: 'View spending details', destination: '/plan' },
      dataSource: source('synthetic-transactions', 'Transaction history', latest.transactionIds, synthetic),
    });
  }

  const latestChanges = latest
    ? calculateMonthToMonthChanges(monthly).filter(
        (change) => change.toMonth === latest.month && change.absoluteChange !== 0,
      )
    : [];
  latestChanges.forEach((change) => {
    const direction = change.absoluteChange > 0 ? 'increased' : 'decreased';
    const comparison =
      change.percentageChange === null
        ? `No ${change.category} spending was recorded in ${change.fromMonth}, so no percentage is shown.`
        : `That is ${Math.abs(change.percentageChange)}% ${change.absoluteChange > 0 ? 'higher' : 'lower'}.`;
    insights.push({
      id: `category-change-${slug(change.category)}-${change.toMonth}`,
      type: 'category-change',
      title: `${change.category} spending ${direction}`,
      explanation: `${change.category} spending ${direction} from S$${money(change.previousAmount)} in ${change.fromMonth} to S$${money(change.currentAmount)} in ${change.toMonth}. ${comparison}`,
      dataSource: source('synthetic-transactions', 'Transaction history', change.transactionIds, synthetic),
    });
  });

  detectRecurringExpenses(transactions).forEach((expense) => {
    insights.push({
      id: `recurring-${slug(expense.merchant)}-${money(expense.amount)}`,
      type: 'recurring-expense',
      title: `Possible recurring expense: ${expense.merchant}`,
      explanation: `A charge of S$${money(expense.amount)} from ${expense.merchant} appears in ${expense.months.length} distinct months (${expense.months.join(', ')}). It is labelled possible because transaction history alone cannot confirm a subscription.`,
      relatedAction: { id: 'review-recurring', label: 'Review recurring expenses', destination: '/bills' },
      dataSource: source('synthetic-transactions', 'Transaction history', expense.transactionIds, synthetic),
    });
  });
  return insights;
}

function buildGoalInsights(
  goals: GoalContextRecord[],
  asOf: string | Date,
  synthetic: boolean,
): FinancialInsight[] {
  const insights: FinancialInsight[] = [];
  goals.forEach((goal) => {
    const result = calculateGoalCoaching(goal, asOf);
    if (!result.valid) return;
    const recordIds = goal.sourceRecordIds ?? [goal.id];
    const goalSynthetic = goal.synthetic ?? synthetic;
    insights.push({
      id: `goal-progress-${goal.id}`,
      type: 'goal-progress',
      title: `${goal.name}: ${result.completionPercentage}% complete`,
      explanation: `S$${money(goal.saved)} of S$${money(goal.target)} is recorded, leaving S$${money(result.remainingAmount)}.`,
      relatedAction: { id: 'view-goal', label: 'View savings goal', destination: `/savings/${goal.id}` },
      dataSource: source('savings-goal', goal.name, recordIds, goalSynthetic),
    });

    const timeEstimate =
      result.estimatedMonthsToGoal === null
        ? 'There is no positive monthly contribution recorded, so an estimated completion time is not available.'
        : result.estimatedMonthsToGoal === 0
          ? 'The recorded target has been reached.'
          : `At S$${money(goal.monthlyContribution)} per month, the remaining amount would take about ${result.estimatedMonthsToGoal} months.`;
    const targetEstimate =
      result.requiredMonthlySaving === null
        ? result.targetDateStatus === 'missing'
          ? 'No target date is recorded.'
          : result.targetDateStatus === 'passed'
            ? 'The recorded target date has passed.'
            : 'The target date is invalid.'
        : result.requiredMonthlySaving === 0
          ? 'No further monthly saving is required for this target.'
          : `To reach the recorded target date, about S$${money(result.requiredMonthlySaving)} per month is required.`;
    insights.push({
      id: `goal-coaching-${goal.id}`,
      type: 'goal-coaching',
      title: `Plan for ${goal.name}`,
      explanation: `${timeEstimate} ${targetEstimate}`,
      dataSource: source('savings-goal', goal.name, recordIds, goalSynthetic),
    });
  });
  return insights;
}

function buildInvestmentInsights(
  investments: Investment[],
  asOf: string | Date,
  synthetic: boolean,
): FinancialInsight[] {
  const asOfTime = new Date(asOf).getTime();
  if (Number.isNaN(asOfTime)) return [];
  const insights: FinancialInsight[] = [];
  investments.forEach((investment) => {
    const maturityTime = new Date(investment.maturityDate).getTime();
    if (!Number.isNaN(maturityTime) && maturityTime >= asOfTime) {
      const days = Math.ceil((maturityTime - asOfTime) / (24 * 60 * 60 * 1000));
      insights.push({
        id: `maturity-${investment.id}`,
        type: 'maturity-reminder',
        title: `${investment.name} matures in ${days} days`,
        explanation: `The recorded maturity date is ${investment.maturityDate}. This is a reminder from the holding record, not a prediction.`,
        relatedAction: { id: 'view-investment', label: 'View maturity details', destination: `/investments/${investment.id}` },
        dataSource: source('investment-holding', investment.name, [investment.id], investment.demo ?? synthetic),
      });
    }
    insights.push({
      id: `risk-${investment.id}`,
      type: 'risk-explanation',
      title: investment.kind === 'bond' ? 'Bond risk in plain language' : 'Fixed deposit access reminder',
      explanation:
        investment.kind === 'bond'
          ? `${investment.name} is recorded as a bond. Bond prices can change before maturity, and the issuer may fail to pay; this is general education, not a recommendation.`
          : `${investment.name} is recorded as a fixed deposit. Accessing funds before maturity may reduce returns depending on product terms; check the actual terms before acting.`,
      dataSource: source('investment-holding', investment.name, [investment.id], investment.demo ?? synthetic),
    });
  });
  return insights;
}

function source(
  kind: FinancialInsight['dataSource']['kind'],
  label: string,
  recordIds: string[],
  synthetic: boolean,
): FinancialInsight['dataSource'] {
  return { kind, label, recordIds: [...new Set(recordIds)], synthetic };
}

function money(value: number): string {
  return value.toFixed(2);
}

function slug(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
