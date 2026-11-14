import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createApi, type ApiResponse } from '../src/api';
import {
  MAX_EVENTS_PER_USER,
  addDays,
  demoEvents,
  expandEvents,
  formatDate,
  parseDate,
  readEventInput,
  readRange,
  summarise,
  todayAsDate,
  type EventInput,
} from '../src/calendar';
import { loadConfig } from '../src/config';
import { MemoryFeatureStore } from '../src/featureStore';
import {
  MAX_QUICK_ACTIONS,
  QUICK_ACTION_CATALOGUE,
  defaultQuickActionIds,
  readQuickActionIds,
} from '../src/quickActions';
import { DEMO_PASSWORD, MemoryStore } from '../src/store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = Record<string, any>;
const body = (r: ApiResponse): Body => r.body as Body;

async function setup(opts: { demoKey?: string } = {}) {
  const env: Record<string, string> = { JWT_SECRET: 'test-secret-test-secret' };
  if (opts.demoKey) env.DEMO_KEY = opts.demoKey;
  const config = loadConfig(env as NodeJS.ProcessEnv);
  const store = new MemoryStore();
  await store.init();
  const features = new MemoryFeatureStore();
  const api = createApi({ store, config, features });

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

  const register = async (priorities: string[] = ['billPayments'], email = 'new.person@example.test'): Promise<string> => {
    const r = await call('POST', '/api/auth/register', {
      body: {
        name: 'New Person',
        email,
        password: 'a-long-password',
        preferences: { guidanceLevel: 'balanced', displayMode: 'standard', language: 'en', priorities },
      },
    });
    assert.equal(r.status, 201);
    return body(r).token as string;
  };

  return { call, login, register };
}

/** The first and last day of the current month, the same way the server works out "today". */
function thisMonth(): { from: string; to: string } {
  const today = todayAsDate();
  const last = new Date(Date.UTC(today.y, today.m, 0)).getUTCDate();
  return { from: formatDate({ ...today, d: 1 }), to: formatDate({ ...today, d: last }) };
}

const validEvent: EventInput = { title: 'Rent', kind: 'bill', amount: 1200, date: '2026-12-01', repeat: 'monthly' };

describe('dates', () => {
  it('accepts real dates and rejects impossible or badly written ones', () => {
    assert.deepEqual(parseDate('2028-02-29'), { y: 2028, m: 2, d: 29 }); // leap day
    for (const bad of ['2026-02-30', '2026-13-01', '2026-2-3', '1999-12-31', '2101-01-01', '', 'tomorrow', 20261201, null]) {
      assert.equal(parseDate(bad), undefined, String(bad));
    }
  });

  it('adds days across month and year ends', () => {
    assert.equal(formatDate(addDays({ y: 2026, m: 12, d: 28 }, 10)), '2027-01-07');
    assert.equal(formatDate(addDays({ y: 2028, m: 2, d: 28 }, 1)), '2028-02-29');
  });

  it('accepts a range of up to about two months and rejects the rest', () => {
    assert.deepEqual(readRange('2026-12-01', '2027-01-31'), { ok: true, from: '2026-12-01', to: '2027-01-31' }); // 62 days
    for (const [from, to] of [
      [undefined, '2026-12-31'],
      ['2026-12-01', undefined],
      ['2026-12-31', '2026-12-01'],
      ['2026-12-01', '2027-02-01'], // 63 days
      ['not a date', '2026-12-31'],
    ] as const) {
      assert.equal(readRange(from, to).ok, false, `${from} to ${to}`);
    }
  });
});

