const test = require('node:test');
const assert = require('node:assert/strict');

const { createTypeScriptLoader } = require('./helpers/load-ts.cjs');

function fixture(overrides) {
  const load = createTypeScriptLoader(overrides);
  const { initialSessionState, sessionReducer } = load('src/state/reducer.ts');
  const { EMPTY_DRAFT } = load('src/types/transaction.ts');
  const { MOCK_RECIPIENTS } = load('src/data/recipients.ts');
  const validation = load('src/features/paynow/validation.ts');
  const outcome = load('src/features/paynow/outcome.ts');
  const lookup = load('src/features/paynow/proxyLookup.ts');

  function initial() { return structuredClone(initialSessionState); }
  function dispatch(state, type, payload) {
    return sessionReducer(state, payload === undefined ? { type } : { type, payload });
  }
  function editing(amount = 50) {
    let state = dispatch(initial(), 'START_TRANSFER');
    state = dispatch(state, 'SET_RECIPIENT', MOCK_RECIPIENTS[0]);
    return dispatch(state, 'SET_AMOUNT', amount);
  }
  function reviewed(amount = 50) { return dispatch(editing(amount), 'MARK_READY_FOR_REVIEW'); }
  function inject(draft) {
    return { ...initial(), transaction: { ...EMPTY_DRAFT, ...draft } };
  }

  return { load, initial, dispatch, editing, reviewed, inject, recipients: MOCK_RECIPIENTS, validation, outcome, lookup };
}

test('empty draft cannot be reviewed, confirmed, failed or shown as a successful receipt', () => {
  const f = fixture();
  let state = f.initial();
  for (const [action, payload] of [
    ['MARK_READY_FOR_REVIEW'], ['CONFIRM_TRANSACTION'], ['FAIL_TRANSACTION', { reason: 'Injected failure' }],
  ]) {
    state = f.dispatch(state, action, payload);
    assert.notEqual(state.transaction.status, 'readyForReview');
    assert.notEqual(state.transaction.status, 'confirmed');
    assert.notEqual(state.transaction.status, 'failed');
  }
  assert.equal(f.validation.canShowSuccessfulReceipt(state.transaction), false);
});

test('canonical recipient identity is required, not only a known ID', async t => {
  const f = fixture();
  const original = f.reviewed().transaction;
  for (const [name, fields] of [
    ['unknown ID', { recipientId: 'unknown' }],
    ['missing name', { recipientName: undefined }],
    ['wrong name', { recipientName: 'Another synthetic recipient' }],
    ['wrong bank', { recipientBank: 'Different demo bank' }],
    ['missing destination', { recipientIdentifier: undefined }],
    ['wrong destination', { recipientIdentifier: '•••• 0000' }],
  ]) {
    await t.test(name, () => {
      const transaction = { ...original, ...fields };
      assert.equal(f.validation.validateTransaction(transaction).valid, false);
      assert.equal(f.validation.canConfirmTransaction(transaction), false);
      const next = f.dispatch(f.inject(transaction), 'CONFIRM_TRANSACTION');
      assert.notEqual(next.transaction.status, 'confirmed');
    });
  }
});

test('SET_RECIPIENT derives known details from the directory and rejects unknown IDs', () => {
  const f = fixture();
  const state = f.dispatch(f.initial(), 'START_TRANSFER');
  const recipient = f.recipients[0];
  const canonical = f.dispatch(state, 'SET_RECIPIENT', {
    ...recipient, name: 'Forged name', bank: 'Forged bank', maskedIdentifier: 'Forged destination',
  });
  assert.equal(canonical.transaction.recipientName, recipient.name);
  assert.equal(canonical.transaction.recipientBank, recipient.bank);
  assert.equal(canonical.transaction.recipientIdentifier, recipient.maskedIdentifier);
  assert.strictEqual(f.dispatch(canonical, 'SET_RECIPIENT', { ...recipient, id: 'unknown' }), canonical);
});

