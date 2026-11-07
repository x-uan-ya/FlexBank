const test = require('node:test');
const assert = require('node:assert/strict');
const { createTypeScriptLoader } = require('./helpers/load-ts.cjs');

/**
 * Backend proxy UNIT tests (no network, no Gemini call).
 *
 * Covers the deterministic server-side logic: the input safety guard and the
 * instruction builder. The live Gemini call and its 429->503 mapping are
 * verified separately at runtime (see server smoke test); mocking the SDK here
 * would add no confidence over the pure-logic checks below.
 */

const load = createTypeScriptLoader();
const { checkUserText } = load('server/src/safety.ts');
const { buildInstruction, SYSTEM_PROMPT } = load('server/src/prompt.ts');

test('safety: plain banking questions are allowed', () => {
  for (const q of [
    'What is a fixed deposit?',
    'How does PayNow work?',
    'Explain bond coupons please',
    'What does maturity mean?',
  ]) {
    assert.equal(checkUserText(q).safe, true, q);
  }
});

test('safety: transaction intent is refused', () => {
  const v = checkUserText('please confirm my transfer now');
  assert.equal(v.safe, false);
  assert.match(v.refusal, /can'?t (make|confirm)|only you/i);
});

test('safety: credential disclosure is refused', () => {
  const v = checkUserText('here is my OTP 123456');
  assert.equal(v.safe, false);
  assert.match(v.refusal, /don'?t share|never asks/i);
});

test('safety: personalised advice is refused', () => {
  const v = checkUserText('what should I buy to guarantee a return?');
  assert.equal(v.safe, false);
  assert.match(v.refusal, /can'?t tell you what to buy|not advice/i);
});

test('safety: empty/undefined text is treated as safe (nothing to scan)', () => {
  assert.equal(checkUserText(undefined).safe, true);
  assert.equal(checkUserText('').safe, true);
});

test('prompt: system prompt encodes the hard safety rules', () => {
  assert.match(SYSTEM_PROMPT, /MUST NOT/);
  assert.match(SYSTEM_PROMPT, /transaction|payment/i);
  assert.match(SYSTEM_PROMPT, /password|OTP|PIN/i);
  assert.match(SYSTEM_PROMPT, /not advice|general information/i);
});

test('prompt: guidance level shapes instruction length hint', () => {
  const quick = buildInstruction({ task: 'chat', question: 'What is a bond?', guidanceLevel: 'quick' });
  const guided = buildInstruction({ task: 'chat', question: 'What is a bond?', guidanceLevel: 'guided' });
  assert.match(quick, /1-2 short sentences/i);
  assert.match(guided, /step-by-step/i);
});

test('prompt: language hint switches to Mandarin', () => {
  const zh = buildInstruction({ task: 'explain', context: 'paynow-review', language: 'zh' });
  assert.match(zh, /Mandarin/i);
});

test('prompt: each task produces a distinct instruction', () => {
  const explain = buildInstruction({ task: 'explain', context: 'paynow-amount' });
  const simplify = buildInstruction({ task: 'simplify', text: 'A proxy is an identifier.' });
  const translate = buildInstruction({ task: 'translate', text: 'Hello', language: 'zh' });
  const chat = buildInstruction({ task: 'chat', question: 'What is interest?' });
  assert.match(explain, /Explain/i);
  assert.match(simplify, /simpler/i);
  assert.match(translate, /Translate/i);
  assert.match(chat, /user asks/i);
});
