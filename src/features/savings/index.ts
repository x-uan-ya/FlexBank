/**
 * Savings Pockets & Goals — public surface.
 *
 *   import { SavingsPocketsScreen } from '@/features/savings';
 *
 * Self-contained feature: types, pure logic, local persistence, and screens.
 * Reuses shared components, theme tokens and the app's jsonStorage. Does not
 * touch any teammate-owned feature.
 */

export { SavingsPocketsScreen } from './screens/SavingsPocketsScreen';
export { PocketFormScreen } from './screens/PocketFormScreen';
export { PocketDetailScreen } from './screens/PocketDetailScreen';
export { useSavingsPockets } from './useSavingsPockets';
export type { SavingsPocket, Contribution, PocketCategory } from './types';
