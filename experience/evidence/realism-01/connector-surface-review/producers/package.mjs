import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../..');
const workspace = resolve(root, 'artifacts/realism-01/connector-surface-review');
const output = resolve(process.argv[2]);
const implementationBase = process.argv[3];
assert(output.startsWith(workspace + sep) && !existsSync(output), 'Use a new ignored package directory');
assert.match(implementationBase || '', /^[a-f0-9]{40}$/);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(readFileSync(path));
const files = new Map(), bindings = [];
const evidenceRoot = resolve(root, 'experience/evidence/realism-01');
const retainedPackage = 'experience/evidence/realism-01/connector-surface-review/package/';

function manifestAt(path, name = 'manifest.json') {
  const bytes = readFileSync(resolve(path, name));
  const manifest = JSON.parse(bytes), records = manifest.files || manifest.records;
  assert(Array.isArray(records));
  assert.equal(new Set(records.map(record => record.path || record.file)).size, records.length);
  for (const record of records) {
    const filename = resolve(path, record.path || record.file);
    assert(filename.startsWith(path + sep));
    const actual = readFileSync(filename);
    assert.equal(actual.length, record.bytes, filename); assert.equal(sha(actual), record.sha256, filename);
  }
  bindings.push({ path: relative(root, resolve(path, name)), sha256: sha(bytes) });
  return { ...manifest, records };
}
function put(name, bytes, source, additional = {}) {
  assert(!files.has(name), name);
  const destination = resolve(output, name); assert(destination.startsWith(output + sep));
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, bytes);
  files.set(name, { path: name, bytes: bytes.length, sha256: sha(bytes), source, ...additional });
}
function copy(name, source, additional) { put(name, readFileSync(source), relative(root, source), additional); }
function retained(path, manifest, source, destination) {
  assert(manifest.records.some(record => (record.path || record.file) === source), source);
  copy(destination, resolve(path, source));
}
function report(path, manifest, source, destination) { retained(path, manifest, source, destination); return read(resolve(path, source)); }

const historical = resolve(evidenceRoot, 'connector-rig-review/package');
const old = manifestAt(historical, 'package-manifest.json');
for (const file of old.records) if (file.path !== 'index.html') copy(file.path, resolve(historical, file.path));
copy('index-20261115.html', resolve(historical, 'index.html'));
copy('history/package-20261115.json', resolve(historical, 'package-manifest.json'));
for (const name of ['index.html', 'surface-app.js', 'surface-style.css']) copy(name, resolve(directory, name));

const three = resolve(root, 'experience/node_modules/three');
assert.equal(read(resolve(three, 'package.json')).version, '0.186.1');
bindings.push({ path: 'experience/package-lock.json', sha256: sha(readFileSync(resolve(root, 'experience/package-lock.json'))) });
for (const [source, name] of [
  ['build/three.module.js', 'three.module.js'], ['build/three.core.js', 'three.core.js'],
  ['examples/jsm/controls/OrbitControls.js', 'OrbitControls.js'], ['examples/jsm/loaders/OBJLoader.js', 'OBJLoader.js'],
  ['examples/jsm/loaders/MTLLoader.js', 'MTLLoader.js'], ['examples/jsm/loaders/GLTFLoader.js', 'loaders/GLTFLoader.js'],
  ['examples/jsm/utils/BufferGeometryUtils.js', 'utils/BufferGeometryUtils.js'],
  ['examples/jsm/utils/SkeletonUtils.js', 'utils/SkeletonUtils.js'], ['LICENSE', 'LICENSE'],
]) {
  const target = 'surface/vendor/' + name;
  put(target, readFileSync(resolve(three, source)), retainedPackage + target,
    { upstream: { package: 'three', version: '0.186.1', path: source, rights: 'MIT' } });
}

