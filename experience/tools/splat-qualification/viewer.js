import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';

const canvas = document.querySelector('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight - 64, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#20252a');
const camera = new THREE.PerspectiveCamera(60, innerWidth / (innerHeight - 64), .001, 10000);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = false;
const spark = new SparkRenderer({ renderer, autoUpdate: false, enableLod: false });
scene.add(spark);
const progress = [], nativeInputs = [], stages = [];
const startedAt = performance.now();
let draws = 0, ready = false, disposed = false, pending = Promise.resolve();
const sample = new SplatMesh({ url: '/shoe.splat', lod: false,
  onProgress: event => progress.push({ at: performance.now(), loaded: event.loaded, total: event.total }) });
scene.add(sample);
await sample.initialized;
stages.push({ stage: 'source-initialized', milliseconds: performance.now() - startedAt });
const bounds = sample.getBoundingBox(false), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
const radius = size.length() / 2;
if (!Number.isFinite(radius) || radius <= 0 || !sample.packedSplats?.numSplats) throw new Error('Source has no finite decoded splat bounds/count');
controls.target.copy(center); camera.position.copy(center).add(new THREE.Vector3(radius * 1.1, radius * .65, radius * 1.8));
camera.near = Math.max(radius / 10000, .00001); camera.far = radius * 100; camera.updateProjectionMatrix(); controls.update();
function submit() { renderer.render(scene, camera); draws++; }
async function draw() {
  await spark.update({ scene, camera });
  submit();
  await new Promise(requestAnimationFrame);
  submit();
}
submit(); await draw();
stages.push({ stage: 'sort-awaited-and-subsequent-submitted-frame', milliseconds: performance.now() - startedAt, draws });
ready = true;
for (const type of ['pointerdown', 'pointerup', 'wheel']) canvas.addEventListener(type, event => {
  nativeInputs.push({ type, trusted: event.isTrusted, timeStamp: event.timeStamp, draws });
}, { passive: true });
controls.addEventListener('change', () => { if (ready && !disposed) pending = pending.then(draw); });
const gl = renderer.getContext(), extension = gl.getExtension('WEBGL_debug_renderer_info');
function snapshot() {
  const resources = [sample.packedSplats?.packedArray, spark.readback32, spark.orderingTexture?.image?.data]
    .filter(value => ArrayBuffer.isView(value));
  const buffers = new Set(resources.map(value => value.buffer));
  return { ready, disposed, draws, threeRevision: THREE.REVISION, stages: [...stages],
    sample: { initialized: sample.isInitialized, count: sample.packedSplats?.numSplats ?? null,
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() }, transform: sample.matrix.toArray(),
      sceneContainsSample: scene.children.includes(sample) },
    camera: { position: camera.position.toArray(), target: controls.target.toArray(), matrixWorld: camera.matrixWorld.toArray(),
      projectionMatrix: camera.projectionMatrix.toArray(), fov: camera.fov },
    spark: { activeSplats: spark.activeSplats, maxSplats: spark.maxSplats, sorting: spark.sorting,
      sortDirty: spark.sortDirty, lastSortTime: spark.lastSortTime, enableLod: spark.enableLod },
    renderer: { memory: { ...renderer.info.memory }, render: { ...renderer.info.render }, programs: renderer.info.programs.length },
    resources: { exposedCpuBufferBytes: [...buffers].reduce((sum, buffer) => sum + buffer.byteLength, 0),
      measuredFields: ['packedArray', 'readback32', 'orderingTexture.image.data'], completeAccounting: false,
      limitation: 'Selected exposed CPU buffers only; worker heaps, transient allocations, GPU textures and peaks remain unmeasured' },
    viewport: [canvas.width, canvas.height], graphics: { version: gl.getParameter(gl.VERSION),
      renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      contextAttributes: gl.getContextAttributes() }, progress: [...progress], nativeInputs: [...nativeInputs] };
}
async function dispose() {
  await pending; ready = false; controls.dispose();
  scene.remove(sample, spark); sample.dispose(); spark.dispose(); submit(); disposed = true;
  return snapshot();
}
window.__SPLAT_DIAGNOSTIC__ = Object.freeze({ snapshot, settle: async () => { await pending; return snapshot(); }, dispose });
document.querySelector('#status').textContent = `${sample.packedSplats.numSplats.toLocaleString('en-US')} original splats · drag to inspect · source/quality acceptance unverified`;
