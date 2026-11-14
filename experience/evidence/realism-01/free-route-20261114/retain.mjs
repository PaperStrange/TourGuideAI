import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[3] ?? fileURLToPath(new URL('../../../../', import.meta.url)));
const directory = path.join(root, 'experience/evidence/realism-01/free-route-20261114');
const cache = path.join(root, 'artifacts/realism-01/free-route-20261114');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async filename => JSON.parse(await readFile(filename, 'utf8'));
const records = [
  ['11606832', 'sequence-11606832-150', '2026-11-14T08:57:09Z'],
  ['11716327', 'sequence-11716327', '2026-11-14T08:57:23Z'],
  ['11716328', 'sequence-11716328', '2026-11-14T08:57:24Z'],
  ['11716329', 'sequence-11716329', '2026-11-14T08:57:23Z'],
  ['11716330', 'sequence-11716330', '2026-11-14T08:57:23Z'],
  ['11716350', 'sequence-11716350', '2026-11-14T08:57:23Z'],
  ['11716354', 'sequence-11716354', '2026-11-14T08:57:23Z'],
];
const routePath = 'experience/src/neighborhoods/shijo-east/geography.json';
const priorPath = 'experience/evidence/realism-01/qualification/free-sources/query-coverage.json';
const sourceUrl = id => `https://api.kartaview.org/2.0/photo/?sequenceId=${id}&page=1&itemsPerPage=150`;
const location = 'Kyoto; the seven sequences identified by the retained Shijo East proximity query';
const limits = 'Declared public metadata only. Coordinates do not establish visible features, surveyed position, calibration, reconstructable geometry, pedestrian floor or complete provider coverage.';
const rights = '© Grab and KartaView Contributors. Attributed API facts; KartaView terms license street imagery and 3D spatial data under CC BY-SA 4.0. No image is retained in this follow-up.';

async function identity(filename, label) {
  const bytes = await readFile(filename);
  return { path: label, bytes: bytes.length, sha256: sha(bytes) };
}

async function findings() {
  const route = await json(path.join(root, routePath));
  const prior = await json(path.join(root, priorPath));
  const edges = new Map(route.navigation.edges.map(edge => [edge.id, edge]));
  const coordinates = route.selectedRoute.edgeIds.flatMap(id => edges.get(id).points.map(point => [
    route.frame.origin.longitude + point.x / route.frame.metresPerDegreeLon,
    route.frame.origin.latitude + point.y / route.frame.metresPerDegreeLat,
  ]));
  const bounds = [Math.min(...coordinates.map(p => p[0])), Math.min(...coordinates.map(p => p[1])),
    Math.max(...coordinates.map(p => p[0])), Math.max(...coordinates.map(p => p[1]))];
  const previous = prior.queries.find(query => query.name === 'kartaview-route-east').response.result.data;
  assert.deepEqual(new Set(records.map(record => record[0])), new Set(previous.map(photo => photo.sequenceId)));
  const priorIds = new Set(previous.map(photo => photo.id));
  const sequences = [];
  for (const [id, filename] of records) {
    const response = await json(path.join(directory, 'responses', `${filename}.json`));
    assert.equal(response.status.apiCode, 600);
    assert.equal(response.status.httpCode, 200);
    assert.equal(response.result.hasMoreData, false);
    const photos = response.result.data.map(photo => {
      assert.equal(photo.sequenceId, id);
      const longitude = Number(photo.lng);
      const latitude = Number(photo.lat);
      assert(Number.isFinite(longitude) && Number.isFinite(latitude));
      return { id: photo.id, sequenceIndex: photo.sequenceIndex, longitude, latitude,
        shotDate: photo.shotDate, cameraParameters: photo.cameraParameters,
        fieldOfView: photo.fieldOfView, heading: photo.heading, previouslyRetained: priorIds.has(photo.id),
        cameraInsideRouteBounds: longitude >= bounds[0] && longitude <= bounds[2]
          && latitude >= bounds[1] && latitude <= bounds[3] };
    });
    sequences.push({ id, response: `responses/${filename}.json`, source: sourceUrl(id), hasMoreData: false, photos });
  }
  const photos = sequences.flatMap(sequence => sequence.photos);
  return { date: '2026-11-14', location, method: 'Seven documented no-key sequence queries; complete retained polylines define the geographic bounding rectangle. Numeric membership checks use source-declared camera coordinates.',
    inputs: [await identity(path.join(root, routePath), routePath), await identity(path.join(root, priorPath), priorPath)],
    routeBoundsDegrees: bounds, routeEdges: route.selectedRoute.edgeIds.length,
    lengthMetres: route.selectedRoute.lengthMetres, sequences,
    totals: { sequences: sequences.length, photos: photos.length,
      additionalPhotoIds: photos.filter(photo => !photo.previouslyRetained).map(photo => photo.id),
      camerasInsideRouteBounds: photos.filter(photo => photo.cameraInsideRouteBounds).length,
      absentCameraParameters: photos.filter(photo => photo.cameraParameters === null).length,
      zeroFieldOfView: photos.filter(photo => photo.fieldOfView === '0').length,
      zeroHeading: photos.filter(photo => photo.heading === '0').length },
    limitations: limits };
}

