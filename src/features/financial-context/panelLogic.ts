import type { BankingPurpose } from '@/types/preferences';

import { generatePrioritisedInsights, type FinancialContextInput } from './insightEngine';
import type { PrioritisedInsight, RelatedAction } from './types';

export type SafeInsightRoute = '/plan' | '/bills' | '/savings' | '/investments';

export interface SafeInsightAction extends RelatedAction {
  route: SafeInsightRoute;
}

export function selectPanelInsights(
  context: FinancialContextInput,
  bankingPurposes: BankingPurpose[],
  dismissedIds: string[],
  maximum: 2 | 3,
): PrioritisedInsight[] {
  const dismissed = new Set(normaliseDismissedIds(dismissedIds));
  return generatePrioritisedInsights(context, bankingPurposes)
    .filter((insight) => !dismissed.has(insight.id))
    .slice(0, maximum);
}

/** Remove amount-bearing copy before rendering or accessibility announcement. */
export function privacySafeInsight(
  insight: PrioritisedInsight,
  balanceHidden: boolean,
): PrioritisedInsight {
  if (!balanceHidden || !containsFinancialAmounts(insight.type)) return insight;
  return {
    ...insight,
    title: privateTitle(insight.type),
    explanation:
      'Financial amounts are hidden. Use the existing balance visibility control to view this insight.',
  };
}

export function safeInsightAction(insight: PrioritisedInsight): SafeInsightAction | null {
  const action = insight.relatedAction;
  if (!action) return null;
  // Goal insights currently come from the user-keyed Plan store. Never route
  // them into the app-wide Savings Pocket store.
  if (insight.type === 'goal-progress' || insight.type === 'goal-coaching') {
    return { ...action, route: '/plan' };
  }
  // Saved investment ownership is not represented by the existing store, so
  // panel investment examples remain educational and non-navigable.
  if (insight.dataSource.kind === 'investment-holding') return null;
  const destination = action.destination;
  let route: SafeInsightRoute | null = null;
  if (destination === '/plan') route = '/plan';
  else if (destination === '/bills') route = '/bills';
  else if (destination === '/savings' || destination.startsWith('/savings/')) route = '/savings';
  return route ? { ...action, route } : null;
}

export function dismissalsKey(userId: string): string {
  return `financial-context:dismissals:v1:${encodeURIComponent(userId.trim())}`;
}

export function normaliseDismissedIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim()).filter(Boolean))];
}

function containsFinancialAmounts(type: PrioritisedInsight['type']): boolean {
  return type === 'spending-summary' || type === 'category-change' ||
    type === 'recurring-expense' || type === 'goal-progress' || type === 'goal-coaching';
}

function privateTitle(type: PrioritisedInsight['type']): string {
  if (type === 'goal-progress' || type === 'goal-coaching') return 'Savings goal insight';
  if (type === 'recurring-expense') return 'Recurring expense insight';
  return 'Spending insight';
}
