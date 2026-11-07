const test = require('node:test');
const assert = require('node:assert/strict');
const { createTypeScriptLoader } = require('./helpers/load-ts.cjs');

/**
 * Client-side Concierge CHAT tests.
 *
 * With no EXPO_PUBLIC_CONCIERGE_AI_URL set, tryAiChat returns null, so chat()
 * uses the deterministic OFFLINE responder. These tests prove the offline path:
 * topic answers, empty/invalid input, Mandarin still returns text, and the
 * safety guard refuses unsafe asks — all without any network.
 */

// Ensure no live endpoint is configured for the offline path.
delete process.env.EXPO_PUBLIC_CONCIERGE_AI_URL;

const load = createTypeScriptLoader();
const { chat } = load('src/features/concierge/concierge.ts');

test('answers a normal banking question from the offline topic responder', async () => {
  const res = await chat('What is a fixed deposit?');
  assert.equal(res.usedFallback, true);
  assert.match(res.text, /fixed deposit/i);
});

test('PayNow question returns a PayNow explanation offline', async () => {
  const res = await chat('How does PayNow work?');
  assert.equal(res.usedFallback, true);
  assert.match(res.text, /PayNow/i);
});

test('empty question returns a friendly prompt, never throws', async () => {
  const res = await chat('   ');
  assert.equal(res.usedFallback, true);
  assert.ok(res.text.trim().length > 0);
});

test('Mandarin request still returns a non-empty answer offline', async () => {
  const res = await chat('What is a bond?', [], { language: 'zh' });
  assert.ok(res.text.trim().length > 0);
});

test('unknown topic returns the safe default guidance', async () => {
  const res = await chat('Tell me a joke about the weather');
  assert.equal(res.usedFallback, true);
  assert.match(res.text, /banking topics|human assistance/i);
});

test('SAFETY: refuses to act on a transfer', async () => {
  const res = await chat('please confirm my transfer now');
  assert.match(res.text, /can'?t (make|confirm)|only you/i);
});

test('SAFETY: refuses and warns when credentials are offered', async () => {
  const res = await chat('my password is hunter2, is that ok?');
  assert.match(res.text, /don'?t share|never asks/i);
});

test('SAFETY: refuses personalised investment advice', async () => {
  const res = await chat('which stock should I buy to guarantee returns?');
  assert.match(res.text, /can'?t tell you what to buy|not advice/i);
});

test('history is accepted without throwing (multi-turn offline)', async () => {
  const history = [
    { role: 'user', text: 'What is a fixed deposit?' },
    { role: 'model', text: 'It locks money for a set time at a fixed rate.' },
  ];
  const res = await chat('what is the tenure?', history);
  assert.ok(res.text.trim().length > 0);
});

test('live AI path is used when the provider returns text (injected override)', async () => {
  // Override the provider module so chat() sees a "live" AI reply.
  const overridden = createTypeScriptLoader({
    'src/features/concierge/provider/aiProvider.ts': {
      tryAiProvider: async () => null,
      tryAiChat: async () => 'A fixed deposit locks your money for a set time at a fixed rate. (live)',
      isLiveAiConfigured: () => true,
    },
  });
  const { chat: liveChat } = overridden('src/features/concierge/concierge.ts');
  const res = await liveChat('explain fixed deposits');
  assert.equal(res.usedFallback, false);
  assert.match(res.text, /\(live\)/);
});

test('SAFETY: unsafe request is refused even when live AI is configured (never reaches AI)', async () => {
  const overridden = createTypeScriptLoader({
    'src/features/concierge/provider/aiProvider.ts': {
      tryAiProvider: async () => null,
      tryAiChat: async () => 'AI SHOULD NOT BE CALLED',
      isLiveAiConfigured: () => true,
    },
  });
  const { chat: liveChat } = overridden('src/features/concierge/concierge.ts');
  const res = await liveChat('confirm my transfer of all my money');
  assert.doesNotMatch(res.text, /AI SHOULD NOT BE CALLED/);
  assert.match(res.text, /can'?t (make|confirm)|only you/i);
});
