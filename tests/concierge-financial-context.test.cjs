const test = require('node:test');
const assert = require('node:assert/strict');
const { createTypeScriptLoader } = require('./helpers/load-ts.cjs');

delete process.env.EXPO_PUBLIC_CONCIERGE_AI_URL;

const load = createTypeScriptLoader();
const {
  answerContextualFinancialQuestion,
  detectFinancialQuestionIntent,
  historyForGeneralProvider,
  isResponseForCurrentUser,
  redactFinancialFigures,
  redactTurnsForPrivacy,
  removeContextualTurns,
} = load('src/features/concierge/contextualFinance.ts');
const { buildUserScopedFinancialContext } = load('src/features/financial-context/dataPolicy.ts');
const {
  SYNTHETIC_CONTEXT_GOALS,
  SYNTHETIC_CONTEXT_INVESTMENTS,
  SYNTHETIC_CONTEXT_TRANSACTIONS,
} = load('src/features/financial-context/sampleData.ts');

const AS_OF = '2026-11-14T00:00:00Z';
const fullContext = {
  transactions: SYNTHETIC_CONTEXT_TRANSACTIONS,
  goals: SYNTHETIC_CONTEXT_GOALS,
  investments: SYNTHETIC_CONTEXT_INVESTMENTS,
  asOf: AS_OF,
  synthetic: true,
};

function ask(question, overrides = {}) {
  return answerContextualFinancialQuestion({
    question,
    context: fullContext,
    bankingPurposes: ['everyday', 'managing'],
    guidanceLevel: 'balanced',
    balanceHidden: false,
    ...overrides,
  });
}

test('social-spender answers are grounded in spending and recurring insights', () => {
  const spending = ask('Summarise my spending');
  const category = ask('Why did my Dining spending category increase?');
  const recurring = ask('Do I have a recurring subscription?');
  assert.equal(spending.source, 'prepared-financial-context');
  assert.match(spending.text, /S\$201\.90/);
  assert.match(category.text, /S\$103\.00.*S\$134\.00/);
  assert.match(recurring.text, /3 distinct months/);
  assert.match(recurring.text, /cannot confirm a subscription/);
  assert.match(spending.text, /Synthetic demo data/);
});

test('goal-oriented saver answer uses engine progress and monthly coaching', () => {
  const progress = ask('How is my savings goal progressing?', {
    bankingPurposes: ['saving'],
  });
  const coaching = ask('What monthly contribution reaches my target date?', {
    bankingPurposes: ['saving'],
  });
  assert.match(progress.text, /45% complete/);
  assert.match(progress.text, /S\$1,800\.00|S\$1800\.00/);
  assert.match(coaching.text, /S\$366\.67 per month/);
  assert.ok(progress.insightIds.every(id => id.startsWith('goal-')));
});

test('investment explorer gets a synthetic maturity reminder and general risk explanation', () => {
  const maturity = ask('When does the demo investment mature?', {
    bankingPurposes: ['investments', 'fixedDeposits'],
  });
  const risk = ask('Explain the risk of my bond', {
    bankingPurposes: ['investments', 'learning'],
  });
  assert.match(maturity.text, /2027-06-01/);
  assert.match(maturity.text, /not a prediction/);
  assert.match(risk.text, /general education, not a recommendation/);
  assert.match(risk.text, /Synthetic demo data/);
});

test('missing and invalid records produce explicit limitations without invented figures', () => {
  const missing = ask('How is my savings goal progressing?', {
    context: { transactions: [], goals: [], investments: [], asOf: AS_OF, synthetic: true },
  });
  const invalid = ask('What monthly contribution reaches my target date?', {
    context: {
      transactions: [],
      goals: [{ id: 'invalid', name: 'Invalid', target: 0, saved: -1, monthlyContribution: NaN }],
      investments: [],
      asOf: AS_OF,
      synthetic: true,
    },
  });
  assert.match(missing.text, /could not find a valid savings goal/i);
  assert.match(invalid.text, /No figure has been assumed/i);
  assert.deepEqual(invalid.insightIds, []);
});

