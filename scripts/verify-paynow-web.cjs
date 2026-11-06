/* Requires Expo Web on :8087 and an isolated Chromium CDP page on :9229.
 * No packages are needed. Drives the actual UI; never injects transaction state.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const targets = await (await fetch('http://localhost:9229/json/list')).json();
  const ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let sequence = 0;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data), callback = pending.get(message.id);
    if (callback) { pending.delete(message.id); message.error ? callback.reject(message.error) : callback.resolve(message.result); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++sequence, { resolve, reject }); ws.send(JSON.stringify({ id: sequence, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw result.exceptionDetails;
    return result.result.value;
  };
  const wait = async expression => {
    for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await delay(120); }
    throw new Error('Timed out: ' + expression);
  };
  const control = label => `([...document.querySelectorAll('[role="button"], [role="radio"]')].reverse().find(e => !e.closest('[aria-hidden="true"]') && e.getBoundingClientRect().width > 0 && (e.getAttribute('aria-label') === ${JSON.stringify(label)} || e.textContent.trim() === ${JSON.stringify(label)})))`;
  const click = async label => {
    const expression = control(label); await wait(`!!${expression}`);
    // Direct-route HTML may appear before React attaches its event handlers.
    await wait(`Object.keys(${expression}).some(key => key.startsWith('__reactProps$'))`);
    assert.equal(await evaluate(`!!(${expression}.disabled || ${expression}.getAttribute('aria-disabled') === 'true')`), false, 'Disabled: ' + label);
    await evaluate(`${expression}.click()`); await delay(120);
  };
  const input = label => `([...document.querySelectorAll('input')].reverse().find(e => !e.closest('[aria-hidden="true"]') && e.getBoundingClientRect().width > 0 && e.getAttribute('aria-label') === ${JSON.stringify(label)}))`;
  const type = async (label, value) => {
    if (label === 'PayNow mobile number' && !await evaluate(`!!${input(label)}`)) await click('Look up a mobile number');
    const expression = input(label); await wait(`!!${expression}`);
    await evaluate(`${expression}.focus(); ${expression}.select()`);
    await send('Input.insertText', { text: value });
    await wait(`${expression}.value === ${JSON.stringify(value)}`); await delay(120);
  };
  const bodyHas = text => `!!document.body && document.body.innerText.includes(${JSON.stringify(text)})`;
  const disabled = async label => evaluate(`!!(${control(label)}.disabled || ${control(label)}.getAttribute('aria-disabled') === 'true')`);
  const output = process.argv.find(arg => arg.startsWith('--output='))?.slice('--output='.length);
  const dir = path.join(process.cwd(), output ?? 'artifacts/paynow-integration-2026-11-06');
  fs.mkdirSync(dir, { recursive: true });
  const report = { source: { member2: '84026a8', member3: 'cc99ea5' }, viewportHeight: 900, cases: [], additional: [] };
  const screenshot = async name => {
    const result = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(result.data, 'base64'));
  };
  const scroll = async bottom => {
    await evaluate(`document.querySelectorAll('div').forEach(e => { if (getComputedStyle(e).overflowY === 'auto') e.scrollTop = ${bottom ? 'e.scrollHeight' : '0'}; })`);
    await delay(80);
  };
  const capture = async name => {
    const metrics = await evaluate(`(() => {
      const visible = e => !e.closest('[aria-hidden="true"]') && e.getBoundingClientRect().width > 0;
      const panel = [...document.querySelectorAll('[role="button"]')].find(e => e.getAttribute('aria-label') === 'Open development tools')?.parentElement;
      return { documentWidth: document.documentElement.scrollWidth, viewport: innerWidth,
        panelOverlap: panel ? panel.previousElementSibling.getBoundingClientRect().bottom > panel.getBoundingClientRect().top + 1 : false,
        clippedText: [...document.querySelectorAll('div')].filter(e => visible(e) && e.childNodes.length === 1 && e.firstChild.nodeType === 3 && e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent),
        shortTargets: [...document.querySelectorAll('[role="button"],[role="radio"]')].filter(e => visible(e) && e.getBoundingClientRect().height < 47.5).map(e => ({ label:e.getAttribute('aria-label') ?? e.textContent, height:e.getBoundingClientRect().height })) };
    })()`);
    await screenshot(name);
    assert.equal(metrics.documentWidth <= metrics.viewport, true, name + ': horizontal document overflow');
    assert.deepEqual(metrics.clippedText, [], name + ': clipped text');
    assert.equal(metrics.panelOverlap, false, name + ': development panel overlap');
    assert.deepEqual(metrics.shortTargets, [], name + ': touch targets');
    return metrics;
  };
  const modes = async (guidance, display) => {
    const panel = `([...document.querySelectorAll('[role="button"]')].reverse().find(e => !e.closest('[aria-hidden="true"]') && e.getAttribute('aria-label')?.startsWith('Banking preferences, ')))`;
    const panelClosed = await evaluate(`!!${panel} && ${panel}.getAttribute('aria-expanded') !== 'true'`);
    if (panelClosed) { await evaluate(`${panel}.click()`); await delay(80); }
    await click({ quick: 'Quick mode', balanced: 'Balanced mode', guided: 'Guided mode' }[guidance]);
    const readability = `([...document.querySelectorAll('[role="button"]')].reverse().find(e => !e.closest('[aria-hidden="true"]') && e.getAttribute('aria-label')?.startsWith('Readability, ')))`;
    await wait(`!!${readability}`);
    if (!await evaluate(`${readability}.getAttribute('aria-expanded') === 'true'`)) { await evaluate(`${readability}.click()`); await delay(80); }
    await click({ standard: 'Standard', largeText: 'Large text', highClarity: 'High clarity' }[display]);
    await evaluate(`${readability}.click()`); await delay(100);
    if (panelClosed) { await evaluate(`${panel}.click()`); await delay(80); }
  };
  const load = async route => {
    await send('Page.navigate', { url: 'http://localhost:8087' + route });
    await wait(`!!${control(route === '/paynow' ? 'Continue to recipient' : 'Confirm and send')} || ${bodyHas('The transfer was not confirmed.')}`);
    await wait(`Object.keys(document.querySelector('[role="button"]')).some(key => key.startsWith('__reactProps$'))`);
    await delay(250);
  };
  if (process.argv.includes('--inspect')) {
    console.log(JSON.stringify(await evaluate(`({route:location.pathname,inputs:[...document.querySelectorAll('input')].map(e=>({label:e.getAttribute('aria-label'),value:e.value,hidden:!!e.closest('[aria-hidden="true"]'),width:e.getBoundingClientRect().width})),text:document.body.innerText.slice(-800)})`),null,2));
    ws.close();return;
  }
  await send('Page.enable'); await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  if (process.argv.includes('--starts')) {
    const starts = [];
    for (const width of [320, 390, 430]) for (const display of ['standard', 'highClarity']) for (const guidance of ['quick', 'guided']) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true });
      await load('/paynow'); await modes(guidance, display); await scroll(false);
      starts.push({ name: `${width}-${display}-${guidance}`, metrics: await capture(`${width}-${display}-${guidance}-start`) });
    }
    fs.writeFileSync(path.join(dir, 'runtime-start-results.json'), JSON.stringify(starts, null, 2));
    console.log(`All ${starts.length} Start screen combinations passed.`); ws.close(); return;
  }
  if (process.argv.includes('--extras')) {
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
    await load('/paynow'); await modes('balanced', 'largeText'); await click('Continue to recipient');
    await wait(`location.pathname === '/paynow/recipient'`); await click('Pay Alex Tan at DBS'); await click('Continue to amount'); await wait(`location.pathname === '/paynow/amount'`);
    await type('Amount (SGD)', '1.000'); await click('Review transfer'); await wait(bodyHas('Use at most 2 decimal places'));
    assert.equal(await evaluate('location.pathname'), '/paynow/amount');
    await type('Amount (SGD)', '-5'); await click('Review transfer'); await wait(bodyHas('one decimal point'));
    assert.equal(await evaluate(`${input('Amount (SGD)')}.value`), '-5');
    await scroll(true); await capture('390-largeText-balanced-invalid-amount');
    await type('Amount (SGD)', '50'); await click('Review transfer'); await wait(`location.pathname === '/paynow/review'`);
    await click('Confirm and send'); await wait(`location.pathname === '/paynow/success'`); await wait(bodyHas('Transfer receipt'));
    const reference = await evaluate(`document.body.innerText.match(/FB-\\d{8}-\\d{4}/)?.[0]`); assert(reference);
    await modes('guided', 'highClarity'); await modes('balanced', 'largeText');
    assert.equal(await evaluate(`document.body.innerText.match(/FB-\\d{8}-\\d{4}/)?.[0]`), reference);
    await scroll(true); await capture('390-largeText-balanced-success');
    await load('/paynow/review'); assert.equal(await disabled('Confirm and send'), true);
    await click('Edit details'); await wait(`location.pathname === '/paynow/recipient'`);
    await send('Page.navigate', { url: 'http://localhost:8087/paynow/amount' });
    await wait(`!!${control('Choose recipient')}`); await click('Choose recipient'); await wait(`location.pathname === '/paynow/recipient'`);
    const extra = { balancedLargeText: true, invalidRawPreserved: true, referenceStableAcrossModes: true, directMissingRecipientRecovery: true };
    fs.writeFileSync(path.join(dir, 'runtime-extra-results.json'), JSON.stringify(extra, null, 2));
    console.log(JSON.stringify(extra)); ws.close(); return;
  }
  for (const width of [320, 390, 430]) for (const display of ['standard', 'highClarity']) for (const guidance of ['quick', 'guided']) {
    const name = `${width}-${display}-${guidance}`;
    const evidence = { name, screens: {} };
    console.log('Running ' + name);
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true });
    await load('/paynow'); await modes(guidance, display); await click('Continue to recipient');
    await wait(`location.pathname === '/paynow/recipient'`);
    await type('PayNow mobile number', '123'); await click('Find recipient'); await wait(bodyHas('8-digit Singapore mobile'));
    // Mode controls must not remount local lookup/error state.
    await modes(guidance === 'quick' ? 'guided' : 'quick', display === 'standard' ? 'highClarity' : 'standard');
    assert.equal(await evaluate(`${input('PayNow mobile number')}.value`), '123');
    assert.equal(await evaluate(bodyHas('8-digit Singapore mobile')), true);
    assert.equal(await evaluate('location.pathname'), '/paynow/recipient');
    await modes(guidance, display);
    await scroll(true); evidence.screens.lookupError = await capture(name + '-recipient-error');
    await type('PayNow mobile number', '+65 9000-4821'); await click('Find recipient'); await wait(`!!${control('Use Alex Tan as recipient')}`);
    assert.equal(await evaluate('location.pathname'), '/paynow/recipient', 'Lookup must not select automatically');
    await click('Use Alex Tan as recipient'); await click('Continue to amount'); await wait(`location.pathname === '/paynow/amount'`);
    await type('Amount (SGD)', '13.');
    await modes(guidance === 'quick' ? 'guided' : 'quick', display === 'standard' ? 'highClarity' : 'standard');
    assert.equal(await evaluate(`${input('Amount (SGD)')}.value`), '13.');
    assert.equal(await evaluate('location.pathname'), '/paynow/amount');
    await modes(guidance, display); await type('Amount (SGD)', '13.13');
    await scroll(true); evidence.screens.amount = await capture(name + '-amount');
    await click('Review transfer'); await wait(`location.pathname === '/paynow/review'`); await wait(`!!${control('Confirm and send')}`);
    assert.equal(await disabled('Confirm and send'), false);
    assert.equal(await evaluate(bodyHas('Alex Tan')), true); assert.equal(await evaluate(bodyHas('S$13.13')), true);
    await modes(guidance === 'quick' ? 'guided' : 'quick', display === 'standard' ? 'highClarity' : 'standard');
    assert.equal(await disabled('Confirm and send'), false, 'Preference change must not invalidate review');
    await modes(guidance, display); await scroll(true); evidence.screens.review = await capture(name + '-review');
    await click('Confirm and send'); await wait(`location.pathname === '/paynow/success'`); await wait(bodyHas('Edit details and try again'));
    assert.equal(await evaluate(bodyHas('Transfer receipt')), false, 'Failure must not show receipt');
    await scroll(false); evidence.screens.failure = await capture(name + '-failure');
    await modes(guidance === 'quick' ? 'guided' : 'quick', display === 'standard' ? 'highClarity' : 'standard');
    assert.equal(await evaluate(bodyHas('Edit details and try again')), true); assert.equal(await evaluate(bodyHas('Transfer receipt')), false);
    await modes(guidance, display); await click('Edit details and try again'); await wait(`location.pathname === '/paynow/amount'`);
    assert.equal(await evaluate(`${input('Amount (SGD)')}.value`), '13.13', 'Retry must preserve amount');
    await type('Amount (SGD)', '13.14'); await click('Review transfer'); await wait(`location.pathname === '/paynow/review'`);
    assert.equal(await disabled('Confirm and send'), true); await click('I have reviewed the details');
    await wait(`!${control('Confirm and send')}.disabled`); assert.equal(await disabled('Confirm and send'), false);
    await click('Confirm and send'); await wait(`location.pathname === '/paynow/success'`); await wait(bodyHas('Transfer receipt'));
    await scroll(true); evidence.screens.success = await capture(name + '-success');
    assert.equal(await evaluate(bodyHas('S$13.14')), true); evidence.failedAt1313 = true; evidence.retryPreservedDraft = true; evidence.reReviewRequired = true; evidence.confirmedAt1314 = true;
    report.cases.push(evidence); fs.writeFileSync(path.join(dir, 'runtime-results.json'), JSON.stringify(report, null, 2));
    console.log('Passed ' + name);
  }
  // Direct-route guards, unchanged-value edit, and actual cancellation.
  await load('/paynow/review'); assert.equal(await disabled('Confirm and send'), true);
  await capture('direct-empty-review'); report.additional.push('Empty direct Review cannot confirm');
  await load('/paynow/success'); assert.equal(await evaluate(bodyHas('Transfer receipt')), false); await capture('direct-empty-outcome');
  report.additional.push('Empty direct Success cannot show receipt');
  await load('/paynow'); await click('Continue to recipient'); await wait(`location.pathname === '/paynow/recipient'`);
  await click('Pay Alex Tan at DBS'); await click('Continue to amount'); await wait(`location.pathname === '/paynow/amount'`); await type('Amount (SGD)', '50');
  await click('Review transfer'); await wait(`location.pathname === '/paynow/review'`); await click('Edit details'); await wait(`location.pathname === '/paynow/amount'`);
  assert.equal(await evaluate(`${input('Amount (SGD)')}.value`), '50'); await click('Review transfer'); await wait(`location.pathname === '/paynow/review'`);
  assert.equal(await disabled('Confirm and send'), false); report.additional.push('Unchanged amount does not force re-review');
  await click('Cancel transfer'); await wait(`location.pathname === '/home'`); report.additional.push('Cancel returns Home');
  // SPA history transition keeps the cancelled draft; no reload is used here.
  await evaluate('history.back()'); await delay(300);
  if (await evaluate(`location.pathname === '/paynow/amount'`)) {
    assert.equal(await evaluate(`${input('Amount (SGD)')}.value`), '', 'Cancelled draft must be empty on remount');
  }
  fs.writeFileSync(path.join(dir, 'runtime-results.json'), JSON.stringify(report, null, 2));
  console.log('All 12 UI journeys passed. ' + JSON.stringify(report.additional)); ws.close();
})().catch(error => { console.error(error); process.exit(1); });
