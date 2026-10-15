import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

// 显式运行的真实外部读取检查；网络响应全部来自实际服务。
const output = resolve('test-results/discovery-live');
const query = process.argv[2] || 'Kyoto';
await mkdir(output, { recursive: true });
const modules = new Map();
for (const name of ['provider.js', 'routes.js', 'transport.js']) {
  modules.set(`/src/discovery/${name}`, await readFile(new URL(`../src/discovery/${name}`, import.meta.url)));
}
const server = createServer((request, response) => {
  if (request.url === '/') { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end('<!doctype html><title>Discovery live verification</title>'); return; }
  if (!modules.has(request.url)) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': 'text/javascript' }); response.end(modules.get(request.url));
});
await new Promise(resolveReady => server.listen(0, '127.0.0.1', resolveReady));
const origin = `http://127.0.0.1:${server.address().port}`;
const proxyValue = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxy = proxyValue ? new URL(proxyValue) : null;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.EXPERIENCE_QA_CHROMIUM || undefined,
  args: ['--no-sandbox'],
  ...(proxy ? { proxy: { server: proxy.origin, bypass: '127.0.0.1,localhost',
    ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}),
});
const report = { checkedAt: new Date().toISOString(), query, origin, responses: [], failures: [], observations: {} };
try {
  const page = await browser.newPage();
  page.on('requestfailed', request => report.failures.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', async response => {
    const url = new URL(response.url());
    if (!['photon.komoot.io', 'en.wikipedia.org'].includes(url.hostname)) return;
    const headers = await response.allHeaders();
    report.responses.push({ url: response.url(), status: response.status(), cors: headers['access-control-allow-origin'] || null });
  });
  await page.goto(origin);
  report.observations = await page.evaluate(async query => {
    const { searchCenters, findNearby } = await import('/src/discovery/provider.js');
    const { suggestRoutes } = await import('/src/discovery/routes.js');
    const centers = await searchCenters(query);
    const city = centers.find(place => place.kind === 'city');
    if (!city) throw new Error('The live query did not identify a city.');
    const nearby = await findNearby(city);
    const routes = suggestRoutes(city, nearby);
    const cachedCenters = await searchCenters(query);
    const aborted = new AbortController(); aborted.abort();
    let cancellation = '';
    try { await searchCenters('Paris', { signal: aborted.signal }); }
    catch (error) { cancellation = error.name; }
    return { centers, city, nearby, routes, cacheMatches: JSON.stringify(centers) === JSON.stringify(cachedCenters), cancellation };
  }, query);
  assert.ok(report.observations.nearby.length > 0);
  assert.ok(report.observations.routes.length > 0);
  assert.equal(report.observations.cacheMatches, true);
  assert.equal(report.observations.cancellation, 'AbortError');
  assert.equal(report.responses.filter(response => response.url.includes('photon.komoot.io')).length, 1);
  assert.equal(report.responses.filter(response => response.url.includes('en.wikipedia.org')).length, 1);
  assert.ok(report.responses.every(response => response.status === 200 && response.cors === '*'));
  report.passed = true;
  console.log(JSON.stringify({ passed: true, center: report.observations.city.title, nearby: report.observations.nearby.length, routes: report.observations.routes.map(route => route.title), requests: report.responses.length, output }));
} finally {
  await writeFile(resolve(output, `${query.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-result.json`), JSON.stringify(report, null, 2));
  await browser.close();
  await new Promise(resolveClosed => server.close(resolveClosed));
}
