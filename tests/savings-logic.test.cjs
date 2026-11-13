const test = require('node:test');
const assert = require('node:assert/strict');
const { createTypeScriptLoader } = require('./helpers/load-ts.cjs');

/**
 * Pure savings-logic tests: progress maths + validation. No React, no storage.
 */
const load = createTypeScriptLoader();
const {
  savedAmount,
  pocketProgress,
  parseAmount,
  validatePocketForm,
  validateContribution,
  makePocket,
} = load('src/features/savings/logic.ts');

function pocket(contribs) {
  return {
    id: 'p1', name: 'Test', category: 'general', target: 1000,
    targetDate: null, createdAt: new Date().toISOString(),
    contributions: contribs.map((a, i) => ({ id: `c${i}`, amount: a, at: new Date().toISOString() })),
  };
}

test('savedAmount sums contributions', () => {
  assert.equal(savedAmount(pocket([100, 250.5, 50])), 400.5);
});

test('pocketProgress computes fraction, percent, remaining, complete', () => {
  const p = pocketProgress(pocket([250]));
  assert.equal(p.saved, 250);
  assert.equal(p.remaining, 750);
  assert.equal(p.percent, 25);
  assert.equal(p.complete, false);
});

test('pocketProgress clamps when over target', () => {
  const p = pocketProgress(pocket([1200]));
  assert.equal(p.percent, 100);
  assert.equal(p.remaining, 0);
  assert.equal(p.complete, true);
  assert.equal(p.fraction, 1);
});

test('parseAmount accepts valid money, rejects junk and >2dp', () => {
  assert.equal(parseAmount('50'), 50);
  assert.equal(parseAmount('12.50'), 12.5);
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount('abc'), null);
  assert.equal(parseAmount('10.999'), null);
  assert.equal(parseAmount('-5'), null);
});

test('validatePocketForm flags empty name and bad target', () => {
  const e = validatePocketForm({ name: '', target: '0' });
  assert.ok(e.name);
  assert.ok(e.target);
});

test('validatePocketForm passes a good form', () => {
  const e = validatePocketForm({ name: 'Holiday', target: '3000', initial: '500' });
  assert.deepEqual(e, {});
});

test('validatePocketForm rejects initial greater than target', () => {
  const e = validatePocketForm({ name: 'X', target: '100', initial: '200' });
  assert.ok(e.initial);
});

test('validatePocketForm rejects a past target date', () => {
  const e = validatePocketForm({ name: 'X', target: '100', targetDate: '2000-01-01' });
  assert.ok(e.targetDate);
});

test('validateContribution rejects zero/negative/invalid, accepts valid', () => {
  assert.equal(validateContribution('0').ok, false);
  assert.equal(validateContribution('-5').ok, false);
  assert.equal(validateContribution('abc').ok, false);
  const ok = validateContribution('75');
  assert.equal(ok.ok, true);
  assert.equal(ok.amount, 75);
});

test('makePocket seeds an initial contribution when provided', () => {
  const p = makePocket({ name: 'Car', category: 'vehicle', target: 5000, targetDate: null, initial: 500 });
  assert.equal(p.contributions.length, 1);
  assert.equal(savedAmount(p), 500);
  const empty = makePocket({ name: 'Car', category: 'vehicle', target: 5000, targetDate: null });
  assert.equal(empty.contributions.length, 0);
});
