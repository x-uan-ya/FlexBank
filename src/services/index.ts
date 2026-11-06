/**
 * Services — public surface.
 *
 *   import { authService, isValidEmail } from '@/services';
 *
 * The app depends on these service INTERFACES, not their implementations, so a
 * real backend can be swapped in later (see BACKEND.md).
 */

export { authService, isValidEmail, type AuthService } from './authService';
export { clearAllFlexBankData } from './storage';
export { seedDemoAccounts, resetDemoData } from './seedDemo';
