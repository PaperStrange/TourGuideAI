import { chromium } from '../experience/node_modules/playwright/index.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve,join } from 'node:path';
import { startWorkbenchServer } from '../experience/content-tools/preview-site.mjs';

const root = resolve(import.meta.dirname,'..');
const output = resolve(root,'artifacts/workbench-shadow',process.argv[2]);
await mkdir(output,{recursive:true});
const directories = ['delft','helsinki'].map(name=>resolve(root,'artifacts/site-workbench',name));
const manifests = await Promise.all(directories.map(async directory=>JSON.parse(await readFile(join(directory,'manifest.json'),'utf8'))));
const report = {startedAt:new Date().toISOString(),viewerSha256:createHash('sha256').update(await readFile(resolve(root,'experience/content-tools/viewer/main.js'))).digest('hex'),models:manifests.map(item=>({id:item.id,...item.model})),captures:[],errors:[]};
const server = await startWorkbenchServer({directories,port:0});
let browser;
try {
  browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  report.browser = browser.version();
  for (const mobile of [false,true]) {
    const context = await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1,reducedMotion:'reduce'});
    const page = await context.newPage();
    page.setDefaultTimeout(120000);
    page.on('pageerror',error=>report.errors.push(error.message));
    await page.goto(server.url,{waitUntil:'domcontentloaded'});
    for (const site of manifests) {
      await page.locator('#site-selector').selectOption(site.id);
      for (const mode of ['day','night']) {
        await page.locator(`[data-lighting=${mode}]`)[mobile?'tap':'click']();
        await page.waitForFunction(({id,mode})=>{const state=window.__SITE_WORKBENCH__?.snapshot();return state?.phase==='ready'&&state.siteId===id&&state.mode===mode;},{id:site.id,mode},{timeout:120000});
        await page.locator('#reset-view')[mobile?'tap':'click']();
        await page.locator('#stage').scrollIntoViewIfNeeded();
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const filename = `${site.id}-${mobile?'phone':'desktop'}-${mode}.png`;
        await page.screenshot({path:join(output,filename),fullPage:!mobile});
        report.captures.push({filename,snapshot:await page.evaluate(()=>window.__SITE_WORKBENCH__.snapshot())});
      }
    }
    await context.close();
  }
} finally {
  await browser?.close(); await server.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(join(output,'capture.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({output,captures:report.captures.length,errors:report.errors,viewerSha256:report.viewerSha256}));
