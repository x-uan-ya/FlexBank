const test = require('node:test');
const assert = require('node:assert/strict');
const { createTypeScriptLoader } = require('./helpers/load-ts.cjs');
const { bankingReturnRoute } = createTypeScriptLoader()('src/utils/bankingNavigation.ts');

test('contextual Back accepts only existing banking destinations', () => {
  for (const value of ['/home','/customize','/settings','/paynow','/paynow/review','/paynow/success','/checkpoint']) {
    assert.equal(bankingReturnRoute(value), value);
  }
});
test('external, unknown and repeated query values fall back to a known app route', () => {
  for (const value of [undefined,null,42,['/settings'],'https://example.com','//example.com','/fake-bank','/home?amount=50']) {
    assert.equal(bankingReturnRoute(value),'/home');
    assert.equal(bankingReturnRoute(value,'/paynow'),'/paynow');
  }
});