const inputs = resolve(evidenceRoot, 'connector-surface/review-inputs');
const inputsManifest = manifestAt(inputs);
const handoff = report(inputs, inputsManifest, 'viewer-handoff.json', 'surface/evidence/source-cameras.json');
assert.equal(handoff.triangles, 66755);
assert.deepEqual(handoff.views.map(view => view.rank), [68, 69, 70, 71]);
const views = handoff.views.map(view => {
  assert.equal(view.cameraIndex, 9); assert.equal(view.width, 1520); assert.equal(view.height, 1520);
  assert(view.projectionReferences.length > 5);
  const referenceImage = `surface/source/rank-${view.rank}.jpg`, maskPath = `surface/source/rank-${view.rank}-mask.png`;
  retained(inputs, inputsManifest, view.referenceImage, referenceImage); retained(inputs, inputsManifest, view.maskPath, maskPath);
  assert.equal(files.get(referenceImage).sha256, view.imageSha256); assert.equal(files.get(maskPath).sha256, view.maskSha256);
  return { ...view, referenceImage, maskPath };
});
const baseline = resolve(evidenceRoot, 'connector-surface/run-02');
const baselineManifest = manifestAt(baseline);
report(baseline, baselineManifest, 'texture-result.json', 'surface/evidence/native-8192-texture.json');
copy('surface/evidence/native-8192-manifest.json', resolve(baseline, 'manifest.json'));
const nativeEvaluation = resolve(evidenceRoot, 'connector-surface-evaluation');
const nativeEvaluationManifest = manifestAt(nativeEvaluation);
const baselineSummary = report(nativeEvaluation, nativeEvaluationManifest, 'summary.json', 'surface/evidence/native-8192-evaluation.json');
const variant = resolve(evidenceRoot, 'connector-surface/texture-4096-01');
const variantManifest = manifestAt(variant);
const variantHandoff = report(variant, variantManifest, 'viewer-handoff.json', 'surface/evidence/variant-cameras.json');
assert.equal(variantHandoff.geometryIdentityVerified, true);
for (const view of views) {
  const native = variantHandoff.views.find(candidate => candidate.id === view.id);
  assert(native && native.near > 0 && native.far > native.near && native.orbitDistance > 0);
  assert.deepEqual(native.camFromWorld, view.camFromWorld); assert.deepEqual(native.projectionReferences, view.projectionReferences);
  Object.assign(view, { near: native.near, far: native.far, orbitDistance: native.orbitDistance,
    positiveMeshVertexDepthRange: native.positiveMeshVertexDepthRange });
}
const variantAuditDirectory = resolve(evidenceRoot, 'connector-surface/texture-4096-audit');
const variantAuditManifest = manifestAt(variantAuditDirectory);
const audit = report(variantAuditDirectory, variantAuditManifest, 'result.json', 'surface/evidence/variant-geometry.json');
assert.equal(audit.geometry.triangleCount, handoff.triangles);
assert.equal(audit.geometry.maximumVertexDistance, 0);
assert.equal(audit.geometry.missingOrientedTriangles, 0); assert.equal(audit.geometry.addedOrientedTriangles, 0);
assert.equal(audit.images.length, 1); assert.equal(audit.images[0].width, 4096); assert.equal(audit.images[0].height, 4096);
retained(variant, variantManifest, 'scene_textured.gltf', 'surface/model/scene_textured.gltf');
retained(variant, variantManifest, 'scene_textured_0.png', 'surface/model/scene_textured_0.png');
assert.equal(files.get('surface/model/scene_textured.gltf').sha256, audit.gltfSha256);
assert.equal(files.get('surface/model/scene_textured_0.png').sha256, audit.images[0].sha256);
copy('surface/evidence/variant-manifest.json', resolve(variant, 'manifest.json'));

