import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { Pool } from 'pg';

import { hashPassword, verifyPassword } from '../src/auth';
import { DEMO_STARTING_BALANCE } from '../src/store';
import { SupabaseStore } from '../src/supabaseStore';

try {
  process.loadEnvFile(resolve(process.cwd(), '.env'));
} catch {
  // CI can provide DATABASE_URL directly. Missing configuration skips this suite.
}

const databaseUrl = process.env.DATABASE_URL?.trim();

describe('SupabaseStore PostgreSQL integration', { skip: !databaseUrl }, () => {
  let store: SupabaseStore;
  let createdUserId: string | undefined;

  before(async () => {
    store = new SupabaseStore(databaseUrl!);
    await store.init();
  });

  after(async () => {
    await store?.close();
    if (!createdUserId) return;

    const cleanup = new Pool({ connectionString: databaseUrl! });
    try {
      await cleanup.query('delete from public.users where id = $1', [createdUserId]);
    } finally {
      await cleanup.end();
    }
  });

  it('persists users, preferences, accounts and idempotent transfers', async () => {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const email = `postgres-${suffix}@demo.flexbank.test`;
    const password = randomBytes(32).toString('base64url');
    const passwordHash = await hashPassword(password);
    const initialPreferences = {
      guidanceLevel: 'guided' as const,
      displayMode: 'largeText' as const,
      language: 'ms' as const,
      priorities: ['transfers', 'billPayments'] as const,
    };

    const created = await store.createUser({
      name: 'PostgreSQL Integration Test',
      email: email.toUpperCase(),
      passwordHash,
      preferences: { ...initialPreferences, priorities: [...initialPreferences.priorities] },
    });
    assert.notEqual(created, 'email-taken');
    if (created === 'email-taken') return;
    createdUserId = created.id;

    assert.match(created.id, /^usr-[0-9a-f]{8}$/);
    assert.equal(created.email, email);
    assert.equal(await verifyPassword(password, created.passwordHash), true);
    assert.deepEqual(created.preferences, initialPreferences);

    const duplicate = await store.createUser({
      name: 'Duplicate',
      email,
      passwordHash,
      preferences: { ...initialPreferences, priorities: [...initialPreferences.priorities] },
    });
    assert.equal(duplicate, 'email-taken');

    const nextPreferences = {
      guidanceLevel: 'quick' as const,
      displayMode: 'standard' as const,
      language: 'en' as const,
      priorities: ['accountOverview', 'transfers'] as const,
    };
    const updated = await store.updatePreferences(created.id, {
      ...nextPreferences,
      priorities: [...nextPreferences.priorities],
    });
    assert.deepEqual(updated?.preferences, nextPreferences);

    const [account] = await store.getAccounts(created.id);
    assert.ok(account);
    assert.equal(account.balance, DEMO_STARTING_BALANCE);

    const recipient = await store.findRecipient('rcp-alex');
    assert.ok(recipient);
    assert.equal((await store.findRecipientByMobile(recipient.mobile))?.id, recipient.id);
    assert.ok((await store.listRecipients()).length >= 5);

    const requestId = `it-${suffix}`;
    const transfer = await store.applyTransfer({
      userId: created.id,
      requestId,
      recipient,
      amount: 1.23,
    });
    assert.equal(transfer.kind, 'confirmed');
    assert.equal(transfer.balance, DEMO_STARTING_BALANCE - 1.23);

    const repeated = await store.applyTransfer({
      userId: created.id,
      requestId,
      recipient,
      amount: 1.23,
    });
    assert.equal(repeated.kind, 'duplicate');
    assert.equal(repeated.balance, transfer.balance);

    const persistedTransfer = await store.findTransactionByRequestId(created.id, requestId);
    assert.equal(persistedTransfer?.reference, transfer.record.reference);
    assert.equal((await store.listTransactions(created.id)).length, 1);

    await store.close();
    store = new SupabaseStore(databaseUrl!);
    await store.init();

    const reloaded = await store.findUserByEmail(email);
    assert.equal(reloaded?.id, created.id);
    assert.deepEqual(reloaded?.preferences, nextPreferences);
    assert.equal((await store.getAccounts(created.id))[0]?.balance, transfer.balance);
    assert.equal((await store.listTransactions(created.id))[0]?.requestId, requestId);
  });
});
