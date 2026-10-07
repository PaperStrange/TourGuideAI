import { chromium } from '/workspace/TourGuideAI-iteration-plan/experience/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { createHash } from 'node:crypto';
const root='/workspace/TourGuideAI-iteration-plan/experience/dist';
const out='/workspace/scratch/perspective-qa/layout-repair-20261007';
const origin='http://127.0.0.1:4187';
const hash=x=>createHash('sha256').update(x).digest('hex');
const assets=new Map();function scan(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())scan(path);else assets.set('/'+relative(root,path),readFileSync(path));}}scan(root);
const files=[...assets].sort(([a],[b])=>a.localeCompare(b)).map(([path,bytes])=>({path,bytes:bytes.length,sha256:hash(bytes)}));
const delta=JSON.parse(readFileSync(out+'/artifact-delta.json'));
const report={startedAt:new Date().toISOString(),artifact:{manifestSha256:hash(JSON.stringify(files)),files},scope:'Focused proof for original sidebar entry layout and navigation repair; not a replay of the original full suite.',checks:[],screenshots:[],requests:[],externalRequests:[],pageErrors:[],consoleErrors:[]};
if(report.artifact.manifestSha256!==delta.currentManifestSha256)throw Error('Repair package changed since delta audit');
function check(id,pass,evidence){report.checks.push({id,pass:Boolean(pass),evidence});writeFileSync(out+'/layout-result.json',JSON.stringify(report,null,2)+'\n');console.log(`${pass?'PASS':'FAIL'} ${id}`);}
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin||!assets.has(url.pathname)){report.externalRequests.push(url.href);return route.abort();}report.requests.push(url.pathname);return route.fulfill({body:assets.get(url.pathname),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.woff':'font/woff','.glb':'model/gltf-binary'})[extname(url.pathname)]||'application/octet-stream'});});
await context.addInitScript(()=>{if(!sessionStorage.getItem('qa-seed')){localStorage.setItem('tourguideai:appearance:v1','{"lighting":"night"}');sessionStorage.setItem('qa-seed','1');}});
const page=await context.newPage();page.setDefaultTimeout(180000);page.on('pageerror',e=>report.pageErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
await page.goto(origin+'/index.html?qa=1');await page.waitForFunction(()=>window.__TOUR_GAME__&&document.querySelector('#loading').hidden&&window.__TOUR_GAME__.renderer().lighting.phase==='ready');await page.evaluate(()=>document.fonts.ready);
for(const[width,height]of[[1440,1000],[1280,720],[390,844]]){
 await page.setViewportSize({width,height});
 for(const locale of['en','zh']){
  await page.locator(`#language-switch [data-locale="${locale}"]`).click();
  await page.waitForFunction(()=>{const a=document.querySelector('#game-stage').getBoundingClientRect(),b=document.querySelector('#game-stage canvas').getBoundingClientRect();return Math.abs(a.width-b.width)<=1&&Math.abs(a.height-b.height)<=1;});
  const name=`legacy-layout-${width}-${locale}.png`;await page.screenshot({path:out+'/'+name,fullPage:true});report.screenshots.push({name,sha256:hash(readFileSync(out+'/'+name))});
  const dimensions=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};const link=document.querySelector('#perspective-link'),r=link.getClientRects()[0],top=r?document.elementFromPoint(r.x+r.width/2,r.y+r.height/2):null;return{viewport:[innerWidth,innerHeight],document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],stage:rect('#game-stage'),canvas:rect('#game-stage canvas'),sidebar:rect('.sidebar'),export:rect('#export-notes'),footer:rect('.bottom-bar'),link:rect('#perspective-link'),linkRects:[...link.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom})),href:link.href,text:link.textContent,linkReachable:top===link||link.contains(top)};});
  const canvasFit=Math.abs(dimensions.stage.width-dimensions.canvas.width)<=1&&Math.abs(dimensions.stage.height-dimensions.canvas.height)<=1;
  check(`layout-${width}-${locale}`,dimensions.document[0]===width&&(width<721||dimensions.document[1]===height)&&canvasFit&&dimensions.export.bottom<=dimensions.footer.y,dimensions);
  const href=new URL(dimensions.href);check(`entry-${width}-${locale}`,href.pathname==='/perspective.html'&&href.searchParams.get('lang')===locale&&dimensions.linkReachable&&dimensions.linkRects.every(r=>r.left>=dimensions.sidebar.x&&r.right<=dimensions.sidebar.right),{href:dimensions.href,text:dimensions.text,rects:dimensions.linkRects,reachable:dimensions.linkReachable});
 }
}
const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('tourguideai:journey:v2')));
await page.locator('#perspective-link').focus();await page.keyboard.press('Enter');await page.locator('#begin').waitFor();
const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('tourguideai:journey:v2')));
check('entry-keyboard-navigation-opens-chinese-experience',new URL(page.url()).pathname==='/perspective.html'&&new URL(page.url()).searchParams.get('lang')==='zh'&&await page.evaluate(()=>document.documentElement.lang==='zh'),{url:page.url()});
check('entry-navigation-retains-journey-meaning',JSON.stringify(before.notes)===JSON.stringify(after.notes)&&JSON.stringify(before.game.choiceIds)===JSON.stringify(after.game.choiceIds)&&before.game.x===after.game.x&&before.game.y===after.game.y,{before,after});
check('repair-no-external-requests-or-errors',report.externalRequests.length===0&&report.pageErrors.length===0&&report.consoleErrors.length===0,{externalRequests:report.externalRequests,pageErrors:report.pageErrors,consoleErrors:report.consoleErrors});
await context.close();
}catch(error){check('repair-probe-completed',false,{message:error.message,stack:error.stack});}
finally{await browser.close();report.finishedAt=new Date().toISOString();report.summary={passed:report.checks.filter(x=>x.pass).length,failed:report.checks.filter(x=>!x.pass).length};writeFileSync(out+'/layout-result.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));if(report.summary.failed)process.exitCode=1;}
