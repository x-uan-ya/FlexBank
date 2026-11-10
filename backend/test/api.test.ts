import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createApi, type ApiResponse } from '../src/api';
import { hashPassword, signToken, verifyPassword, verifyToken } from '../src/auth';
import { loadConfig } from '../src/config';
import { DEMO_PASSWORD, DEMO_STARTING_BALANCE, MemoryStore } from '../src/store';
import { parseMobile } from '../src/validation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = Record<string, any>;
const body = (r: ApiResponse): Body => r.body as Body;

async function setup(opts: { demoKey?: string } = {}) {
  const env: Record<string, string> = { JWT_SECRET: 'test-secret-test-secret' };
  if (opts.demoKey) env.DEMO_KEY = opts.demoKey;
  const config = loadConfig(env as NodeJS.ProcessEnv);
  const store = new MemoryStore();
  await store.init();
  const api = createApi({ store, config });

  const call = (
    method: string,
    path: string,
    o: { body?: unknown; token?: string; query?: Record<string, string>; headers?: Record<string, string> } = {},
  ) =>
    api.handle({
      method,
      path,
      query: o.query ?? {},
      headers: { ...(o.token ? { authorization: `Bearer ${o.token}` } : {}), ...(o.headers ?? {}) },
      body: o.body,
    });

  const login = async (email = 'quick@demo.flexbank.test'): Promise<string> => {
    const r = await call('POST', '/api/auth/login', { body: { email, password: DEMO_PASSWORD } });
    assert.equal(r.status, 200);
    return body(r).token as string;
  };

  return { call, login, store, config };
}

const GOOD_PREFS = {
  guidanceLevel: 'guided',
  displayMode: 'largeText',
  language: 'ms',
  priorities: ['transfers', 'billPayments'],
};

describe('passwords and tokens', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('Demo1234!');
    assert.ok(!hash.includes('Demo1234!'));
    assert.equal(await verifyPassword('Demo1234!', hash), true);
    assert.equal(await verifyPassword('wrong', hash), false);
    assert.equal(await verifyPassword('x', 'not-a-hash'), false);
  });

  it('accepts a good token and rejects expired, tampered and wrong-secret tokens', () => {
    const secret = 'a-long-test-secret-value';
    const token = signToken('usr-1', secret, 60, 0);
    assert.equal(verifyToken(token, secret, 30_000), 'usr-1');
    assert.equal(verifyToken(token, secret, 61_000), null); // expired
    assert.equal(verifyToken(token, 'another-secret-value-x', 30_000), null);

    const [h, p, s] = token.split('.') as [string, string, string];
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 'usr-2', exp: 9_999_999_999 })).toString('base64url');
    assert.equal(verifyToken(`${h}.${forgedPayload}.${s}`, secret, 30_000), null);
    assert.equal(verifyToken('garbage', secret), null);

    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    assert.equal(verifyToken(`${noneHeader}.${p}.`, secret, 30_000), null);
  });
});

describe('mobile number parsing', () => {
  it('cleans valid numbers', () => {
    assert.deepEqual(parseMobile('9000 4821'), { ok: true, mobile: '90004821' });
    assert.deepEqual(parseMobile('+65 9000-4821'), { ok: true, mobile: '90004821' });
  });
  it('gives friendly errors for bad input', () => {
    assert.deepEqual(parseMobile(''), { ok: false, message: 'Enter a mobile number.' });
    assert.deepEqual(parseMobile(undefined), { ok: false, message: 'Enter a mobile number.' });
    assert.deepEqual(parseMobile('9000abcd'), { ok: false, message: 'Mobile numbers can only contain digits.' });
    const short = parseMobile('9000482');
    const wrongStart = parseMobile('70004821');
    assert.equal(short.ok, false);
    assert.equal(wrongStart.ok, false);
    if (!short.ok) assert.match(short.message, /8-digit Singapore mobile number/);
  });
});

