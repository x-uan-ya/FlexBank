/**
 * Synthetic mock data — public surface. Development/demo data only.
 *
 *   import { MOCK_RECIPIENTS, MOCK_ACCOUNTS, DEMO_PERSONAS } from '@/data';
 */

export { MOCK_RECIPIENTS } from './recipients';
export {
  MOCK_ACCOUNTS,
  PRIMARY_ACCOUNT_ID,
  MOCK_TRANSACTION_HISTORY,
} from './accounts';
export { DEMO_PERSONAS, getPersona, type DemoPersona } from './personas';
export { DEMO_ACCOUNTS, DEMO_LOGINS, type DemoAccount } from './demoAccounts';
export {
  MOCK_SPENDING,
  MOCK_GOALS,
  MOCK_SECURITY_TIPS,
  MOCK_FIXED_DEPOSITS,
  MOCK_FD_RATES,
  MOCK_BONDS,
  MOCK_PORTFOLIO,
  MOCK_BUDGET,
  MOCK_LEARNING,
  type SpendingCategory,
  type SavingsGoal,
  type SecurityTip,
  type FixedDeposit,
  type BondHolding,
  type LearningItem,
} from './insights';
