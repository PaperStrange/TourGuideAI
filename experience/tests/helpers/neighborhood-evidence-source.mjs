import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const beforeSha256 = 'cb6d616d3858becf459a885ed940a6766cdd942e14a4d0b2b8a39776e3c16e55';
const afterSha256 = '0fe837655a45b8c2685e1bae24d739ef9fdf2c55dc60401588474cfa31bd9c7f';
const auditSha256 = '156cdc90f594a9a69a672ac8003e1ddbfa76259c0dc86c5b59035b0e55cc35dd';
const evidence = new URL('../../evidence/neighborhood-20261023/world/platform-context/', import.meta.url);
const sources = new URL('../../src/neighborhoods/shijo-east/', import.meta.url);
const verified = new Map();

export function verifyHistoricalGeography(recordedSha256, currentBytes) {
  const currentSha256 = digest(currentBytes);
  if (recordedSha256 === currentSha256) return { kind: 'identical-geography', recordedSha256, currentSha256 };
  if (recordedSha256 !== beforeSha256 || currentSha256 !== afterSha256) {
    throw new Error('Historical view geography has no reviewed compatibility proof.');
  }
  if (verified.has(currentSha256)) return verified.get(currentSha256);

  // 历史记录保持原始字节；只允许已审核的同一图节点之间的六项景点元数据变更。
  const auditBytes = readFileSync(new URL('tenmangu-compatibility.json', evidence));
  if (digest(auditBytes) !== auditSha256) throw new Error('The reviewed geography compatibility audit changed.');
  const audit = JSON.parse(auditBytes);
  const baselineBytes = gunzipSync(readFileSync(new URL('geography-before.json.gz', evidence)));
  if (digest(baselineBytes) !== beforeSha256 || baselineBytes.length !== audit.baseline.geography.bytes
    || audit.status !== 'pass' || audit.baseline.geography.sha256 !== beforeSha256
    || audit.candidate.geography.sha256 !== afterSha256 || currentBytes.length !== audit.candidate.geography.bytes) {
    throw new Error('The reviewed geography identities differ.');
  }
  const baseline = JSON.parse(baselineBytes), current = JSON.parse(currentBytes);
  const expected = structuredClone(baseline), sight = expected.sights.find(value => value.id === 'nishiki-tenmangu');
  const changes = {
    nodeId: ['osm:node:434344433', 'osm:node:354840400'],
    approachNodeId: ['osm:node:434344433', 'osm:node:354840400'],
    x: [681.4668908271395, 651.9644999448319],
    y: [142.00403199935374, 143.13562662996517],
    latitude: [35.005019, 35.0050292],
    longitude: [135.7671845, 135.7668613],
  };
  for (const [field, [before, after]] of Object.entries(changes)) {
    if (!sight || sight[field] !== before) throw new Error('The historical viewing pause differs: ' + field);
    sight[field] = after;
  }
  if (!isDeepStrictEqual(expected, current)) throw new Error('Geography changed beyond the approved viewing-pause metadata.');
  const unchangedSources = {};
  for (const [file, identity] of Object.entries(audit.unchangedSources)) {
    const bytes = readFileSync(new URL(file, sources));
    if (bytes.length !== identity.bytes || digest(bytes) !== identity.sha256) throw new Error('Reviewed source changed: ' + file);
    unchangedSources[file] = identity;
  }
  const result = { kind: 'reviewed-tenmangu-anchor-metadata', recordedSha256, currentSha256, auditSha256,
    auditFile: 'experience/evidence/neighborhood-20261023/world/platform-context/tenmangu-compatibility.json',
    changedFields: Object.keys(changes), completeGeographyCompared: true, unchangedSources,
    scope: 'Stored metric view, frame and navigation geometry. Rendered assets retain their separate current-build identity.' };
  verified.set(currentSha256, result);
  return result;
}
