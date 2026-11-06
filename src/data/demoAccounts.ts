/**
 * Demo accounts for the competition — SYNTHETIC ONLY.
 *
 * These are seeded into the SAME local auth store as real registrations (see
 * src/services/seedDemo.ts). Passwords live here only because this is an
 * offline prototype with fictional users; they are NOT real credentials and
 * must never be reused for anything real. Do not copy this pattern to a real
 * backend — there, demo users would be seeded server-side.
 */

import type { CustomerPreferences } from '@/types/preferences';

export interface DemoAccount {
  name: string;
  email: string;
  password: string;
  preferences: CustomerPreferences;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: 'Alex',
    email: 'alex@flexbank.demo',
    password: 'demo1234',
    preferences: {
      language: 'en',
      guidanceLevel: 'quick',
      displayMode: 'standard',
      bankingPurposes: ['saving', 'fixedDeposits'],
      priorities: ['moneyManagement', 'payments'],
      voiceEnabled: false,
      visualTheme: 'classic',
    },
  },
  {
    name: 'Jamie',
    email: 'jamie@flexbank.demo',
    password: 'demo1234',
    preferences: {
      language: 'en',
      guidanceLevel: 'guided',
      displayMode: 'standard',
      bankingPurposes: ['investments', 'learning'],
      priorities: ['guidance', 'moneyManagement'],
      voiceEnabled: false,
      visualTheme: 'classic',
    },
  },
  {
    name: 'Taylor',
    email: 'taylor@flexbank.demo',
    password: 'demo1234',
    preferences: {
      language: 'en',
      guidanceLevel: 'balanced',
      displayMode: 'highClarity',
      bankingPurposes: ['everyday', 'managing'],
      priorities: ['payments', 'moneyManagement', 'accessibility'],
      voiceEnabled: false,
      visualTheme: 'classic',
    },
  },
];

/** Minimal list for the login screen's demo quick-sign-in buttons. */
export const DEMO_LOGINS = DEMO_ACCOUNTS.map((d) => ({
  name: d.name,
  email: d.email,
  password: d.password,
}));