describe('health, routing and auth guard', () => {
  it('health is public', async () => {
    const { call } = await setup();
    const r = await call('GET', '/api/health');
    assert.equal(r.status, 200);
    assert.equal(body(r).ok, true);
  });

  it('unknown path is 404 and wrong method is 405', async () => {
    const { call } = await setup();
    assert.equal((await call('GET', '/api/nope')).status, 404);
    assert.equal((await call('GET', '/api/auth/login')).status, 405);
  });

  it('protected routes need a valid token', async () => {
    const { call } = await setup();
    for (const [m, p] of [
      ['GET', '/api/me'],
      ['PUT', '/api/me/preferences'],
      ['GET', '/api/accounts'],
      ['GET', '/api/recipients'],
      ['GET', '/api/recipients/lookup'],
      ['POST', '/api/transfers/validate'],
      ['POST', '/api/transfers/confirm'],
      ['GET', '/api/transactions'],
    ] as const) {
      assert.equal((await call(m, p)).status, 401, `${m} ${p}`);
    }
    assert.equal((await call('GET', '/api/me', { token: 'not-a-token' })).status, 401);
  });
});

describe('registration with preferences chosen up front', () => {
  it('registers, returns a token, and keeps the chosen preferences', async () => {
    const { call } = await setup();
    const r = await call('POST', '/api/auth/register', {
      body: { name: 'Test User', email: 'Test.User@Example.com', password: 'Password123', preferences: GOOD_PREFS },
    });
    assert.equal(r.status, 201);
    assert.deepEqual(body(r).preferences, GOOD_PREFS);
    assert.equal(body(r).user.email, 'test.user@example.com');
    assert.equal(body(r).user.passwordHash, undefined);

    const me = await call('GET', '/api/me', { token: body(r).token });
    assert.equal(me.status, 200);
    assert.deepEqual(body(me).preferences, GOOD_PREFS);
  });

  it('rejects a duplicate email', async () => {
    const { call } = await setup();
    const r = await call('POST', '/api/auth/register', {
      body: { name: 'X', email: 'quick@demo.flexbank.test', password: 'Password123', preferences: GOOD_PREFS },
    });
    assert.equal(r.status, 409);
  });

  it('lists exactly what is wrong, including missing preferences', async () => {
    const { call } = await setup();
    const r = await call('POST', '/api/auth/register', {
      body: { name: '', email: 'nope', password: 'short', preferences: { guidanceLevel: 'whatever', priorities: [] } },
    });
    assert.equal(r.status, 400);
    const fields = body(r).error.fields as Record<string, string>;
    for (const key of [
      'name',
      'email',
      'password',
      'preferences.guidanceLevel',
      'preferences.displayMode',
      'preferences.language',
      'preferences.priorities',
    ]) {
      assert.ok(fields[key], `missing message for ${key}`);
    }
  });

  it('allows preferences to be changed later, and rejects bad ones', async () => {
    const { call, login } = await setup();
    const token = await login();
    const ok = await call('PUT', '/api/me/preferences', { token, body: GOOD_PREFS });
    assert.equal(ok.status, 200);
    assert.deepEqual(body(ok).preferences, GOOD_PREFS);
    const bad = await call('PUT', '/api/me/preferences', { token, body: { ...GOOD_PREFS, language: 'fr' } });
    assert.equal(bad.status, 400);
    const me = await call('GET', '/api/me', { token });
    assert.deepEqual(body(me).preferences, GOOD_PREFS);
  });
});

describe('login', () => {
  it('logs in each demo customer with their own preferences', async () => {
    const { call } = await setup();
    const r = await call('POST', '/api/auth/login', {
      body: { email: 'readable@demo.flexbank.test', password: DEMO_PASSWORD },
    });
    assert.equal(r.status, 200);
    assert.equal(body(r).preferences.displayMode, 'largeText');
    assert.equal(body(r).preferences.language, 'zh');
  });

  it('gives the same message for a wrong password and an unknown email', async () => {
    const { call } = await setup();
    const wrongPassword = await call('POST', '/api/auth/login', {
      body: { email: 'quick@demo.flexbank.test', password: 'nope' },
    });
    const unknownEmail = await call('POST', '/api/auth/login', {
      body: { email: 'nobody@example.com', password: 'nope' },
    });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.deepEqual(wrongPassword.body, unknownEmail.body);
  });

  it('slows down password guessing', async () => {
    const { call } = await setup();
    let last = 0;
    for (let i = 0; i < 11; i += 1) {
      last = (await call('POST', '/api/auth/login', { body: { email: 'quick@demo.flexbank.test', password: 'bad' } })).status;
    }
    assert.equal(last, 429);
  });
});

