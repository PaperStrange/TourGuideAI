import { chromium } from '/workspace/TourGuideAI-iteration-plan/experience/node_modules/playwright/index.mjs';
import { readFileSync,readdirSync,writeFileSync } from 'node:fs';
import { join,relative,extname } from 'node:path';
import { createHash } from 'node:crypto';
const dist='/workspace/TourGuideAI-iteration-plan/experience/dist',out='/workspace/scratch/perspective-qa/mobile-live-20261007',origin='http://127.0.0.1:4187';
const sha=x=>createHash('sha256').update(x).digest('hex'),assets=new Map();
function scan(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())scan(p);else assets.set('/'+relative(dist,p),readFileSync(p));}}scan(dist);
const files=[...assets].sort(([a],[b])=>a.localeCompare(b)).map(([path,bytes])=>({path,bytes:bytes.length,sha256:sha(bytes)}));
const report={startedAt:new Date().toISOString(),artifact:{manifestSha256:sha(JSON.stringify(files)),files},driverSha256:sha(readFileSync(new URL(import.meta.url))),conditions:{viewport:[390,844],hasTouch:true,isMobile:true,deviceScaleFactor:1,inputs:'Playwright touchscreen taps and trusted Chromium CDP touch swipe; text via keyboard input'},checks:[],screenshots:[],externalRequests:[],pageErrors:[],consoleErrors:[],limitations:['Automated emulated mobile touch behavior, not physical-device fluency or virtual keyboard acceptance.','Single first-moment check and short adjacent walk, not a full phone route replay.','Software-rendered Chromium; no hardware performance claim.']};
if(report.artifact.manifestSha256!=='0dcb86bc7247f0b790627ecc61799a8c60268475e802da8f940995fe2791e613')throw Error('Final package changed');
const persist=()=>writeFileSync(out+'/mobile-result.json',JSON.stringify(report,null,2)+'\n');
function check(id,pass,evidence){report.checks.push({id,pass:Boolean(pass),evidence});persist();console.log(`${pass?'PASS':'FAIL'} ${id}`);if(!pass)throw Error('Stop on failed check: '+id);}
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
report.browser=browser.version();
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin||!assets.has(u.pathname)){report.externalRequests.push(u.href);return route.abort();}return route.fulfill({body:assets.get(u.pathname),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.woff':'font/woff'})[extname(u.pathname)]||'application/octet-stream'});});
const page=await context.newPage();page.setDefaultTimeout(120000);page.on('pageerror',e=>report.pageErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
const live=()=>page.evaluate(()=>window.__PERSPECTIVE_VIEW__.snapshot());
const game=()=>page.evaluate(()=>window.__TOUR_GAME__.snapshot());
const ready=()=>page.waitForFunction(()=>{const s=window.__PERSPECTIVE_VIEW__?.snapshot();return s?.ready&&s.settled&&!s.moving;});
const capture=async name=>{const path=out+'/'+name;await page.screenshot({path,fullPage:true});report.screenshots.push({name,path,sha256:sha(readFileSync(path))});persist();};
await page.goto(origin+'/perspective.html?qa=1&mode=walk&lang=en');await page.locator('#begin').tap();await ready();
const arrived=await live();check('first-moment-arrives-with-real-live-scene',Math.hypot(arrived.position.x-20.721,arrived.position.y-2.33)<.15&&await page.locator('#reveal').isEnabled(),arrived);
const en=await page.locator('#view-help').innerText();const coarse=await page.evaluate(()=>({coarse:matchMedia('(pointer:coarse)').matches,touchPoints:navigator.maxTouchPoints,width:innerWidth,documentWidth:document.documentElement.scrollWidth}));
check('english-touch-hint-and-phone-layout',en==='Tap the street to walk · Drag to look around'&&coarse.coarse&&coarse.touchPoints>0&&coarse.width===390&&coarse.documentWidth===390,{hint:en,...coarse});
await page.locator('#reveal').tap();await ready();await capture('mobile-live-en.png');
await page.locator('#reset-camera').tap();await ready();
const canvas=page.locator('#live-stage canvas');await canvas.scrollIntoViewIfNeeded();
await page.evaluate(()=>{window.__QA_TOUCH_EVENTS__=[];for(const type of ['pointerdown','pointerup'])document.querySelector('#live-stage canvas').addEventListener(type,e=>window.__QA_TOUCH_EVENTS__.push({type:e.type,pointerType:e.pointerType,trusted:e.isTrusted,x:e.clientX,y:e.clientY}),{passive:true});});
const beforeTap=await game();
const target={x:beforeTap.x+.9,y:beforeTap.y};
const projected=await page.evaluate(p=>{const q=window.__TOUR_GAME__.screenPoint(p.x,p.y,.17),r=document.querySelector('#live-stage canvas').getBoundingClientRect();return{...q,clientX:r.x+q.x,clientY:r.y+q.y,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};},target);
check('adjacent-tap-ground-is-visible',projected.visible&&projected.clientX>projected.rect.x+5&&projected.clientX<projected.rect.x+projected.rect.width-5&&projected.clientY>projected.rect.y+5&&projected.clientY<projected.rect.y+projected.rect.height-5,{target,projected});
await page.touchscreen.tap(projected.clientX,projected.clientY);
await page.waitForFunction(p=>{const s=window.__TOUR_GAME__.snapshot();return !s.moving&&!s.destination&&Math.hypot(s.x-p.x,s.y-p.y)<.12;},target);await ready();
const afterTap=await game(),events=await page.evaluate(()=>window.__QA_TOUCH_EVENTS__);
check('trusted-touch-tap-walks-to-adjacent-ground',Math.hypot(afterTap.x-beforeTap.x,afterTap.y-beforeTap.y)>.5&&Math.hypot(afterTap.x-target.x,afterTap.y-target.y)<.12&&events.some(e=>e.type==='pointerup'&&e.pointerType==='touch'&&e.trusted),{beforeTap,afterTap,target,events});
const beforeSwipe=await live(),beforeScroll=await page.evaluate(()=>scrollY),r=await canvas.boundingBox(),cdp=await context.newCDPSession(page);
const x=r.x+r.width*.38,y=r.y+r.height*.48;
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1,radiusX:4,radiusY:4,force:1}]});
for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*r.width*.2/8,y:y-i*4/8,id:1,radiusX:4,radiusY:4,force:1}]});await page.waitForTimeout(35);}
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1500);await ready();
const afterSwipe=await live(),swipeGame=await game(),afterScroll=await page.evaluate(()=>scrollY),swipeEvents=await page.evaluate(()=>window.__QA_TOUCH_EVENTS__);
check('trusted-touch-swipe-orbits-without-walk-or-page-scroll',JSON.stringify(beforeSwipe.position)===JSON.stringify(afterSwipe.position)&&Math.abs(beforeSwipe.view.camera.azimuth-afterSwipe.view.camera.azimuth)>.02&&!swipeGame.destination&&!swipeGame.moving&&Math.abs(beforeScroll-afterScroll)<2&&swipeEvents.filter(e=>e.type==='pointerup'&&e.pointerType==='touch'&&e.trusted).length===2,{beforeSwipe,afterSwipe,swipeGame,beforeScroll,afterScroll,events:swipeEvents});
await page.locator('#note').tap();const beforeNote=await live();await page.keyboard.insertText('自动化触控检查 / touch QA draft');await page.keyboard.press('w');await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowRight');
const expected='自动化触控检查 / touch QA draftw';
const afterNote=await live();check('note-keyboard-input-does-not-drive-player',await page.locator('#note').inputValue()===expected&&JSON.stringify(beforeNote.position)===JSON.stringify(afterNote.position)&&!afterNote.moving,{beforeNote,afterNote,note:await page.locator('#note').inputValue()});
await page.locator('#locale-zh').tap();await page.waitForFunction(()=>document.documentElement.lang==='zh');
const zh=await page.locator('#view-help').innerText(),afterLocale=await live();
check('chinese-touch-hint-keeps-draft-and-scene',zh==='轻点街道行走 · 拖动环顾'&&await page.locator('#note').inputValue()===expected&&JSON.stringify(afterNote.position)===JSON.stringify(afterLocale.position)&&await page.evaluate(()=>window.__PERSPECTIVE__.snapshot().record.index===0),{hint:zh,afterLocale,note:await page.locator('#note').inputValue()});
await page.locator('#save-moment').tap();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tourguideai:perspective:v1')));
check('touch-note-save-retains-live-view-and-no-horizontal-overflow',saved.moments.length===1&&saved.moments[0].note===expected&&saved.moments[0].view.kind==='walk'&&await page.evaluate(()=>document.documentElement.scrollWidth===390),saved);
await capture('mobile-live-zh.png');
check('mobile-live-no-external-network-or-browser-errors',!report.externalRequests.length&&!report.pageErrors.length&&!report.consoleErrors.length,{externalRequests:report.externalRequests,pageErrors:report.pageErrors,consoleErrors:report.consoleErrors});
await context.close();
}catch(error){report.error={message:error.message,stack:error.stack};if(!report.checks.some(c=>!c.pass))report.checks.push({id:'probe-completed',pass:false,evidence:report.error});console.log(error.message);}
finally{await browser.close();report.finishedAt=new Date().toISOString();report.summary={passed:report.checks.filter(c=>c.pass).length,failed:report.checks.filter(c=>!c.pass).length};persist();console.log(JSON.stringify(report.summary));if(report.summary.failed)process.exitCode=1;}
