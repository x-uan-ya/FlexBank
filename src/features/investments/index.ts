/**
 * Investment Maturity Tracker — public surface.
 *
 *   import { InvestmentsScreen } from '@/features/investments';
 *
 * Self-contained feature: types, pure logic, local persistence, and screens.
 * Reuses shared components, theme tokens and the app's jsonStorage. Does not
 * touch any teammate-owned feature. Simulated data + estimates only.
 */

export { InvestmentsScreen } from './screens/InvestmentsScreen';
export { InvestmentDetailScreen } from './screens/InvestmentDetailScreen';
export { InvestmentFormScreen } from './screens/InvestmentFormScreen';
export { ReminderSettingsScreen } from './screens/ReminderSettingsScreen';
export { useInvestments } from './useInvestments';
export type { Investment, FixedDepositInvestment, BondInvestment } from './types';