describe('recipients and mobile lookup', () => {
  it('lists recipients without their mobile numbers', async () => {
    const { call, login } = await setup();
    const r = await call('GET', '/api/recipients', { token: await login() });
    assert.equal(r.status, 200);
    assert.equal(body(r).recipients.length, 5);
    assert.equal(body(r).recipients[0].mobile, undefined);
  });

  it('finds a recipient by mobile number', async () => {
    const { call, login } = await setup();
    const r = await call('GET', '/api/recipients/lookup', { token: await login(), query: { mobile: '+65 9000-4821' } });
    assert.equal(r.status, 200);
    assert.equal(body(r).recipient.name, 'Alex Tan');
    assert.equal(body(r).recipient.mobile, undefined);
  });

  it('gives friendly errors for a wrong or unknown number', async () => {
    const { call, login } = await setup();
    const token = await login();
    const bad = await call('GET', '/api/recipients/lookup', { token, query: { mobile: '9000abcd' } });
    assert.equal(bad.status, 400);
    assert.equal(body(bad).error.message, 'Mobile numbers can only contain digits.');
    const unknown = await call('GET', '/api/recipients/lookup', { token, query: { mobile: '91234567' } });
    assert.equal(unknown.status, 404);
    assert.match(body(unknown).error.message, /couldn't find a PayNow account/);
  });
});

describe('transfer validation', () => {
  const check = async (payload: unknown) => {
    const { call, login } = await setup();
    const r = await call('POST', '/api/transfers/validate', { token: await login(), body: payload });
    assert.equal(r.status, 200);
    return body(r);
  };

  it('accepts a good transfer', async () => {
    const r = await check({ recipientId: 'rcp-alex', amount: 50 });
    assert.deepEqual(r, { valid: true, messages: [] });
  });

  it('explains each problem in friendly words', async () => {
    assert.deepEqual((await check({ amount: 50 })).messages, ['Choose who you want to pay.']);
    assert.deepEqual((await check({ recipientId: 'rcp-nobody', amount: 50 })).messages, [
      "We couldn't find this recipient. Please choose someone from your list.",
    ]);
    assert.deepEqual((await check({ recipientId: 'rcp-alex' })).messages, ['Enter an amount.']);
    assert.deepEqual((await check({ recipientId: 'rcp-alex', amount: '50' })).messages, ['Enter a valid amount.']);
    assert.deepEqual((await check({ recipientId: 'rcp-alex', amount: 0.5 })).messages, ['Enter at least S$1.00.']);
    assert.deepEqual((await check({ recipientId: 'rcp-alex', amount: 10.999 })).messages, [
      'Use at most 2 decimal places, for example 12.50.',
    ]);
    assert.ok((await check({ recipientId: 'rcp-alex', amount: 30000 })).messages.includes('For this demo the limit is S$25,000.'));
    assert.deepEqual((await check({ recipientId: 'rcp-alex', amount: 9000 })).messages, [
      'This is more than your available balance.',
    ]);
  });
});

describe('confirming a transfer', () => {
  it('sends money once, records it, and updates the balance', async () => {
    const { call, login } = await setup();
    const token = await login();
    const r = await call('POST', '/api/transfers/confirm', {
      token,
      body: { recipientId: 'rcp-alex', amount: 100, requestId: 'req-00000001' },
    });
    assert.equal(r.status, 200);
    assert.equal(body(r).status, 'confirmed');
    assert.match(body(r).reference as string, /^FB-\d{8}-0001$/);
    assert.equal(body(r).balance, 8320.55);
    assert.equal(body(r).recipient.name, 'Alex Tan');

    const accounts = await call('GET', '/api/accounts', { token });
    assert.equal(body(accounts).accounts[0].balance, 8320.55);
    const history = await call('GET', '/api/transactions', { token });
    assert.equal(body(history).transactions.length, 1);
  });

  it('a double press does not send twice', async () => {
    const { call, login } = await setup();
    const token = await login();
    const payload = { recipientId: 'rcp-alex', amount: 100, requestId: 'req-00000002' };
    const first = await call('POST', '/api/transfers/confirm', { token, body: payload });
    const second = await call('POST', '/api/transfers/confirm', { token, body: payload });
    assert.equal(second.status, 200);
    assert.equal(body(second).duplicate, true);
    assert.equal(body(second).reference, body(first).reference);
    assert.equal(body(second).balance, 8320.55);

    const different = await call('POST', '/api/transfers/confirm', {
      token,
      body: { ...payload, amount: 200 },
    });
    assert.equal(different.status, 409);

    const history = await call('GET', '/api/transactions', { token });
    assert.equal(body(history).transactions.length, 1);
  });

  it('S$13.13 simulates a failure: recorded, friendly reason, no money moves', async () => {
    const { call, login } = await setup();
    const token = await login();
    const r = await call('POST', '/api/transfers/confirm', {
      token,
      body: { recipientId: 'rcp-sarah', amount: 13.13, requestId: 'req-00000003' },
    });
    assert.equal(r.status, 200);
    assert.equal(body(r).status, 'failed');
    assert.match(body(r).reason as string, /No money was moved/);
    assert.equal(body(r).balance, DEMO_STARTING_BALANCE);

    const history = await call('GET', '/api/transactions', { token });
    assert.equal(body(history).transactions[0].status, 'failed');
  });

  it('refuses invalid transfers and a missing request id', async () => {
    const { call, login } = await setup();
    const token = await login();
    const noId = await call('POST', '/api/transfers/confirm', { token, body: { recipientId: 'rcp-alex', amount: 10 } });
    assert.equal(noId.status, 400);

    const tooMuch = await call('POST', '/api/transfers/confirm', {
      token,
      body: { recipientId: 'rcp-alex', amount: 9000, requestId: 'req-00000004' },
    });
    assert.equal(tooMuch.status, 422);
    assert.deepEqual(body(tooMuch).messages, ['This is more than your available balance.']);

    const noRecipient = await call('POST', '/api/transfers/confirm', {
      token,
      body: { amount: 10, requestId: 'req-00000005' },
    });
    assert.equal(noRecipient.status, 422);

    const history = await call('GET', '/api/transactions', { token });
    assert.equal(body(history).transactions.length, 0);
  });

  it('keeps each customer’s money and history separate', async () => {
    const { call, login } = await setup();
    const quick = await login('quick@demo.flexbank.test');
    const careful = await login('careful@demo.flexbank.test');
    await call('POST', '/api/transfers/confirm', {
      token: quick,
      body: { recipientId: 'rcp-alex', amount: 500, requestId: 'req-00000006' },
    });
    const other = await call('GET', '/api/accounts', { token: careful });
    assert.equal(body(other).accounts[0].balance, DEMO_STARTING_BALANCE);
    const otherHistory = await call('GET', '/api/transactions', { token: careful });
    assert.equal(body(otherHistory).transactions.length, 0);
  });
});

describe('demo reset', () => {
  it('is switched off unless DEMO_KEY is set', async () => {
    const { call } = await setup();
    assert.equal((await call('POST', '/api/demo/reset')).status, 404);
  });

  it('needs the right key', async () => {
    const { call } = await setup({ demoKey: 'my-demo-key' });
    assert.equal((await call('POST', '/api/demo/reset')).status, 403);
    assert.equal((await call('POST', '/api/demo/reset', { headers: { 'x-demo-key': 'wrong' } })).status, 403);
  });

  it('puts balances and history back and removes new registrations', async () => {
    const { call, login } = await setup({ demoKey: 'my-demo-key' });
    const token = await login();
    await call('POST', '/api/transfers/confirm', {
      token,
      body: { recipientId: 'rcp-alex', amount: 100, requestId: 'req-00000007' },
    });
    await call('POST', '/api/auth/register', {
      body: { name: 'New', email: 'new@example.com', password: 'Password123', preferences: GOOD_PREFS },
    });

    const reset = await call('POST', '/api/demo/reset', { headers: { 'x-demo-key': 'my-demo-key' } });
    assert.equal(reset.status, 200);

    const again = await login();
    assert.equal(body(await call('GET', '/api/accounts', { token: again })).accounts[0].balance, DEMO_STARTING_BALANCE);
    assert.equal(body(await call('GET', '/api/transactions', { token: again })).transactions.length, 0);
    const gone = await call('POST', '/api/auth/login', { body: { email: 'new@example.com', password: 'Password123' } });
    assert.equal(gone.status, 401);
  });
});