const evaluation = resolve(nativeEvaluation, 'variant-4096');
const evaluationManifest = manifestAt(evaluation);
const summary = report(evaluation, evaluationManifest, 'summary.json', 'surface/evidence/variant-evaluation.json');
const render = report(evaluation, evaluationManifest, 'result.json', 'surface/evidence/variant-render.json');
assert.equal(summary.routeQualified, false); assert.equal(summary.appearanceQualified, false);
assert.equal(render.completed, true); assert.equal(render.mesh.sha256, audit.gltfSha256);
assert.equal(render.views.length, 24);
const evidence = [
  { path: 'surface/evidence/variant-evaluation.json', label: { en: 'Reserved-view coverage and color measurements', zh: '预留视图的覆盖率与颜色测量' } },
  { path: 'surface/evidence/variant-render.json', label: { en: 'All 24 rendered evaluation directions', zh: '全部 24 个评估方向的渲染记录' } },
  { path: 'surface/evidence/variant-geometry.json', label: { en: 'Native geometry and texture comparison', zh: '原生几何与纹理对比' } },
  { path: 'surface/evidence/variant-cameras.json', label: { en: 'Source cameras, rights and native projection references', zh: '来源相机、授权与原生投影参考' } },
  { path: 'surface/evidence/native-8192-evaluation.json', label: { en: '8192-pixel baseline evaluation', zh: '8192 像素基准评估' } },
  { path: 'surface/evidence/native-8192-texture.json', label: { en: '8192-pixel native baseline assets', zh: '8192 像素原生基准资源' } },
  { path: 'index-20261115.html', label: { en: 'Earlier camera and source-coverage trials', zh: '此前相机与来源覆盖实验' } },
  { path: 'surface/vendor/LICENSE', label: { en: 'Three.js license', zh: 'Three.js 授权' } },
];
const heldout = [67, 72].map(rank => {
  const total = summary.renderTotals[String(rank)], previous = baselineSummary.renderTotals[String(rank)];
  assert(total.eligiblePixels > 0 && total.coveredPixels > 0 && total.comparisonPixels > 0);
  const coverage = (100 * total.coveredPixels / total.eligiblePixels).toFixed(1);
  const error = total.remainingPixelMeanAbsoluteChannelError255.toFixed(2);
  const view = render.views.find(view => view.rank === rank && view.cameraIndex === 9);
  assert(view && view.rendered);
  const stem = `rank-${rank}-view-09`;
  for (const suffix of ['reference.jpg', 'eligible.png', 'pose-neighborhood.png']) {
    retained(nativeEvaluation, nativeEvaluationManifest, `render/${stem}-${suffix}`, `surface/heldout/${stem}-${suffix}`);
  }
  retained(evaluation, evaluationManifest, `${stem}-render.png`, `surface/heldout/${stem}-render.png`);
  evidence.push({ path: `surface/heldout/${stem}-eligible.png`, label: { en: `Position ${rank}: eligible-pixel mask`, zh: `拍摄位置 ${rank}：有效像素遮罩` } },
    { path: `surface/heldout/${stem}-pose-neighborhood.png`, label: { en: `Position ${rank}: localization-neighborhood exclusion`, zh: `拍摄位置 ${rank}：定位邻域排除遮罩` } });
  return { rank, coverage: total, baseline: previous,
    comparison: { referenceImage: `surface/heldout/${stem}-reference.jpg`, renderImage: `surface/heldout/${stem}-render.png` },
    description: {
      en: `${coverage}% of eligible pixels are covered (${total.coveredPixels.toLocaleString('en-US')} / ${total.eligiblePixels.toLocaleString('en-US')}). After excluding pose-feature neighborhoods, ${total.comparisonPixels.toLocaleString('en-US')} pixels give ${error} / 255 mean absolute channel error. Missing surfaces remain uncovered; the denominator includes sky. ${rank === 72 ? 'This position’s pose is supported by only three upper viewing directions. ' : ''}The pair below shows native direction 9; measurements aggregate all 12 directions, including four fully masked directions.`,
      zh: `有效像素覆盖率为 ${coverage}%（${total.coveredPixels.toLocaleString('en-US')} / ${total.eligiblePixels.toLocaleString('en-US')}）。排除定位特征邻域后，${total.comparisonPixels.toLocaleString('en-US')} 个像素的平均通道绝对误差为 ${error} / 255。缺失表面保留为未覆盖区域，分母包含天空。${rank === 72 ? '该位置的相机姿态仅由三个上半球方向支持。' : ''}下方显示原生方向 9；测量汇总全部 12 个方向，其中四个方向完全受到遮罩排除。`,
    } };
});
const modelBytes = files.get('surface/model/scene_textured.gltf').bytes + files.get('surface/model/scene_textured_0.png').bytes;
const data = {
  schemaVersion: 1, routeQualified: false, appearanceQualified: false, date: summary.date,
  views, projectionConvention: handoff.projectionConvention, heldout, evidence,
  model: { status: 'textured', format: 'gltf', gltf: 'surface/model/scene_textured.gltf',
    textures: ['surface/model/scene_textured_0.png'], atlasWidth: 4096, atlasHeight: 4096, bytes: modelBytes,
    triangles: audit.geometry.triangleCount, bounds: variantHandoff.bounds,
    cameraRangeMethod: 'Per-view clipping and orbit distance from retained native model bounds and actual mesh vertex depths. Model-relative units.',
    lighting: 'Captured color, MeshBasicMaterial, source sRGB, NoToneMapping, native full-resolution atlas and normal mipmaps',
    limits: variantHandoff.limits },
  description: {
    en: `Four fitted panorama positions west of the walking route’s start produce ${handoff.triangles.toLocaleString('en-US')} triangles. The 4096-pixel native atlas preserves the reconstructed geometry; ${audit.geometry.constantUvFaces} faces have no assigned source texture patch. Reconstructed surfaces remain incomplete. This free-inspection study uses captured daylight and arbitrary scale.`,
    zh: `步行路线起点西侧的四个全景拍摄位置生成 ${handoff.triangles.toLocaleString('en-US')} 个三角形。4096 像素原生纹理图保留重建几何，${audit.geometry.constantUvFaces} 个面没有分配来源纹理区域。重建表面仍不完整。本研究支持自由观察，保留拍摄时的日光与相对尺度。`,
  },
  measurements: [
    { label: { en: 'Physical source positions', zh: '真实拍摄位置' }, value: '4' },
    { label: { en: 'Reconstructed triangles', zh: '重建三角形' }, value: handoff.triangles.toLocaleString('en-US') },
    { label: { en: '3D geometry + texture download', zh: '三维几何与纹理下载量' }, value: `${(modelBytes / 1048576).toFixed(2)} MiB` },
    { label: { en: 'Atlas with mipmaps; buffers additional', zh: '含 mipmaps 的纹理；缓冲区另计' }, value: '85.33 MiB' },
    { label: { en: '8192 baseline atlas with mipmaps', zh: '8192 基准纹理（含 mipmaps）' }, value: '341.33 MiB' },
    { label: { en: 'Atlas comparison mean channel difference', zh: '纹理对比平均通道差异' }, value: `${audit.sampleComparison.perChannelAbsoluteDifference.mean.toFixed(2)} / 255` },
  ], sourceBindings: bindings,
  limits: ['Same-capture-family evaluation; human realism, independent recognition, full route and device latency remain unqualified.',
    'Single model transfer exceeds the 4 MiB startup and 2 MiB per-section gates. Explicit lazy loading controls when this research asset is requested.',
    'The 96 MiB texture-and-render-target gate needs complete allocation and physical-device verification. Atlas-only size establishes no pass.',
    'Viewer preserves the native glTF double-sided material; numerical held-out evaluation also intersects both sides. Browser filtering uses full-resolution trilinear mipmaps; evaluation uses bilinear atlas samples.'],
};
put('surface-data.json', Buffer.from(JSON.stringify(data, null, 2) + '\n'), retainedPackage + 'surface-data.json', { generatedFrom: bindings.map(binding => binding.path) });
const manifest = { schemaVersion: 1, id: 'realism-01-kyoto-surface-review', createdAt: new Date().toISOString(), implementationBase,
  sourceBindings: bindings, producer: { path: relative(root, fileURLToPath(import.meta.url)), sha256: sha(readFileSync(fileURLToPath(import.meta.url))) },
  scope: 'Interactive captured-color research surface and same-sequence evaluation; route and appearance remain unqualified',
  files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path, 'en')) };
writeFileSync(resolve(output, 'package-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ output: relative(root, output), files: files.size, modelBytes,
  manifestSha256: sha(readFileSync(resolve(output, 'package-manifest.json'))) }));
