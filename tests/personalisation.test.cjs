const test = require('node:test');
const assert = require('node:assert/strict');
const { createTypeScriptLoader } = require('./helpers/load-ts.cjs');

const load = createTypeScriptLoader();
const { recommendHomeExperience, applyRecommendedWidgetOrder } = load('src/features/adaptive/homeRecommendations.ts');
const { DEFAULT_HOME_LAYOUT } = load('src/types/home.ts');
const { DEFAULT_PREFERENCES } = load('src/types/preferences.ts');
const { initialSessionState, sessionReducer } = load('src/state/reducer.ts');
const { MOCK_RECIPIENTS } = load('src/data/recipients.ts');

const recommend = (preferences, existingLayout) => recommendHomeExperience({
  preferences, existingLayout, approvedWidgetIds: DEFAULT_HOME_LAYOUT.map(widget => widget.id),
});
const send = (state, type, payload) => sessionReducer(state, { type, payload });

function reviewed() {
  let state = send(structuredClone(initialSessionState), 'START_TRANSFER');
  state = send(state, 'SET_RECIPIENT', MOCK_RECIPIENTS[0]);
  state = send(state, 'SET_AMOUNT', 50);
  return send(state, 'MARK_READY_FOR_REVIEW');
}

test('homepage suggestions are deterministic and do not mutate saved choices', () => {
  const state = reviewed();
  const original = structuredClone(state);
  const first = recommend(state.preferences, state.homeLayout);
  assert.deepEqual(recommend(state.preferences, state.homeLayout), first);
  assert.deepEqual(state, original);
});

test('applying recommended order preserves hidden widgets, titles and other widget settings', () => {
  const layout = structuredClone(DEFAULT_HOME_LAYOUT).reverse().map((widget, position) => ({
    ...widget, position, visible: position % 2 === 0, title: `Saved ${widget.title}`, priority: position * 7,
  }));
  const original = structuredClone(layout);
  const order = recommend(DEFAULT_PREFERENCES, layout).widgetOrder;
  const applied = applyRecommendedWidgetOrder(layout, order);
  assert.deepEqual(layout, original);
  assert.deepEqual(applied.map(widget => widget.id), order);
  assert.equal(applied.length, layout.length);
  applied.forEach((widget, position) => {
    const saved = layout.find(item => item.id === widget.id);
    assert.deepEqual(widget, { ...saved, position });
  });
});

test('priority changes update recommendations without applying a layout or changing other preferences', () => {
  const state = reviewed();
  const next = send(state, 'SET_PREFERENCES', { priorities: ['guidance', 'accessibility'] });
  assert.strictEqual(next.transaction, state.transaction);
  assert.strictEqual(next.homeLayout, state.homeLayout);
  assert.deepEqual(next.preferences, { ...state.preferences, priorities: ['guidance', 'accessibility'] });
  assert.equal(recommend(next.preferences, next.homeLayout).guidanceSuggestion.mode, 'guided');
  assert.equal(next.preferences.guidanceLevel, 'balanced');
});

test('accepting a homepage arrangement does not apply its banking pace suggestion', () => {
  const state = reviewed();
  const recommendation = recommend(state.preferences, state.homeLayout);
  assert.equal(recommendation.guidanceSuggestion.mode, 'quick');
  const next = send(state, 'SET_HOME_LAYOUT', applyRecommendedWidgetOrder(state.homeLayout, recommendation.widgetOrder));
  assert.strictEqual(next.preferences, state.preferences);
  assert.strictEqual(next.transaction, state.transaction);
  assert.equal(next.preferences.guidanceLevel, 'balanced');
});

test('accepting a pace suggestion does not apply a homepage arrangement', () => {
  const state = reviewed();
  const suggestion = recommend(state.preferences, state.homeLayout).guidanceSuggestion;
  const next = send(state, 'SET_PREFERENCES', { guidanceLevel: suggestion.mode });
  assert.strictEqual(next.homeLayout, state.homeLayout);
  assert.strictEqual(next.transaction, state.transaction);
  assert.deepEqual(next.preferences, { ...state.preferences, guidanceLevel: 'quick' });
});

test('manual ordering and visibility survive later priorities, modes and suggestion calculations', () => {
  const state = reviewed();
  const manual = [...state.homeLayout].reverse().map((widget, position) => ({ ...widget, position, visible: widget.id !== 'w-recent' }));
  let next = send(state, 'SET_HOME_LAYOUT', manual);
  next = send(next, 'SET_PREFERENCES', { priorities: ['moneyManagement', 'guidance'] });
  next = send(next, 'SET_DISPLAY_MODE', 'highClarity');
  const recommendation = recommend(next.preferences, next.homeLayout);
  assert.strictEqual(next.homeLayout, manual);
  assert.strictEqual(next.transaction, state.transaction);
  const explicitlyApplied = send(next, 'SET_HOME_LAYOUT', applyRecommendedWidgetOrder(manual, recommendation.widgetOrder));
  assert.equal(explicitlyApplied.homeLayout.find(widget => widget.id === 'w-recent').visible, false);
  assert.strictEqual(explicitlyApplied.transaction, state.transaction);
});

test('every pace/display combination preserves a reviewed transaction and saved manual layout', () => {
  const state = reviewed();
  for (const guidanceLevel of ['quick', 'balanced', 'guided']) {
    for (const displayMode of ['standard', 'largeText', 'highClarity']) {
      const pace = send(state, 'SET_PREFERENCES', { guidanceLevel });
      const display = send(pace, 'SET_DISPLAY_MODE', displayMode);
      recommend(display.preferences, display.homeLayout);
      assert.strictEqual(display.transaction, state.transaction);
      assert.strictEqual(display.homeLayout, state.homeLayout);
    }
  }
});

test('reset preserves the active transfer and restores existing personalisation defaults', () => {
  const state = send(reviewed(), 'SET_PREFERENCES', { priorities: ['guidance'], displayMode: 'highClarity' });
  const next = send(state, 'RESET_PREFERENCES');
  assert.strictEqual(next.transaction, state.transaction);
  assert.deepEqual(next.preferences, DEFAULT_PREFERENCES);
  assert.deepEqual(next.homeLayout, DEFAULT_HOME_LAYOUT);
});
