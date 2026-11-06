const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { connect } = require('./helpers/v2-browser.cjs');
const phase = process.argv.find(arg=>arg.startsWith('--phase='))?.slice(8) ?? 'baseline';
const root = path.join(process.cwd(),'artifacts','v2-complete');

(async()=>{
  const b=await connect();const stored=path.join(root,phase+'-results.json');
  const report=(process.argv.includes('--smoke-only')||process.argv.includes('--resume'))&&fs.existsSync(stored)?JSON.parse(fs.readFileSync(stored,'utf8')):{phase,cases:[]};
  const save=()=>fs.writeFileSync(path.join(root,phase+'-results.json'),JSON.stringify(report,null,2));
  const shot=async name=>{const metrics=await b.capture(path.join(root,phase),name,phase!=='baseline');report.cases.push({name,metrics});save()};
  await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});
  if(phase==='baseline'){
    await b.home();await b.scroll(false);await shot('home');await b.click('Made for you. Personalise your home dashboard');await b.route('/customize');await b.scroll(false);await shot('made-for-you');await b.click('Go back');await b.route('/home');
    await b.click('PayNow');await b.route('/paynow');await b.scroll(false);await shot('start');await b.click('Continue to recipient');await b.route('/paynow/recipient');await b.scroll(false);await shot('recipient');
    await b.saved();await b.type('Amount (SGD)','50');await b.scroll(false);await shot('amount');await b.click('Review transfer');await b.route('/paynow/review');await b.scroll(false);await shot('review');
    await b.click('Confirm and send');await b.route('/paynow/success');await b.scroll(false);await shot('success');await b.click('Done — back to home');await b.route('/home');await b.click('Settings');await b.route('/settings');await b.scroll(false);await shot('settings');
    await b.click('Go back');await b.route('/home');await b.click('Ask Banking Concierge');await b.route('/concierge');await b.scroll(false);await shot('concierge');
    await b.review('13.13');await b.click('Confirm and send');await b.route('/paynow/success');await b.scroll(false);await shot('failure');
  }
  if(phase==='start'){
    await b.home();const initial=(await b.state()).transaction;await b.click('PayNow');await b.route('/paynow');assert.deepEqual((await b.state()).transaction,initial);
    await b.modes('guided','highClarity');assert.deepEqual((await b.state()).transaction,initial);await b.scroll(false);await shot('start-390-highClarity');
    await b.modes('balanced','standard');await b.scroll(false);await shot('start-390-standard');
    await b.click('Continue to recipient');await b.route('/paynow/recipient');assert.equal((await b.state()).transaction.status,'editing');
  }
  if(phase==='recipient'){
    for(const [width,guidance,display] of [[390,'balanced','standard'],[320,'guided','highClarity'],[1280,'quick','standard']]){
      const name=width+'-'+display;await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
      await b.start(guidance,display);const before=(await b.state()).transaction;
      assert.equal(await b.evaluate(`!!${b.control('Continue to amount')}.disabled`),true);
      await b.type('PayNow mobile number','123');await b.click('Find recipient');assert.equal(await b.evaluate(`document.body.innerText.includes('8-digit Singapore mobile')`),true);
      await b.modes('quick',display==='standard'?'highClarity':'standard');assert.equal(await b.evaluate(`${b.input('PayNow mobile number')}.value`),'123');assert.deepEqual((await b.state()).transaction,before);
      await b.modes(guidance,display);await b.scroll(false);await shot(name+'-recipient');
      await b.type('PayNow mobile number','+65 9000-4821');await b.click('Find recipient');assert.deepEqual((await b.state()).transaction,before);
      await b.click('Use Alex Tan as recipient');await b.route('/paynow/recipient');assert.equal((await b.state()).transaction.recipientName,'Alex Tan');
      await b.scroll(true);await shot(name+'-selected-recipient');await b.click('Continue to amount');await b.route('/paynow/amount');
    }
  }
  if(phase==='amount'){
    for(const [width,guidance,display] of [[390,'balanced','standard'],[320,'guided','highClarity'],[1280,'quick','standard']]){
      const name=width+'-'+display;await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
      await b.start(guidance,display);await b.saved();const before=(await b.state()).transaction;
      for(const value of ['-5','1.000','0.99','25001','13000']){await b.type('Amount (SGD)',value);await b.click('Review transfer');await b.route('/paynow/amount');assert.deepEqual((await b.state()).transaction,before)}
      await b.type('Amount (SGD)','1.000');await b.click('Review transfer');assert.equal(await b.evaluate(`document.body.innerText.includes('Use at most 2 decimal places')`),true);
      await b.scroll(true);await shot(name+'-amount-error');await b.type('Amount (SGD)','13.');await b.modes('quick',display==='standard'?'highClarity':'standard');assert.equal(await b.evaluate(`${b.input('Amount (SGD)')}.value`),'13.');assert.deepEqual((await b.state()).transaction,before);
      await b.modes(guidance,display);await b.type('Amount (SGD)','50');await b.scroll(false);await shot(name+'-amount');await b.click('Review transfer');await b.route('/paynow/review');assert.equal((await b.state()).transaction.status,'readyForReview');
      await b.click('Edit details');await b.route('/paynow/amount');await b.click('Review transfer');await b.route('/paynow/review');assert.equal((await b.state()).transaction.requiresReview,false);
    }
  }
  if(phase==='review'){
    for(const [width,guidance,display] of [[390,'quick','standard'],[320,'guided','highClarity'],[1280,'balanced','largeText']]){
      const name=width+'-'+display;await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
      await b.review('50',guidance,display);const reviewed=(await b.state()).transaction;await b.scroll(false);await shot(name+'-review');
      assert.equal(await b.evaluate(`document.body.innerText.includes('Everyday Account')`),true);
      await b.modes('balanced',display==='standard'?'highClarity':'standard');assert.deepEqual((await b.state()).transaction,reviewed);await b.modes(guidance,display);
      await b.click('Edit details');await b.route('/paynow/amount');await b.type('Amount (SGD)','51');await b.click('Review transfer');await b.route('/paynow/review');assert.equal((await b.state()).transaction.requiresReview,true);assert.equal(await b.evaluate(`!!${b.control('Confirm and send')}.disabled`),true);
      await b.scroll(true);await shot(name+'-re-review');await b.click('I have reviewed the details');assert.equal(await b.evaluate(`!!${b.control('Confirm and send')}.disabled`),false);
      await b.click('Cancel transfer');await b.route('/home');assert.equal((await b.state()).transaction.status,'cancelled');assert.equal((await b.state()).transaction.recipientId,undefined);
    }
    await b.load('/paynow/review','Confirm and send');assert.equal(await b.evaluate(`!!${b.control('Confirm and send')}.disabled`),true);await b.scroll(false);await shot('direct-empty-review');
    await b.click('Edit details');await b.route('/paynow/recipient');
  }
  if(phase==='outcome'){
    for(const [width,guidance,display] of [[390,'balanced','standard'],[320,'guided','highClarity'],[1280,'quick','standard']]){
      const name=width+'-'+display;await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
      await b.review('50',guidance,display);await b.click('Confirm and send');await b.route('/paynow/success');assert.equal((await b.state()).transaction.status,'confirmed');
      const reference=await b.evaluate(`document.body.innerText.match(/FB-\\d{8}-\\d{4}/)?.[0]`);assert(reference);const confirmed=(await b.state()).transaction;
      await b.modes('guided',display==='standard'?'highClarity':'standard');assert.deepEqual((await b.state()).transaction,confirmed);assert.equal(await b.evaluate(`document.body.innerText.match(/FB-\\d{8}-\\d{4}/)?.[0]`),reference);await b.modes(guidance,display);await b.scroll(false);await shot(name+'-success');
      await b.review('13.13',guidance,display);await b.click('Confirm and send');await b.route('/paynow/success');const failed=(await b.state()).transaction;assert.equal(failed.status,'failed');assert.equal(await b.evaluate(`document.body.innerText.includes('Transfer receipt')`),false);await b.scroll(false);await shot(name+'-failure');
      await b.modes('quick',display==='standard'?'highClarity':'standard');assert.deepEqual((await b.state()).transaction,failed);await b.modes(guidance,display);
      await b.click('Edit details and try again');await b.route('/paynow/amount');assert.equal(await b.evaluate(`${b.input('Amount (SGD)')}.value`),'13.13');
      await b.click('Review transfer');await b.route('/paynow/review');assert.equal(await b.evaluate(`!!${b.control('Confirm and send')}.disabled`),true);await b.click('I have reviewed the details');await b.click('Confirm and send');await b.route('/paynow/success');assert.equal((await b.state()).transaction.status,'failed');
      await b.click('Edit details and try again');await b.route('/paynow/amount');await b.type('Amount (SGD)','13.14');await b.click('Review transfer');await b.route('/paynow/review');await b.click('I have reviewed the details');await b.click('Confirm and send');await b.route('/paynow/success');assert.equal((await b.state()).transaction.status,'confirmed');
    }
    await b.load('/paynow/success','Done — back to home');assert.equal(await b.evaluate(`document.body.innerText.includes('Transfer receipt')`),false);await b.scroll(false);await shot('direct-empty-outcome');await b.click('Return to PayNow');await b.route('/paynow');
  }
  if(phase==='settings'){
    for(const [width,guidance,display] of [[390,'balanced','standard'],[320,'guided','highClarity'],[1280,'quick','standard']]){
      const name=width+'-'+display;await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
      await b.review('50',guidance,display);const draft=(await b.state()).transaction;await b.backHome();
      await b.click('Edit homepage shortcuts');await b.route('/customize');await b.click('Customise manually');await b.click('Move PayNow down');await b.click('Hide Recent recipients');await b.click('Keep my current layout');await b.route('/home');
      const layout=(await b.state()).homeLayout;await b.click('Settings');await b.route('/settings');await b.modes(guidance,display);assert.deepEqual((await b.state()).transaction,draft);assert.deepEqual((await b.state()).homeLayout,layout);await b.scroll(false);await shot(name+'-settings');
      await b.click('More preferences');await b.click('Payments');assert.deepEqual((await b.state()).transaction,draft);assert.deepEqual((await b.state()).homeLayout,layout);
      await b.evaluate(`${b.control('Money management')}.focus()`);await b.key(' ','Space',32);assert.equal((await b.state()).preferences.priorities.includes('moneyManagement'),false);
      await b.evaluate(`${b.control('Classic Banking theme')}.focus()`);await b.key('ArrowRight','ArrowRight',39);assert.equal((await b.state()).preferences.visualTheme,'nature');assert.deepEqual((await b.state()).transaction,draft);await b.key('Home','Home',36);assert.equal((await b.state()).preferences.visualTheme,'classic');
      await b.scroll(true);await shot(name+'-more-preferences');await b.click('Reset to standard');assert.deepEqual((await b.state()).transaction,draft);assert.equal((await b.state()).preferences.displayMode,'standard');assert.equal((await b.state()).homeLayout.every(w=>w.visible),true);
      await b.click('Made for You');await b.route('/customize');await b.click('Go back');await b.route('/settings');assert.deepEqual((await b.state()).transaction,draft);
      await b.click('Ask Banking Concierge');await b.route('/concierge');await b.click('Explain the review screen');await b.wait(`document.body.innerText.includes('This screen shows who you are paying')`);assert.deepEqual((await b.state()).transaction,draft);await b.click('Go back');await b.route('/settings');
    }
  }
  if(phase==='audit'){
    if(!process.argv.includes('--smoke-only'))for(const width of [320,375,390,430,768,1280])for(const display of ['standard','largeText','highClarity']){
      const name=width+'-'+display;console.log('Audit '+name);await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
      await b.home();await b.click('Settings');await b.route('/settings');await b.modes('balanced',display);await b.scroll(false);await shot(name+'-settings');
      await b.click('Go back');await b.route('/home');await b.scroll(false);await shot(name+'-home');
      await b.click('Made for you. Personalise your home dashboard');await b.route('/customize');await b.scroll(false);await shot(name+'-made-for-you');await b.click('Go back');await b.route('/home');
      await b.click('Ask Banking Concierge');await b.route('/concierge');const draft=(await b.state()).transaction;await b.click('Explain the review screen');await b.wait(`document.body.innerText.includes('This screen shows who you are paying')`);assert.deepEqual((await b.state()).transaction,draft);await b.scroll(false);await shot(name+'-concierge');await b.click('Go back');await b.route('/home');
    }
    await b.home();await b.click('Hide account balance');assert.equal(await b.evaluate(`!!document.querySelector('[aria-label="Balance hidden"]')`),true);await b.click('Show account balance');
    await b.click('Transfer, PayNow demo only');await b.wait(`document.body.innerText.includes('Transfers in this demo')`);await shot('transfer-disclosure');await b.click('Close');
    await b.click('Accounts');await b.wait(`document.body.innerText.includes('Your demo accounts')`);await b.click('Close');
    await b.click('Edit homepage shortcuts');await b.route('/customize');await b.click('Customise manually');await b.click('Move Pay bills up');await b.click('Keep my current layout');await b.route('/home');
    report.smoke={balanceMasking:true,transferDisclosure:true,accountsDisclosure:true,manualShortcuts:true};
  }
  if(phase==='full'){
    const widths=(process.argv.find(arg=>arg.startsWith('--widths='))?.slice(9)??'320,375,390,430,768,1280').split(',').map(Number);
    const combinations=[['quick','standard'],['quick','highClarity'],['balanced','largeText'],['guided','standard'],['guided','highClarity']];
    report.journeys??=[];
    for(const width of widths)for(const [guidance,display]of combinations){
      const name=width+'-'+guidance+'-'+display;if(report.journeys.some(item=>item.name===name))continue;console.log('Journey '+name);await b.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
      await b.home();await b.click('Settings');await b.route('/settings');await b.modes(guidance,display);await b.click('Go back');await b.route('/home');const initial=(await b.state()).transaction;
      await b.click('PayNow');await b.route('/paynow');assert.deepEqual((await b.state()).transaction,initial);await b.scroll(false);await shot(name+'-start');
      await b.click('Continue to recipient');await b.route('/paynow/recipient');const editing=(await b.state()).transaction;
      assert.equal(await b.evaluate(`!!${b.control('Continue to amount')}.disabled`),true);
      await b.type('PayNow mobile number','123');await b.click('Find recipient');assert.equal(await b.evaluate(`document.body.innerText.includes('8-digit Singapore mobile')`),true);
      await b.modes(guidance==='quick'?'guided':'quick',display==='standard'?'highClarity':'standard');assert.deepEqual((await b.state()).transaction,editing);assert.equal(await b.evaluate(`${b.input('PayNow mobile number')}.value`),'123');assert.equal(await b.evaluate(`document.body.innerText.includes('8-digit Singapore mobile')`),true);await b.modes(guidance,display);
      await b.scroll(true);await shot(name+'-lookup-error');await b.type('PayNow mobile number','+65 9000-4821');await b.click('Find recipient');assert.deepEqual((await b.state()).transaction,editing);
      await b.click('Use Alex Tan as recipient');await b.route('/paynow/recipient');assert.equal((await b.state()).transaction.recipientName,'Alex Tan');await b.scroll(true);await shot(name+'-recipient');
      await b.click('Continue to amount');await b.route('/paynow/amount');const recipient=(await b.state()).transaction;
      for(const raw of ['','-5','1.000','25001']){await b.type('Amount (SGD)',raw);await b.click('Review transfer');await b.route('/paynow/amount');assert.deepEqual((await b.state()).transaction,recipient)}
      await b.type('Amount (SGD)','13.');await b.modes(guidance==='quick'?'guided':'quick',display==='standard'?'highClarity':'standard');assert.equal(await b.evaluate(`${b.input('Amount (SGD)')}.value`),'13.');assert.deepEqual((await b.state()).transaction,recipient);await b.modes(guidance,display);await b.type('Amount (SGD)','13.13');await b.scroll(false);await shot(name+'-amount');
      await b.click('Review transfer');await b.route('/paynow/review');const reviewed=(await b.state()).transaction;
      await b.modes(guidance==='quick'?'guided':'quick',display==='standard'?'highClarity':'standard');assert.deepEqual((await b.state()).transaction,reviewed);await b.modes(guidance,display);assert.equal(await b.evaluate(`!!${b.control('Confirm and send')}.disabled`),false);
      await b.click('Edit details');await b.route('/paynow/amount');await b.click('Review transfer');await b.route('/paynow/review');assert.deepEqual((await b.state()).transaction,reviewed);await b.scroll(false);await shot(name+'-review');await b.scroll(true);await shot(name+'-review-actions');
      await b.click('Confirm and send');await b.route('/paynow/success');const failed=(await b.state()).transaction;assert.equal(failed.status,'failed');assert.equal(await b.evaluate(`document.body.innerText.includes('Transfer receipt')`),false);await b.scroll(false);await shot(name+'-failure');await b.scroll(true);await shot(name+'-failure-actions');
      await b.modes(guidance==='quick'?'guided':'quick',display==='standard'?'highClarity':'standard');assert.deepEqual((await b.state()).transaction,failed);await b.modes(guidance,display);
      await b.click('Edit details and try again');await b.route('/paynow/amount');assert.equal(await b.evaluate(`${b.input('Amount (SGD)')}.value`),'13.13');await b.type('Amount (SGD)','13.14');await b.click('Review transfer');await b.route('/paynow/review');assert.equal((await b.state()).transaction.requiresReview,true);assert.equal(await b.evaluate(`!!${b.control('Confirm and send')}.disabled`),true);
      await b.click('I have reviewed the details');await b.click('Confirm and send');await b.route('/paynow/success');const confirmed=(await b.state()).transaction;assert.equal(confirmed.status,'confirmed');const reference=await b.evaluate(`document.body.innerText.match(/FB-\\d{8}-\\d{4}/)?.[0]`);assert(reference);
      await b.modes(guidance==='quick'?'guided':'quick',display==='standard'?'highClarity':'standard');assert.deepEqual((await b.state()).transaction,confirmed);assert.equal(await b.evaluate(`document.body.innerText.match(/FB-\\d{8}-\\d{4}/)?.[0]`),reference);await b.modes(guidance,display);await b.scroll(false);await shot(name+'-success');await b.scroll(true);await shot(name+'-receipt');
      await b.click('Done — back to home');await b.route('/home');assert.equal((await b.state()).preferences.guidanceLevel,guidance);assert.equal((await b.state()).preferences.displayMode,display);
      await b.click('PayNow');await b.route('/paynow');assert.equal((await b.state()).transaction.status,'confirmed');await b.click('Continue to recipient');await b.route('/paynow/recipient');await b.saved();await b.type('Amount (SGD)','50');await b.click('Review transfer');await b.route('/paynow/review');await b.click('Cancel transfer');await b.route('/home');assert.equal((await b.state()).transaction.status,'cancelled');assert.equal((await b.state()).transaction.amount,undefined);assert.equal((await b.state()).transaction.recipientId,undefined);
      await b.load('/paynow/review','Confirm and send');await b.modes(guidance,display);assert.equal(await b.evaluate(`!!${b.control('Confirm and send')}.disabled`),true);await b.load('/paynow/success','Done — back to home');await b.modes(guidance,display);assert.equal(await b.evaluate(`document.body.innerText.includes('Transfer receipt')`),false);
      report.journeys.push({name,lookupExplicit:true,invalidInputsBlocked:true,modesPreserveDraft:true,unchangedAmountPreservesApproval:true,failure1313:true,reReviewRequired:true,retry1314Succeeded:true,referenceStable:true,cancelClearsDraft:true,directRouteProtected:true});save();console.log('Passed '+name);
    }
  }
  save();b.close();console.log(JSON.stringify({phase,captures:report.cases.length}));
})().catch(error=>{console.error(error);process.exit(1)});