test('invalid amounts cannot pass full validation or direct confirmation', async t => {
  const f = fixture();
  const draft = f.reviewed().transaction;
  for (const [name, amount] of [
    ['missing', undefined], ['NaN', NaN], ['positive infinity', Infinity],
    ['negative infinity', -Infinity], ['zero', 0], ['negative', -5],
    ['below minimum', 0.99], ['excess decimal places', 10.999],
    ['displayed failure amount with hidden fractional cents', 13.1300000001],
    ['over daily cap', 25000.01], ['insufficient balance', 8420.56],
    ['wrong runtime type', '50'], ['null runtime value', null],
  ]) {
    await t.test(name, () => {
      const transaction = { ...draft, amount };
      assert.equal(f.validation.validateTransaction(transaction).valid, false);
      assert.equal(f.validation.canConfirmTransaction(transaction), false);
      assert.notEqual(f.dispatch(f.inject(transaction), 'CONFIRM_TRANSACTION').transaction.status, 'confirmed');
    });
  }
});

test('supported minimum, cents and full available balance pass amount validation', () => {
  const f = fixture();
  for (const amount of [1, 1.01, 1.29, 13.13, 50, 8420.55]) {
    assert.equal(f.validation.validateTransaction({ ...f.editing().transaction, amount }).valid, true, String(amount));
  }
});

test('ordinary binary floating-point cents are not mistaken for excess precision', () => {
  const f = fixture();
  const result = f.validation.validateAmount({ ...f.editing().transaction, amount: 0.29 });
  // 29 cents is below the banking minimum, but it is a valid two-decimal number.
  assert.equal(result.valid, false);
  assert.ok(result.messages.some(message => message.includes('at least')));
  assert.equal(result.messages.some(message => message.includes('decimal places')), false);
});

test('currency mismatch cannot pass review or confirmation', () => {
  const f = fixture();
  const state = f.inject({ ...f.editing().transaction, currency: 'USD' });
  assert.equal(f.validation.validateTransaction(state.transaction).valid, false);
  assert.notEqual(f.dispatch(state, 'MARK_READY_FOR_REVIEW').transaction.status, 'readyForReview');
  assert.notEqual(f.dispatch(state, 'CONFIRM_TRANSACTION').transaction.status, 'confirmed');
});

test('unavailable primary account fails closed instead of skipping balance checks', () => {
  const f = fixture({ 'src/data/accounts.ts': { MOCK_ACCOUNTS: [], PRIMARY_ACCOUNT_ID: 'acc-everyday' } });
  const state = f.editing();
  assert.equal(f.validation.validateTransaction(state.transaction).valid, false);
  assert.notEqual(f.dispatch(state, 'MARK_READY_FOR_REVIEW').transaction.status, 'readyForReview');
});

test('valid transfer requires review before explicit confirmation', () => {
  const f = fixture();
  const editing = f.editing();
  assert.equal(f.validation.canConfirmTransaction(editing.transaction), false);
  assert.notEqual(f.dispatch(editing, 'CONFIRM_TRANSACTION').transaction.status, 'confirmed');
  const reviewed = f.dispatch(editing, 'MARK_READY_FOR_REVIEW');
  assert.equal(reviewed.transaction.status, 'readyForReview');
  assert.equal(reviewed.transaction.requiresReview, false);
  assert.ok(Number.isFinite(Date.parse(reviewed.transaction.lastValidatedAt)));
  assert.equal(f.validation.canConfirmTransaction(reviewed.transaction), true);
  const confirmed = f.dispatch(reviewed, 'CONFIRM_TRANSACTION');
  assert.equal(confirmed.transaction.status, 'confirmed');
  assert.equal(f.validation.canShowSuccessfulReceipt(confirmed.transaction), true);
});

test('setting review status without valid review evidence does not authorize confirmation', () => {
  const f = fixture();
  for (const lastValidatedAt of [null, undefined, 'not-a-date']) {
    const state = f.inject({ ...f.editing().transaction, status: 'readyForReview', lastValidatedAt });
    assert.equal(f.validation.canConfirmTransaction(state.transaction), false);
    assert.notEqual(f.dispatch(state, 'CONFIRM_TRANSACTION').transaction.status, 'confirmed');
  }
});

test('amount change after review invalidates approval until explicit re-review', () => {
  const f = fixture();
  const changed = f.dispatch(f.reviewed(), 'SET_AMOUNT', 75);
  assert.equal(changed.transaction.status, 'reviewRequired');
  assert.equal(changed.transaction.requiresReview, true);
  assert.equal(changed.transaction.lastValidatedAt, null);
  assert.notEqual(f.dispatch(changed, 'CONFIRM_TRANSACTION').transaction.status, 'confirmed');
  const reviewed = f.dispatch(changed, 'MARK_READY_FOR_REVIEW');
  assert.equal(reviewed.transaction.amount, 75);
  assert.equal(f.dispatch(reviewed, 'CONFIRM_TRANSACTION').transaction.status, 'confirmed');
});

