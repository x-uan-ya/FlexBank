/* Expo Web :8087 + isolated Chromium/Edge CDP :9229; no new dependencies.
 * Drives real controls. React session state is inspected read-only to verify
 * complete draft/preference preservation; no state or actions are injected.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createTypeScriptLoader } = require('../tests/helpers/load-ts.cjs');
const load = createTypeScriptLoader();
const rules = load('src/features/adaptive/homeRecommendations.ts');
const { DEFAULT_HOME_LAYOUT } = load('src/types/home.ts');
const output = process.argv.find(arg => arg.startsWith('--output='))?.slice('--output='.length);
const dir = path.join(process.cwd(), output ?? 'artifacts/made-for-you');
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
  const control = label => `([...document.querySelectorAll('[role="button"],[role="checkbox"],[role="radio"]')].reverse().find(e => !e.closest('[aria-hidden="true"]') && e.getBoundingClientRect().width > 0 && (e.getAttribute('aria-label') === ${JSON.stringify(label)} || e.textContent.trim() === ${JSON.stringify(label)})))`;
  const exactText = text => `([...document.querySelectorAll('div,h1,h2,h3,h4,p,span')].find(e => !e.closest('[aria-hidden="true"]') && e.getBoundingClientRect().width > 0 && e.childNodes.length === 1 && e.firstChild.nodeType === 3 && e.textContent === ${JSON.stringify(text)}))`;
  const click = async label => {
    const e = control(label); await wait(`!!${e}`);
    await wait(`Object.keys(${e}).some(key => key.startsWith('__reactProps$'))`);
    assert.equal(await evaluate(`${e}.getAttribute('aria-disabled') === 'true' || !!${e}.disabled`), false, 'Disabled: ' + label);
    await evaluate(`${e}.click()`); await delay(100);
  };
  const state = () => evaluate(`(() => {
    const e = [...document.querySelectorAll('[role="checkbox"],[role="button"]')].find(e => !e.closest('[aria-hidden="true"]'));
    let fiber = e?.[Object.keys(e).find(key => key.startsWith('__reactFiber$'))];
    while (fiber?.return) fiber = fiber.return;
    const stack = [fiber?.stateNode?.current];
    while (stack.length) {
      const current = stack.pop();
      if (!current) continue;
      if (current.type?.name === 'SessionProvider') return current.memoizedState.memoizedState;
      stack.push(current.child, current.sibling);
    }
    throw new Error('SessionProvider not found');
  })()`);
  const navigate = async route => {
    await send('Page.navigate', { url: 'http://localhost:8087' + route });
    const label = route === '/customize' ? 'Make payments quickly' : route === '/home' ? 'Hide account balance' : 'Continue to recipient';
    await wait(`!!${control(label)}`);
    await wait(`Object.keys(${control(label)}).some(key => key.startsWith('__reactProps$'))`);
    await delay(200);
  };
  const scrollTo = async text => {
    await evaluate(`${exactText(text)}.scrollIntoView({block:'start'})`); await delay(100);
  };
  const top = async () => {
    await evaluate(`document.querySelectorAll('div').forEach(e => { if(getComputedStyle(e).overflowY === 'auto') e.scrollTop = 0; })`); await delay(100);
  };
  const capture = async name => {
    const metrics = await evaluate(`(() => {
      const visible = e => !e.closest('[aria-hidden="true"]') && e.getBoundingClientRect().width > 0;
      const panel = [...document.querySelectorAll('[role="button"]')].find(e => e.getAttribute('aria-label') === 'Open development tools')?.parentElement;
      return { documentWidth: document.documentElement.scrollWidth, viewport: innerWidth,
        panelOverlap: panel ? panel.previousElementSibling.getBoundingClientRect().bottom > panel.getBoundingClientRect().top + 1 : false,
        clippedText: [...document.querySelectorAll('div,h1,h2,h3,h4,p,span')].filter(e => visible(e) && e.childNodes.length === 1 && e.firstChild.nodeType === 3 && e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent),
        smallTargets: [...document.querySelectorAll('[role="button"],[role="checkbox"],[role="radio"]')].filter(e => visible(e) && (e.getBoundingClientRect().height < 47.5 || e.getBoundingClientRect().width < 47.5)).map(e => ({label:e.getAttribute('aria-label') ?? e.textContent,rect:e.getBoundingClientRect().toJSON()})) };
    })()`);
    const result = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(result.data, 'base64'));
    assert.equal(metrics.documentWidth <= metrics.viewport, true, name + ': document overflow');
    assert.deepEqual(metrics.clippedText, [], name + ': clipped text');
    assert.deepEqual(metrics.smallTargets, [], name + ': small targets');
    assert.equal(metrics.panelOverlap, false, name + ': developer panel overlap');
    return metrics;
  };
  const recommendation = s => rules.recommendHomeExperience({ preferences: s.preferences, existingLayout: s.homeLayout, approvedWidgetIds: DEFAULT_HOME_LAYOUT.map(w => w.id) });
  const firstFour = layout => [...layout].sort((a,b) => a.position-b.position).filter(w => w.visible).slice(0,4);
  const assertPreview = async () => {
    const s = await state(), expected = rules.applyRecommendedWidgetOrder(s.homeLayout, recommendation(s).widgetOrder);
    for (const [title, layout] of [['Current home', s.homeLayout], ['Recommended home', expected]]) {
      const actual = await evaluate(`[...${exactText(title)}.parentElement.children].slice(1).map(e => e.lastElementChild.textContent)`);
      assert.deepEqual(actual, firstFour(layout).map(w => w.title), title + ' must show actual Home shortcuts');
    }
  };
  const assertHome = async () => {
    const s = await state();
    const labels = firstFour(s.homeLayout).map(w => ['paynow','transfer'].includes(w.type) ? `${w.title}, available in payment actions above` : w.title);
    const actual = await evaluate(`[...document.querySelectorAll('[role="button"]')].filter(e=>!e.closest('[aria-hidden="true"]')).map(e=>e.getAttribute('aria-label')).filter(label=>${JSON.stringify(labels)}.includes(label))`);
    assert.deepEqual(actual, labels, 'Home must render saved visible order');
  };
  const display = async mode => {
    // Change display through the existing Settings route; Page 2 does not
    // duplicate its controls or alter the shared readability component.
    await click('More preferences in Settings'); await wait(`location.pathname === '/settings'`);
    await click({standard:'Standard',largeText:'Large text',highClarity:'High clarity'}[mode]);
    await click('Go back'); await wait(`location.pathname === '/customize'`); await delay(100);
  };
  if (process.argv.includes('--inspect')) {
    console.log(JSON.stringify({state:await state(),text:await evaluate('document.body.innerText')},null,2)); ws.close(); return;
  }
  await send('Page.enable'); await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled:true });
  fs.mkdirSync(dir, { recursive:true });
  const report = {viewportHeight:900,cases:[],behaviour:[]};
  if (process.argv.includes('--measure')) {
    for (const width of [320,390,430]) for (const mode of ['standard','largeText','highClarity']) {
      const name = `${mode}-${width}`;
      await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:true});
      await navigate('/customize'); await display(mode); await delay(300); await top();
      const geometry = await evaluate(`(() => {
        const priority = ${control('Make payments quickly')};
        const scroller = [...document.querySelectorAll('div')].find(e => getComputedStyle(e).overflowY === 'auto' && e.contains(priority));
        const apply = ${control('Apply to my home')};
        const current = ${exactText('Current home')}.parentElement.parentElement.getBoundingClientRect();
        const suggested = ${exactText('Recommended home')}.parentElement.parentElement.getBoundingClientRect();
        return {scrollHeight:scroller.scrollHeight,viewportHeight:scroller.clientHeight,maxScroll:scroller.scrollHeight-scroller.clientHeight,
          applyTop:Math.round(apply.getBoundingClientRect().top-scroller.getBoundingClientRect().top+scroller.scrollTop),
          comparisonHeight:Math.round(${exactText('Current home')}.parentElement.parentElement.parentElement.getBoundingClientRect().height),
          sideBySide:Math.abs(current.top-suggested.top)<2,currentWidth:Math.round(current.width),recommendedWidth:Math.round(suggested.width)};
      })()`);
      const checks = {top:await capture(name+'-top')};
      await scrollTo('Your suggested homepage'); checks.comparison=await capture(name+'-comparison');
      await scrollTo('Suggested banking pace'); checks.pace=await capture(name+'-pace');
      report.cases.push({name,...geometry,checks});
      fs.writeFileSync(path.join(dir,'measurements.json'),JSON.stringify(report,null,2));
      console.log(JSON.stringify({name,...geometry}));
    }
    ws.close(); return;
  }
  if (process.argv.includes('--extras')) {
    await send('Emulation.setDeviceMetricsOverride', {width:390,height:900,deviceScaleFactor:1,mobile:true});
    await navigate('/customize');
    const key = async (key, code, virtualKey) => {
      await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:virtualKey,nativeVirtualKeyCode:virtualKey,...(key==='Enter'?{text:'\r'}:{})});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:virtualKey,nativeVirtualKeyCode:virtualKey});
      await delay(100);
    };
    await evaluate('document.activeElement?.blur()');
    await key('Tab','Tab',9);
    assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Go back');
    await key('Tab','Tab',9);
    assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Make payments quickly');
    const outline = await evaluate(`({style:getComputedStyle(document.activeElement).outlineStyle,width:getComputedStyle(document.activeElement).outlineWidth})`);
    await capture('keyboard-priority-focus');
    await key(' ','Space',32); assert.equal((await state()).preferences.priorities.includes('payments'),false);
    await key(' ','Space',32); assert.equal((await state()).preferences.priorities.at(-1),'payments');
    await click('Understand my money'); await click('Make payments quickly');
    const beforePace = await state();
    await evaluate(`${control('Use Guided mode')}.focus()`); await key('Enter','Enter',13);
    assert.equal((await state()).preferences.guidanceLevel,'guided');
    assert.deepEqual((await state()).homeLayout,beforePace.homeLayout);
    const beforeLayout = await state();
    await evaluate(`${control('Apply to my home')}.focus()`); await key('Enter','Enter',13);
    assert.deepEqual((await state()).homeLayout,rules.applyRecommendedWidgetOrder(beforeLayout.homeLayout,recommendation(beforeLayout).widgetOrder));
    assert.deepEqual((await state()).preferences,beforeLayout.preferences);
    assert.deepEqual((await state()).transaction,beforeLayout.transaction);
    await click('Make things easier to read');
    await click('Get more guidance');
    assert.deepEqual((await state()).preferences.priorities,['guidance']);
    assert.equal(await evaluate(`document.body.innerText.includes('Keep at least one priority')`),true);
    await evaluate(`${control('Customise manually')}.focus()`); await key('Enter','Enter',13);
    assert.equal(await evaluate(`${control('Hide manual controls')}.getAttribute('aria-expanded')`),'true');
    const beforeMove = [...(await state()).homeLayout].sort((a,b)=>a.position-b.position);
    await evaluate(`${control('Move ' + beforeMove[0].title + ' down')}.focus()`); await key('Enter','Enter',13);
    const afterMove = [...(await state()).homeLayout].sort((a,b)=>a.position-b.position);
    assert.equal(afterMove[0].id,beforeMove[1].id); assert.equal(afterMove[1].id,beforeMove[0].id);
    const saved = (await state()).homeLayout;
    for (const widget of saved) await click('Hide ' + widget.title);
    assert.equal((await state()).homeLayout.every(w=>!w.visible),true);
    assert.equal(await evaluate(`document.body.innerText.includes('Your shortcuts stay hidden until you choose to show them.')`),true);
    await display('highClarity');
    // The keyboard move may already match the suggestion. Make a deliberate
    // manual change so accepting a fresh arrangement is meaningful here.
    if (await evaluate(`${control('Apply to my home')}.getAttribute('aria-disabled') === 'true' || !!${control('Apply to my home')}.disabled`)) {
      await click('Move Banking Concierge down');
    }
    await click('Apply to my home');
    assert.equal((await state()).homeLayout.every(w=>!w.visible),true);
    assert.equal((await state()).preferences.guidanceLevel,'guided');
    await click('Keep my current layout'); await wait(`location.pathname === '/home'`);
    assert.equal(await evaluate(`document.body.innerText.includes('No shortcuts shown. Select Edit to choose your tools.')`),true);
    await click('Edit homepage shortcuts'); await wait(`location.pathname === '/customize'`);
    await click('Customise manually'); await click('Show Accounts');
    await click('Reset to standard');
    const reset = await state();
    assert.deepEqual(reset.homeLayout,DEFAULT_HOME_LAYOUT); assert.equal(reset.preferences.displayMode,'standard');
    assert.equal(reset.preferences.guidanceLevel,'balanced');
    await click('Go back'); await wait(`location.pathname === '/home'`); await assertHome();
    await navigate('/customize');
    const ax = await send('Accessibility.getFullAXTree');
    const checkboxes = ax.nodes.filter(n=>n.role?.value==='checkbox').map(n=>({name:n.name?.value,checked:n.properties?.find(p=>p.name==='checked')?.value?.value}));
    assert.equal(checkboxes.length,4); assert.equal(checkboxes.every(c=>c.checked==='true'),true);
    await click('Go back'); await wait(`location.pathname === '/home'`);
    const extra = {tabOrder:true,spaceTogglesPriorities:true,enterAppliesPace:true,enterAppliesLayout:true,keyboardReorder:true,keyboardDisclosure:true,lastPriorityPreserved:true,
      allHiddenPreserved:true,resetWorks:true,directBackFallback:true,focusOutline:outline,checkboxes};
    fs.writeFileSync(path.join(dir,'accessibility-and-edge-cases.json'),JSON.stringify(extra,null,2));
    console.log(JSON.stringify(extra)); ws.close(); return;
  }
  for (const width of [320,390,430]) for (const mode of ['standard','largeText','highClarity']) {
    const name = `${mode}-${width}`; console.log('Running ' + name);
    await send('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:true});
    await navigate('/customize');
    await click('Customise manually'); await display(mode); await click('Hide manual controls');
    await assertPreview(); await top(); const metrics = {top:await capture(name + '-top')};
    await scrollTo('Your suggested homepage'); metrics.preview = await capture(name + '-preview');
    await scrollTo('Suggested banking pace'); metrics.controls = await capture(name + '-controls');
    const before = await state();
    const suggested = rules.applyRecommendedWidgetOrder(before.homeLayout, recommendation(before).widgetOrder);
    await click('Apply to my home'); const applied = await state();
    assert.deepEqual(applied.homeLayout, suggested); assert.deepEqual(applied.preferences,before.preferences);
    assert.deepEqual(applied.transaction,before.transaction);
    await click('Use Quick mode'); const paced = await state();
    assert.equal(paced.preferences.guidanceLevel,'quick'); assert.deepEqual(paced.homeLayout,applied.homeLayout);
    await click('Keep my current layout'); await wait(`location.pathname === '/home'`); await assertHome();
    await click('Edit homepage shortcuts'); await wait(`location.pathname === '/customize'`);
    assert.equal((await state()).preferences.displayMode,mode); assert.equal((await state()).preferences.guidanceLevel,'quick');
    await click('Customise manually'); const first = [...(await state()).homeLayout].sort((a,b)=>a.position-b.position)[0];
    await click('Move ' + first.title + ' down'); await click('Hide Recent recipients');
    const manual = await state();
    await scrollTo('Arrange your shortcuts'); metrics.manual = await capture(name + '-manual');
    await click('Make payments quickly'); const priority = await state();
    assert.deepEqual(priority.homeLayout,manual.homeLayout); assert.equal(priority.preferences.guidanceLevel,'quick');
    await assertPreview(); await click('Hide manual controls'); await click('Keep my current layout');
    await wait(`location.pathname === '/home'`); await assertHome();
    assert.deepEqual((await state()).homeLayout,manual.homeLayout);
    report.cases.push({name,metrics,livePreview:true,layoutAndPaceIndependent:true,manualChoicesRetained:true,homeUpdated:true});
    fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2)); console.log('Passed ' + name);
  }
  // One complete reviewed draft, followed by real in-app personalisation actions.
  await navigate('/home'); await click('PayNow'); await wait(`location.pathname === '/paynow'`);
  await click('Continue to recipient'); await wait(`location.pathname === '/paynow/recipient'`);
  await click('Pay Alex Tan at DBS'); await click('Continue to amount'); await wait(`location.pathname === '/paynow/amount'`);
  const input = `document.querySelector('input[aria-label="Amount (SGD)"]')`;
  await evaluate(`${input}.focus()`); await send('Input.insertText',{text:'50'}); await delay(100);
  await click('Review transfer'); await wait(`location.pathname === '/paynow/review'`);
  const draft = (await state()).transaction; assert.equal(draft.status,'readyForReview');
  await evaluate('history.go(-3)'); await wait(`location.pathname === '/paynow'`);
  // Start has no Home action; its actual back control returns to the entry route
  // when present. Use the router's existing SPA history path to the Home page.
  await click('Go back'); await wait(`location.pathname === '/home' || location.pathname === '/onboarding'`);
  if (await evaluate(`location.pathname === '/onboarding'`)) throw new Error('Test requires Home in initial PayNow history');
  await click('Made for you. Personalise your home dashboard'); await wait(`location.pathname === '/customize'`);
  for (const label of ['Make payments quickly','Understand my money']) await click(label);
  assert.equal((await state()).preferences.priorities[0],'guidance');
  await click('Use Guided mode'); await click('Apply to my home');
  await click('Customise manually'); await display('highClarity');
  assert.deepEqual((await state()).transaction,draft);
  report.behaviour.push('Reviewed draft preserved by priorities, layout, pace and display changes');
  await click('More preferences in Settings'); await wait(`location.pathname === '/settings'`);
  await click('Go back'); await wait(`location.pathname === '/customize'`);
  assert.deepEqual((await state()).transaction,draft);
  report.behaviour.push('Settings navigation and Back retain the transaction');
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:report.cases.length,behaviour:report.behaviour})); ws.close();
})().catch(error => { console.error(error); process.exit(1); });
