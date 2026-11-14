const test = require('node:test');
const assert = require('node:assert/strict');
const { createTypeScriptLoader } = require('./helpers/load-ts.cjs');

const load = createTypeScriptLoader();
const {
  calculateGoalCoaching,
  calculateMonthlySpending,
  calculateMonthToMonthChanges,
  detectRecurringExpenses,
  generateFinancialInsights,
  generatePrioritisedInsights,
  goalContextFromSavingsPocket,
  lifestyleFromPurposes,
  prioritiseInsights,
} = load('src/features/financial-context/index.ts');
const {
  SYNTHETIC_CONTEXT_GOALS,
  SYNTHETIC_CONTEXT_INVESTMENTS,
  SYNTHETIC_CONTEXT_TRANSACTIONS,
} = load('src/features/financial-context/sampleData.ts');

const AS_OF = '2026-11-14T00:00:00Z';

test('monthly spending totals include valid debits and exclude credits and invalid values', () => {
  const monthly = calculateMonthlySpending([
    ...SYNTHETIC_CONTEXT_TRANSACTIONS,
    { id: 'bad-negative', occurredAt: '2026-11-14', merchant: 'Bad', category: 'Dining', amount: -2, direction: 'debit' },
    { id: 'bad-nan', occurredAt: '2026-11-14', merchant: 'Bad', category: 'Dining', amount: NaN, direction: 'debit' },
    { id: 'bad-date', occurredAt: 'not-a-date', merchant: 'Bad', category: 'Dining', amount: 4, direction: 'debit' },
  ]);
  assert.deepEqual(monthly.map(item => item.month), ['2026-09', '2026-10', '2026-11']);
  assert.equal(monthly[2].total, 201.9);
  assert.deepEqual(monthly[2].categoryTotals, { Dining: 134, Subscriptions: 18.9, Transport: 49 });
  assert.deepEqual(calculateMonthlySpending([]), []);
});

test('month-to-month category changes are calculated only for consecutive months', () => {
  const monthly = calculateMonthlySpending(SYNTHETIC_CONTEXT_TRANSACTIONS);
  const changes = calculateMonthToMonthChanges(monthly);
  const dining = changes.find(item => item.fromMonth === '2026-10' && item.toMonth === '2026-11' && item.category === 'Dining');
  assert.deepEqual(dining, {
    category: 'Dining',
    fromMonth: '2026-10',
    toMonth: '2026-11',
    previousAmount: 103,
    currentAmount: 134,
    absoluteChange: 31,
    percentageChange: 30.1,
    transactionIds: [...monthly[1].transactionIds, ...monthly[2].transactionIds],
  });
  assert.deepEqual(calculateMonthToMonthChanges([
    { month: '2026-01', total: 10, categoryTotals: { Dining: 10 }, transactionIds: ['a'] },
    { month: '2026-03', total: 20, categoryTotals: { Dining: 20 }, transactionIds: ['b'] },
  ]), []);
});

test('recurring expenses require matching evidence in distinct months', () => {
  const recurring = detectRecurringExpenses(SYNTHETIC_CONTEXT_TRANSACTIONS);
  assert.equal(recurring.length, 1);
  assert.equal(recurring[0].merchant, 'StreamFlix Demo');
  assert.equal(recurring[0].amount, 18.9);
  assert.deepEqual(recurring[0].months, ['2026-09', '2026-10', '2026-11']);
  assert.deepEqual(detectRecurringExpenses(SYNTHETIC_CONTEXT_TRANSACTIONS.slice(-4), 3), []);
  assert.deepEqual(detectRecurringExpenses([], 2), []);
});

test('goal coaching calculates progress, remaining time and target-date pace', () => {
  const result = calculateGoalCoaching(SYNTHETIC_CONTEXT_GOALS[0], AS_OF);
  assert.deepEqual(result, {
    valid: true,
    completionPercentage: 45,
    remainingAmount: 2200,
    estimatedMonthsToGoal: 6,
    requiredMonthlySaving: 366.67,
    monthsUntilTarget: 6,
    targetDateStatus: 'valid',
    invalidReasons: [],
  });
});