test('recipient change after review invalidates approval and retains entered amount', () => {
  const f = fixture();
  const changed = f.dispatch(f.reviewed(), 'SET_RECIPIENT', f.recipients[1]);
  assert.equal(changed.transaction.status, 'reviewRequired');
  assert.equal(changed.transaction.requiresReview, true);
  assert.equal(changed.transaction.lastValidatedAt, null);
  assert.equal(changed.transaction.recipientName, f.recipients[1].name);
  assert.equal(changed.transaction.amount, 50);
  assert.notEqual(f.dispatch(changed, 'CONFIRM_TRANSACTION').transaction.status, 'confirmed');
});

test('unchanged amount and recipient do not introduce re-review or new state objects', () => {
  const f = fixture();
  const state = f.reviewed();
  assert.strictEqual(f.dispatch(state, 'SET_AMOUNT', state.transaction.amount), state);
  assert.strictEqual(f.dispatch(state, 'SET_RECIPIENT', f.recipients[0]), state);
});

test('all guidance/display combinations preserve the complete draft and independent assistance state', () => {
  const f = fixture();
  for (const status of ['idle', 'editing', 'readyForReview', 'reviewRequired', 'failed', 'confirmed', 'cancelled']) {
    for (const guidanceLevel of ['quick', 'balanced', 'guided']) {
      for (const displayMode of ['standard', 'largeText', 'highClarity']) {
        const state = { ...f.reviewed(), interactionMode: 'assistance' };
        state.transaction = {
          ...state.transaction, status, requiresReview: status === 'reviewRequired' || status === 'failed',
          failureReason: status === 'failed' ? 'Synthetic failure' : undefined,
        };
        const snapshot = structuredClone(state.transaction);
        const guidance = f.dispatch(state, 'SET_PREFERENCES', { guidanceLevel });
        const display = f.dispatch(guidance, 'SET_DISPLAY_MODE', displayMode);
        assert.strictEqual(display.transaction, state.transaction);
        assert.deepEqual(display.transaction, snapshot);
        assert.equal(display.preferences.guidanceLevel, guidanceLevel);
        assert.equal(display.preferences.displayMode, displayMode);
        assert.equal(display.interactionMode, 'assistance');
      }
    }
  }
});

test('cancel clears the draft while retaining preferences and home layout', () => {
  const f = fixture();
  const state = f.dispatch(f.reviewed(), 'SET_PREFERENCES', { guidanceLevel: 'guided', displayMode: 'highClarity' });
  const cancelled = f.dispatch(state, 'CANCEL_TRANSACTION');
  assert.equal(cancelled.transaction.status, 'cancelled');
  assert.equal(cancelled.transaction.recipientId, undefined);
  assert.equal(cancelled.transaction.amount, undefined);
  assert.equal(cancelled.transaction.lastValidatedAt, null);
  assert.strictEqual(cancelled.preferences, state.preferences);
  assert.strictEqual(cancelled.homeLayout, state.homeLayout);
});

test('S$13.13 deterministically fails even when confirmation is dispatched directly', () => {
  const f = fixture();
  const reviewed = f.reviewed(13.13);
  assert.equal(f.outcome.simulateOutcome(reviewed.transaction).ok, false);
  const failed = f.dispatch(reviewed, 'CONFIRM_TRANSACTION');
  assert.equal(failed.transaction.status, 'failed');
  assert.equal(failed.transaction.requiresReview, true);
  assert.equal(failed.transaction.lastValidatedAt, null);
  assert.ok(failed.transaction.failureReason);
  assert.equal(failed.transaction.recipientId, reviewed.transaction.recipientId);
  assert.equal(failed.transaction.amount, 13.13);
  assert.equal(f.validation.canShowSuccessfulReceipt(failed.transaction), false);
});

test('failure retry preserves details and preferences, then allows an edited amount after re-review', () => {
  const f = fixture();
  const reviewed = f.reviewed(13.13);
  const failed = f.dispatch(reviewed, 'CONFIRM_TRANSACTION');
  const changed = f.dispatch(failed, 'SET_AMOUNT', 13.14);
  assert.equal(changed.transaction.recipientId, reviewed.transaction.recipientId);
  assert.equal(changed.transaction.amount, 13.14);
  assert.strictEqual(changed.preferences, failed.preferences);
  assert.equal(f.validation.canConfirmTransaction(changed.transaction), false);
  const rereviewed = f.dispatch(changed, 'MARK_READY_FOR_REVIEW');
  assert.equal(rereviewed.transaction.failureReason, undefined);
  assert.equal(f.dispatch(rereviewed, 'CONFIRM_TRANSACTION').transaction.status, 'confirmed');
});

