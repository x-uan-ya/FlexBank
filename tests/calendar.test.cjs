const test = require('node:test');
const assert = require('node:assert/strict');
const { createTypeScriptLoader } = require('./helpers/load-ts.cjs');

const load = createTypeScriptLoader();
const cal = load('src/features/calendar/calendar.ts');
const server = load('backend/src/calendar.ts');

const ev = (over = {}, id = 'evt-1') => ({ id, title: 'Rent', kind: 'bill', amount: 1200, date: '2026-12-01', repeat: 'monthly', ...over });
const dates = (events, from, to) => cal.expandEvents(events, from, to).map(o => o.date);

test('dates: only real dates are accepted', () => {
  assert.deepEqual(cal.parseDate('2028-02-29'), { y: 2028, m: 2, d: 29 });
  for (const bad of ['2026-02-30', '2026-13-01', '2026-2-3', '1999-12-31', '2101-01-01', '', 'soon', 20261201, null]) {
    assert.equal(cal.parseDate(bad), undefined, String(bad));
  }
  assert.equal(cal.formatDate(cal.addDays({ y: 2026, m: 12, d: 28 }, 10)), '2027-01-07');
});

test('dates: readable labels', () => {
  assert.equal(cal.longDateLabel('2026-11-13'), 'Friday 13 November');
  assert.equal(cal.shortDateLabel('2026-11-13'), '13 Nov');
  assert.deepEqual(cal.monthRange(2028, 2), { from: '2028-02-01', to: '2028-02-29' });
  assert.deepEqual(cal.shiftMonth({ y: 2026, m: 12 }, 1), { y: 2027, m: 1 });
  assert.deepEqual(cal.shiftMonth({ y: 2026, m: 1 }, -1), { y: 2025, m: 12 });
});

test('month grid: Sunday-first weeks with blanks around the month', () => {
  const weeks = cal.buildMonthGrid(2026, 11); // 1 November 2026 is a Sunday
  assert.equal(weeks[0][0], '2026-11-01');
  assert.ok(weeks.every(week => week.length === 7));
  assert.equal(weeks.flat().filter(Boolean).length, 30);
  const feb = cal.buildMonthGrid(2026, 7); // 1 July 2026 is a Wednesday
  assert.deepEqual(feb[0].slice(0, 4), [null, null, null, '2026-07-01']);
  assert.equal(feb.flat().filter(Boolean).length, 31);
});

test('repeating events: once, weekly and monthly, including month ends and the first date', () => {
  assert.deepEqual(dates([ev({ repeat: 'none', date: '2026-11-15' })], '2026-11-01', '2026-11-30'), ['2026-11-15']);
  assert.deepEqual(dates([ev({ repeat: 'none', date: '2026-11-15' })], '2026-11-16', '2026-11-30'), []);
  assert.deepEqual(dates([ev({ repeat: 'weekly', date: '2026-10-01' })], '2026-11-01', '2026-11-30'),
    ['2026-11-05', '2026-11-12', '2026-11-19', '2026-11-26']);
  assert.deepEqual(dates([ev({ date: '2026-11-15' })], '2026-10-01', '2026-10-31'), []);
  assert.deepEqual(dates([ev({ date: '2026-01-31' })], '2026-02-01', '2026-04-30'), ['2026-02-28', '2026-03-31', '2026-04-30']);
  assert.deepEqual(dates([ev({ date: '2028-01-29' })], '2028-02-01', '2028-02-29'), ['2028-02-29']);
  assert.deepEqual(dates([ev({ date: '2026-12-31' })], '2027-01-01', '2027-02-28'), ['2027-01-31', '2027-02-28']);
});

test('summary adds up bills, income and savings, and ignores events with no amount', () => {
  const list = cal.expandEvents([
    ev({ title: 'Salary', kind: 'income', amount: 3200, repeat: 'none', date: '2026-11-25' }, 'a'),
    ev({ title: 'Phone', kind: 'bill', amount: 38.9, repeat: 'none', date: '2026-11-12' }, 'b'),
    ev({ title: 'Card', kind: 'bill', amount: 250, repeat: 'none', date: '2026-11-20' }, 'c'),
    ev({ title: 'Top-up', kind: 'savings', amount: 200, repeat: 'none', date: '2026-11-01' }, 'd'),
    { id: 'e', title: 'Renew', kind: 'reminder', date: '2026-11-22', repeat: 'none' },
  ], '2026-11-01', '2026-11-30');
  assert.deepEqual(cal.summarise(list), { billsTotal: 288.9, incomeTotal: 3200, savingsTotal: 200, leftover: 2711.1, count: 5 });
});

