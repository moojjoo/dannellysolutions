const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const test = require('node:test');
const root = path.resolve(__dirname, '../..');
const code = fs.readFileSync(path.join(root, 'analytics-preferences.js'), 'utf8');
const id = 'G-MK1NPN5N6N';
const disabled = 'ga-disable-' + id;
const key = 'dannelly-analytics-preference-v1';
const horizon = 180 * 86400 * 1000;
const pref = (choice, until = Date.now()+1000) => JSON.stringify({choice,until});

function fixture(raw, {host='dannellysolutions.com', hash='', noStorage=false}={}) {
  const scripts = [], writes = [], preferences = [], events = {};
  const field = {value:'Partially typed description'};
  let cookieReads = 0;
  function element() {
    return { hidden:true, events:{}, addEventListener(n,fn){this.events[n]=fn;}, focus(){this.focused=true;} };
  }
  const elements=Object.fromEntries(['cookie-preferences','open-analytics-preferences','allow-analytics','reject-analytics','analytics-status','cookie-preferences-title'].map(k=>[k,element()]));
  const window={addEventListener(n,f){events[n]=f;}};
  const document={getElementById:k=>elements[k],createElement(tag){assert.equal(tag,'script');return element();},head:{appendChild:scripts.push.bind(scripts)}};
  Object.defineProperty(document,'cookie',{get(){cookieReads++;return '';},set(value){writes.push(value);}});
  const location={hostname:host,hash,origin:'https://'+host,pathname:'/'};
  const localStorage={getItem(k){assert.equal(k,key);if(noStorage)throw Error('blocked');return raw;},setItem(k,v){assert.equal(k,key);if(noStorage)throw Error('blocked');preferences.push(JSON.parse(v));}};
  vm.runInNewContext(code,{window,document,localStorage,location});
  return {window,events,els:elements,scripts,writes,preferences,field,cookieReads:()=>cookieReads};
}
test('clean and expired visits are off with no Google request or cookie access', () => {
  for(const v of [null,'{',pref('allow',Date.now()-1),pref('bogus')]){
    const f=fixture(v);
    assert.equal(f.window[disabled],true);
    assert.equal(f.scripts.length,0);
    assert.equal(f.cookieReads(),0);
    assert.equal(f.writes.length,0);
    assert.equal(f.els['cookie-preferences'].hidden,false);
  }
});
test('explicit rejection persists off without adding external script or reading cookies', () => {
  const f=fixture(null,{host:'www.dannellysolutions.com'});
  f.els['reject-analytics'].events.click();
  assert.equal(f.window[disabled],true);
  assert.equal(f.scripts.length,0);
  assert.equal(f.cookieReads(),0);
  assert.ok(f.writes.includes('_ga_=; Max-Age=0; Path=/; Domain=dannellysolutions.com')===false);
  assert.ok(f.writes.includes('_ga_MK1NPN5N6N=; Max-Age=0; Path=/; Domain=dannellysolutions.com'));
  assert.ok(f.writes.includes('_ga=; Max-Age=0; Path=/'));
  assert.equal(f.preferences[0].choice,'reject');
  assert.ok(Math.abs((f.preferences[0].until-Date.now())-horizon)<1000);
  const reload=fixture(JSON.stringify(f.preferences[0]));
  assert.equal(reload.scripts.length,0);
});
test('allow loads one tag, then withdrawal disables it without reloading or touching inputs', () => {
  const f=fixture(null);
  f.els['allow-analytics'].events.click();
  f.els['allow-analytics'].events.click();
  assert.equal(f.window[disabled],false);
  assert.equal(f.scripts.length,1);
  assert.match(f.scripts[0].src,/^https:\/\/www\.googletagmanager\.com\//);
  const config=Array.from(f.window.dataLayer[2])[2];
  assert.equal(config.cookie_expires,180*86400);
  assert.equal(config.cookie_update,false);
  f.els['reject-analytics'].events.click();
  assert.equal(f.window[disabled],true);
  assert.equal(f.field.value,'Partially typed description');
  assert.equal(f.preferences.at(-1).choice,'reject');
  const count=f.writes.length;
  f.scripts[0].events.load();  // Resolves withdrawal during initial tag download.
  assert.ok(f.writes.length>count);
});
test('stored choice, preference focus, cross-tab withdrawal, storage blocked', () => {
  const f=fixture(pref('allow'));
  assert.equal(f.scripts.length,1);
  assert.equal(f.els['cookie-preferences'].hidden,true);
  f.els['open-analytics-preferences'].events.click();
  assert.equal(f.els['cookie-preferences'].hidden,false);
  assert.equal(f.els['cookie-preferences-title'].focused,true);
  f.events.storage({key,newValue:pref('reject')});
  assert.equal(f.window[disabled],true);
  const n=fixture(null,{noStorage:true,hash:'#cookie-preferences'});
  assert.equal(n.window[disabled],true);
  n.els['reject-analytics'].events.click();
  assert.match(n.els['analytics-status'].textContent,/could not save/);
});
test('HTML dependency and no-JavaScript navigation contracts', () => {
  for (const file of ['index.html','privacy.html','cookies.html','terms.html']) {
    const source=fs.readFileSync(path.join(root,file),'utf8');
    for(const link of ['privacy.html','cookies.html','terms.html']) assert.ok(source.includes('href="'+link+'"'));
    assert.doesNotMatch(source,/googletagmanager|google-analytics\.com|<iframe/i);
    if(file!=='index.html')assert.doesNotMatch(source,/<script|<form/i);
    else {
      assert.match(source,/id="contact-form"/);
      assert.match(source,/challenges\.cloudflare\.com\/turnstile/);
      assert.match(source,/class="privacy-note"[^\n]+href="privacy\.html"/);
      assert.match(source,/analytics-preferences\.js/);
      assert.match(source,/id="allow-analytics" type="button"/);
      assert.match(source,/id="reject-analytics" type="button"/);
    }
  }
});