describe('repeating events', () => {
  const ev = (over: Partial<EventInput>, id = 'evt-1'): EventInput & { id: string } => ({
    ...validEvent,
    ...over,
    id,
  });
  const dates = (events: Array<EventInput & { id: string }>, from: string, to: string): string[] =>
    expandEvents(events, from, to).map((o) => o.date);

  it('shows a one-off event only on its own date', () => {
    const one = [ev({ repeat: 'none', date: '2026-11-15' })];
    assert.deepEqual(dates(one, '2026-11-01', '2026-11-30'), ['2026-11-15']);
    assert.deepEqual(dates(one, '2026-11-16', '2026-11-30'), []);
    assert.deepEqual(dates(one, '2026-11-15', '2026-11-15'), ['2026-11-15']); // both ends are included
  });

  it('repeats weekly, including when the event started before the range', () => {
    assert.deepEqual(dates([ev({ repeat: 'weekly', date: '2026-11-02' })], '2026-11-01', '2026-11-30'), [
      '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30',
    ]);
    assert.deepEqual(dates([ev({ repeat: 'weekly', date: '2026-10-01' })], '2026-11-01', '2026-11-30'), [
      '2026-11-05', '2026-11-12', '2026-11-19', '2026-11-26',
    ]);
  });

  it('repeats monthly on the same day, and never before the first date', () => {
    const monthly = [ev({ repeat: 'monthly', date: '2026-11-15' })];
    assert.deepEqual(dates(monthly, '2026-11-01', '2026-12-31'), ['2026-11-15', '2026-12-15']);
    assert.deepEqual(dates(monthly, '2026-10-01', '2026-10-31'), []);
    assert.deepEqual(dates(monthly, '2026-11-16', '2026-11-30'), []);
  });

  it('moves a 29th, 30th or 31st to the last day of a shorter month', () => {
    const on31 = [ev({ repeat: 'monthly', date: '2026-01-31' })];
    assert.deepEqual(dates(on31, '2026-02-01', '2026-04-30'), ['2026-02-28', '2026-03-31', '2026-04-30']);
    const on29 = [ev({ repeat: 'monthly', date: '2028-01-29' })];
    assert.deepEqual(dates(on29, '2028-02-01', '2028-02-29'), ['2028-02-29']); // leap year
    assert.deepEqual(dates(on29, '2027-02-01', '2027-02-28'), []); // before it started
    assert.deepEqual(dates([ev({ repeat: 'monthly', date: '2026-12-31' })], '2027-01-01', '2027-02-28'), [
      '2027-01-31', '2027-02-28',
    ]);
  });

  it('sorts by date, then by name, and keeps the first date for editing', () => {
    const list = expandEvents(
      [
        ev({ title: 'B', repeat: 'none', date: '2026-11-10' }, 'evt-b'),
        ev({ title: 'A', repeat: 'none', date: '2026-11-10' }, 'evt-a'),
        ev({ title: 'C', repeat: 'monthly', date: '2026-10-05' }, 'evt-c'),
      ],
      '2026-11-01',
      '2026-11-30',
    );
    assert.deepEqual(list.map((o) => o.title), ['C', 'A', 'B']);
    assert.equal(list[0]?.startDate, '2026-10-05');
    assert.equal(list[0]?.date, '2026-11-05');
    assert.equal(list[0]?.eventId, 'evt-c');
  });

  it('adds up bills, income and savings, and ignores events with no amount', () => {
    const summary = summarise(
      expandEvents(
        [
          ev({ title: 'Salary', kind: 'income', amount: 3200, repeat: 'none', date: '2026-11-25' }, 'e1'),
          ev({ title: 'Phone', kind: 'bill', amount: 38.9, repeat: 'none', date: '2026-11-12' }, 'e2'),
          ev({ title: 'Card', kind: 'bill', amount: 250, repeat: 'none', date: '2026-11-20' }, 'e3'),
          ev({ title: 'Top-up', kind: 'savings', amount: 200, repeat: 'none', date: '2026-11-01' }, 'e4'),
          { title: 'Renew', kind: 'reminder', date: '2026-11-22', repeat: 'none', id: 'e5' },
        ],
        '2026-11-01',
        '2026-11-30',
      ),
    );
    assert.deepEqual(summary, {
      currency: 'SGD',
      billsTotal: 288.9,
      incomeTotal: 3200,
      savingsTotal: 200,
      leftover: 2711.1,
      count: 5,
    });
  });
});

