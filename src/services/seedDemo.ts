/**
 * Demo account seeding (development/demo convenience).
 *
 * Registers the three fictional demo users (Alex / Jamie / Taylor) into the
 * SAME local auth store as normal registrations, so the demo quick-logins work
 * and each produces a different purpose-based home. Idempotent: it skips any
 * account that already exists.
 *
 * SAFETY: synthetic users only. In a real backend, demo users would be seeded
 * server-side, never with client-side passwords (see BACKEND.md).
 */

import { DEMO_ACCOUNTS } from '@/data';

import { authService } from './authService';
import { clearAllFlexBankData } from './storage';

/**
 * Seed demo accounts that don't already exist.
 *
 * IMPORTANT: call this only when NOT signed in (e.g. once on boot before the
 * session is restored, if no session exists). Registering a demo user starts a
 * session as a side effect, so we sign out afterwards to leave the app on the
 * login screen. Idempotent — existing accounts are skipped.
 */
export async function seedDemoAccounts(): Promise<void> {
  let seededAny = false;

  for (const demo of DEMO_ACCOUNTS) {
    try {
      const exists = await authService.hasAccount(demo.email);
      if (exists) continue;
      await authService.register({
        fullName: demo.name,
        email: demo.email,
        password: demo.password,
        preferences: demo.preferences,
      });
      seededAny = true;
    } catch {
      // Ignore individual seed failures (e.g. first-boot race); non-fatal.
    }
  }

  // register() signs in the last seeded user; sign out so boot lands on login.
  if (seededAny) {
    try {
      await authService.logout();
    } catch {
      /* non-fatal */
    }
  }
}

/**
 * DANGER (dev only): wipe ALL FlexBank local data, then re-seed demo accounts.
 * Useful to reset the prototype to a known state between demo runs.
 */
export async function resetDemoData(): Promise<void> {
  await clearAllFlexBankData();
  await seedDemoAccounts();
}
