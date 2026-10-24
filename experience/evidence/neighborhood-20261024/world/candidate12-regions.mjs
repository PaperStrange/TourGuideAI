import assert from 'node:assert/strict';

// 区域检查使用实际解码三角形；容差仅覆盖源坐标转 float32 的舍入。
export const REGION_TOLERANCE_METRES = 0.00002;
export const APPROVED_FACADES = {
  201: { face: [0, 0, 3], from: [185.979, 4.407], to: [258.326, 5.035],
    height: 33.49100000000001, nearRecess: .20, baseRecess: .06,
    newMaterials: ['stone', 'daimaru-brown-tile', 'plaster', 'frame', 'glass'] },
  274: { face: [0, 0, 2], from: [162.603, 3.597], to: [185.695, 3.835],
    height: 30.380000000000003, nearRecess: .12, baseRecess: .06,
    newMaterials: ['plaster', 'frame', 'frontage-dark-glass'] },
};
export const EXPECTED_THIN_SHEET = {
  version: 1, role: 'nishiki-colored-roof', sourceId: 'osm:way:772134672', sourceIndex: 139,
  pairedVerticalOffsetMetres: .045, diffuseTransmission: .55, transmissionColor: [1, 1, 1],
};
export const THIN_MATERIALS = {
  'nishiki-ridge-red': 'arcade-red', 'nishiki-ridge-gold': 'arcade-gold', 'nishiki-ridge-green': 'arcade-green',
};
function pointSegmentDistance(point, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point[0] - a[0] - dx * t, point[1] - a[1] - dy * t);
}
function difference(records, matched) {
  const counts = new Map();
  for (const item of matched) counts.set(item.fingerprint, (counts.get(item.fingerprint) ?? 0) + 1);
  return records.filter(item => {
    const count = counts.get(item.fingerprint) ?? 0;
    if (!count) return true;
    counts.set(item.fingerprint, count - 1); return false;
  });
}
function bounds(records) {
  const minimum = [Infinity, Infinity, Infinity], maximum = [-Infinity, -Infinity, -Infinity];
  for (const record of records) for (const point of record.points) for (let axis = 0; axis < 3; axis++) {
    minimum[axis] = Math.min(minimum[axis], point[axis]); maximum[axis] = Math.max(maximum[axis], point[axis]);
  }
  return { minimum, maximum };
}
export function assertFacadeRegionPreserved(before, after, { sourceIndex, lod, feature }) {
  const rule = APPROVED_FACADES[sourceIndex]; assert(rule); assert(['base', 'near'].includes(lod));
  const ring = feature.polygons[0].outer;
  assert.deepEqual(ring[rule.face[2]], rule.from); assert.deepEqual(ring[rule.face[2] + 1], rule.to);
  assert.equal(feature.height.metres, rule.height); assert.equal(feature.baseHeightMetres, 0);
  assert(before.length && after.length);
  const dx = rule.to[0] - rule.from[0], dy = rule.to[1] - rule.from[1], length = Math.hypot(dx, dy);
  const tangent = [dx / length, dy / length], outward = [tangent[1], -tangent[0]];
  function coordinates(point) {
    const px = point[0] - rule.from[0], py = -point[2] - rule.from[1];
    return { along: px * tangent[0] + py * tangent[1], outward: px * outward[0] + py * outward[1], height: point[1] };
  }
  function belongsToReviewedFace(record) {
    const centroid = [0, 0];
    for (const point of record.points) { centroid[0] += point[0] / 3; centroid[1] -= point[2] / 3; }
    const distance = pointSegmentDistance(centroid, rule.from, rule.to);
    return ring.slice(0, -1).every((start, edge) => edge === rule.face[2] ||
      pointSegmentDistance(centroid, start, ring[edge + 1]) + REGION_TOLERANCE_METRES >= distance);
  }
  const protectedLower = before.filter(record => Math.min(...record.points.map(point => point[1])) < 3.5);
  const sourceFaceLower = protectedLower.filter(belongsToReviewedFace);
  assert(sourceFaceLower.length);
  const inheritedSeam = Math.max(...sourceFaceLower.flatMap(record => record.points.map(point => point[1])));
  assert(inheritedSeam > 3.5 && inheritedSeam < 4);
  assert.equal(difference(protectedLower, after).length, 0, 'A protected lower triangle changed');
  const protectedRoof = before.filter(record => record.material === 'roof');
  assert(protectedRoof.length); assert.equal(difference(protectedRoof, after).length, 0, 'Source roof changed');
  const cornice = before.filter(record => Math.min(...record.points.map(point => point[1])) >= rule.height - .16 - REGION_TOLERANCE_METRES);
  assert.equal(difference(cornice, after).length, 0, 'Original cornice/top geometry changed');
  const otherFaces = before.filter(record => !belongsToReviewedFace(record));
  assert.equal(difference(otherFaces, after).length, 0, 'Another facade edge changed');
  const removed = difference(before, after), added = difference(after, before);
  assert(removed.length && added.length);
  for (const record of [...removed, ...added]) {
    assert(record.allAttributesFinite); assert(belongsToReviewedFace(record), 'Changed triangle belongs to another source edge');
    assert.notEqual(record.material, 'roof');
    for (const point of record.points) {
      const local = coordinates(point);
      assert(local.along >= -REGION_TOLERANCE_METRES && local.along <= length + REGION_TOLERANCE_METRES);
      assert(local.height >= inheritedSeam - REGION_TOLERANCE_METRES && local.height <= rule.height + REGION_TOLERANCE_METRES);
    }
  }
  for (const record of removed) for (const point of record.points) {
    const depth = coordinates(point).outward;
    assert(depth >= -.15 - REGION_TOLERANCE_METRES && depth <= .081 + REGION_TOLERANCE_METRES);
  }
  const recess = lod === 'near' ? rule.nearRecess : rule.baseRecess;
  for (const record of added) {
    assert(rule.newMaterials.includes(record.material));
    for (const point of record.points) {
      const depth = coordinates(point).outward;
      assert(depth <= REGION_TOLERANCE_METRES && depth >= -recess - REGION_TOLERANCE_METRES,
        'New face leaves the reviewed inward facade envelope');
    }
  }
  assert.deepEqual(bounds(after), bounds(before), 'Overall source envelope changed');
  return { sourceIndex, lod, beforeTriangles: before.length, afterTriangles: after.length,
    retainedTriangles: before.length - removed.length, removedTriangles: removed.length, addedTriangles: added.length,
    protectedLowerTriangles: protectedLower.length, protectedRoofTriangles: protectedRoof.length,
    protectedCorniceTriangles: cornice.length, protectedOtherFaceTriangles: otherFaces.length, inheritedSeam,
    sourceBounds: bounds(after), approvedFace: rule.face, toleranceMetres: REGION_TOLERANCE_METRES,
    changedVertexBounds: bounds(added), inwardRecessLimitMetres: recess, exactProtectedAttributesMaterialsTransforms: true };
}

