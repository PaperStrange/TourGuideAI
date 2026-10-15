import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

if (process.argv.length < 4) throw new Error('Usage: node bind-regressions.mjs <report> <output>');
const sourcePath = resolve(process.argv[2]), output = resolve(process.argv[3]);
const bytes = readFileSync(sourcePath), report = JSON.parse(bytes);
const final = JSON.parse(readFileSync(new URL('./final/travel-result.json', import.meta.url), 'utf8'));
const previousFiles = new Map((report.artifact?.files ?? []).map(file => [file.path, file]));
const finalFiles = new Map(final.artifact.files.map(file => [file.path, file]));
const requested = [...new Set(Object.values(report.scenarios).flatMap(scenario => scenario.requests))].sort();
// 回归运行期间只修改 travel 页面；逐个核对回归场景实际读取的资源。
const loaded = requested.filter(path => previousFiles.has(path)).map(path => ({ path,
  originalSha256: previousFiles.get(path).sha256, finalSha256: finalFiles.get(path)?.sha256 ?? null,
  matches: previousFiles.get(path).sha256 === finalFiles.get(path)?.sha256 }));
const result = { report: sourcePath, reportSha256: createHash('sha256').update(bytes).digest('hex'),
  reportManifestSha256: report.artifact?.manifestSha256,
  finalManifestSha256: final.artifact.manifestSha256,
  checksPassed: report.checks.filter(check => check.pass).length, checksTotal: report.checks.length,
  requestedPackagedFiles: loaded, requestedAbsentFiles: requested.filter(path => !previousFiles.has(path)),
  passed: loaded.length > 0 && loaded.every(file => file.matches) && report.checks.every(check => check.pass) };
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passed: result.passed, checksPassed: result.checksPassed, checksTotal: result.checksTotal,
  files: loaded.length, mismatch: loaded.filter(file => !file.matches).map(file => file.path) }));
process.exitCode = result.passed ? 0 : 1;