test('user switching cannot resolve another user Plan goal or stale insight ID', () => {
  const userA = buildUserScopedFinancialContext([
    { id: 'user-a-goal', name: 'User A only', target: 1000, saved: 250, monthly: 50 },
  ], AS_OF);
  const userB = buildUserScopedFinancialContext([
    { id: 'user-b-goal', name: 'User B only', target: 2000, saved: 400, monthly: 100 },
  ], AS_OF);
  const answerA = ask('How is my savings goal progressing?', { context: userA, bankingPurposes: ['saving'] });
  const answerB = ask('How is my savings goal progressing?', { context: userB, bankingPurposes: ['saving'] });
  assert.match(answerA.text, /User A only/);
  assert.doesNotMatch(answerA.text, /User B only/);
  assert.match(answerB.text, /User B only/);
  const stale = ask('Explain this insight', {
    context: userB,
    bankingPurposes: ['saving'],
    selectedInsightId: 'goal-progress-user-a-goal',
  });
  assert.match(stale.text, /no longer available in the current authorised context/i);
  assert.doesNotMatch(stale.text, /User A only|S\$/);
});

test('the data loader masks a previous user context during an auth transition', () => {
  const hookModule = createTypeScriptLoader({
    'src/services/index.ts': { jsonStorage: {} },
  })('src/features/financial-context/useFinancialInsightsData.ts');
  assert.equal(hookModule.isFinancialContextForUser('user-a', 'user-a'), true);
  assert.equal(hookModule.isFinancialContextForUser('user-a', 'user-b'), false);
  assert.equal(hookModule.isFinancialContextForUser('user-a', null), false);
});

test('balance privacy redacts visible and screen-reader response text', () => {
  const privateAnswer = ask('Summarise my spending', { balanceHidden: true });
  assert.match(privateAnswer.text, /Financial amounts are hidden/);
  assert.doesNotMatch(privateAnswer.text, /S\$|201\.90|134\.00|45%/);
  assert.match(privateAnswer.text, /Synthetic demo data/);
});

test('hidden mode redacts numeric user text and retained general history', () => {
  assert.equal(
    redactFinancialFigures('I spent S$842.55, saved 45%, and set a 2027 target.'),
    'I spent [hidden financial figure], saved [hidden financial figure], and set a [hidden financial figure] target.',
  );
  const redacted = redactTurnsForPrivacy([
    { role: 'user', text: 'Explain 3% on S$1,000' },
    { role: 'model', text: 'That is about S$30.' },
  ]);
  assert.doesNotMatch(redacted.map(turn => turn.text).join(' '), /S\$|\d/);
});

test('financial replies and their paired asks are excluded from proxy history and removable from visible history', () => {
  const turns = [
    { role: 'user', text: 'What is a fixed deposit?' },
    { role: 'model', text: 'General answer' },
    { role: 'user', text: 'Summarise my spending', containsFinancialContext: true },
    { role: 'model', text: 'Private amount', containsFinancialContext: true },
  ];
  assert.deepEqual(historyForGeneralProvider(turns), []);
  assert.deepEqual(removeContextualTurns(turns), turns.slice(0, 2));
});

test('stale asynchronous responses are rejected after an account switch', () => {
  assert.equal(isResponseForCurrentUser('user-a', 'user-a'), true);
  assert.equal(isResponseForCurrentUser('user-a', 'user-b'), false);
  assert.equal(isResponseForCurrentUser('user-a', null), false);
});

test('quick, balanced and guided styles preserve the same grounded insight', () => {
  const quick = ask('How is my savings goal progressing?', { bankingPurposes: ['saving'], guidanceLevel: 'quick' });
  const balanced = ask('How is my savings goal progressing?', { bankingPurposes: ['saving'], guidanceLevel: 'balanced' });
  const guided = ask('How is my savings goal progressing?', { bankingPurposes: ['saving'], guidanceLevel: 'guided' });
  assert.match(quick.text, /45% complete/);
  assert.match(balanced.text, /Source:/);
  assert.match(guided.text, /What the records show:/);
  assert.match(guided.text, /read-only explanation/);
  assert.ok(quick.text.length < guided.text.length);
});

test('financial intent detection leaves general Concierge and PayNow questions untouched', () => {
  assert.equal(detectFinancialQuestionIntent('How does PayNow work?'), null);
  assert.equal(detectFinancialQuestionIntent('Translate this explanation'), null);
  assert.equal(detectFinancialQuestionIntent('Do I have recurring charges?'), 'recurring-expense');
});

test('account-specific answers operate offline and never call the AI provider', async () => {
  let providerCalls = 0;
  const isolated = createTypeScriptLoader({
    'src/features/concierge/provider/aiProvider.ts': {
      tryAiProvider: async () => { providerCalls += 1; return 'unexpected'; },
      tryAiChat: async () => { providerCalls += 1; return 'unexpected'; },
    },
  });
  const { chatWithFinancialContext } = isolated('src/features/concierge/concierge.ts');
  const response = await chatWithFinancialContext('Summarise my spending', [], {
    language: 'en',
    guidanceLevel: 'balanced',
    bankingPurposes: ['everyday'],
    financialContext: fullContext,
    balanceHidden: false,
  });
  assert.equal(response.source, 'prepared-financial-context');
  assert.equal(response.usedFallback, true);
  assert.equal(providerCalls, 0);
});