export function assertThinSheetPairs(records) {
  assert(records.length);
  const buckets = new Map();
  let vertices = 0, maximumPairingErrorMetres = 0;
  for (const record of records) {
    assert(THIN_MATERIALS[record.material]); assert.deepEqual(record.thinSheet, EXPECTED_THIN_SHEET);
    assert.equal(record.sourceIndex, 139); assert(record.allAttributesFinite);
    for (let index = 0; index < 3; index++) {
      const point = record.points[index], normal = record.worldNormals[index];
      assert(Math.abs(normal[1]) > .1, 'Thin-sheet role includes a non-roof vertical face');
      const key = JSON.stringify([record.material, point[0], point[2]]);
      const group = buckets.get(key) ?? []; group.push({ point, normal }); buckets.set(key, group); vertices++;
    }
  }
  for (const group of buckets.values()) for (const vertex of group) {
    const counterpart = group.find(other =>
      Math.abs(Math.abs(other.point[1] - vertex.point[1]) - .045) <= 0.000001 &&
      Math.hypot(...other.normal.map((value, axis) => value + vertex.normal[axis])) < 0.0001);
    assert(counterpart, 'Actual opposite-normal roof vertex lacks the retained45mm pair');
    maximumPairingErrorMetres = Math.max(maximumPairingErrorMetres,
      Math.abs(Math.abs(counterpart.point[1] - vertex.point[1]) - .045));
  }
  return { triangles: records.length, vertices, maximumPairingErrorMetres, pairedOffsetMetres: .045,
    role: EXPECTED_THIN_SHEET, geometryMeaning: 'Existing authored paired roof; no measured thickness claim.' };
}
