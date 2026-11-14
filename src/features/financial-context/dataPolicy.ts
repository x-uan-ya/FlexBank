import type { Goal } from '@/features/plan/goals';

import { goalContextFromPlanGoal } from './goals';
import type { FinancialContextInput } from './insightEngine';
import {
  SYNTHETIC_CONTEXT_INVESTMENTS,
  SYNTHETIC_CONTEXT_TRANSACTIONS,
} from './sampleData';

export const FINANCIAL_INSIGHTS_SOURCE_NOTE =
  'Plan goals are read only for this demo user. Spending and investment examples use clearly labelled global synthetic data. Savings pockets and saved investments are excluded until their stores support user ownership.';

/**
 * Ownership boundary for the panel. Never accepts the app-wide pocket or
 * investment stores, so switching users cannot surface records created there.
 */
export function buildUserScopedFinancialContext(
  planGoals: Goal[],
  asOf: string | Date,
): FinancialContextInput {
  return {
    transactions: SYNTHETIC_CONTEXT_TRANSACTIONS,
    goals: planGoals.map((goal) => ({
      ...goalContextFromPlanGoal(goal),
      synthetic: true,
    })),
    investments: SYNTHETIC_CONTEXT_INVESTMENTS,
    asOf,
    synthetic: true,
  };
}
