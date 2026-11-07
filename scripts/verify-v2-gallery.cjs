const assert = require('node:assert/strict');
const fs = require('node:fs');
const { connect } = require('./helpers/v2-browser.cjs');

(async () => {
  const b = await connect();
  await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
  const captures = [];
  const shot = async name => {
    await b.scroll(false);
    const contentHeight = await b.evaluate(`Math.ceil(900 + Math.max(0, ...[...document.querySelectorAll('div')].filter(e => !e.closest('[aria-hidden="true"]') && e.getBoundingClientRect().width > 0 && getComputedStyle(e).overflowY === 'auto').map(e => e.scrollHeight - e.clientHeight)))`);
    // Tall captures expose the complete scroll content; width/typography stay unchanged.
    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: contentHeight, deviceScaleFactor: 1, mobile: true });
    await b.delay(120);
    captures.push({ name, height: contentHeight, metrics: await b.capture('artifacts/v2-complete/gallery', name) });
    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
    await b.delay(90);
  };
  for (const [guidance, display] of [['balanced', 'standard'], ['guided', 'highClarity']]) {
    const prefix = '390-' + display;
    await b.home();
    await b.click('Settings'); await b.route('/settings'); await b.modes(guidance, display);
    await shot(prefix + '-settings');
    await b.click('Go back'); await b.route('/home'); await shot(prefix + '-home');
    await b.click('Made for you. Personalise your home dashboard'); await b.route('/customize'); await shot(prefix + '-made-for-you');
    await b.click('Go back'); await b.route('/home'); await b.click('PayNow'); await b.route('/paynow'); await shot(prefix + '-start');
    await b.click('Help with PayNow'); await b.route('/human-assistance'); await shot(prefix + '-human-assistance');
    const empty = (await b.state()).transaction;
    await b.click('Request human assistance');
    assert.deepEqual((await b.state()).transaction, empty);
    await shot(prefix + '-assistance-requested');
    await b.click('Go back'); await b.route('/paynow');
    // An explicit fresh transfer uses the existing action, including its assistance reset.
    await b.click('Continue to recipient'); await b.route('/paynow/recipient'); await shot(prefix + '-recipient');
    await b.saved(); await b.type('Amount (SGD)', '50'); await shot(prefix + '-amount');
    await b.click('Review transfer'); await b.route('/paynow/review'); await shot(prefix + '-review');
    const reviewed = (await b.state()).transaction;
    await b.click('Explain this screen'); await b.route('/concierge'); await b.click('Explain the review screen');
    await b.wait(`document.body.innerText.includes('This screen shows who you are paying')`);
    assert.deepEqual((await b.state()).transaction, reviewed); await shot(prefix + '-concierge');
    await b.click('Go back'); await b.route('/paynow/review');
    await b.click('Confirm and send'); await b.route('/paynow/success'); await shot(prefix + '-success');
    await b.click('Done — back to home'); await b.route('/home'); await b.click('PayNow'); await b.route('/paynow');
    await b.click('Continue to recipient'); await b.route('/paynow/recipient'); await b.saved(); await b.type('Amount (SGD)', '13.13');
    await b.click('Review transfer'); await b.route('/paynow/review'); await b.click('Confirm and send'); await b.route('/paynow/success');
    await shot(prefix + '-failure');
    const failed = (await b.state()).transaction;
    await b.click('Ask for help'); await b.route('/human-assistance'); await b.click('Go back'); await b.route('/paynow/success');
    assert.deepEqual((await b.state()).transaction, failed);
    console.log('Captured ' + prefix);
  }
  // Inspect the existing standalone checkpoint without changing its safety handler.
  await b.load('/checkpoint', "I'm sure, continue");
  await shot('390-standard-checkpoint');
  await b.click('Get help from a person'); await b.route('/human-assistance'); await b.click('Go back'); await b.route('/checkpoint');
  const before = (await b.state()).transaction;
  await b.click("I'm sure, continue");
  assert.deepEqual((await b.state()).transaction, before);
  assert.notEqual((await b.state()).transaction.status, 'confirmed');
  fs.writeFileSync('artifacts/v2-complete/gallery-results.json', JSON.stringify({ captures, assistancePreservesDraft: true, helpReturnsToCaller: true, checkpointNeverConfirms: true }, null, 2));
  b.close();
})().catch(error => { console.error(error); process.exit(1); });
