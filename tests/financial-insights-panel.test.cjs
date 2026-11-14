const test = require('node:test');
const assert = require('node:assert/strict');
const { createTypeScriptLoader } = require('./helpers/load-ts.cjs');

const load = createTypeScriptLoader();
const {
  dismissalsKey,
  normaliseDismissedIds,
  privacySafeInsight,
  safeInsightAction,
  selectPanelInsights,
} = load('src/features/financial-context/panelLogic.ts');
const {
  SYNTHETIC_CONTEXT_GOALS,
  SYNTHETIC_CONTEXT_INVESTMENTS,
  SYNTHETIC_CONTEXT_TRANSACTIONS,
} = load('src/features/financial-context/sampleData.ts');
const {
  buildUserScopedFinancialContext,
  FINANCIAL_INSIGHTS_SOURCE_NOTE,
} = load('src/features/financial-context/dataPolicy.ts');

const context = {
  transactions: SYNTHETIC_CONTEXT_TRANSACTIONS,
  goals: SYNTHETIC_CONTEXT_GOALS,
  investments: SYNTHETIC_CONTEXT_INVESTMENTS,
  asOf: '2026-11-14T00:00:00Z',
  synthetic: true,
};

test('panel selects at most the requested number using explicit purpose order', () => {
  const social = selectPanelInsights(context, ['everyday', 'managing'], [], 2);
  const saver = selectPanelInsights(context, ['saving'], [], 3);
  const explorer = selectPanelInsights(context, ['investments'], [], 3);
  assert.equal(social.length, 2);
  assert.ok(social.every(item => ['spending-summary', 'category-change', 'recurring-expense'].includes(item.type)));
  assert.ok(['goal-progress', 'goal-coaching'].includes(saver[0].type));
  assert.ok(['maturity-reminder', 'risk-explanation'].includes(explorer[0].type));
});

test('dismissal filtering does not mutate insights, context or preferences', () => {
  const before = structuredClone(context);
  const purposes = ['saving'];
  const first = selectPanelInsights(context, purposes, [], 3);
  const next = selectPanelInsights(context, purposes, [first[0].id], 3);
  assert.equal(next.some(item => item.id === first[0].id), false);
  assert.equal(next.length, 3);
  assert.deepEqual(context, before);
  assert.deepEqual(purposes, ['saving']);
});

test('balance privacy removes amount-bearing visible and accessible copy', () => {
  const original = selectPanelInsights(context, ['saving'], [], 2)[0];
  const privateInsight = privacySafeInsight(original, true);
  assert.notStrictEqual(privateInsight, original);
  assert.equal(privateInsight.title, 'Savings goal progress');
  assert.doesNotMatch(`${privateInsight.title} ${privateInsight.explanation}`, /S\$|1800|4000|45%/);
  assert.match(privateInsight.explanation, /amounts.*hidden/i);
  assert.match(original.title, /45%/);
  assert.strictEqual(privacySafeInsight(original, false), original);
});

test('hidden goal progress and coaching remain distinct without exposing goal details', () => {
  const goalInsights = selectPanelInsights(context, ['saving'], [], 3)
    .filter(insight => insight.type === 'goal-progress' || insight.type === 'goal-coaching');
  const hiddenByType = Object.fromEntries(goalInsights.map(insight => [
    insight.type,
    privacySafeInsight(insight, true),
  ]));
  const progress = hiddenByType['goal-progress'];
  const coaching = hiddenByType['goal-coaching'];

  assert.ok(progress);
  assert.ok(coaching);
  assert.equal(progress.title, 'Savings goal progress');
  assert.equal(coaching.title, 'Savings contribution planning');
  assert.notEqual(progress.explanation, coaching.explanation);

  // This is the same title/explanation composition used by the card's accessibilityLabel.
  const accessibleCopy = [progress, coaching]
    .map(insight => `${insight.title}. ${insight.explanation}`)
    .join(' ');
  assert.doesNotMatch(
    accessibleCopy,
    /Japan trip demo|2027-05-14|S\$|\b(?:4000|1800|400)\b|45%/i,
  );
  assert.match(progress.explanation, /progress update/i);
  assert.match(coaching.explanation, /contribution guidance/i);
  assert.match(progress.priority.reason, /selected Saving/i);
  assert.match(coaching.priority.reason, /selected Saving/i);
});

test('optional actions are restricted to existing non-transaction routes', () => {
  const insights = selectPanelInsights(context, ['everyday'], [], 3);
  const routes = insights.map(safeInsightAction).filter(Boolean).map(action => action.route);
  assert.ok(routes.every(route => ['/plan', '/bills', '/savings', '/investments'].includes(route)));
  const unsafe = { ...insights[0], relatedAction: { id: 'bad', label: 'Send', destination: '/paynow' } };
  assert.equal(safeInsightAction(unsafe), null);
});

test('user-scoped context excludes app-wide pockets and saved investments', () => {
  const userAGoals = [{ id: 'user-a-goal', name: 'User A goal', target: 1000, saved: 250, monthly: 50 }];
  const userBGoals = [{ id: 'user-b-goal', name: 'User B goal', target: 2000, saved: 400, monthly: 100 }];
  const userA = buildUserScopedFinancialContext(userAGoals, context.asOf);
  const userB = buildUserScopedFinancialContext(userBGoals, context.asOf);
  assert.deepEqual(userA.goals.map(goal => goal.id), ['user-a-goal']);
  assert.deepEqual(userB.goals.map(goal => goal.id), ['user-b-goal']);
  assert.equal(userA.goals.some(goal => goal.id === 'user-b-goal'), false);
  assert.equal(userB.goals.some(goal => goal.id === 'user-a-goal'), false);
  assert.ok(userA.investments.every(item => item.demo));
  assert.match(FINANCIAL_INSIGHTS_SOURCE_NOTE, /excluded until their stores support user ownership/);
});

test('rebuilding context reflects updated per-user goals while dismissals remain applicable', () => {
  const original = buildUserScopedFinancialContext([
    { id: 'fresh-goal', name: 'Fresh goal', target: 1000, saved: 100, monthly: 100 },
  ], context.asOf);
  const first = selectPanelInsights(original, ['saving'], [], 3);
  const dismissedId = first[0].id;
  const updated = buildUserScopedFinancialContext([
    { id: 'fresh-goal', name: 'Fresh goal', target: 1000, saved: 600, monthly: 100 },
  ], context.asOf);
  const refreshedAll = selectPanelInsights(updated, ['saving'], [], 3);
  const refreshed = selectPanelInsights(updated, ['saving'], [dismissedId], 3);
  assert.ok(refreshedAll.some(item => /60% complete/.test(item.title)));
  assert.equal(refreshed.some(item => item.id === dismissedId), false);
});

test('dismissal storage is isolated per user and rejects malformed stored values', () => {
  assert.notEqual(dismissalsKey('demo-a'), dismissalsKey('demo-b'));
  assert.match(dismissalsKey('demo user'), /demo%20user$/);
  assert.deepEqual(normaliseDismissedIds(['one', ' one ', '', 3, 'two', 'two']), ['one', 'two']);
  assert.deepEqual(normaliseDismissedIds({ one: true }), []);
});
