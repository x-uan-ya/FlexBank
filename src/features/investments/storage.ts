/**
 * Local persistence for the Investment Maturity Tracker.
 *
 * Reuses the app's `jsonStorage` (namespaced AsyncStorage) so records + reminder
 * preferences survive restarts. One key holds the investment list, one holds
 * reminder prefs. Seeds the spec's example FD + bond once on first load.
 *
 * SAFETY: simulated data only. Clearly-labelled estimates, not real products.
 */

import { jsonStorage } from '@/services';

import { uid } from './logic';
import {
  DEFAULT_REMINDER_PREFS,
  type BondInvestment,
  type FixedDepositInvestment,
  type Investment,
  type ReminderPrefs,
} from './types';

const KEY = 'investments:list';
const PREFS_KEY = 'investments:reminderPrefs';
const SEEDED_FLAG = 'investments:seeded';

function demoInvestments(): Investment[] {
  // Fixed Deposit A (from the spec).
  const fd: FixedDepositInvestment = {
    id: uid('inv'),
    kind: 'fixedDeposit',
    name: 'Fixed Deposit A',
    principal: 10000,
    rate: 2.5,
    startDate: '2026-09-15',
    maturityDate: '2026-12-15',
    demo: true,
    createdAt: new Date().toISOString(),
  };
  // Corporate Bond B (from the spec).
  const bond: BondInvestment = {
    id: uid('inv'),
    kind: 'bond',
    name: 'Corporate Bond B',
    principal: 5000,
    faceValue: 5000,
    rate: 3.2,
    couponFrequency: 'semiAnnual',
    startDate: '2026-05-28',
    maturityDate: '2028-11-28',
    demo: true,
    createdAt: new Date().toISOString(),
  };
  return [fd, bond];
}

export async function loadInvestments(): Promise<Investment[]> {
  const existing = await jsonStorage.get<Investment[]>(KEY);
  if (existing) return existing;

  const seeded = await jsonStorage.get<boolean>(SEEDED_FLAG);
  if (seeded) return [];

  const demo = demoInvestments();
  await jsonStorage.set(KEY, demo);
  await jsonStorage.set(SEEDED_FLAG, true);
  return demo;
}

async function saveAll(list: Investment[]): Promise<Investment[]> {
  await jsonStorage.set(KEY, list);
  await jsonStorage.set(SEEDED_FLAG, true);
  return list;
}

export async function upsertInvestment(inv: Investment): Promise<Investment[]> {
  const all = await loadInvestments();
  const idx = all.findIndex((i) => i.id === inv.id);
  const next = idx >= 0 ? all.map((i) => (i.id === inv.id ? inv : i)) : [...all, inv];
  return saveAll(next);
}

export async function deleteInvestment(id: string): Promise<Investment[]> {
  const all = await loadInvestments();
  return saveAll(all.filter((i) => i.id !== id));
}

export async function getInvestment(id: string): Promise<Investment | undefined> {
  const all = await loadInvestments();
  return all.find((i) => i.id === id);
}

/* ----------------------------- Reminder prefs --------------------------- */

export async function loadReminderPrefs(): Promise<ReminderPrefs> {
  return (await jsonStorage.get<ReminderPrefs>(PREFS_KEY)) ?? DEFAULT_REMINDER_PREFS;
}

export async function saveReminderPrefs(prefs: ReminderPrefs): Promise<ReminderPrefs> {
  await jsonStorage.set(PREFS_KEY, prefs);
  return prefs;
}
