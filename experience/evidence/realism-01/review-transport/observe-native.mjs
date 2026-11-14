import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const reportPath = resolve(process.argv[2]);
const report = JSON.parse(readFileSync(reportPath));
const profile = report.environment.nativeBrowser.args.find(argument => argument.startsWith('--user-data-dir=')).slice('--user-data-dir='.length);
const port = readFileSync(resolve(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = targets.find(target => target.type === 'page' && target.url.startsWith(report.entry));
if (!target) throw new Error('The active native source page was not found');
const socket = new WebSocket(target.webSocketDebuggerUrl);
const value = await new Promise((accept, reject) => {
  const timer = setTimeout(() => reject(new Error('Native observation timeout')), 10000);
  socket.addEventListener('open', () => socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: {
    expression: '({ hidden: document.hidden, visibilityState: document.visibilityState, view: window.__REALISM_REVIEW__?.snapshot() })', returnByValue: true,
  } })));
  socket.addEventListener('message', event => {
    const response = JSON.parse(event.data); if (response.id !== 1) return;
    clearTimeout(timer);
    if (response.error || response.result.exceptionDetails) reject(new Error(JSON.stringify(response)));
    else accept(response.result.result.value);
  });
  socket.addEventListener('error', error => { clearTimeout(timer); reject(error); });
});
socket.close();
const record = { at: new Date().toISOString(), observerSha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
  method: 'Read-only Runtime.evaluate attached to the existing native browser target', url: target.url, ...value };
const path = resolve(dirname(reportPath), `native-observation-${Date.now()}.json`);
writeFileSync(path, JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ path, hidden: record.hidden, status: record.view?.status, frames: record.view?.frames, tour: record.view?.tour }));