test('remote AI requires explicit consent and receives only an eligible standalone question', async () => {
  const requests = [];
  const isolated = createTypeScriptLoader({
    'src/features/concierge/provider/aiProvider.ts': {
      tryAiProvider: async () => null,
      tryAiChat: async request => { requests.push(request); return 'Remote general education'; },
    },
  });
  const { chatWithFinancialContext } = isolated('src/features/concierge/concierge.ts');
  const options = {
    language: 'en', guidanceLevel: 'balanced', bankingPurposes: ['everyday'],
    financialContext: fullContext, balanceHidden: false,
  };
  const noConsent = await chatWithFinancialContext('What is a fixed deposit?', [], options);
  assert.equal(noConsent.source, 'prepared-general');
  assert.equal(requests.length, 0);

  const consented = await chatWithFinancialContext('What is a fixed deposit?', [], {
    ...options, allowRemoteAi: true,
  });
  assert.equal(consented.source, 'live-ai');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].question, 'What is a fixed deposit?');
  assert.deepEqual(requests[0].history, []);
  assert.equal('financialContext' in requests[0], false);
});

test('unclassified private wording and numeric details fail closed even with remote consent', async () => {
  let providerCalls = 0;
  const isolated = createTypeScriptLoader({
    'src/features/concierge/provider/aiProvider.ts': {
      tryAiProvider: async () => null,
      tryAiChat: async () => { providerCalls += 1; return 'unsafe'; },
    },
  });
  const { chatWithFinancialContext } = isolated('src/features/concierge/concierge.ts');
  const options = {
    language: 'en', guidanceLevel: 'balanced', bankingPurposes: ['everyday'],
    financialContext: fullContext, balanceHidden: false, allowRemoteAi: true,
  };
  const privateAsk = await chatWithFinancialContext(
    'Can you explain the thing I bought yesterday for S$842.55?', [], options,
  );
  const personalAsk = await chatWithFinancialContext(
    'Can you explain what I should do with my rainy-day pot?', [], options,
  );
  assert.equal(privateAsk.source, 'prepared-general');
  assert.equal(personalAsk.source, 'prepared-general');
  assert.equal(providerCalls, 0);
});

test('mixed financial conversations and any prior history cannot reach the provider', async () => {
  let providerCalls = 0;
  const isolated = createTypeScriptLoader({
    'src/features/concierge/provider/aiProvider.ts': {
      tryAiProvider: async () => null,
      tryAiChat: async () => { providerCalls += 1; return 'unsafe'; },
    },
  });
  const { chatWithFinancialContext } = isolated('src/features/concierge/concierge.ts');
  const options = {
    language: 'en', guidanceLevel: 'balanced', bankingPurposes: ['everyday'],
    financialContext: fullContext, balanceHidden: false, allowRemoteAi: true,
  };
  const history = [
    { role: 'user', text: 'Summarise my spending' },
    { role: 'model', text: 'Recorded spending was S$201.90.' },
  ];
  const withHistory = await chatWithFinancialContext('What is a fixed deposit?', history, options);
  const redactedMixed = await chatWithFinancialContext('What is a bond?', [], {
    ...options, conversationContainsFinancialContext: true,
  });
  assert.equal(withHistory.source, 'prepared-general');
  assert.equal(redactedMixed.source, 'prepared-general');
  assert.equal(providerCalls, 0);
});

test('existing safety guard runs before financial context and general chat still works', async () => {
  const { chatWithFinancialContext } = load('src/features/concierge/concierge.ts');
  const unsafe = await chatWithFinancialContext('Which bond should I buy for my investments?', [], {
    language: 'en', guidanceLevel: 'balanced', bankingPurposes: ['investments'],
    financialContext: fullContext, balanceHidden: false,
  });
  const payNow = await chatWithFinancialContext('How does PayNow work?', [], {
    language: 'en', guidanceLevel: 'balanced', bankingPurposes: ['everyday'],
    financialContext: fullContext, balanceHidden: false,
  });
  assert.equal(unsafe.source, 'prepared-general');
  assert.match(unsafe.text, /can'?t tell you what to buy|not advice/i);
  assert.match(payNow.text, /PayNow/);
  assert.equal(payNow.source, 'prepared-general');
});
