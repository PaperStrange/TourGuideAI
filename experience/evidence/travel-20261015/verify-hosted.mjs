import { readFileSync, writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';

const run = promisify(execFile);
const sourceCommit = 'a8c3e493058198e8e5012bc9fd470190dc358148';
const base = 'https://paperstrange.github.io/TourGuideAI/';
const evidence = JSON.parse(readFileSync(new URL('./final/travel-result.json', import.meta.url), 'utf8'));
const output = new URL('./hosted-verification.json', import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { checkedAt: new Date().toISOString(), base, sourceCommit,
  manifestSha256: evidence.artifact.manifestSha256, passed: false, files: [] };
const fetchBytes = async path => {
  const url = new URL(path.replace(/^\//, ''), base);
  url.searchParams.set('review', sourceCommit);
  const result = await run('curl', ['--fail', '--silent', '--show-error', '--location',
    '--max-time', '45', url.href], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  return result.stdout;
};

try {
  const descriptor = JSON.parse((await fetchBytes('review-build.json')).toString('utf8'));
  report.servedSourceCommit = descriptor.sourceCommit;
  report.descriptorMatches = descriptor.sourceCommit === sourceCommit
    && descriptor.builtManifestSha256 === report.manifestSha256;
  const pending = [...evidence.artifact.files];
  // 使用有限并发读取发布文件，以浏览器实际检查过的 SHA-256 核对远端字节。
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (pending.length) {
      const file = pending.shift();
      try {
        const bytes = await fetchBytes(file.path), actual = sha(bytes);
        report.files.push({ path: file.path, expectedSha256: file.sha256, actualSha256: actual,
          bytes: bytes.length, matches: bytes.length === file.bytes && actual === file.sha256 });
      } catch (error) {
        report.files.push({ path: file.path, matches: false, error: error.message });
      }
    }
  }));
  report.files.sort((a, b) => a.path.localeCompare(b.path));
  report.passed = report.descriptorMatches && report.files.length === evidence.artifact.files.length
    && report.files.every(file => file.matches);
} catch (error) { report.error = error.message; }
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, files: report.files.length,
  matched: report.files.filter(file => file.matches).length, servedSourceCommit: report.servedSourceCommit,
  failed: report.files.filter(file => !file.matches).map(file => file.path), error: report.error }));
process.exitCode = report.passed ? 0 : 1;
