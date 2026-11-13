/**
 * Local persistence for Savings Pockets.
 *
 * Reuses the existing `jsonStorage` (namespaced AsyncStorage) so pockets survive
 * app restarts, exactly like the rest of the local-first app. One key holds the
 * whole pocket list; seeding runs once on first load.
 *
 * SAFETY: simulated data only. Nothing here moves real money.
 */

import { jsonStorage } from '@/services';

import { makeContribution, makePocket } from './logic';
import type { Contribution, SavingsPocket } from './types';

const KEY = 'savings:pockets';
const SEEDED_FLAG = 'savings:seeded';

/** The three demo pockets requested for the prototype (clearly simulated). */
function demoPockets(): SavingsPocket[] {
  const holiday = makePocket({
    name: 'Holiday Fund',
    category: 'holiday',
    target: 3000,
    targetDate: futureDate(5),
    initial: 1200,
  });
  const emergency = makePocket({
    name: 'Emergency Fund',
    category: 'emergency',
    target: 5000,
    targetDate: futureDate(10),
    initial: 2500,
  });
  const laptop = makePocket({
    name: 'New Laptop',
    category: 'gadget',
    target: 2000,
    targetDate: futureDate(3),
    initial: 800,
  });
  return [holiday, emergency, laptop].map((p) => ({ ...p, demo: true }));
}

/** Load all pockets. Seeds demo data on the very first run only. */
export async function loadPockets(): Promise<SavingsPocket[]> {
  const existing = await jsonStorage.get<SavingsPocket[]>(KEY);
  if (existing) return existing;

  const seeded = await jsonStorage.get<boolean>(SEEDED_FLAG);
  if (seeded) return []; // user deleted everything; respect that.

  const demo = demoPockets();
  await jsonStorage.set(KEY, demo);
  await jsonStorage.set(SEEDED_FLAG, true);
  return demo;
}

async function saveAll(pockets: SavingsPocket[]): Promise<SavingsPocket[]> {
  await jsonStorage.set(KEY, pockets);
  // Mark as seeded so an emptied list is not re-seeded on next launch.
  await jsonStorage.set(SEEDED_FLAG, true);
  return pockets;
}

export async function upsertPocket(pocket: SavingsPocket): Promise<SavingsPocket[]> {
  const all = await loadPockets();
  const idx = all.findIndex((p) => p.id === pocket.id);
  const next = idx >= 0
    ? all.map((p) => (p.id === pocket.id ? pocket : p))
    : [...all, pocket];
  return saveAll(next);
}

export async function deletePocket(id: string): Promise<SavingsPocket[]> {
  const all = await loadPockets();
  return saveAll(all.filter((p) => p.id !== id));
}

export async function addContribution(
  id: string,
  amount: number,
  note?: string,
): Promise<SavingsPocket[]> {
  const all = await loadPockets();
  const next = all.map((p) =>
    p.id === id
      ? { ...p, contributions: [...p.contributions, makeContribution(amount, note)] }
      : p,
  );
  return saveAll(next);
}

/** Convenience: fetch one pocket by id. */
export async function getPocket(id: string): Promise<SavingsPocket | undefined> {
  const all = await loadPockets();
  return all.find((p) => p.id === id);
}

export type { Contribution };

function futureDate(monthsAhead: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  return d.toISOString().slice(0, 10); // yyyy-mm-dd
}
