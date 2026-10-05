const fs=require('node:fs');
const crypto=require('node:crypto');
const {chromium}=require('playwright');
const dir='/workspace/scratch/blender-depth';
const artifact=process.argv[2];
if(!artifact)throw Error('Pass the frozen proof HTML path');
const bytes=fs.readFileSync(artifact),glb=fs.readFileSync(dir+'/block.glb');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const gltf=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)));
const url='http://127.0.0.1:4181/qa-depth-proof';
const result={recordedAt:new Date().toISOString(),scope:'Independent bounded Blender→GLB→browser proof; not game integration or human art acceptance',artifact:{path:artifact,sha256:sha(bytes),bytes:bytes.length},model:{path:dir+'/block.glb',sha256:sha(glb),bytes:glb.length},checks:[],observations:{},scenarios:{},screenshots:[],limitations:['Software-rendered cloud Chromium timings are not desktop GPU acceptance.','No character gameplay, bilingual game encounters, save migration, collision, picking-to-walk or journey export was implemented or tested by this camera proof.','No actual file:// launch: managed browser policy blocks that scheme.','No human acceptance or field test.']};
const save=()=>fs.writeFileSync(dir+'/qa-result.json',JSON.stringify(result,null,2)+'\n');
function check(name,pass,details){result.checks.push({name,status:pass?'PASS':'FAIL',details});save();console.log((pass?'PASS ':'FAIL ')+name);}
function distance(a,b){return Math.hypot(...a.map((v,i)=>v-b[i]));}
function snap(p){return p.evaluate(()=>window.__DEPTH_PROBE__.snapshot());}
let browser;
async function setup(name,options={},init){
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,...options});
 const page=await context.newPage();const record=result.scenarios[name]={secondaryRequests:[],consoleErrors:[],pageErrors:[]};
 page.on('pageerror',e=>record.pageErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')record.consoleErrors.push(m.text());});
 await page.route('**/*',r=>r.request().url()===url?r.fulfill({status:200,contentType:'text/html',body:bytes}):(record.secondaryRequests.push(r.request().url()),r.abort()));
 if(init)await page.addInitScript(init);
 const started=Date.now();await page.goto(url,{waitUntil:'load'});record.documentLoadWallMs=Date.now()-started;
 return{context,page,record};
}
async function shot(page,name){const path=dir+'/qa-'+name+'.png';await page.screenshot({path,fullPage:true});result.screenshots.push(path);save();}
(async()=>{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});result.browser=browser.version();save();
 check('HTML embeds the exact independently hashed GLB bytes',bytes.includes(Buffer.from(glb.toString('base64'))));
 const external=[...(gltf.buffers||[]),...(gltf.images||[])].filter(v=>v.uri&&!v.uri.startsWith('data:'));
 check('GLB contains no external asset URIs',external.length===0,external);
 const anchors=gltf.nodes.filter(n=>n.name?.startsWith('ReadingPoint_'));
 const crossing=anchors.find(n=>n.name==='ReadingPoint_crossing');const actor=gltf.nodes.find(n=>n.name==='Traveller_Authored');
 result.observations.anchors=anchors;check('Crossing and actor retain world-to-glTF axes and authored heights',distance(crossing.translation,[20.721,.25,-2.33])<.00001&&distance(actor.translation,[23.8,.23,-2.1])<.00001,{crossing:crossing.translation,actor:actor.translation});
 const {page,record,context}=await setup('normal',{},()=>localStorage.setItem('tourguideai:first-walk:v1','QA existing journey sentinel'));
 await page.waitForFunction(()=>window.__DEPTH_PROBE__?.snapshot().ready,{},{timeout:90000});await page.waitForTimeout(700);
 const opening=await snap(page);result.observations.opening=opening;
 check('Browser reports the same imported model hash',opening.metadata.modelSha256===result.model.sha256);
 check('Real WebGL2 canvas has drawn imported meshes',opening.frame>0&&opening.model.meshInstances>0&&opening.render.calls>0&&opening.webgl.version.includes('WebGL 2'),opening);
 check('Existing journey storage is untouched by this isolated proof',await page.evaluate(()=>localStorage.getItem('tourguideai:first-walk:v1'))==='QA existing journey sentinel');
 await shot(page,'en-initial');
 await page.locator('#locale').click();await page.waitForTimeout(200);const zh=await snap(page);
 const zhUI=await page.evaluate(()=>({lang:document.documentElement.lang,title:document.querySelector('h1').textContent,buttons:[...document.querySelectorAll('#tools button')].map(e=>e.textContent),canvasLabel:document.querySelector('canvas').getAttribute('aria-label'),toolsLabel:document.querySelector('#tools').getAttribute('aria-label')}));
 check('Chinese camera instructions and accessible controls are translated',zhUI.lang.startsWith('zh')&&zhUI.buttons.every(s=>/[\u4e00-\u9fff]/.test(s))&&/[\u4e00-\u9fff]/.test(zhUI.canvasLabel)&&/[\u4e00-\u9fff]/.test(zhUI.toolsLabel),zhUI);
 check('Locale switch preserves camera',distance(opening.camera.position,zh.camera.position)<.00001);
 await shot(page,'zh-initial');
 await page.mouse.move(1080,570);await page.mouse.down();await page.mouse.move(940,610,{steps:8});await page.mouse.up();await page.waitForTimeout(1500);
 const dragged=await snap(page);check('Actual pointer drag rotates camera',distance(zh.camera.position,dragged.camera.position)>.1,{before:zh.camera,after:dragged.camera});
 await page.mouse.wheel(0,-260);await page.waitForTimeout(1300);const zoomed=await snap(page);
 check('Actual wheel changes camera distance within bounds',zoomed.camera.distance<dragged.camera.distance-.1&&zoomed.camera.distance>=37.999&&zoomed.camera.distance<=94.001,{before:dragged.camera,after:zoomed.camera});await shot(page,'zh-pointer-zoom');
 await page.locator('#reset').click();await page.waitForTimeout(1300);const reset=await snap(page);
 check('Reset returns to guided camera',Math.abs(reset.camera.distance-73)<.001&&Math.abs(reset.camera.azimuth-.17)<.001,reset.camera);
 await page.locator('#left').click();await page.waitForTimeout(1000);const left=await snap(page);await shot(page,'zh-left');
 await page.locator('#right').click();await page.waitForTimeout(1000);const right=await snap(page);await shot(page,'zh-right');
 check('Camera buttons give distinct bounded viewpoints',left.camera.azimuth<-.4&&right.camera.azimuth>.4&&Math.abs(left.camera.azimuth)<=.601&&Math.abs(right.camera.azimuth)<=.601,{left:left.camera,right:right.camera});
 await page.locator('#reset').click();await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(800);await shot(page,'zh-1280x720');
 const size=await page.evaluate(()=>{const c=document.querySelector('canvas'),s=document.querySelector('#stage'),r=c.getBoundingClientRect(),p=s.getBoundingClientRect();return{canvas:[r.width,r.height],stage:[p.width,p.height],bitmap:[c.width,c.height],document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight]};});
 check('Compact desktop canvas matches stage after screenshot/resize',size.canvas[0]===size.stage[0]&&size.canvas[1]===size.stage[1]&&size.document[0]===1280&&size.document[1]===720,size);
 result.observations.beforeContextLoss=await snap(page);
 const lost=await page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_lose_context');if(!ext)return false;ext.loseContext();return true;});
 check('Context-loss injection supported',lost);
 if(lost){await page.waitForFunction(()=>document.querySelector('#stage').dataset.state==='unavailable');await page.waitForTimeout(200);
 const recovery=await page.evaluate(()=>({fallback:!document.querySelector('#fallback').hidden,imageLoaded:document.querySelector('#fallback img')?.naturalWidth>0,toolsHidden:document.querySelector('#tools').hidden,status:document.querySelector('#status').textContent,intro:document.querySelector('header p').textContent,save:localStorage.getItem('tourguideai:first-walk:v1')}));
 check('Context loss shows localized fixed view and stops camera controls',recovery.fallback&&recovery.imageLoaded&&recovery.toolsHidden&&/无法|不可|不支持/.test(recovery.status),recovery);
 check('Context loss does not touch existing saved journey',recovery.save==='QA existing journey sentinel');await shot(page,'zh-context-lost');
 await page.locator('#locale').click();await shot(page,'en-context-lost');check('Failure message switches to English',/unavailable|not available/i.test(await page.locator('#status').innerText()));}
 check('Normal/context-loss run made zero secondary requests',record.secondaryRequests.length===0,record.secondaryRequests);
 check('Normal/context-loss run had no uncaught or console errors',record.pageErrors.length===0&&record.consoleErrors.length===0,record);
 await context.close();
 const reduced=await setup('reduced-motion',{reducedMotion:'reduce'});await reduced.page.waitForFunction(()=>window.__DEPTH_PROBE__?.snapshot().ready,{},{timeout:90000});
 await reduced.page.mouse.move(1050,600);await reduced.page.mouse.down();await reduced.page.mouse.move(900,620,{steps:7});await reduced.page.mouse.up();await reduced.page.waitForTimeout(70);const ra=await snap(reduced.page);await reduced.page.waitForTimeout(650);const rb=await snap(reduced.page);
 check('Reduced motion has no continuing camera inertia after release',distance(ra.camera.position,rb.camera.position)<.000001,{afterRelease:ra.camera,later:rb.camera});
 check('Reduced-motion scenario has no secondary requests or errors',reduced.record.secondaryRequests.length===0&&reduced.record.consoleErrors.length===0&&reduced.record.pageErrors.length===0,reduced.record);await reduced.context.close();
 const unavailable=await setup('webgl-unavailable',{},()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return ['webgl','webgl2','experimental-webgl'].includes(type)?null:get.call(this,type,...args);};});
 await unavailable.page.waitForFunction(()=>document.querySelector('#stage').dataset.state==='unavailable');
 const unavailableUI=await unavailable.page.evaluate(()=>({imageLoaded:document.querySelector('#fallback img')?.naturalWidth>0,status:document.querySelector('#status').textContent,intro:document.querySelector('header p').textContent,toolsHidden:document.querySelector('#tools').hidden}));
 check('WebGL creation failure displays honest fixed-view recovery',unavailableUI.imageLoaded&&unavailableUI.toolsHidden&&/unavailable/i.test(unavailableUI.status),unavailableUI);await shot(unavailable.page,'en-webgl-unavailable');await unavailable.page.locator('#locale').click();
 check('WebGL-unavailable recovery also localizes to Chinese',/无法|不可|不支持/.test(await unavailable.page.locator('#status').innerText()));await shot(unavailable.page,'zh-webgl-unavailable');
 check('WebGL-unavailable scenario has zero secondary requests and uncaught errors',unavailable.record.secondaryRequests.length===0&&unavailable.record.pageErrors.length===0,unavailable.record);
 result.observations.expectedUnavailableConsoleErrors=unavailable.record.consoleErrors;await unavailable.context.close();
 result.summary={passed:result.checks.filter(c=>c.status==='PASS').length,failed:result.checks.filter(c=>c.status==='FAIL').length};result.status=result.summary.failed?'issues found':'technical proof checks passed; visual review and user acceptance separate';save();
})().catch(error=>{result.fatal=error.stack;result.status='incomplete';save();console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