describe('checking what the customer typed', () => {
  it('accepts a good event and tidies it up', () => {
    const r = readEventInput({ title: '  Rent ', kind: 'bill', amount: 1200.5, date: '2026-12-01', note: '  due early  ' });
    assert.deepEqual(r, {
      ok: true,
      value: { title: 'Rent', kind: 'bill', amount: 1200.5, date: '2026-12-01', repeat: 'none', note: 'due early' },
    });
  });

  it('lets the amount and note be left out', () => {
    for (const amount of [undefined, null, '']) {
      const r = readEventInput({ title: 'Renew passport', kind: 'reminder', date: '2026-12-01', amount, note: '' });
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.equal('amount' in r.value, false);
        assert.equal('note' in r.value, false);
      }
    }
  });

  it('explains each problem in friendly words', () => {
    const r = readEventInput({
      title: '',
      kind: 'gift',
      amount: -5,
      date: '2026-02-30',
      repeat: 'daily',
      note: 'x'.repeat(201),
    });
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.deepEqual(Object.keys(r.fields).sort(), ['amount', 'date', 'kind', 'note', 'repeat', 'title']);
      for (const message of Object.values(r.fields)) {
        assert.ok(message.endsWith('.') || message.endsWith('?'), message);
        assert.ok(!/undefined|NaN|Error/.test(message), message);
      }
    }
    for (const amount of [0, 12.345, 1_000_001, 'ten', Number.NaN, Number.POSITIVE_INFINITY]) {
      const bad = readEventInput({ ...validEvent, amount });
      assert.equal(bad.ok, false, String(amount));
    }
  });
});

describe('demo events', () => {
  it('are dated around today so the calendar is never empty', () => {
    const events = demoEvents(new Date('2026-11-13T04:00:00Z'));
    assert.equal(events.length, 5);
    assert.deepEqual(events.find((e) => e.title === 'Salary'), {
      title: 'Salary', kind: 'income', amount: 3200, date: '2026-10-25', repeat: 'monthly', note: 'Sample entry for the demo.',
    });
    assert.equal(events.find((e) => e.title === 'Car insurance renewal')?.date, '2026-11-23');
    for (const e of events) assert.equal(readEventInput(e).ok, true, e.title);
  });

  it('start in December of the year before when today is in January', () => {
    const salary = demoEvents(new Date('2026-01-15T04:00:00Z')).find((e) => e.title === 'Salary');
    assert.equal(salary?.date, '2025-12-25');
  });
});

describe('quick action choices', () => {
  it('builds the starting shortcuts from the priorities the customer chose, in their order', () => {
    assert.deepEqual(defaultQuickActionIds(['transfers']), ['paynow', 'scan', 'bills']);
    assert.deepEqual(defaultQuickActionIds(['transfers', 'accountOverview']), ['paynow', 'scan', 'calendar']);
    assert.deepEqual(defaultQuickActionIds(['accountOverview', 'billPayments']), ['calendar', 'plan', 'bills']);
    assert.deepEqual(defaultQuickActionIds(['billPayments']), ['bills', 'calendar', 'paynow']);
    assert.deepEqual(defaultQuickActionIds([]), ['paynow', 'scan', 'bills']);
  });

  it('only offers shortcuts that open screens', () => {
    assert.ok(QUICK_ACTION_CATALOGUE.length >= MAX_QUICK_ACTIONS);
    assert.equal(new Set(QUICK_ACTION_CATALOGUE.map((a) => a.id)).size, QUICK_ACTION_CATALOGUE.length);
    for (const action of QUICK_ACTION_CATALOGUE) {
      assert.match(action.route, /^\/[a-z-]+$/, action.id);
    }
  });

  it('accepts a good list and gives a friendly reason for a bad one', () => {
    assert.deepEqual(readQuickActionIds(['calendar', 'paynow']), { ok: true, ids: ['calendar', 'paynow'] });
    for (const bad of [
      undefined, 'paynow', [], ['paynow', 'paynow'], ['nope'], [1], ['paynow', 'scan', 'bills', 'calendar', 'plan'],
    ]) {
      const r = readQuickActionIds(bad);
      assert.equal(r.ok, false, JSON.stringify(bad));
      if (!r.ok) assert.ok(r.message.endsWith('.'));
    }
  });
});