test('failed outcome and incomplete direct-navigation drafts never authorize a successful receipt', () => {
  const f = fixture();
  const confirmed = f.dispatch(f.reviewed(), 'CONFIRM_TRANSACTION').transaction;
  for (const draft of [
    f.initial().transaction,
    f.editing().transaction,
    f.dispatch(f.reviewed(13.13), 'CONFIRM_TRANSACTION').transaction,
    { ...confirmed, recipientName: undefined },
    { ...confirmed, recipientBank: 'Wrong bank' },
    { ...confirmed, amount: undefined },
    { ...confirmed, amount: 13.13 },
    { ...confirmed, requiresReview: true },
    { ...confirmed, lastValidatedAt: null },
    { ...confirmed, failureReason: 'Stale failure' },
  ]) {
    assert.equal(f.validation.canShowSuccessfulReceipt(draft), false);
  }
});

test('simulateOutcome never reports success for an invalid draft', () => {
  const f = fixture();
  assert.equal(f.outcome.simulateOutcome(f.initial().transaction).ok, false);
  assert.equal(f.outcome.simulateOutcome({ ...f.reviewed().transaction, recipientIdentifier: 'Wrong destination' }).ok, false);
});

test('direct failure action requires a complete valid confirmable transaction', () => {
  const f = fixture();
  for (const state of [
    f.initial(), f.editing(),
    f.inject({ ...f.reviewed().transaction, amount: undefined }),
    f.inject({ ...f.reviewed().transaction, requiresReview: true }),
  ]) {
    assert.notEqual(f.dispatch(state, 'FAIL_TRANSACTION', { reason: 'Injected failure' }).transaction.status, 'failed');
  }
  const failed = f.dispatch(f.reviewed(), 'FAIL_TRANSACTION', { reason: 'Synthetic service failure' });
  assert.equal(failed.transaction.status, 'failed');
  assert.equal(failed.transaction.failureReason, 'Synthetic service failure');
  assert.equal(failed.transaction.requiresReview, true);
});

test('confirmed and cancelled states cannot be resurrected or changed by stale actions', async t => {
  const f = fixture();
  for (const terminal of [
    f.dispatch(f.reviewed(), 'CONFIRM_TRANSACTION'),
    f.dispatch(f.reviewed(), 'CANCEL_TRANSACTION'),
  ]) {
    await t.test(terminal.transaction.status, () => {
      for (const [action, payload] of [
        ['SET_AMOUNT', 80], ['SET_RECIPIENT', f.recipients[1]],
        ['MARK_READY_FOR_REVIEW'], ['CONFIRM_TRANSACTION'],
        ['FAIL_TRANSACTION', { reason: 'Late failure' }],
        ['SET_TRANSACTION_STEP', 'amount'], ['CANCEL_TRANSACTION'],
      ]) {
        assert.deepEqual(f.dispatch(terminal, action, payload).transaction, terminal.transaction, action);
      }
      const restarted = f.dispatch(terminal, 'START_TRANSFER');
      assert.equal(restarted.transaction.status, 'editing');
      assert.equal(restarted.transaction.recipientId, undefined);
      assert.equal(restarted.transaction.amount, undefined);
    });
  }
});

test('synthetic mobile lookup normalizes valid numbers and returns canonical recipients', () => {
  const f = fixture();
  for (const input of ['90004821', '9000 4821', '9000-4821', '+65 9000-4821']) {
    const result = f.lookup.lookupRecipientByMobile(input);
    assert.equal(result.ok, true, input);
    assert.strictEqual(result.recipient, f.recipients[0]);
  }
});

test('synthetic mobile lookup provides recoverable messages for malformed and unknown numbers', () => {
  const f = fixture();
  for (const input of ['', 'letters', '123', '71234567', '99999999']) {
    const result = f.lookup.lookupRecipientByMobile(input);
    assert.equal(result.ok, false, input);
    assert.equal(typeof result.message, 'string');
    assert.ok(result.message.length > 0);
  }
});
