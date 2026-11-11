/**
 * PostgreSQL implementation of the existing Store contract.
 *
 * Authentication remains in Express. This class is constructed only on the
 * server with DATABASE_URL and never exposes database credentials to clients.
 */

import { Pool, type PoolClient } from 'pg';

import { hashPassword } from './auth';
import {
  DEMO_PASSWORD,
  DEMO_RECIPIENTS,
  DEMO_USERS,
  type CreateUserInput,
  type Store,
  type TransferInput,
  type TransferResult,
} from './store';
import type { Account, Preferences, Priority, Recipient, TransactionRecord, User } from './types';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date | string;
  guidance_level: Preferences['guidanceLevel'];
  display_mode: Preferences['displayMode'];
  language: Preferences['language'];
  priorities: Priority[];
}

interface AccountRow {
  id: string;
  name: string;
  masked_number: string;
  balance: string | number;
  currency: 'SGD';
}

interface RecipientRow {
  id: string;
  name: string;
  bank: string;
  masked_identifier: string;
  initials: string;
  mobile: string;
}

interface TransactionRow {
  id: string;
  user_id: string;
  request_id: string;
  recipient_id: string;
  recipient_name: string;
  recipient_bank: string;
  recipient_identifier: string;
  amount: string | number;
  currency: 'SGD';
  status: 'confirmed' | 'failed';
  failure_reason: string | null;
  reference: string;
  created_at: Date | string;
}

interface JsonResultRow {
  result: unknown;
}

interface CreateStoreResult {
  kind: 'created' | 'email-taken';
  user?: { id?: unknown };
}

const USER_SELECT = `
  select
    u.id,
    u.name,
    u.email,
    u.password_hash,
    u.created_at,
    p.guidance_level,
    p.display_mode,
    p.language,
    coalesce(
      json_agg(up.priority_key order by up.sort_order)
        filter (where up.priority_key is not null),
      '[]'::json
    ) as priorities
  from public.users u
  join public.user_preferences p on p.user_id = u.id
  left join public.user_priorities up on up.user_id = u.id
`;

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function number(value: string | number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error('Database returned an invalid numeric value');
  }
  return parsed;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    preferences: {
      guidanceLevel: row.guidance_level,
      displayMode: row.display_mode,
      language: row.language,
      priorities: row.priorities,
    },
    createdAt: iso(row.created_at),
  };
}

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    maskedNumber: row.masked_number,
    balance: number(row.balance),
    currency: row.currency,
  };
}

function mapRecipient(row: RecipientRow): Recipient {
  return {
    id: row.id,
    name: row.name,
    bank: row.bank,
    maskedIdentifier: row.masked_identifier,
    initials: row.initials,
    mobile: row.mobile,
  };
}

