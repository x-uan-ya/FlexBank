/**
 * The data layer.
 *
 * `Store` is the list of things the server needs from a database. Today it is
 * answered by `MemoryStore` (works instantly, great as a demo backup). The next
 * step is a `SupabaseStore` that answers the same questions from PostgreSQL, so
 * nothing else in the server has to change.
 *
 * All data is SYNTHETIC.
 */

import { randomUUID } from 'node:crypto';

import { hashPassword } from './auth';
import type { Account, Preferences, Recipient, TransactionRecord, User } from './types';

export const DEMO_PASSWORD = 'Demo1234!';
export const DEMO_STARTING_BALANCE = 8420.55;

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  preferences: Preferences;
}

export interface TransferInput {
  userId: string;
  requestId: string;
  recipient: Recipient;
  amount: number;
  /** When set, the transfer is recorded as FAILED with this reason and no money moves. */
  simulatedFailureReason?: string;
}

export type TransferResult =
  | { kind: 'confirmed' | 'failed' | 'duplicate'; record: TransactionRecord; balance: number }
  | { kind: 'insufficient'; balance: number };

export interface Store {
  findUserByEmail(email: string): Promise<User | undefined>;
  findUserById(id: string): Promise<User | undefined>;
  createUser(input: CreateUserInput): Promise<User | 'email-taken'>;
  updatePreferences(userId: string, preferences: Preferences): Promise<User | undefined>;
  listRecipients(): Promise<Recipient[]>;
  findRecipient(id: string): Promise<Recipient | undefined>;
  findRecipientByMobile(mobile: string): Promise<Recipient | undefined>;
  getAccounts(userId: string): Promise<Account[]>;
  findTransactionByRequestId(userId: string, requestId: string): Promise<TransactionRecord | undefined>;
  /** Checks the balance, moves the money and records the transaction as ONE step. */
  applyTransfer(input: TransferInput): Promise<TransferResult>;
  listTransactions(userId: string): Promise<TransactionRecord[]>;
  /** Puts the demo back to its starting state (seed users, balances, no transactions). */
  reset(): Promise<void>;
}

const SEED_RECIPIENTS: Recipient[] = [
  { id: 'rcp-alex', name: 'Alex Tan', bank: 'DBS', maskedIdentifier: '•••• 4821', initials: 'AT', mobile: '90004821' },
  { id: 'rcp-sarah', name: 'Sarah Lim', bank: 'OCBC', maskedIdentifier: '•••• 1293', initials: 'SL', mobile: '90001293' },
  { id: 'rcp-marcus', name: 'Marcus Lee', bank: 'UOB', maskedIdentifier: '•••• 7356', initials: 'ML', mobile: '90007356' },
  { id: 'rcp-priya', name: 'Priya Nair', bank: 'OCBC', maskedIdentifier: '•••• 9014', initials: 'PN', mobile: '90009014' },
  { id: 'rcp-wei', name: 'Wei Zhang', bank: 'DBS', maskedIdentifier: '•••• 2680', initials: 'WZ', mobile: '90002680' },
];

/** Demo customers. Each one explicitly "chose" different preferences at registration. */
const SEED_USERS: { name: string; email: string; preferences: Preferences }[] = [
  {
    name: 'Quick Navigator',
    email: 'quick@demo.flexbank.test',
    preferences: { guidanceLevel: 'quick', displayMode: 'standard', language: 'en', priorities: ['transfers'] },
  },
  {
    name: 'Careful Checker',
    email: 'careful@demo.flexbank.test',
    preferences: {
      guidanceLevel: 'guided',
      displayMode: 'standard',
      language: 'en',
      priorities: ['transfers', 'accountOverview'],
    },
  },
  {
    name: 'Readability First',
    email: 'readable@demo.flexbank.test',
    preferences: {
      guidanceLevel: 'balanced',
      displayMode: 'largeText',
      language: 'zh',
      priorities: ['accountOverview', 'billPayments'],
    },
  },
];

