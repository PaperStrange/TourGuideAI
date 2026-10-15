import { readFileSync, writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceCommit = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(sourceCommit || '')) throw new Error('Provide the full released source commit.');
const run = promisify(execFile);
const base = 'https://paperstrange.github.io/TourGuideAI/';
const evidencePath = process.argv[3] ? resolve(process.argv[3])
  : fileURLToPath(new URL('./final/homepage-result.json', import.meta.url));
const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
const outputPath = process.argv[3] ? join(dirname(evidencePath), 'hosted-verification.json')
  : fileURLToPath(new URL('./hosted-verification.json', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { checkedAt: new Date().toISOString(), base, sourceCommit,
  manifestSha256: evidence.artifact.manifestSha256, passed: false, files: [] };
async function fetchBytes(path) {
  const url = new URL(path.replace(/^\//, ''), base);
  url.searchParams.set('review', sourceCommit);
  const result = await run('curl', ['--fail', '--silent', '--show-error', '--location', '--max-time', '45', url.href],
    { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  return result.stdout;
}
try {
  const descriptor = JSON.parse((await fetchBytes('review-build.json')).toString('utf8'));
  report.servedSourceCommit = descriptor.sourceCommit;
  report.descriptorMatches = descriptor.sourceCommit === sourceCommit
    && descriptor.builtManifestSha256 === report.manifestSha256;
  const pending = [...evidence.artifact.files];
  // 发布核对使用浏览器检查过的文件清单，限制并发读取数量。
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (pending.length) {
      const file = pending.shift();
      try {
        const bytes = await fetchBytes(file.path), actualSha256 = sha(bytes);
        report.files.push({ path: file.path, expectedSha256: file.sha256, actualSha256,
          bytes: bytes.length, matches: bytes.length === file.bytes && actualSha256 === file.sha256 });
      } catch (error) { report.files.push({ path: file.path, matches: false, error: error.message }); }
    }
  }));
  report.files.sort((a, b) => a.path.localeCompare(b.path));
  report.passed = report.descriptorMatches && report.files.length === evidence.artifact.files.length
    && report.files.every(file => file.matches);
} catch (error) { report.error = error.message; }
writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, files: report.files.length,
  matched: report.files.filter(file => file.matches).length, servedSourceCommit: report.servedSourceCommit,
  failed: report.files.filter(file => !file.matches).map(file => file.path), error: report.error }));
process.exitCode = report.passed ? 0 : 1;