describe('quick actions API', () => {
  it('needs a login', async () => {
    const { call } = await setup();
    for (const method of ['GET', 'PUT', 'DELETE']) {
      assert.equal((await call(method, '/api/quick-actions')).status, 401, method);
    }
  });

  it('starts from the priorities chosen at registration', async () => {
    const { call, login, register } = await setup();
    const quick = body(await call('GET', '/api/quick-actions', { token: await login('quick@demo.flexbank.test') }));
    assert.deepEqual(quick.selected, ['paynow', 'scan', 'bills']);
    assert.equal(quick.isDefault, true);
    assert.equal(quick.max, MAX_QUICK_ACTIONS);
    assert.equal(quick.catalogue.length, QUICK_ACTION_CATALOGUE.length);

    const readable = body(await call('GET', '/api/quick-actions', { token: await login('readable@demo.flexbank.test') }));
    assert.deepEqual(readable.selected, ['calendar', 'plan', 'bills']);

    const fresh = body(await call('GET', '/api/quick-actions', { token: await register(['billPayments']) }));
    assert.deepEqual(fresh.selected, ['bills', 'calendar', 'paynow']);
  });

  it('keeps the customer’s own choice and order, only for them', async () => {
    const { call, login } = await setup();
    const alex = await login('quick@demo.flexbank.test');
    const sam = await login('careful@demo.flexbank.test');

    const put = await call('PUT', '/api/quick-actions', { token: alex, body: { actionIds: ['calendar', 'paynow'] } });
    assert.equal(put.status, 200);
    assert.deepEqual(body(put).selected, ['calendar', 'paynow']);
    assert.equal(body(put).isDefault, false);

    assert.deepEqual(body(await call('GET', '/api/quick-actions', { token: alex })).selected, ['calendar', 'paynow']);
    const other = body(await call('GET', '/api/quick-actions', { token: sam }));
    assert.deepEqual(other.selected, ['paynow', 'scan', 'calendar']);
    assert.equal(other.isDefault, true);
  });

  it('refuses a bad list and leaves the saved one alone', async () => {
    const { call, login } = await setup();
    const token = await login();
    await call('PUT', '/api/quick-actions', { token, body: { actionIds: ['bills'] } });
    for (const actionIds of [[], ['paynow', 'paynow'], ['hack'], 'paynow', ['paynow', 'scan', 'bills', 'calendar', 'plan']]) {
      const r = await call('PUT', '/api/quick-actions', { token, body: { actionIds } });
      assert.equal(r.status, 400, JSON.stringify(actionIds));
      assert.ok(typeof body(r).error.message === 'string');
    }
    assert.equal((await call('PUT', '/api/quick-actions', { token, body: 'nonsense' })).status, 400);
    assert.deepEqual(body(await call('GET', '/api/quick-actions', { token })).selected, ['bills']);
  });

  it('goes back to the defaults when reset', async () => {
    const { call, login } = await setup();
    const token = await login();
    await call('PUT', '/api/quick-actions', { token, body: { actionIds: ['help'] } });
    const r = await call('DELETE', '/api/quick-actions', { token });
    assert.equal(r.status, 200);
    assert.deepEqual(body(r).selected, ['paynow', 'scan', 'bills']);
    assert.equal(body(r).isDefault, true);
  });
});

