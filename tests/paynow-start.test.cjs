const test = require('node:test');
const assert = require('node:assert/strict');
const { createTypeScriptLoader } = require('./helpers/load-ts.cjs');
const load = createTypeScriptLoader();
const { getPayNowResumeRoute } = load('src/features/paynow/startNavigation.ts');
const { EMPTY_DRAFT } = load('src/types/transaction.ts');
const { MOCK_RECIPIENTS } = load('src/data/recipients.ts');
const recipient = MOCK_RECIPIENTS[0];
const draft = {
  ...EMPTY_DRAFT, status:'editing', recipientId:recipient.id, recipientName:recipient.name,
  recipientBank:recipient.bank, recipientIdentifier:recipient.maskedIdentifier,
};

test('idle and terminal transfers do not offer resume', () => {
  for (const status of ['idle','confirmed','cancelled']) {
    assert.equal(getPayNowResumeRoute({...draft,status,amount:50},'normal'),undefined);
  }
});
test('an empty editing draft resumes recipient selection without changing it', () => {
  const editing = {...EMPTY_DRAFT,status:'editing'};
  const before = structuredClone(editing);
  assert.equal(getPayNowResumeRoute(editing,'normal'),'/paynow/recipient');
  assert.deepEqual(editing,before);
});
test('canonical recipient-only and unreviewed amount drafts resume amount entry', () => {
  assert.equal(getPayNowResumeRoute(draft,'normal'),'/paynow/amount');
  assert.equal(getPayNowResumeRoute({...draft,amount:50},'normal'),'/paynow/amount');
});
test('unknown or inconsistent recipients return to selection', () => {
  assert.equal(getPayNowResumeRoute({...draft,recipientId:'unknown',amount:50,status:'readyForReview'},'normal'),'/paynow/recipient');
  assert.equal(getPayNowResumeRoute({...draft,recipientName:'Wrong demo name'},'normal'),'/paynow/recipient');
});
test('ready and changed reviewed drafts return to guarded Review with all review evidence unchanged', () => {
  for (const status of ['readyForReview','reviewRequired']) {
    const reviewed = {...draft,amount:50,status,requiresReview:status==='reviewRequired',lastValidatedAt:'2026-11-06T00:00:00.000Z'};
    const before = structuredClone(reviewed);
    assert.equal(getPayNowResumeRoute(reviewed,'normal'),'/paynow/review');
    assert.deepEqual(reviewed,before);
  }
});
test('invalid reviewed amounts return to editing, not an outcome', () => {
  for (const amount of [undefined,NaN,-1,0.99,1.001,Infinity,25001]) {
    assert.equal(getPayNowResumeRoute({...draft,amount,status:'readyForReview'},'normal'),'/paynow/amount');
  }
});
test('valid failed transfers resume existing failure recovery; incomplete failures return to editing', () => {
  const failed = {...draft,amount:13.13,status:'failed',requiresReview:true,failureReason:'Synthetic failure'};
  const before = structuredClone(failed);
  assert.equal(getPayNowResumeRoute(failed,'normal'),'/paynow/success');
  assert.deepEqual(failed,before);
  assert.equal(getPayNowResumeRoute({...failed,amount:undefined},'normal'),'/paynow/amount');
});
test('pending safety checkpoints are not skipped or synchronized with customer guidance', () => {
  const checkpoint = {...draft,amount:50,status:'readyForReview',currentStep:'checkpoint'};
  assert.equal(getPayNowResumeRoute(checkpoint,'guided'),'/checkpoint');
  assert.equal(getPayNowResumeRoute(checkpoint,'assistance'),'/checkpoint');
  assert.equal(getPayNowResumeRoute(checkpoint,'normal'),'/paynow/review');
});
