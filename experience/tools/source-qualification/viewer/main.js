import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const stage = document.querySelector('#stage');
const status = document.querySelector('#status');
const sightSelect = document.querySelector('#sight'), poseSelect = document.querySelector('#pose');
const sourceResponse = await fetch('/review-manifest.json');
if (!sourceResponse.ok) throw new Error(`Source manifest HTTP ${sourceResponse.status}`);
const manifest = await sourceResponse.json();
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1;
stage.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#dce3e5');
const camera = new THREE.PerspectiveCamera(60, 1, .05, 3000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
controls.minDistance = .3;
controls.maxDistance = 1500;
const sky = new THREE.HemisphereLight(0xffffff, 0xb7b7b7, 2.2);
const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(-80, 160, -50);
scene.add(sky, sun);
const loader = new GLTFLoader();
const draco = new DRACOLoader().setDecoderPath('/vendor/three/examples/jsm/libs/draco/gltf/');
draco.setWorkerLimit(2); loader.setDRACOLoader(draco);
const loaded = [], decoderWarnings = [], nativeInputs = [];
let draws = 0, active = null, ready = false;
const poseNames = { approach: 'Approach / forward', reverse: 'Reverse', north: 'Look north', east: 'Look east', south: 'Look south', west: 'Look west', overview: 'Elevated context' };

function selectSourceObjects(object, selectedBatchIds) {
  const source = object.geometry, batches = source.attributes._batchid;
  if (!batches || !source.index || source.index.count % 3) throw new Error('Source selection requires indexed triangles and decoded _BATCHID');
  const selected = new Set(selectedBatchIds), indices = [], groups = [];
  const sourceGroups = source.groups.length ? source.groups : [{ start: 0, count: source.index.count, materialIndex: 0 }];
  for (const group of sourceGroups) {
    if (group.start % 3 || group.count % 3) throw new Error('Source group is not triangle-aligned');
    const start = indices.length;
    for (let offset = group.start; offset < group.start + group.count; offset += 3) {
      const triangle = [source.index.getX(offset), source.index.getX(offset + 1), source.index.getX(offset + 2)];
      const ids = triangle.map(index => batches.getX(index));
      if (!Number.isInteger(ids[0]) || ids.some(id => id !== ids[0])) throw new Error('Source triangle crosses batch identity');
      if (selected.has(ids[0])) indices.push(...triangle);
    }
    if (indices.length > start) groups.push({ start, count: indices.length - start, materialIndex: group.materialIndex });
  }
  const geometry = source.clone(); geometry.setIndex(indices); geometry.clearGroups();
  for (const group of groups) geometry.addGroup(group.start, group.count, group.materialIndex);
  object.geometry = geometry; object.visible = indices.length > 0;
  return { originalTriangles: source.index.count / 3, selectedTriangles: indices.length / 3 };
}

function render() {
  renderer.render(scene, camera); draws++;
}
function resize() {
  const bounds = stage.getBoundingClientRect();
  renderer.setSize(Math.round(bounds.width), Math.round(bounds.height), false);
  camera.aspect = bounds.width / bounds.height; camera.updateProjectionMatrix();
  if (ready) render();
}
new ResizeObserver(resize).observe(stage);
controls.addEventListener('change', () => { if (ready) render(); });
for (const type of ['pointerdown', 'pointerup', 'wheel']) stage.addEventListener(type, event => {
  nativeInputs.push({ type, trusted: event.isTrusted, timeStamp: event.timeStamp, draws });
}, { passive: true });

for (let index = 0; index < manifest.models.length; index++) {
  const record = manifest.models[index];
  status.textContent = `Loading ${index + 1} / ${manifest.models.length} source tiles`;
  const gltf = await loader.loadAsync(record.url);
  if (record.transform) {
    const parent = new THREE.Group();
    parent.matrix.fromArray(record.transform); parent.matrixAutoUpdate = false;
    parent.add(gltf.scene); scene.add(parent);
  } else scene.add(gltf.scene);
  let triangles = 0, meshes = 0, originalTriangles = 0;
  gltf.scene.traverse(object => {
    if (object.isMesh) {
      const counts = selectSourceObjects(object, record.selectedBatchIds);
      meshes += object.visible ? 1 : 0; triangles += counts.selectedTriangles; originalTriangles += counts.originalTriangles;
    }
  });
  if (triangles !== record.selectedTriangles) throw new Error(`Selected triangle count differs from inspected source: ${record.id}`);
  loaded.push({ id: record.id, sha256: record.sha256, bytes: record.bytes, meshes, triangles, originalTriangles,
    selectedBatchIds: [...record.selectedBatchIds] });
  if (gltf.parser.json.extensionsUsed?.includes('CESIUM_RTC') && !record.transform) {
    throw new Error(`CESIUM_RTC source requires explicit reviewed transform: ${record.id}`);
  }
}
for (const sight of manifest.sights) {
  const option = document.createElement('option'); option.value = sight.id;
  option.textContent = sight.label ?? sight.id; sightSelect.append(option);
}
function graphics() {
  const gl = renderer.getContext(), extension = gl.getExtension('WEBGL_debug_renderer_info');
  return { vendor: gl.getParameter(gl.VENDOR), renderer: gl.getParameter(gl.RENDERER),
    unmaskedRenderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null,
    unmaskedVendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : null,
    contextAttributes: gl.getContextAttributes() };
}
function snapshot() {
  return { ready, draws, pose: structuredClone(active), loaded: structuredClone(loaded),
    camera: { position: camera.position.toArray(), target: controls.target.toArray(),
      matrixWorld: camera.matrixWorld.toArray(), projectionMatrix: camera.projectionMatrix.toArray(),
      fov: camera.fov, near: camera.near, far: camera.far },
    render: { ...renderer.info.render }, memory: { ...renderer.info.memory },
    viewport: { width: renderer.domElement.width, height: renderer.domElement.height, dpr: renderer.getPixelRatio() },
    nativeInputs: structuredClone(nativeInputs), decoderWarnings, graphics: graphics() };
}
async function setPose(sightId, pose = 'approach') {
  const sight = manifest.sights.find(value => value.id === sightId);
  if (!sight || !Object.hasOwn(poseNames, pose)) throw new Error('Unknown source review pose');
  const [x, baseHeight, z] = sight.position;
  const forward = sight.forward;
  const length = Math.hypot(...forward);
  if (!Number.isFinite(length) || !length) throw new Error('Invalid review forward vector');
  const cardinal = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };
  const direction = cardinal[pose] ?? [forward[0] / length, forward[1] / length];
  if (pose === 'reverse') { direction[0] *= -1; direction[1] *= -1; }
  if (pose === 'overview') {
    camera.position.set(x - 35, baseHeight + 27, z + 35);
    controls.target.set(x, baseHeight + 5, z);
  } else {
    camera.position.set(x, baseHeight + 1.7, z);
    controls.target.set(x + direction[0] * 12, baseHeight + 1.7, z + direction[1] * 12);
  }
  active = { sightId, pose, sourcePosition: [...sight.position], heightMethod: sight.heightMethod,
    heightQualified: sight.heightQualified, verticalDatum: manifest.coordinateSystem.verticalDatum,
    eyeOffsetMetres: pose === 'overview' ? 27 : 1.7,
    limitations: 'Review camera placement only; pedestrian ground, traversability and current appearance remain unqualified.' };
  sightSelect.value = sightId; poseSelect.value = pose;
  document.querySelector('#title').textContent = sight.label ?? sight.id;
  document.querySelector('#pose-label').textContent = poseNames[pose];
  document.querySelector('#height').textContent = `${baseHeight.toFixed(2)} m source anchor. ${sight.heightMethod}. Ground qualification: ${sight.heightQualified ? 'qualified in supplied source' : 'unverified'}.`;
  controls.update(); camera.updateMatrixWorld(true); render();
  await new Promise(requestAnimationFrame); render();
  return snapshot();
}
sightSelect.addEventListener('change', () => setPose(sightSelect.value, poseSelect.value));
poseSelect.addEventListener('change', () => setPose(sightSelect.value, poseSelect.value));
document.querySelector('#reset').addEventListener('click', () => setPose(sightSelect.value, poseSelect.value));
resize(); ready = true;
await setPose(manifest.sights[0].id, 'overview');
sightSelect.disabled = false; poseSelect.disabled = false; document.querySelector('#reset').disabled = false;
status.textContent = `${loaded.length} tiles · ${loaded.reduce((sum, model) => sum + model.triangles, 0).toLocaleString('en-US')} source triangles loaded`;
window.__SOURCE_REVIEW__ = Object.freeze({ setPose, snapshot, manifest: () => structuredClone(manifest) });