export class MemoryStore implements Store {
  private users = new Map<string, User>();
  private accounts = new Map<string, Account>(); // keyed by userId (one everyday account each)
  private transactions: TransactionRecord[] = [];
  private recipients: Recipient[] = [];
  private referenceCounter = 0;

  /** Loads the demo data. Call once at startup. */
  async init(): Promise<void> {
    this.users.clear();
    this.accounts.clear();
    this.transactions = [];
    this.recipients = SEED_RECIPIENTS.map((r) => ({ ...r }));
    this.referenceCounter = 0;

    const passwordHash = await hashPassword(DEMO_PASSWORD);
    for (const seed of SEED_USERS) {
      await this.createUser({ ...seed, passwordHash });
    }
  }

  async reset(): Promise<void> {
    await this.init();
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    const wanted = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === wanted) {
        return user;
      }
    }
    return undefined;
  }

  async findUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async createUser(input: CreateUserInput): Promise<User | 'email-taken'> {
    const email = input.email.trim().toLowerCase();
    if (await this.findUserByEmail(email)) {
      return 'email-taken';
    }
    const user: User = {
      id: `usr-${randomUUID().slice(0, 8)}`,
      name: input.name,
      email,
      passwordHash: input.passwordHash,
      preferences: input.preferences,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    this.accounts.set(user.id, {
      id: `acc-${user.id}`,
      name: 'Everyday Account',
      maskedNumber: '•••• 2847',
      balance: DEMO_STARTING_BALANCE,
      currency: 'SGD',
    });
    return user;
  }

  async updatePreferences(userId: string, preferences: Preferences): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) {
      return undefined;
    }
    user.preferences = preferences;
    return user;
  }

  async listRecipients(): Promise<Recipient[]> {
    return this.recipients.map((r) => ({ ...r }));
  }

  async findRecipient(id: string): Promise<Recipient | undefined> {
    return this.recipients.find((r) => r.id === id);
  }

  async findRecipientByMobile(mobile: string): Promise<Recipient | undefined> {
    return this.recipients.find((r) => r.mobile === mobile);
  }

  async getAccounts(userId: string): Promise<Account[]> {
    const account = this.accounts.get(userId);
    return account ? [{ ...account }] : [];
  }

  async findTransactionByRequestId(
    userId: string,
    requestId: string,
  ): Promise<TransactionRecord | undefined> {
    return this.transactions.find((t) => t.userId === userId && t.requestId === requestId);
  }

  async applyTransfer(input: TransferInput): Promise<TransferResult> {
    // No "await" between the checks and the changes below, so two requests can never interleave.
    const account = this.accounts.get(input.userId);
    if (!account) {
      throw new Error('Account not found for user');
    }

    const existing = this.transactions.find(
      (t) => t.userId === input.userId && t.requestId === input.requestId,
    );
    if (existing) {
      return { kind: 'duplicate', record: existing, balance: account.balance };
    }

    const failed = input.simulatedFailureReason !== undefined;
    if (!failed && account.balance < input.amount) {
      return { kind: 'insufficient', balance: account.balance };
    }
    if (!failed) {
      account.balance = round2(account.balance - input.amount);
    }

    this.referenceCounter += 1;
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const record: TransactionRecord = {
      id: `txn-${randomUUID().slice(0, 8)}`,
      userId: input.userId,
      requestId: input.requestId,
      recipientId: input.recipient.id,
      recipientName: input.recipient.name,
      recipientBank: input.recipient.bank,
      recipientIdentifier: input.recipient.maskedIdentifier,
      amount: input.amount,
      currency: 'SGD',
      status: failed ? 'failed' : 'confirmed',
      ...(failed ? { failureReason: input.simulatedFailureReason } : {}),
      reference: `FB-${day}-${String(this.referenceCounter).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
    };
    this.transactions.push(record);
    return { kind: failed ? 'failed' : 'confirmed', record, balance: account.balance };
  }

  async listTransactions(userId: string): Promise<TransactionRecord[]> {
    return this.transactions.filter((t) => t.userId === userId).reverse();
  }
}
