const assert = require('node:assert/strict');
const fs = require('node:fs');
const { connect } = require('./helpers/v2-browser.cjs');

(async () => {
  const b = await connect();
  const report = [];
  const focus = label => b.evaluate(`${b.control(label)}.focus()`);
  const activeLabel = () => b.evaluate(`document.activeElement.getAttribute('aria-label') ?? document.activeElement.textContent.trim()`);
  for (const display of ['standard', 'largeText', 'highClarity']) {
    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
    await b.start('guided', display);
    await focus('Pay Alex Tan at DBS');
    await b.key('Enter', 'Enter', 13);
    await b.route('/paynow/recipient');
    assert.equal((await b.state()).transaction.recipientName, 'Alex Tan');
    let reachedContinue = false;
    for (let i = 0; i < 30; i++) {
      await b.key('Tab', 'Tab', 9);
      if (await activeLabel() === 'Continue to amount') { reachedContinue = true; break; }
    }
    assert(reachedContinue, 'Continue reachable by keyboard');
    await b.key('Enter', 'Enter', 13);
    await b.route('/paynow/amount');
    await b.type('Amount (SGD)', '50');
    await b.key('Enter', 'Enter', 13);
    await b.route('/paynow/review');
    const draft = (await b.state()).transaction;
    assert.equal(draft.status, 'readyForReview');
    await focus('Confirm and send');
    await b.key('Tab', 'Tab', 9);
    assert.equal(await activeLabel(), 'Edit details');
    await b.key('Tab', 'Tab', 9);
    assert.equal(await activeLabel(), 'Cancel transfer');
    assert.deepEqual((await b.state()).transaction, draft);

    const panel = `([...document.querySelectorAll('[role="button"]')].reverse().find(e => !e.closest('[aria-hidden="true"]') && e.getAttribute('aria-label')?.startsWith('Banking preferences, ')))`;
    await b.evaluate(`${panel}.focus()`);
    await b.key('Enter', 'Enter', 13);
    assert.equal(await b.evaluate(`${panel}.getAttribute('aria-expanded')`), 'true');
    await focus('Guided mode');
    await b.key('ArrowLeft', 'ArrowLeft', 37);
    assert.equal((await b.state()).preferences.guidanceLevel, 'balanced');
    await b.key('End', 'End', 35);
    assert.equal((await b.state()).preferences.guidanceLevel, 'guided');
    assert.equal(await b.evaluate(`${b.control('Guided mode')}.getAttribute('aria-checked')`), 'true');
    const readability = `([...document.querySelectorAll('[role="button"]')].reverse().find(e => !e.closest('[aria-hidden="true"]') && e.getAttribute('aria-label')?.startsWith('Readability, ')))`;
    await b.evaluate(`${readability}.focus()`);
    await b.key('Enter', 'Enter', 13);
    await focus({ standard: 'Standard', largeText: 'Large text', highClarity: 'High clarity' }[display]);
    await b.key('Home', 'Home', 36);
    assert.equal((await b.state()).preferences.displayMode, 'standard');
    await b.key('End', 'End', 35);
    assert.equal((await b.state()).preferences.displayMode, 'highClarity');
    assert.deepEqual((await b.state()).transaction, draft);
    await b.route('/paynow/review');

    await focus('Explain this screen');
    await b.key('Enter', 'Enter', 13);
    await b.route('/concierge');
    await focus('Explain the review screen');
    await b.key('Enter', 'Enter', 13);
    await b.wait(`document.body.innerText.includes('This screen shows who you are paying')`);
    assert.deepEqual((await b.state()).transaction, draft);
    await focus('Go back');
    await b.key('Enter', 'Enter', 13);
    await b.route('/paynow/review');
    assert.deepEqual((await b.state()).transaction, draft);
    await focus('Cancel transfer');
    await b.key('Enter', 'Enter', 13);
    await b.route('/home');
    assert.equal((await b.state()).transaction.status, 'cancelled');
    report.push({ display, explicitRecipientSelection: true, tabToContinue: true, amountEnterOnlyReviews: true,
      reviewActionOrder: true, modeRadioKeys: true, expandedState: true, conciergeReadOnly: true, keyboardCancel: true });
    console.log('Passed keyboard ' + display);
  }
  fs.writeFileSync('artifacts/v2-complete/keyboard-results.json', JSON.stringify(report, null, 2));
  b.close();
})().catch(error => { console.error(error); process.exit(1); });
