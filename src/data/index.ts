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
export {
  MOCK_SPENDING,
  MOCK_GOALS,
  MOCK_SECURITY_TIPS,
  type SpendingCategory,
  type SavingsGoal,
  type SecurityTip,
} from './insights';
