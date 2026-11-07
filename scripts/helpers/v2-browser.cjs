const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function connect() {
  const targets = await (await fetch('http://localhost:9229/json/list')).json();
  const ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data), callback = pending.get(message.id);
    if (callback) { pending.delete(message.id); message.error ? callback.reject(message.error) : callback.resolve(message.result); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw result.exceptionDetails;
    return result.result.value;
  };
  const wait = async expression => {
    for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await delay(100); }
    throw new Error('Timed out: ' + expression);
  };
  const control = label => `([...document.querySelectorAll('[role="button"],[role="checkbox"],[role="radio"]')].reverse().find(e=>!e.closest('[aria-hidden="true"]')&&e.getBoundingClientRect().width>0&&(e.getAttribute('aria-label')===${JSON.stringify(label)}||e.textContent.trim()===${JSON.stringify(label)})))`;
  const exists = label => evaluate(`!!${control(label)}`);
  const click = async label => {
    const e = control(label); await wait(`!!${e}`);
    await wait(`Object.keys(${e}).some(key=>key.startsWith('__reactProps$'))`);
    assert.equal(await evaluate(`!!${e}.disabled||${e}.getAttribute('aria-disabled')==='true'`), false, 'Disabled: '+label);
    await evaluate(`${e}.scrollIntoView({block:'nearest'});${e}.click()`); await delay(100);
  };
  const input = label => `([...document.querySelectorAll('input')].reverse().find(e=>!e.closest('[aria-hidden="true"]')&&e.getBoundingClientRect().width>0&&e.getAttribute('aria-label')===${JSON.stringify(label)}))`;
  const type = async (label, value) => {
    if(label==='PayNow mobile number'&&!await evaluate(`!!${input(label)}`)&&await exists('Look up a mobile number')) await click('Look up a mobile number');
    const e = input(label); await wait(`!!${e}`); await evaluate(`${e}.focus();${e}.select()`);
    if(value===''){await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8})}
    else await send('Input.insertText', { text:value }); await delay(90);
    assert.equal(await evaluate(`${e}.value`), value);
  };
  const route = value => wait(`location.pathname===${JSON.stringify(value)}`);
  const state = () => evaluate(`(()=>{const e=[...document.querySelectorAll('[role="button"]')].find(e=>!e.closest('[aria-hidden="true"]'));let f=e?.[Object.keys(e).find(key=>key.startsWith('__reactFiber$'))];while(f?.return)f=f.return;const stack=[f?.stateNode?.current];while(stack.length){const c=stack.pop();if(!c)continue;if(c.type?.name==='SessionProvider')return c.memoizedState.memoizedState;stack.push(c.child,c.sibling)}throw new Error('No session')})()`);
  const load = async (value, label) => {
    await send('Page.navigate', { url:'http://localhost:8087'+value }); await wait(`!!${control(label)}`);
    await wait(`Object.keys(${control(label)}).some(key=>key.startsWith('__reactProps$'))`); await delay(180);
  };
  const home = () => load('/home', 'Hide account balance');
  const backHome = async () => { for(let i=0;i<8;i++){const current=await evaluate('location.pathname');if(current==='/home')return;await click('Go back');await wait('location.pathname!=='+JSON.stringify(current))}throw new Error('Cannot return Home') };
  const scroll = async bottom => {
    await evaluate(`document.querySelectorAll('div').forEach(e=>{if(getComputedStyle(e).overflowY==='auto')e.scrollTop=${bottom?'e.scrollHeight':'0'}})`); await delay(80);
  };
  const panel = `([...document.querySelectorAll('[role="button"]')].reverse().find(e=>!e.closest('[aria-hidden="true"]')&&e.getAttribute('aria-label')?.startsWith('Banking preferences, ')))`;
  const modes = async (guidance, display) => {
    const panelClosed = await evaluate(`!!${panel}&&${panel}.getAttribute('aria-expanded')!=='true'`);
    if (panelClosed) { await evaluate(`${panel}.click()`); await delay(70); }
    await click({quick:'Quick mode',balanced:'Balanced mode',guided:'Guided mode'}[guidance]);
    const readability = `([...document.querySelectorAll('[role="button"]')].reverse().find(e=>!e.closest('[aria-hidden="true"]')&&e.getAttribute('aria-label')?.startsWith('Readability, ')))`;
    const closed = await evaluate(`${readability}.getAttribute('aria-expanded')!=='true'`);
    if (closed) { await evaluate(`${readability}.click()`); await delay(70); }
    await click({standard:'Standard',largeText:'Large text',highClarity:'High clarity'}[display]);
    if (closed) { await evaluate(`${readability}.click()`); await delay(50); }
    if (panelClosed) { await evaluate(`${panel}.click()`); await delay(50); }
  };
  const capture = async (folder, name, strict = true) => {
    fs.mkdirSync(folder, { recursive:true });
    const metrics = await evaluate(`(()=>{const visible=e=>!e.closest('[aria-hidden="true"]')&&e.getBoundingClientRect().width>0;const panel=[...document.querySelectorAll('[role="button"]')].find(e=>e.getAttribute('aria-label')==='Open development tools')?.parentElement;const col=document.querySelector('[data-testid="banking-column"]');return{
      documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,columnWidth:col?col.getBoundingClientRect().width:null,
      clippedText:[...document.querySelectorAll('div,h1,h2,h3,h4,span,p')].filter(e=>visible(e)&&e.childNodes.length===1&&e.firstChild.nodeType===3&&e.clientWidth>0&&e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),
      smallTargets:[...document.querySelectorAll('[role="button"],[role="radio"],[role="checkbox"]')].filter(e=>visible(e)&&(e.getBoundingClientRect().width<47.5||e.getBoundingClientRect().height<47.5)).map(e=>e.getAttribute('aria-label')??e.textContent),
      panelOverlap:panel?panel.previousElementSibling.getBoundingClientRect().bottom>panel.getBoundingClientRect().top+1:false}})()`);
    const result = await send('Page.captureScreenshot', { format:'png' });
    fs.writeFileSync(path.join(folder,name+'.png'), Buffer.from(result.data,'base64'));
    if(strict){assert.equal(metrics.documentWidth<=metrics.viewport,true,name+': overflow');assert.deepEqual(metrics.clippedText,[],name+': text');assert.deepEqual(metrics.smallTargets,[],name+': targets');assert.equal(metrics.panelOverlap,false,name+': development panel');if(metrics.columnWidth!==null)assert(metrics.columnWidth<=561,name+': desktop width')}
    return metrics;
  };
  const saved = async () => {
    await click('Pay Alex Tan at DBS');
    if(await exists('Continue to amount')) await click('Continue to amount');
    await route('/paynow/amount');
  };
  const start = async (guidance='balanced',display='standard') => {
    await home(); await click('PayNow'); await route('/paynow'); await modes(guidance,display);
    await click('Continue to recipient'); await route('/paynow/recipient');
  };
  const review = async (amount='50',guidance='balanced',display='standard') => {
    await start(guidance,display); await saved(); await type('Amount (SGD)',amount); await click('Review transfer'); await route('/paynow/review');
  };
  const key = async (key,code,vk) => {await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:vk,...(key==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:vk});await delay(90)};
  await send('Page.enable'); await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled',{enabled:true});
  return { send,evaluate,wait,control,exists,click,input,type,route,state,load,home,backHome,scroll,modes,capture,saved,start,review,key,delay,close:()=>ws.close() };
}
module.exports={connect};