test('the app and the backend expand events identically', () => {
  const starts = ['2026-01-29', '2026-01-30', '2026-01-31', '2026-02-28', '2026-03-15', '2026-10-31', '2026-12-31', '2028-02-29', '2025-11-14'];
  const ranges = [['2026-02-01', '2026-03-31'], ['2026-11-01', '2026-11-30'], ['2026-12-01', '2027-01-31'], ['2028-02-01', '2028-03-31'], ['2027-02-14', '2027-02-14']];
  let compared = 0;
  for (const date of starts) {
    for (const repeat of ['none', 'weekly', 'monthly']) {
      for (const [from, to] of ranges) {
        const event = { id: 'evt-x', title: 'T', kind: 'bill', amount: 10.5, date, repeat, note: 'n' };
        assert.deepEqual(cal.expandEvents([event], from, to), server.expandEvents([event], from, to), `${repeat} from ${date} in ${from}..${to}`);
        compared += 1;
      }
    }
  }
  assert.ok(compared > 100);
  const sample = cal.sampleEvents({ y: 2026, m: 11, d: 13 });
  const backendSample = server.demoEvents(new Date('2026-11-13T04:00:00Z'));
  assert.deepEqual(sample.map(({ id, ...rest }) => rest), backendSample);
});

test('the form: a good draft is accepted and tidied', () => {
  const result = cal.validateEventDraft({ title: '  Phone bill ', kind: 'bill', amountText: ' S$1,200.50 ', date: '2026-12-05', repeat: 'monthly', note: '  early ' });
  assert.deepEqual(result, { ok: true, value: { title: 'Phone bill', kind: 'bill', amount: 1200.5, date: '2026-12-05', repeat: 'monthly', note: 'early' } });
  const bare = cal.validateEventDraft({ title: 'Renew', kind: 'reminder', amountText: '', date: '2026-12-05', repeat: 'none', note: '' });
  assert.equal(bare.ok, true);
  assert.equal('amount' in bare.value, false);
  assert.equal('note' in bare.value, false);
});

test('the form: every problem gets a friendly message', () => {
  const bad = cal.validateEventDraft({ title: '   ', kind: null, amountText: 'ten', date: '2026-02-30', repeat: 'none', note: 'x'.repeat(201) });
  assert.equal(bad.ok, false);
  assert.deepEqual(Object.keys(bad.errors).sort(), ['amount', 'date', 'kind', 'note', 'title']);
  Object.values(bad.errors).forEach(message => assert.ok(message.endsWith('.') && !/undefined|NaN|Error/.test(message), message));
  for (const amountText of ['0', '-5', '12.345', '1000001']) {
    const result = cal.validateEventDraft({ title: 'x', kind: 'bill', amountText, date: '2026-12-05', repeat: 'none', note: '' });
    assert.equal(result.ok, false, amountText);
  }
});

test('the form accepts what the backend accepts, and refuses what it refuses', () => {
  const cases = [
    { title: 'Rent', kind: 'bill', amount: '1200', date: '2026-12-01', repeat: 'monthly' },
    { title: '', kind: 'bill', amount: '1200', date: '2026-12-01', repeat: 'none' },
    { title: 'Gift', kind: 'income', amount: '-5', date: '2026-12-01', repeat: 'none' },
    { title: 'x', kind: 'savings', amount: '12.345', date: '2026-12-01', repeat: 'none' },
    { title: 'x', kind: 'reminder', amount: '', date: '2026-02-30', repeat: 'none' },
    { title: 'x', kind: 'reminder', amount: '', date: '2026-12-01', repeat: 'weekly' },
  ];
  for (const c of cases) {
    const app = cal.validateEventDraft({ title: c.title, kind: c.kind, amountText: c.amount, date: c.date, repeat: c.repeat, note: '' });
    const api = server.readEventInput({ title: c.title, kind: c.kind, amount: c.amount === '' ? undefined : Number(c.amount), date: c.date, repeat: c.repeat });
    assert.equal(app.ok, api.ok, JSON.stringify(c));
    if (app.ok) assert.deepEqual(app.value, api.value);
  }
});

test('sample events are dated around today so the calendar is never empty', () => {
  const sample = cal.sampleEvents({ y: 2026, m: 1, d: 15 });
  assert.equal(sample.length, 5);
  assert.equal(sample.find(e => e.id === 'sample-salary').date, '2025-12-25');
  assert.equal(new Set(sample.map(e => e.id)).size, 5);
  const month = cal.expandEvents(cal.sampleEvents({ y: 2026, m: 11, d: 13 }), '2026-11-01', '2026-11-30');
  assert.deepEqual(cal.summarise(month).billsTotal, 288.9);
});

test('new event ids look like the backend ids and do not repeat', () => {
  const made = new Set(Array.from({ length: 50 }, () => cal.newEventId()));
  assert.equal(made.size, 50);
  for (const id of made) assert.match(id, /^evt-[0-9a-z]+$/);
});
