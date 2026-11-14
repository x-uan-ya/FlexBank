const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createTypeScriptLoader } = require('./helpers/load-ts.cjs');

const load = createTypeScriptLoader();
const qa = load('src/features/quickActions/quickActions.ts');
const backend = load('backend/src/quickActions.ts');

const ids = list => list.map(action => action.id);

test('every quick action opens a screen that exists, and none can skip the PayNow review', () => {
  assert.equal(new Set(ids(qa.QUICK_ACTIONS)).size, qa.QUICK_ACTIONS.length);
  for (const action of qa.QUICK_ACTIONS) {
    assert.match(action.route, /^\/[a-z-]+$/, `${action.id} goes to a top-level screen`);
    const screen = [`src/app${action.route}.tsx`, `src/app${action.route}/index.tsx`]
      .some(file => fs.existsSync(path.join(__dirname, '..', file)));
    assert.ok(screen, `${action.id} opens ${action.route}, which must exist in src/app`);
    assert.ok(!/review|success|checkpoint/.test(action.route), `${action.id} must not open a PayNow confirm step`);
  }
});

test('the app and the backend offer the same quick actions in the same order', () => {
  assert.deepEqual(ids(qa.QUICK_ACTIONS), ids(backend.QUICK_ACTION_CATALOGUE));
  for (const action of qa.QUICK_ACTIONS) {
    const server = backend.QUICK_ACTION_CATALOGUE.find(item => item.id === action.id);
    assert.equal(server.route, action.route, `${action.id} route`);
    assert.equal(server.label, action.label, `${action.id} label`);
  }
  assert.equal(qa.MAX_QUICK_ACTIONS, backend.MAX_QUICK_ACTIONS);
  assert.equal(qa.MIN_QUICK_ACTIONS, backend.MIN_QUICK_ACTIONS);
});

test('the starting shortcuts follow the purposes the customer chose, in their order', () => {
  assert.deepEqual(qa.defaultQuickActionIds(['everyday']), ['paynow', 'scan', 'bills']);
  assert.deepEqual(qa.defaultQuickActionIds(['managing', 'everyday']), ['calendar', 'plan', 'paynow']);
  assert.deepEqual(qa.defaultQuickActionIds(['saving']), ['savings', 'calendar', 'paynow']);
  assert.deepEqual(qa.defaultQuickActionIds(['fixedDeposits']), ['investments', 'calendar', 'paynow']);
  assert.deepEqual(qa.defaultQuickActionIds([]), ['paynow', 'scan', 'bills']);
  for (const purposes of [['learning'], ['investments', 'fixedDeposits'], ['everyday', 'managing', 'saving']]) {
    const result = qa.defaultQuickActionIds(purposes);
    assert.equal(result.length, 3);
    assert.equal(new Set(result).size, 3);
    result.forEach(id => assert.ok(qa.getQuickAction(id), id));
  }
});

test('saved data is never trusted: unknown, repeated and damaged entries are dropped', () => {
  assert.deepEqual(qa.normaliseQuickActionIds(['calendar', 'nope', 'calendar', 7, null, 'paynow']), ['calendar', 'paynow']);
  assert.deepEqual(qa.normaliseQuickActionIds(['paynow', 'scan', 'bills', 'calendar', 'plan']), ['paynow', 'scan', 'bills', 'calendar']);
  for (const bad of [undefined, null, 'paynow', 5, {}]) assert.deepEqual(qa.normaliseQuickActionIds(bad), []);
});

test('a usable saved choice wins; otherwise the defaults are used', () => {
  assert.deepEqual(qa.resolveQuickActionIds(['help'], ['everyday']), { ids: ['help'], isDefault: false });
  for (const saved of [null, [], ['nope'], 'x']) {
    assert.deepEqual(qa.resolveQuickActionIds(saved, ['everyday']), { ids: ['paynow', 'scan', 'bills'], isDefault: true });
  }
});

test('adding, removing and moving keep the rules: 1 to 4 actions, no repeats, never mutates the input', () => {
  const start = Object.freeze(['paynow', 'scan']);
  assert.deepEqual(qa.addQuickAction(start, 'bills'), ['paynow', 'scan', 'bills']);
  assert.deepEqual(qa.addQuickAction(start, 'paynow'), ['paynow', 'scan']);
  assert.deepEqual(qa.addQuickAction(['paynow', 'scan', 'bills', 'calendar'], 'plan'), ['paynow', 'scan', 'bills', 'calendar']);
  assert.deepEqual(qa.removeQuickAction(start, 'paynow'), ['scan']);
  assert.deepEqual(qa.removeQuickAction(['scan'], 'scan'), ['scan']);
  assert.deepEqual(qa.moveQuickAction(['paynow', 'scan', 'bills'], 'bills', -1), ['paynow', 'bills', 'scan']);
  assert.deepEqual(qa.moveQuickAction(['paynow', 'scan', 'bills'], 'paynow', -1), ['paynow', 'scan', 'bills']);
  assert.deepEqual(qa.moveQuickAction(['paynow', 'scan', 'bills'], 'bills', 1), ['paynow', 'scan', 'bills']);
  assert.deepEqual(qa.moveQuickAction(['paynow', 'scan'], 'calendar', 1), ['paynow', 'scan']);
  assert.deepEqual(start, ['paynow', 'scan']);
});
