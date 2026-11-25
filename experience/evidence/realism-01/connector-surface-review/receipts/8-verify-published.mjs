import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, dirname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const [directory, pageURL, outputFile] = process.argv.slice(2);
if (!directory || !pageURL || !outputFile) throw new Error('Usage: node tools/verify-published.mjs <dist> <page-url> <output-json>');
const dist = resolve(directory), output = resolve(outputFile), base = new URL(pageURL);
if (base.protocol !== 'https:') throw new Error('Published verification requires HTTPS.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = [];
function collect(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) collect(path);
    else { const bytes = readFileSync(path); files.push({ path: '/' + relative(dist, path).split(sep).join('/'), bytes: bytes.length, sha256: sha(bytes) }); }
  }
}
collect(dist); files.sort((a, b) => a.path.localeCompare(b.path));
const report = { startedAt: new Date().toISOString(), baseURL: base.href, manifestSha256: sha(JSON.stringify(files)),
  method: 'Actual HTTPS bytes through inherited proxy with default TLS verification; at most four concurrent requests.', files: [] };
const execute = promisify(execFile);
let index = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (index < files.length) {
    const expected = files[index++], url = new URL(expected.path.slice(1), base);
    url.searchParams.set('verified-release', report.manifestSha256.slice(0, 12));
    try {
      const { stdout } = await execute('curl', ['--fail', '--silent', '--show-error', '--max-time', '90', url.href], { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024 });
      const observed = { bytes: stdout.length, sha256: sha(stdout) };
      report.files.push({ ...expected, observed, pass: expected.bytes === observed.bytes && expected.sha256 === observed.sha256 });
    } catch (error) { report.files.push({ ...expected, pass: false, error: String(error.stderr || error.message) }); }
  }
}));
report.files.sort((a, b) => a.path.localeCompare(b.path));
report.finishedAt = new Date().toISOString(); report.passed = report.files.filter(file => file.pass).length;
report.failed = report.files.length - report.passed;
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ manifestSha256: report.manifestSha256, passed: report.passed, failed: report.failed, output }));
if (report.failed) process.exitCode = 1;