function mapTransaction(row: TransactionRow): TransactionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    requestId: row.request_id,
    recipientId: row.recipient_id,
    recipientName: row.recipient_name,
    recipientBank: row.recipient_bank,
    recipientIdentifier: row.recipient_identifier,
    amount: number(row.amount),
    currency: row.currency,
    status: row.status,
    ...(row.failure_reason ? { failureReason: row.failure_reason } : {}),
    reference: row.reference,
    createdAt: iso(row.created_at),
  };
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Database returned an invalid ${label}`);
  }
  return value as Record<string, unknown>;
}

function mapRpcTransaction(value: unknown): TransactionRecord {
  const row = object(value, 'transaction record');
  const status = row.status;
  const currency = row.currency;
  if (status !== 'confirmed' && status !== 'failed') {
    throw new Error('Database returned an invalid transaction status');
  }
  if (currency !== 'SGD') {
    throw new Error('Database returned an invalid transaction currency');
  }
  const failureReason = row.failureReason;
  return {
    id: String(row.id),
    userId: String(row.userId),
    requestId: String(row.requestId),
    recipientId: String(row.recipientId),
    recipientName: String(row.recipientName),
    recipientBank: String(row.recipientBank),
    recipientIdentifier: String(row.recipientIdentifier),
    amount: number(row.amount as string | number),
    currency,
    status,
    ...(typeof failureReason === 'string' && failureReason ? { failureReason } : {}),
    reference: String(row.reference),
    createdAt: iso(String(row.createdAt)),
  };
}

/** A server-only PostgreSQL store. Call init once and close during shutdown. */
export class SupabaseStore implements Store {
  private readonly pool: Pool;
  private closed = false;

  constructor(connectionString: string) {
    if (!connectionString.trim()) {
      throw new Error('DATABASE_URL is required when STORE_DRIVER=postgres');
    }
    this.pool = new Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    });
    this.pool.on('error', (err) => {
      console.error('[database] idle PostgreSQL client error:', err.message);
    });
  }

  async init(): Promise<void> {
    const result = await this.pool.query<{
      users_table: string | null;
      create_user_function: string | null;
      transfer_function: string | null;
    }>(`
      select
        to_regclass('public.users')::text as users_table,
        to_regprocedure(
          'public.create_store_user(text,text,text,text,text,text,text[])'
        )::text as create_user_function,
        to_regprocedure(
          'public.apply_store_transfer(text,text,text,numeric,text)'
        )::text as transfer_function
    `);
    const row = result.rows[0];
    if (!row?.users_table || !row.create_user_function || !row.transfer_function) {
      throw new Error('PostgreSQL schema is missing; apply supabase/migrations/01_initial_schema.sql');
    }
  }

  async close(): Promise<void> {
    if (!this.closed) {
      this.closed = true;
      await this.pool.end();
    }
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    return this.findUser('u.email = $1', email.trim().toLowerCase());
  }

  async findUserById(id: string): Promise<User | undefined> {
    return this.findUser('u.id = $1', id);
  }

  private async findUser(condition: 'u.email = $1' | 'u.id = $1', value: string): Promise<User | undefined> {
    const result = await this.pool.query<UserRow>(`
      ${USER_SELECT}
      where ${condition}
      group by
        u.id,
        u.name,
        u.email,
        u.password_hash,
        u.created_at,
        p.guidance_level,
        p.display_mode,
        p.language
      limit 1
    `, [value]);
    const row = result.rows[0];
    return row ? mapUser(row) : undefined;
  }

  async createUser(input: CreateUserInput): Promise<User | 'email-taken'> {
    const result = await this.pool.query<JsonResultRow>(`
      select public.create_store_user($1, $2, $3, $4, $5, $6, $7::text[]) as result
    `, [
      input.name,
      input.email,
      input.passwordHash,
      input.preferences.guidanceLevel,
      input.preferences.displayMode,
      input.preferences.language,
      input.preferences.priorities,
    ]);
    const raw = object(result.rows[0]?.result, 'create user result') as unknown as CreateStoreResult;
    if (raw.kind === 'email-taken') {
      return 'email-taken';
    }
    const userId = raw.user?.id;
    if (raw.kind !== 'created' || typeof userId !== 'string') {
      throw new Error('Database returned an invalid create user result');
    }
    const user = await this.findUserById(userId);
    if (!user) {
      throw new Error('Database created a user that could not be loaded');
    }
    return user;
  }

  async updatePreferences(userId: string, preferences: Preferences): Promise<User | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const updated = await client.query(`
        update public.user_preferences
        set guidance_level = $2, display_mode = $3, language = $4
        where user_id = $1
        returning user_id
      `, [userId, preferences.guidanceLevel, preferences.displayMode, preferences.language]);
      if (updated.rowCount === 0) {
        await client.query('rollback');
        return undefined;
      }
      await client.query('delete from public.user_priorities where user_id = $1', [userId]);
      await client.query(`
        insert into public.user_priorities (user_id, priority_key, sort_order)
        select $1, priority_key, (position - 1)::smallint
        from unnest($2::text[]) with ordinality as selected(priority_key, position)
      `, [userId, preferences.priorities]);
      await client.query('commit');
    } catch (err) {
      await this.rollback(client);
      throw err;
    } finally {
      client.release();
    }
    return this.findUserById(userId);
  }

  async listRecipients(): Promise<Recipient[]> {
    const result = await this.pool.query<RecipientRow>(`
      select id, name, bank, masked_identifier, initials, mobile
      from public.recipients
      order by sort_order
    `);
    return result.rows.map(mapRecipient);
  }

  async findRecipient(id: string): Promise<Recipient | undefined> {
    return this.findRecipientWhere('id = $1', id);
  }

  async findRecipientByMobile(mobile: string): Promise<Recipient | undefined> {
    return this.findRecipientWhere('mobile = $1', mobile);
  }

  private async findRecipientWhere(condition: 'id = $1' | 'mobile = $1', value: string): Promise<Recipient | undefined> {
    const result = await this.pool.query<RecipientRow>(`
      select id, name, bank, masked_identifier, initials, mobile
      from public.recipients
      where ${condition}
      limit 1
    `, [value]);
    const row = result.rows[0];
    return row ? mapRecipient(row) : undefined;
  }

  async getAccounts(userId: string): Promise<Account[]> {
    const result = await this.pool.query<AccountRow>(`
      select id, name, masked_number, balance, currency
      from public.accounts
      where user_id = $1
      order by created_at, id
    `, [userId]);
    return result.rows.map(mapAccount);
  }

  async findTransactionByRequestId(userId: string, requestId: string): Promise<TransactionRecord | undefined> {
    const result = await this.pool.query<TransactionRow>(`
      select
        id,
        user_id,
        request_id,
        recipient_id,
        recipient_name,
        recipient_bank,
        recipient_identifier,
        amount,
        currency,
        status,
        failure_reason,
        reference,
        created_at
      from public.transactions
      where user_id = $1 and request_id = $2
      limit 1
    `, [userId, requestId]);
    const row = result.rows[0];
    return row ? mapTransaction(row) : undefined;
  }

  async applyTransfer(input: TransferInput): Promise<TransferResult> {
    const result = await this.pool.query<JsonResultRow>(`
      select public.apply_store_transfer($1, $2, $3, $4, $5) as result
    `, [
      input.userId,
      input.requestId,
      input.recipient.id,
      input.amount,
      input.simulatedFailureReason ?? null,
    ]);
    const raw = object(result.rows[0]?.result, 'transfer result');
    const kind = raw.kind;
    const balance = number(raw.balance as string | number);
    if (kind === 'insufficient') {
      return { kind, balance };
    }
    if (kind !== 'confirmed' && kind !== 'failed' && kind !== 'duplicate') {
      throw new Error('Database returned an invalid transfer result');
    }
    return { kind, record: mapRpcTransaction(raw.record), balance };
  }

  async listTransactions(userId: string): Promise<TransactionRecord[]> {
    const result = await this.pool.query<TransactionRow>(`
      select
        id,
        user_id,
        request_id,
        recipient_id,
        recipient_name,
        recipient_bank,
        recipient_identifier,
        amount,
        currency,
        status,
        failure_reason,
        reference,
        created_at
      from public.transactions
      where user_id = $1
      order by created_at desc, id desc
    `, [userId]);
    return result.rows.map(mapTransaction);
  }

  async reset(): Promise<void> {
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('delete from public.users');
      await client.query('delete from public.recipients');
      await client.query("select setval('public.transfer_reference_seq', 1, false)");

      for (const [sortOrder, recipient] of DEMO_RECIPIENTS.entries()) {
        await client.query(`
          insert into public.recipients
            (id, name, bank, masked_identifier, initials, mobile, sort_order)
          values ($1, $2, $3, $4, $5, $6, $7)
        `, [
          recipient.id,
          recipient.name,
          recipient.bank,
          recipient.maskedIdentifier,
          recipient.initials,
          recipient.mobile,
          sortOrder,
        ]);
      }

      for (const user of DEMO_USERS) {
        await client.query(`
          select public.create_store_user($1, $2, $3, $4, $5, $6, $7::text[])
        `, [
          user.name,
          user.email,
          passwordHash,
          user.preferences.guidanceLevel,
          user.preferences.displayMode,
          user.preferences.language,
          user.preferences.priorities,
        ]);
      }
      await client.query('commit');
    } catch (err) {
      await this.rollback(client);
      throw err;
    } finally {
      client.release();
    }
  }

  private async rollback(client: PoolClient): Promise<void> {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the original database error.
    }
  }
}
