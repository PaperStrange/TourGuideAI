import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const output = path.join(root, 'experience/evidence/realism-01/review-page');
const packageDirectory = path.resolve(process.argv[2]);
const hostedReport = path.resolve(process.argv[3]);
const qa = path.join(root, 'artifacts/realism-01/review-page/qa');
const sha = data => createHash('sha256').update(data).digest('hex');
const files = [];
const createdAt = new Date().toISOString();
const provenance = {
  source: 'TourGuideAI browser review; Knock Community Hall by scbenoit, https://superspl.at/scene/0ff2e6dc',
  recordDate: createdAt,
  rights: 'Project-generated QA records. Captured architecture and derived screenshots: CC BY 4.0, scbenoit; adapted camera/UI and streamed detail.',
  location: 'Innisfil, Ontario, Canada; software-rendered Chromium in the managed workspace',
  method: 'Packaged application, native browser controls, actual source bytes and independent public HTTPS byte verification.',
  limitations: 'Architectural inspection; no Kyoto route coverage, pedestrian traversal, relighting, physical-device performance or participant acceptance.',
};

async function retain(source, destination) {
  const data = await readFile(source);
  await mkdir(path.dirname(path.join(output, destination)), { recursive: true });
  await cp(source, path.join(output, destination));
  files.push({ ...provenance, path: destination, input: path.relative(root, source), bytes: data.length, sha256: sha(data) });
}

async function retainRuns(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  if (entries.some(entry => entry.name === 'result.json')) {
    const report = JSON.parse(await readFile(path.join(directory, 'result.json'), 'utf8'));
    if (!report.finishedAt) throw new Error(`Browser attempt is still active: ${directory}`);
    const destination = path.join('runs', path.relative(qa, directory));
    for (const entry of entries) {
      if (entry.isFile()) await retain(path.join(directory, entry.name), path.join(destination, entry.name));
    }
  } else {
    for (const entry of entries) if (entry.isDirectory()) await retainRuns(path.join(directory, entry.name));
  }
}

await retainRuns(qa);
await retain(path.join(packageDirectory, 'package-manifest.json'), 'package-manifest.json');
await retain(hostedReport, 'published-bytes.json');
const producerPaths = [
  'experience/realism-review.html', 'experience/src/review/main.js', 'experience/src/review/copy.js',
  'experience/src/review/styles.css', 'experience/src/review/scene.js', 'experience/src/review/review-assets.json',
  'experience/vite.review.config.mjs', 'experience/package.json', 'experience/package-lock.json',
  'experience/tests/browser-realism-review.mjs', 'experience/tools/review-page/package.mjs',
  'experience/tools/review-page/retain.mjs', 'experience/tools/review-page/verify.mjs',
  'experience/tools/verify-published.mjs',
];
const producers = [];
for (const name of producerPaths) {
  const data = await readFile(path.join(root, name));
  producers.push({ path: name, bytes: data.length, sha256: sha(data) });
}
files.sort((a, b) => a.path.localeCompare(b.path));
await writeFile(path.join(output, 'manifest.json'), JSON.stringify({ schemaVersion: 1, createdAt,
  publicUrl: 'https://paperstrange.github.io/TourGuideAI/previews/realism-01/', files, producers }, null, 2) + '\n');
console.log(JSON.stringify({ files: files.length, producers: producers.length }));
