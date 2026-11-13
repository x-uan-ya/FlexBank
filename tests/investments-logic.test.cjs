const test = require('node:test');
const assert = require('node:assert/strict');
const { createTypeScriptLoader } = require('./helpers/load-ts.cjs');

/**
 * Pure investment-logic tests: maturity value, coupon amounts/schedule,
 * timeline building, reminder windows, validation. No React, no storage.
 */
const load = createTypeScriptLoader();
const {
  fixedDepositMaturityValue,
  bondCouponAmount,
  bondCouponDates,
  buildTimeline,
  upcomingEvents,
  dueReminders,
  daysUntil,
  statusOf,
  validateInvestmentForm,
} = load('src/features/investments/logic.ts');

const fd = (over = {}) => ({
  id: 'fd1', kind: 'fixedDeposit', name: 'FD A', principal: 10000, rate: 2.5,
  startDate: '2026-09-15', maturityDate: '2027-09-15', createdAt: '', ...over,
});
const bond = (over = {}) => ({
  id: 'b1', kind: 'bond', name: 'Bond B', principal: 5000, faceValue: 5000, rate: 3.2,
  couponFrequency: 'semiAnnual', startDate: '2026-05-28', maturityDate: '2028-11-28',
  createdAt: '', ...over,
});

test('fixed deposit simple-interest maturity value (1 year, 2.5%)', () => {
  // 10000 + 10000*0.025*1 ≈ 10250 (approx; year fraction ~1.0)
  const v = fixedDepositMaturityValue(fd());
  assert.ok(Math.abs(v - 10250) < 2, `got ${v}`);
});

test('bond coupon amount = face * rate / couponsPerYear', () => {
  // 5000 * 3.2% / 2 = 80
  assert.equal(bondCouponAmount(bond()), 80);
});

test('bond coupon dates step by frequency up to (not past) maturity', () => {
  const dates = bondCouponDates(bond());
  assert.ok(dates.length >= 4, `expected several semi-annual coupons, got ${dates.length}`);
  // all strictly before or equal to maturity, ascending
  for (let i = 1; i < dates.length; i++) {
    assert.ok(Date.parse(dates[i]) > Date.parse(dates[i - 1]));
  }
  assert.ok(Date.parse(dates[dates.length - 1]) <= Date.parse('2028-11-28'));
});

test('buildTimeline: FD yields one maturity event', () => {
  const events = buildTimeline([fd()]);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'maturity');
  assert.equal(events[0].kind, 'fixedDeposit');
});

test('buildTimeline: bond yields coupon events plus one maturity, sorted', () => {
  const events = buildTimeline([bond()]);
  const maturities = events.filter((e) => e.type === 'maturity');
  const coupons = events.filter((e) => e.type === 'coupon');
  assert.equal(maturities.length, 1);
  assert.ok(coupons.length >= 4);
  for (let i = 1; i < events.length; i++) {
    assert.ok(Date.parse(events[i].date) >= Date.parse(events[i - 1].date));
  }
});

test('upcomingEvents excludes past dates relative to a fixed now', () => {
  const now = new Date('2027-01-01T00:00:00.000Z');
  const all = buildTimeline([bond()], now);
  const up = upcomingEvents([bond()], now);
  assert.ok(up.length < all.length); // some coupons are before 2027
  assert.ok(up.every((e) => Date.parse(e.date) >= Date.parse('2026-12-31')));
});

test('dueReminders returns only events within the day window', () => {
  const now = new Date('2026-12-10T00:00:00.000Z');
  // FD matures 2026-12-15 → 5 days away; window 7 should include it.
  const fdSoon = fd({ maturityDate: '2026-12-15', startDate: '2026-09-15' });
  const due = dueReminders([fdSoon], { daysBefore: 7 }, now);
  assert.equal(due.length, 1);
  const none = dueReminders([fdSoon], { daysBefore: 3 }, now);
  assert.equal(none.length, 0);
});

test('daysUntil and statusOf', () => {
  const now = new Date('2026-12-10T00:00:00.000Z');
  assert.equal(daysUntil('2026-12-15', now), 5);
  assert.equal(statusOf(fd({ maturityDate: '2026-01-01' }), now), 'matured');
  assert.equal(statusOf(fd({ maturityDate: '2030-01-01' }), now), 'active');
});

test('validateInvestmentForm catches bad inputs and passes a good FD', () => {
  const bad = validateInvestmentForm({
    kind: 'fixedDeposit', name: '', principal: '0', rate: '200',
    startDate: 'nope', maturityDate: '2020-01-01',
  });
  assert.ok(bad.name && bad.principal && bad.rate && bad.startDate);

  const good = validateInvestmentForm({
    kind: 'fixedDeposit', name: 'FD', principal: '10000', rate: '2.5',
    startDate: '2026-09-15', maturityDate: '2026-12-15',
  });
  assert.deepEqual(good, {});
});

test('validateInvestmentForm requires face value for bonds', () => {
  const e = validateInvestmentForm({
    kind: 'bond', name: 'B', principal: '5000', rate: '3.2',
    startDate: '2026-05-28', maturityDate: '2028-11-28', faceValue: '',
  });
  assert.ok(e.faceValue);
});

test('maturity must be after start', () => {
  const e = validateInvestmentForm({
    kind: 'fixedDeposit', name: 'X', principal: '100', rate: '1',
    startDate: '2026-12-15', maturityDate: '2026-09-15',
  });
  assert.ok(e.maturityDate);
});
