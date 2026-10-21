/**
 * Synthetic customer accounts and example transaction history.
 * CLEARLY fake — simulated balances, masked numbers only.
 */

import type { Account } from '@/types/banking';
import type { TransactionRecord } from '@/types/transaction';

export const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'acc-everyday',
    name: 'Everyday Account',
    maskedNumber: '•••• 2847',
    balance: 8420.55,
    currency: 'SGD',
    type: 'savings',
  },
  {
    id: 'acc-current',
    name: 'FlexBank Current',
    maskedNumber: '•••• 5190',
    balance: 1265.0,
    currency: 'SGD',
    type: 'current',
  },
];

/** Primary account used as the default "from" account in the PayNow flow. */
export const PRIMARY_ACCOUNT_ID = 'acc-everyday';

/** Example completed transactions for history / recent activity widgets. */
export const MOCK_TRANSACTION_HISTORY: TransactionRecord[] = [
  {
    id: 'txn-1001',
    recipientName: 'Sarah Lim',
    recipientBank: 'OCBC',
    recipientIdentifier: '•••• 1293',
    amount: 45.0,
    currency: 'SGD',
    completedAt: '2026-10-18T09:12:00.000Z',
    status: 'confirmed',
    reference: 'FB-20261018-0001',
  },
  {
    id: 'txn-1000',
    recipientName: 'Alex Tan',
    recipientBank: 'DBS',
    recipientIdentifier: '•••• 4821',
    amount: 120.5,
    currency: 'SGD',
    completedAt: '2026-10-15T14:03:00.000Z',
    status: 'confirmed',
    reference: 'FB-20261015-0007',
  },
  {
    id: 'txn-0999',
    recipientName: 'Marcus Lee',
    recipientBank: 'UOB',
    recipientIdentifier: '•••• 7356',
    amount: 18.9,
    currency: 'SGD',
    completedAt: '2026-10-13T19:41:00.000Z',
    status: 'confirmed',
    reference: 'FB-20261013-0004',
  },
];