describe('calendar API', () => {
  it('needs a login and a sensible date range', async () => {
    const { call, login } = await setup();
    assert.equal((await call('GET', '/api/calendar', { query: { from: '2026-12-01', to: '2026-12-31' } })).status, 401);
    const token = await login();
    const badQueries: Array<Record<string, string>> = [
      {},
      { from: '2026-12-01' },
      { from: '2026-12-31', to: '2026-12-01' },
      { from: '2026-12-01', to: '2027-03-01' },
      { from: 'x', to: 'y' },
    ];
    for (const query of badQueries) {
      const r = await call('GET', '/api/calendar', { token, query });
      assert.equal(r.status, 400, JSON.stringify(query));
      assert.ok(typeof body(r).error.message === 'string');
    }
  });

  it('gives the demo customers example events and this month’s totals', async () => {
    const { call, login } = await setup();
    const token = await login();
    const r = await call('GET', '/api/calendar', { token, query: thisMonth() });
    assert.equal(r.status, 200);
    const titles = (body(r).occurrences as Array<{ title: string }>).map((o) => o.title);
    for (const title of ['Salary', 'Phone bill', 'Credit card payment', 'Savings top-up']) {
      assert.ok(titles.includes(title), title);
    }
    assert.deepEqual(body(r).summary, {
      currency: 'SGD', billsTotal: 288.9, incomeTotal: 3200, savingsTotal: 200, leftover: 2711.1,
      count: body(r).summary.count,
    });
    // The same calendar for the next month still has the monthly events.
    const next = await call('GET', '/api/calendar', { token, query: { from: '2027-03-01', to: '2027-03-31' } });
    assert.equal(body(next).summary.billsTotal, 288.9);
  });

  it('gives a new customer an empty calendar of their own', async () => {
    const { call, login, register } = await setup();
    const fresh = await register();
    const r = await call('GET', '/api/calendar', { token: fresh, query: thisMonth() });
    assert.deepEqual(body(r).occurrences, []);
    assert.equal(body(r).summary.count, 0);
    // ...and the demo customers' events are not visible to them.
    await call('GET', '/api/calendar', { token: await login(), query: thisMonth() });
    assert.deepEqual(body(await call('GET', '/api/calendar', { token: fresh, query: thisMonth() })).occurrences, []);
  });

  it('adds, shows, changes and removes an event', async () => {
    const { call, register } = await setup();
    const token = await register();
    const query = { from: '2026-12-01', to: '2026-12-31' };

    const created = await call('POST', '/api/calendar/events', {
      token,
      body: { title: 'Rent', kind: 'bill', amount: 1200, date: '2026-12-01', repeat: 'monthly', note: 'Pay by the 3rd' },
    });
    assert.equal(created.status, 201);
    const id = body(created).event.id as string;
    assert.match(id, /^evt-[0-9a-f]{8}$/);
    assert.equal(body(created).event.userId, undefined); // never sent to the app

    let month = body(await call('GET', '/api/calendar', { token, query }));
    assert.equal(month.occurrences.length, 1);
    assert.equal(month.occurrences[0].eventId, id);
    assert.equal(month.summary.billsTotal, 1200);

    const changed = await call('PUT', `/api/calendar/events/${id}`, {
      token,
      body: { title: 'Rent (new)', kind: 'bill', date: '2026-12-05', repeat: 'none' },
    });
    assert.equal(changed.status, 200);
    assert.equal(body(changed).event.amount, undefined); // the amount was removed
    assert.equal(body(changed).event.note, undefined);

    month = body(await call('GET', '/api/calendar', { token, query }));
    assert.deepEqual(month.occurrences.map((o: Body) => [o.title, o.date]), [['Rent (new)', '2026-12-05']]);
    assert.equal(month.summary.billsTotal, 0);
    const january = body(await call('GET', '/api/calendar', { token, query: { from: '2027-01-01', to: '2027-01-31' } }));
    assert.equal(january.occurrences.length, 0); // no longer repeats

    assert.equal((await call('DELETE', `/api/calendar/events/${id}`, { token })).status, 200);
    assert.equal((await call('DELETE', `/api/calendar/events/${id}`, { token })).status, 404);
    assert.equal(body(await call('GET', '/api/calendar', { token, query })).occurrences.length, 0);
  });

  it('refuses a bad event with a message for each field', async () => {
    const { call, register } = await setup();
    const token = await register();
    const r = await call('POST', '/api/calendar/events', {
      token,
      body: { title: '', kind: 'gift', amount: -1, date: 'soon', repeat: 'daily' },
    });
    assert.equal(r.status, 400);
    assert.deepEqual(Object.keys(body(r).error.fields).sort(), ['amount', 'date', 'kind', 'repeat', 'title']);
    assert.equal((await call('POST', '/api/calendar/events', { token, body: 'junk' })).status, 400);
  });

  it('never lets one customer see or change another customer’s event', async () => {
    const { call, register } = await setup();
    const a = await register(['transfers'], 'a@example.test');
    const b = await register(['transfers'], 'b@example.test');
    const created = await call('POST', '/api/calendar/events', { token: a, body: validEvent });
    const id = body(created).event.id as string;

    assert.equal((await call('PUT', `/api/calendar/events/${id}`, { token: b, body: validEvent })).status, 404);
    assert.equal((await call('DELETE', `/api/calendar/events/${id}`, { token: b })).status, 404);
    const query = { from: '2026-12-01', to: '2026-12-31' };
    assert.equal(body(await call('GET', '/api/calendar', { token: b, query })).occurrences.length, 0);
    assert.equal(body(await call('GET', '/api/calendar', { token: a, query })).occurrences.length, 1); // untouched
    assert.equal((await call('PUT', '/api/calendar/events/evt-00000000', { token: a, body: validEvent })).status, 404);
  });

  it('does not bring a deleted example event back', async () => {
    const { call, login } = await setup();
    const token = await login();
    const month = thisMonth();
    const first = body(await call('GET', '/api/calendar', { token, query: month }));
    const phone = first.occurrences.find((o: Body) => o.title === 'Phone bill');
    await call('DELETE', `/api/calendar/events/${phone.eventId}`, { token });
    const again = body(await call('GET', '/api/calendar', { token, query: month }));
    assert.ok(!again.occurrences.some((o: Body) => o.title === 'Phone bill'));
  });

  it('stops at the event limit with a friendly message', async () => {
    const { call, register } = await setup();
    const token = await register();
    for (let i = 0; i < MAX_EVENTS_PER_USER; i += 1) {
      const r = await call('POST', '/api/calendar/events', { token, body: { ...validEvent, title: `Event ${i}` } });
      assert.equal(r.status, 201);
    }
    const over = await call('POST', '/api/calendar/events', { token, body: validEvent });
    assert.equal(over.status, 409);
    assert.match(body(over).error.message, /limit/);
  });

  it('answers wrong methods and unknown paths clearly', async () => {
    const { call, login } = await setup();
    const token = await login();
    assert.equal((await call('PATCH', '/api/calendar/events/evt-1', { token })).status, 405);
    assert.equal((await call('GET', '/api/calendar/events', { token })).status, 405);
    assert.equal((await call('GET', '/api/calendar/events/a/b', { token })).status, 404);
    assert.equal((await call('DELETE', '/api/calendar/events/%E0%A4%A', { token })).status, 404); // bad escape
    assert.equal((await call('DELETE', '/api/calendar/events/', { token })).status, 405); // trailing slash is ignored
  });
});

describe('demo reset', () => {
  it('puts quick actions and calendars back to the start', async () => {
    const { call, login } = await setup({ demoKey: 'secret-demo-key' });
    const token = await login();
    await call('PUT', '/api/quick-actions', { token, body: { actionIds: ['help'] } });
    const created = await call('POST', '/api/calendar/events', { token, body: validEvent });
    assert.equal(created.status, 201);

    const reset = await call('POST', '/api/demo/reset', { headers: { 'x-demo-key': 'secret-demo-key' } });
    assert.equal(reset.status, 200);

    const token2 = await login(); // reset also clears every login's data, so log in again
    assert.deepEqual(body(await call('GET', '/api/quick-actions', { token: token2 })).selected, ['paynow', 'scan', 'bills']);
    const month = body(await call('GET', '/api/calendar', { token: token2, query: thisMonth() }));
    assert.ok(!month.occurrences.some((o: Body) => o.title === 'Rent'));
    assert.ok(month.occurrences.some((o: Body) => o.title === 'Salary')); // example events are back
  });
});