test('goal coaching safely handles zero contributions, missing dates, completion and invalid values', () => {
  const zero = calculateGoalCoaching(SYNTHETIC_CONTEXT_GOALS[1], AS_OF);
  assert.equal(zero.valid, true);
  assert.equal(zero.estimatedMonthsToGoal, null);
  assert.equal(zero.requiredMonthlySaving, null);
  assert.equal(zero.targetDateStatus, 'missing');

  const complete = calculateGoalCoaching({ id: 'done', name: 'Done', target: 100, saved: 120, monthlyContribution: 0, targetDate: '2027-01-01' }, AS_OF);
  assert.equal(complete.completionPercentage, 100);
  assert.equal(complete.remainingAmount, 0);
  assert.equal(complete.estimatedMonthsToGoal, 0);
  assert.equal(complete.requiredMonthlySaving, 0);

  const invalid = calculateGoalCoaching({ id: 'bad', name: 'Bad', target: 0, saved: -1, monthlyContribution: Infinity, targetDate: 'bad' }, AS_OF);
  assert.equal(invalid.valid, false);
  assert.equal(invalid.invalidReasons.length, 3);
  assert.equal(invalid.estimatedMonthsToGoal, null);
});

test('existing savings pockets adapt safely when contribution history is empty', () => {
  const adapted = goalContextFromSavingsPocket({
    id: 'pocket-1', name: 'Demo pocket', category: 'general', target: 1000,
    targetDate: null, contributions: [], demo: true, createdAt: '2026-01-01',
  });
  assert.equal(adapted.saved, 0);
  assert.equal(adapted.monthlyContribution, 0);
  assert.equal(adapted.synthetic, true);
  assert.equal(calculateGoalCoaching(adapted, AS_OF).estimatedMonthsToGoal, null);
});

test('generated recommendations explain their evidence and synthetic source', () => {
  const insights = generateFinancialInsights({
    transactions: SYNTHETIC_CONTEXT_TRANSACTIONS,
    goals: SYNTHETIC_CONTEXT_GOALS,
    investments: SYNTHETIC_CONTEXT_INVESTMENTS,
    asOf: AS_OF,
    synthetic: true,
  });
  const recurring = insights.find(item => item.type === 'recurring-expense');
  const coaching = insights.find(item => item.id === 'goal-coaching-demo-goal-trip');
  const risk = insights.find(item => item.type === 'risk-explanation');
  assert.match(recurring.explanation, /3 distinct months/);
  assert.match(recurring.explanation, /cannot confirm a subscription/);
  assert.equal(recurring.dataSource.synthetic, true);
  assert.ok(recurring.dataSource.recordIds.length >= 3);
  assert.match(coaching.explanation, /S\$366\.67 per month/);
  assert.match(risk.explanation, /general education, not a recommendation/);
  assert.ok(insights.every(item => item.id && item.type && item.title && item.explanation && item.dataSource));
});

test('explicit lifestyle purposes reprioritise insights without hiding any', () => {
  const input = {
    transactions: SYNTHETIC_CONTEXT_TRANSACTIONS,
    goals: SYNTHETIC_CONTEXT_GOALS,
    investments: SYNTHETIC_CONTEXT_INVESTMENTS,
    asOf: AS_OF,
    synthetic: true,
  };
  const unranked = generateFinancialInsights(input);
  const social = generatePrioritisedInsights(input, ['everyday', 'managing']);
  const saver = generatePrioritisedInsights(input, ['saving']);
  const explorer = generatePrioritisedInsights(input, ['investments', 'fixedDeposits']);
  assert.equal(social.length, unranked.length);
  assert.equal(saver.length, unranked.length);
  assert.equal(explorer.length, unranked.length);
  assert.ok(['spending-summary', 'category-change', 'recurring-expense'].includes(social[0].type));
  assert.ok(['goal-progress', 'goal-coaching'].includes(saver[0].type));
  assert.ok(['maturity-reminder', 'risk-explanation'].includes(explorer[0].type));
  assert.match(social[0].priority.reason, /you selected/);
  assert.ok(social.some(item => item.type === 'goal-progress'));
  assert.ok(saver.some(item => item.type === 'risk-explanation'));
});

test('lifestyle labels come only from explicit purpose order and neutral choices stay neutral', () => {
  assert.equal(lifestyleFromPurposes(['everyday', 'saving']), 'socialSpender');
  assert.equal(lifestyleFromPurposes(['saving', 'everyday']), 'goalOrientedSaver');
  assert.equal(lifestyleFromPurposes(['investments']), 'investmentExplorer');
  assert.equal(lifestyleFromPurposes(['learning']), null);
  assert.deepEqual(prioritiseInsights([], ['saving']), []);
});
