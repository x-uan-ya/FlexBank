export {
  generateFinancialInsights,
  generatePrioritisedInsights,
  lifestyleFromPurposes,
  prioritiseInsights,
  type FinancialContextInput,
} from './insightEngine';
export {
  calculateGoalCoaching,
  goalContextFromPlanGoal,
  goalContextFromSavingsPocket,
} from './goals';
export {
  calculateMonthlySpending,
  calculateMonthToMonthChanges,
  detectRecurringExpenses,
} from './spending';
export {
  SYNTHETIC_CONTEXT_GOALS,
  SYNTHETIC_CONTEXT_INVESTMENTS,
  SYNTHETIC_CONTEXT_TRANSACTIONS,
} from './sampleData';
export type {
  CategoryChange,
  FinancialInsight,
  FinancialLifestyle,
  GoalCoachingResult,
  GoalContextRecord,
  InsightDataSource,
  InsightType,
  MonthlySpending,
  PrioritisedInsight,
  RecurringExpense,
  RelatedAction,
  SpendingTransaction,
} from './types';
