import type { Investment } from '@/features/investments/types';

import type { GoalContextRecord, SpendingTransaction } from './types';

/**
 * SYNTHETIC HACKATHON DATA ONLY. These records are deliberately fictional and
 * provide three consecutive months so comparisons are evidence-backed.
 */
export const SYNTHETIC_CONTEXT_TRANSACTIONS: SpendingTransaction[] = [
  { id: 'demo-tx-sep-food', occurredAt: '2026-09-08T12:00:00Z', merchant: 'Hawker Corner', category: 'Dining', amount: 82, direction: 'debit', synthetic: true },
  { id: 'demo-tx-sep-stream', occurredAt: '2026-09-12T08:00:00Z', merchant: 'StreamFlix Demo', category: 'Subscriptions', amount: 18.9, direction: 'debit', synthetic: true },
  { id: 'demo-tx-sep-travel', occurredAt: '2026-09-18T09:00:00Z', merchant: 'Metro Demo', category: 'Transport', amount: 55, direction: 'debit', synthetic: true },
  { id: 'demo-tx-oct-food', occurredAt: '2026-10-09T12:00:00Z', merchant: 'Hawker Corner', category: 'Dining', amount: 103, direction: 'debit', synthetic: true },
  { id: 'demo-tx-oct-stream', occurredAt: '2026-10-12T08:00:00Z', merchant: 'StreamFlix Demo', category: 'Subscriptions', amount: 18.9, direction: 'debit', synthetic: true },
  { id: 'demo-tx-oct-travel', occurredAt: '2026-10-20T09:00:00Z', merchant: 'Metro Demo', category: 'Transport', amount: 61, direction: 'debit', synthetic: true },
  { id: 'demo-tx-nov-food', occurredAt: '2026-11-06T12:00:00Z', merchant: 'Hawker Corner', category: 'Dining', amount: 134, direction: 'debit', synthetic: true },
  { id: 'demo-tx-nov-stream', occurredAt: '2026-11-12T08:00:00Z', merchant: 'StreamFlix Demo', category: 'Subscriptions', amount: 18.9, direction: 'debit', synthetic: true },
  { id: 'demo-tx-nov-travel', occurredAt: '2026-11-13T09:00:00Z', merchant: 'Metro Demo', category: 'Transport', amount: 49, direction: 'debit', synthetic: true },
  { id: 'demo-tx-nov-credit', occurredAt: '2026-11-14T09:00:00Z', merchant: 'Demo Refund', category: 'Shopping', amount: 20, direction: 'credit', synthetic: true },
];

/** SYNTHETIC goal snapshots; no contribution moves money. */
export const SYNTHETIC_CONTEXT_GOALS: GoalContextRecord[] = [
  {
    id: 'demo-goal-trip',
    name: 'Japan trip demo',
    target: 4000,
    saved: 1800,
    monthlyContribution: 400,
    targetDate: '2027-05-14',
    synthetic: true,
  },
  {
    id: 'demo-goal-emergency',
    name: 'Emergency fund demo',
    target: 6000,
    saved: 5200,
    monthlyContribution: 0,
    targetDate: null,
    synthetic: true,
  },
];

/** SYNTHETIC holdings; not real products, rates, advice or customer data. */
export const SYNTHETIC_CONTEXT_INVESTMENTS: Investment[] = [
  {
    id: 'demo-bond-2027',
    kind: 'bond',
    name: 'Demo Education Bond',
    principal: 5000,
    faceValue: 5000,
    rate: 2.5,
    couponFrequency: 'semiAnnual',
    startDate: '2025-12-01',
    maturityDate: '2027-06-01',
    demo: true,
    createdAt: '2025-12-01T00:00:00Z',
  },
];
