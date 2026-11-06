/* Expo Web :8087, isolated Edge/Chromium CDP :9229. No dependencies added.
 * Actual UI events; React development state is read-only, never injected.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(process.cwd(),'artifacts','paynow-start-v2');
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));

(async()=>{
  const targets=await(await fetch('http://localhost:9229/json/list')).json();
  const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
  let id=0;const pending=new Map();
  ws.addEventListener('message',event=>{const m=JSON.parse(event.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw r.exceptionDetails;return r.result.value};
  const wait=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await delay(120)}throw new Error('Timed out: '+expression)};
  const control=label=>`([...document.querySelectorAll('[role="button"],[role="radio"]')].reverse().find(e=>!e.closest('[aria-hidden="true"]')&&e.getBoundingClientRect().width>0&&(e.getAttribute('aria-label')===${JSON.stringify(label)}||e.textContent.trim()===${JSON.stringify(label)})))`;
  const click=async label=>{const e=control(label);await wait(`!!${e}`);await wait(`Object.keys(${e}).some(k=>k.startsWith('__reactProps$'))`);assert.equal(await evaluate(`!!${e}.disabled||${e}.getAttribute('aria-disabled')==='true'`),false,'Disabled: '+label);await evaluate(`${e}.click()`);await delay(120)};
  const input=label=>`([...document.querySelectorAll('input')].reverse().find(e=>!e.closest('[aria-hidden="true"]')&&e.getBoundingClientRect().width>0&&e.getAttribute('aria-label')===${JSON.stringify(label)}))`;
  const type=async(label,value)=>{const e=input(label);await wait(`!!${e}`);await evaluate(`${e}.focus();${e}.select()`);await send('Input.insertText',{text:value});await delay(120)};
  const state=()=>evaluate(`(()=>{const e=[...document.querySelectorAll('[role="button"]')].find(e=>!e.closest('[aria-hidden="true"]'));let f=e?.[Object.keys(e).find(k=>k.startsWith('__reactFiber$'))];while(f?.return)f=f.return;const stack=[f?.stateNode?.current];while(stack.length){const c=stack.pop();if(!c)continue;if(c.type?.name==='SessionProvider')return c.memoizedState.memoizedState;stack.push(c.child,c.sibling)}throw new Error('No session')})()`);
  const key=async(key,code,vk)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:vk,...(key==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:vk});await delay(120)};
  const route=path=>wait(`location.pathname===${JSON.stringify(path)}`);
  const home=async()=>{await send('Page.navigate',{url:'http://localhost:8087/home'});await wait(`!!${control('Hide account balance')}`);await wait(`Object.keys(${control('Hide account balance')}).some(k=>k.startsWith('__reactProps$'))`);await delay(200)};
  const enter=async()=>{await click('PayNow');await route('/paynow')};
  const backToStart=async()=>{for(let i=0;i<6;i++){const current=await evaluate('location.pathname');if(current==='/paynow')return;if(current==='/home'){await enter();return}await click('Go back')}throw new Error('Could not return to Start')};
  const assistanceHome=async()=>{await click('Ask for help');await route('/human-assistance');if(await evaluate(`!!${control('Request human assistance')}`))await click('Request human assistance');await click('Back to home');await route('/home');await enter()};
  const scroll=async bottom=>{await evaluate(`document.querySelectorAll('div').forEach(e=>{if(getComputedStyle(e).overflowY==='auto')e.scrollTop=${bottom?'e.scrollHeight':'0'}})`);await delay(80)};
  const mode=async(guidance,display)=>{
    const panel=`([...document.querySelectorAll('[role="button"]')].reverse().find(e=>!e.closest('[aria-hidden="true"]')&&e.getAttribute('aria-label')?.startsWith('Banking preferences, ')))`;
    const panelClosed=await evaluate(`!!${panel}&&${panel}.getAttribute('aria-expanded')!=='true'`);
    if(panelClosed){await evaluate(`${panel}.click()`);await delay(80)}
    await click({quick:'Quick mode',balanced:'Balanced mode',guided:'Guided mode'}[guidance]);
    const readability=`([...document.querySelectorAll('[role="button"]')].reverse().find(e=>!e.closest('[aria-hidden="true"]')&&e.getAttribute('aria-label')?.startsWith('Readability, ')))`;
    await evaluate(`${readability}.click()`);await delay(80);
    if(panelClosed){await evaluate(`${panel}.click()`);await delay(80)}
    await click({standard:'Standard',largeText:'Large text',highClarity:'High clarity'}[display]);
    await evaluate(`${readability}.click()`);await delay(80);
  };
  const capture=async name=>{
    const metrics=await evaluate(`(()=>{const visible=e=>!e.closest('[aria-hidden="true"]')&&e.getBoundingClientRect().width>0;const panel=[...document.querySelectorAll('[role="button"]')].find(e=>e.getAttribute('aria-label')==='Open development tools')?.parentElement;return{
      documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,
      clippedText:[...document.querySelectorAll('div,h1,h2,h3,h4,p,span')].filter(e=>visible(e)&&e.childNodes.length===1&&e.firstChild.nodeType===3&&e.clientWidth>0&&e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),
      smallTargets:[...document.querySelectorAll('[role="button"],[role="radio"]')].filter(e=>visible(e)&&(e.getBoundingClientRect().height<47.5||e.getBoundingClientRect().width<47.5)).map(e=>e.getAttribute('aria-label')??e.textContent),
      panelOverlap:panel?panel.previousElementSibling.getBoundingClientRect().bottom>panel.getBoundingClientRect().top+1:false}})()`);
    const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(r.data,'base64'));
    assert.equal(metrics.documentWidth<=metrics.viewport,true,name+': overflow');assert.deepEqual(metrics.clippedText,[],name+': clipped text');assert.deepEqual(metrics.smallTargets,[],name+': targets');assert.equal(metrics.panelOverlap,false,name+': panel');return metrics;
  };
  if(process.argv.includes('--inspect')){console.log(JSON.stringify({state:await state(),text:await evaluate('document.body.innerText')},null,2));ws.close();return}
  fs.mkdirSync(dir,{recursive:true});await send('Page.enable');await send('Page.bringToFront');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
  if(process.argv.includes('--extras')){
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});await home();await enter();
    await evaluate('document.activeElement?.blur()');await key('Tab','Tab',9);assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Go back');
    await key('Tab','Tab',9);assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Help with PayNow');
    await key('Tab','Tab',9);assert.equal(await evaluate(`document.activeElement.textContent`),'Continue to recipient');
    await key('Tab','Tab',9);assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Balanced mode');const empty=(await state()).transaction;
    await key('ArrowRight','ArrowRight',39);assert.equal((await state()).preferences.guidanceLevel,'guided');assert.equal(await evaluate(`${control('Guided mode')}.getAttribute('aria-checked')`),'true');
    await key('Home','Home',36);assert.equal((await state()).preferences.guidanceLevel,'quick');await key(' ','Space',32);
    await key('Tab','Tab',9);assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Readability, Standard');await key('Enter','Enter',13);assert.equal(await evaluate(`${control('Readability, Standard')}.getAttribute('aria-expanded')`),'true');
    await key('Tab','Tab',9);assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Standard');await key('ArrowRight','ArrowRight',39);await key('End','End',35);assert.equal((await state()).preferences.displayMode,'highClarity');
    assert.deepEqual((await state()).transaction,empty);await capture('keyboard-readability-expanded');await click('Readability, High clarity');
    await click('Help with PayNow');await route('/human-assistance');await click('Go back');await route('/paynow');assert.deepEqual((await state()).transaction,empty);
    await mode('balanced','standard');await click('Continue to recipient');await route('/paynow/recipient');await click('Pay Alex Tan at DBS');await click('Continue to amount');await route('/paynow/amount');
    await type('Amount (SGD)','13.');await mode('guided','highClarity');assert.equal(await evaluate(`${input('Amount (SGD)')}.value`),'13.');
    const beforeUnmount=(await state()).transaction;await backToStart();await click('Resume transfer');await route('/paynow/amount');
    const unsubmittedAmountAfterUnmount=await evaluate(`${input('Amount (SGD)')}.value`);assert.deepEqual((await state()).transaction,beforeUnmount);
    await type('Amount (SGD)','50');await click('Review transfer');await route('/paynow/review');const reviewed=(await state()).transaction;assert.equal(reviewed.status,'readyForReview');
    // Real back controls return to Start; the complete reviewed draft is shared.
    await backToStart();
    assert.deepEqual((await state()).transaction,reviewed);await mode('quick','standard');await mode('guided','highClarity');assert.deepEqual((await state()).transaction,reviewed);
    await scroll(false);await capture('resume-reviewed-highClarity');
    await click('Start again');assert.deepEqual((await state()).transaction,reviewed);await click('Keep current transfer');assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Start again');assert.deepEqual((await state()).transaction,reviewed);
    await click('Resume transfer');await route('/paynow/review');assert.deepEqual((await state()).transaction,reviewed);
    await click('Edit details');await route('/paynow/amount');await type('Amount (SGD)','51');await click('Review transfer');await route('/paynow/review');const changed=(await state()).transaction;assert.equal(changed.requiresReview,true);
    await backToStart();
    await click('Resume transfer');await route('/paynow/review');assert.deepEqual((await state()).transaction,changed);assert.equal(await evaluate(`!!${control('Confirm and send')}.disabled||${control('Confirm and send')}.getAttribute('aria-disabled')==='true'`),true);
    // Explicit re-review remains necessary, then use the existing failure flow.
    await click('Edit details');await route('/paynow/amount');await type('Amount (SGD)','13.13');await click('Review transfer');await route('/paynow/review');await click('I have reviewed the details');await click('Confirm and send');await route('/paynow/success');
    const failed=(await state()).transaction;assert.equal(failed.status,'failed');await assistanceHome();assert.deepEqual((await state()).transaction,failed);
    await click('Resume transfer');await route('/paynow/success');assert.deepEqual((await state()).transaction,failed);assert.equal(await evaluate(`document.body.innerText.includes('Transfer receipt')`),false);
    // The saved failure can be abandoned only after the explicit clear choice.
    await assistanceHome();
    const prefs=(await state()).preferences;await click('Start again');await scroll(true);await capture('restart-explicit-approval');await click('Clear draft and start again');await route('/paynow/recipient');const restarted=await state();
    assert.equal(restarted.transaction.recipientId,undefined);assert.equal(restarted.transaction.amount,undefined);assert.equal(restarted.transaction.status,'editing');assert.deepEqual(restarted.preferences,prefs);
    await send('Page.navigate',{url:'http://localhost:8087/paynow'});await wait(`!!${control('Continue to recipient')}`);await click('Go back');await route('/home');
    const result={keyboard:true,ariaStates:true,helpPreservesDraft:true,partialAmountPreservedWhileMounted:true,unsubmittedAmountAfterUnmount,reviewedDraftResume:true,reReviewPreserved:true,failedDraftResume:true,explicitRestart:true,cancelRestartReturnsFocus:true,directBackHome:true};
    fs.writeFileSync(path.join(dir,'recovery-and-keyboard.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));ws.close();return;
  }
  const cases=[];
  for(const width of [320,390,430])for(const display of ['standard','largeText','highClarity'])for(const guidance of ['quick','balanced','guided']){
    const name=`${width}-${display}-${guidance}`;await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:true});await home();const before=(await state()).transaction;await enter();assert.deepEqual((await state()).transaction,before);
    await mode(guidance,display);assert.deepEqual((await state()).transaction,before);assert.equal(await evaluate('location.pathname'),'/paynow');await scroll(false);const top=await capture(name+'-top');await scroll(true);const controls=await capture(name+'-controls');
    assert.equal(await evaluate(`document.body.innerText.includes('Demo transfer — no real money will move.')`),true);assert.equal(await evaluate(`document.body.innerText.includes('Done')`),true);
    await click('Continue to recipient');await route('/paynow/recipient');const next=await state();assert.equal(next.transaction.status,'editing');assert.equal(next.transaction.recipientId,undefined);assert.equal(next.transaction.amount,undefined);
    cases.push({name,top,controls,entryDoesNotReset:true,preferencesIndependent:true,continueOpensRecipient:true});fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({viewportHeight:900,cases},null,2));console.log('Passed '+name);
  }
  ws.close();
})().catch(error=>{console.error(error);process.exit(1)});
