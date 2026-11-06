import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const source = resolve(repository, process.argv[2]);
const destination = resolve(repository, 'experience/evidence/realism-01/measurement');
if (!source.startsWith(join(repository, 'artifacts/realism-01/runs/') )) throw new Error('Select a retained local measurement run');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const resultBytes = readFileSync(join(source, 'result.json')), report = JSON.parse(resultBytes);
if (!report.finishedAt || !report.interactions) throw new Error('The actual measurement must finish before retention');
const sources = [
  ['result.json', resultBytes, sha(resultBytes)],
  ['neighborhood-performance.executed.mjs', readFileSync(join(source, 'neighborhood-performance.executed.mjs')), report.driverSha256],
  ['submitted-frame.executed.js', readFileSync(join(source, 'submitted-frame.executed.js')), report.measurementSha256],
];
if (process.argv[3]) {
  const prior = resolve(repository, process.argv[3]);
  if (!prior.startsWith(join(repository, 'artifacts/realism-01/runs/'))) throw new Error('Select a retained local prior attempt');
  const bytes = readFileSync(join(prior, 'result.json')), attempt = JSON.parse(bytes);
  if (!attempt.finishedAt) throw new Error('The prior attempt must have finished');
  sources.push(['development-attempt.json', bytes, sha(bytes), attempt.finishedAt]);
}
mkdirSync(destination, { recursive: true });
const records = sources.map(([name, bytes, expected, date = report.finishedAt]) => {
  if (sha(bytes) !== expected) throw new Error(`Executed evidence identity mismatch: ${name}`);
  const encoded = gzipSync(bytes, { level: 9 }), path = `${name}.gz`;
  writeFileSync(join(destination, path), encoded);
  return { path, bytes: encoded.length, sha256: sha(encoded), decodedBytes: bytes.length, decodedSha256: expected,
    source: 'Actual local browser diagnostic against the immutable captured application package',
    date, rights: 'Project-generated diagnostic and MIT-licensed repository source; third-party asset identities remain in their source receipts.',
    location: 'Shijo East starting segment; local managed Linux host',
    method: 'Original output and executed source compressed with gzip; decoded bytes preserved',
    limitations: ['English/day, one cold plus three warm entries, starting-segment inputs only.',
      'Software graphics and loopback network approximation; no physical-device or human acceptance.',
      'Full-quality checks selected resident assets and a later draw; visual realism and complete-route coverage are unverified.',
      ...(name === 'development-attempt.json' ? ['Earlier implementation diagnostic; executing source hashes are retained in its report, while exact executing source copies were not saved.'] : [])] };
});
const binding = { version: 1, protocol: report.protocol, startedAt: report.startedAt, finishedAt: report.finishedAt,
  driverSha256: report.driverSha256, measurementSha256: report.measurementSha256,
  packageManifestSha256: report.artifact.manifestSha256, conditions: report.conditions,
  entries: report.entries.map(entry => ({ id: entry.id, firstUsableObservedMs: entry.firstUsableObservedMs,
    fullQualityObservedMs: entry.fullQualityObservedMs, frame: entry.fullQuality.frame.frame,
    residentObservedMs: entry.fullQuality.frame.quality.observedMs,
    drawStartedMs: entry.fullQuality.frame.drawStartedMs, submittedMs: entry.fullQuality.frame.submittedMs })),
  checks: report.checks.map(({ id, pass }) => ({ id, pass })),
  inputAndFrameMetrics: report.interactions.summary.groups, frameCounterGaps: report.interactions.summary.frameCounterGaps,
  hidden: { status: report.hidden.status, observed: report.hidden.observed }, errors: report.errors,
  files: records };
writeFileSync(join(destination, 'binding.json'), JSON.stringify(binding, null, 2) + '\n');
console.log(JSON.stringify({ files: records.length, checks: binding.checks, errors: binding.errors }, null, 2));