if (process.argv[2] === '--verify') {
  const manifest = await json(path.join(directory, 'manifest.json'));
  for (const record of manifest.files) {
    const filename = path.resolve(directory, record.path);
    assert(filename.startsWith(directory + path.sep));
    assert.deepEqual(await identity(filename, record.path), { path: record.path, bytes: record.bytes, sha256: record.sha256 });
    for (const key of ['source', 'date', 'rights', 'location', 'method', 'limitations']) assert(record[key]);
  }
  const observed = await findings();
  assert.deepEqual(observed, await json(path.join(directory, 'findings.json')));
  assert.deepEqual(observed.totals, { sequences: 7, photos: 9, additionalPhotoIds: ['2625879233', '2625879234'],
    camerasInsideRouteBounds: 0, absentCameraParameters: 9, zeroFieldOfView: 9, zeroHeading: 9 });
  console.log(JSON.stringify({ verified: true, retainedFiles: manifest.files.length, ...observed.totals, limitations: limits }));
} else {
  assert.equal(process.argv[2], '--retain');
  await mkdir(path.join(directory, 'responses'), { recursive: true });
  await mkdir(path.join(directory, 'diagnostics'), { recursive: true });
  const files = [];
  async function register(filename, source, date, method, fileRights = rights) {
    files.push({ ...await identity(path.join(directory, filename), filename), source, date,
      rights: fileRights, location, method, limitations: limits });
  }
  for (const [id, filename, date] of records) {
    for (const extension of ['json', 'headers']) {
      const name = `responses/${filename}.${extension}`;
      await copyFile(path.join(cache, `${filename}.${extension}`), path.join(directory, name));
      await register(name, sourceUrl(id), date, 'Unmodified curl response or header bytes; inherited proxy, TLS verification; API code and pagination checked independently');
    }
  }
  // 保留参数校验响应；成功的七次查询独立计数。
  for (const extension of ['json', 'headers']) {
    const name = `diagnostics/sequence-11606832.${extension}`;
    await copyFile(path.join(cache, `sequence-11606832.${extension}`), path.join(directory, name));
    await register(name, 'https://api.kartaview.org/2.0/photo/?sequenceId=11606832&page=1&itemsPerPage=500',
      '2026-11-14T08:56:57Z', 'Unmodified parameter-validation response; API 613 / body httpCode 400. Excluded from successful sequence coverage');
  }
  const appPath = path.join(cache, 'app.js');
  const app = await readFile(appPath, 'utf8');
  assert.equal(sha(Buffer.from(app)), '7ccabae8c8781d01d75afde0d83fbacd5e14aab752a2dc5679dac030f41fbd75');
  const { parse } = await import('@babel/parser');
  const queue = [parse(app)];
  const extracts = [];
  while (queue.length) {
    const node = queue.pop();
    if (!node || typeof node !== 'object') continue;
    if (node.type === 'StringLiteral') {
      let name;
      if (node.value.includes('/2.0/photo/?sequenceId=[sequenceId]')) name = 'photo-api.html';
      if (node.value.startsWith('<p>KartaView is developed by Grab with the aim of creating')) name = 'data-license.html';
      if (name) {
        await writeFile(path.join(directory, name), node.value);
        extracts.push({ path: name, javascriptStartOffset: node.start, javascriptEndOffset: node.end,
          transformation: 'Babel StringLiteral decoding; complete embedded HTML template, without edits or truncation' });
        await register(name, 'https://kartaview.org/main.713c8a0a1a99dfff0f74.js', '2026-11-14',
          'Complete HTML string extracted using @babel/parser from the hash-identified official application bundle',
          '© Grab / KartaView; attributed documentation and license excerpt retained as research evidence');
      }
    }
    for (const value of Object.values(node)) if (value && typeof value === 'object') queue.push(...(Array.isArray(value) ? value : [value]));
  }
  assert.equal(extracts.length, 2);
  for (const filename of ['docs.html', 'docs.headers']) {
    await copyFile(path.join(cache, filename), path.join(directory, filename));
    await register(filename, 'https://doc.kartaview.org/', '2026-11-14T08:56:33Z',
      'Unmodified documentation entry response and redirect headers; destination https://kartaview.org/doc',
      '© Grab / KartaView; attributed documentation evidence');
  }
  await writeFile(path.join(directory, 'findings.json'), JSON.stringify(await findings(), null, 2) + '\n');
  await register('findings.json', records.map(([id]) => sourceUrl(id)).join('\n'), '2026-11-14',
    'Derived metadata and route-bounds checks; no inferred visible-feature or geometry claim');
  await register('retain.mjs', 'TourGuideAI research producer', '2026-11-14', 'Exact evidence producer and offline verifier', 'TourGuideAI project code');
  const manifest = { schemaVersion: 1, date: '2026-11-14', files, sourceBundle: {
    ...await identity(appPath, 'artifacts/realism-01/free-route-20261114/app.js'),
    source: 'https://kartaview.org/main.713c8a0a1a99dfff0f74.js', retained: false,
    date: '2026-11-14', rights: '© Grab / KartaView; attributed official documentation', location,
    method: 'Original bundle remains in ignored research cache; complete selected documentation templates retained',
    limitations: 'Offline verification checks retained excerpts; reproducing extraction requires the exact hash-matched original bundle',
    extracts }, limitations: limits };
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ retainedFiles: files.length, output: path.relative(root, directory) }));
}
