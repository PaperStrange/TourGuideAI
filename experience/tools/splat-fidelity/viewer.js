import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from 'spark';
import { Viewer, SplatLoader, SceneRevealMode } from 'independent';

const engine = new URL(location.href).searchParams.get('engine');
if (!['spark', 'independent'].includes(engine)) throw new Error('Declare a source renderer');
const reference = await (await fetch('/reference.json')).json();
const canvas = document.querySelector('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight - 64, false);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor('#20252a');
const camera = new THREE.PerspectiveCamera(60, innerWidth / (innerHeight - 64), .001, 10000);
camera.position.fromArray(reference.before.camera.position);
camera.projectionMatrix.fromArray(reference.before.camera.projectionMatrix);
camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
const target = new THREE.Vector3().fromArray(reference.before.camera.target);
camera.lookAt(target); camera.updateMatrixWorld(true);
const controls = new OrbitControls(camera, canvas); controls.target.copy(target); controls.enableDamping = false; controls.update();
const scene = new THREE.Scene(); scene.background = new THREE.Color('#20252a');
const nativeInputs = [], visibility = [], observations = [];
let ready = false, disposed = false, draws = 0, pending = Promise.resolve(), sample, spark, independent;
let decoderComparison = null;
camera.updateMatrixWorld(true);
const initialCamera = camera.matrixWorld.toArray();
if (engine === 'spark') {
  spark = new SparkRenderer({ renderer, autoUpdate: false, enableLod: false }); scene.add(spark);
  sample = new SplatMesh({ url: '/shoe.splat', lod: false }); scene.add(sample); await sample.initialized;
  const source = await SplatLoader.loadFromURL('/shoe.splat', undefined, false, undefined, 0, 0, false);
  const center = new THREE.Vector3(), scale = new THREE.Vector3(), rotation = new THREE.Quaternion(), color = new THREE.Vector4();
  const differences = { center: [], scaleAbsolute: [], scaleRelative: [], rotationRadians: [], opacity: [], color: [] };
  const examples = [], identities = new Map();
  const key = (position, rgba) => [...position.toArray().map(THREE.DataUtils.toHalfFloat), ...rgba].join(',');
  // 两个成熟解码器可以重排原始记录；按量化后的位置和颜色配对，不能假定下标相同。
  for (let index = 0; index < source.getSplatCount(); index++) {
    source.getSplatCenter(index, center); source.getSplatColor(index, color);
    const identity = key(center, color.toArray());
    if (!identities.has(identity)) identities.set(identity, []);
    identities.get(identity).push(index);
  }
  let matched = 0, ambiguous = 0, missing = 0, reordered = 0;
  sample.forEachSplat((index, c, s, q, opacity, rgb) => {
    const candidates = identities.get(key(c, [rgb.r, rgb.g, rgb.b, opacity].map(value => Math.round(value * 255))));
    if (!candidates?.length) { missing++; return; }
    if (candidates.length !== 1) { ambiguous++; return; }
    const sourceIndex = candidates[0]; matched++; if (index !== sourceIndex) reordered++;
    source.getSplatCenter(sourceIndex, center); source.getSplatScaleAndRotation(sourceIndex, scale, rotation); source.getSplatColor(sourceIndex, color);
    const values = { center: c.distanceTo(center), scaleAbsolute: s.distanceTo(scale), scaleRelative: s.distanceTo(scale) / Math.max(scale.length(), 1e-20),
      rotationRadians: 2 * Math.acos(Math.min(1, Math.abs(q.clone().normalize().dot(rotation.clone().normalize())))),
      opacity: Math.abs(opacity - color.w / 255), color: Math.hypot(rgb.r - color.x / 255, rgb.g - color.y / 255, rgb.b - color.z / 255) };
    for (const [key, value] of Object.entries(values)) differences[key].push(value);
    if (index < 5) examples.push({ index, sourceIndex, spark: { center: c.toArray(), scale: s.toArray(), quaternion: q.toArray(), opacity },
      independent: { center: center.toArray(), scale: scale.toArray(), quaternion: rotation.toArray(), opacity: color.w / 255 } });
  });
  decoderComparison = { count: sample.packedSplats.numSplats, independentCount: source.getSplatCount(), matched, ambiguous, missing, reordered, examples,
    method: 'Two mature decoders; pair only unique float16 center plus exact RGBA8 identity, then compare scales and sign-normalized quaternion; ambiguous/missing entries excluded explicitly',
    differences: Object.fromEntries(Object.entries(differences).map(([key, values]) => {
      values.sort((a, b) => a - b); return [key, { maximum: values.at(-1), median: values[Math.floor(values.length * .5)], p95: values[Math.floor(values.length * .95)] }];
    })) };
} else {
  independent = new Viewer({ renderer, camera, threeScene: scene, selfDrivenMode: false, useBuiltInControls: false,
    gpuAcceleratedSort: false, sharedMemoryForWorkers: false, integerBasedSort: false, optimizeSplatData: false,
    inMemoryCompressionLevel: 0, sceneRevealMode: SceneRevealMode.Instant, halfPrecisionCovariancesOnGPU: false });
  await independent.addSplatScene('/shoe.splat', { splatAlphaRemovalThreshold: 0, showLoadingUI: false, progressiveLoad: false });
}
async function draw() {
  if (disposed) throw new Error('Disposed source renderer cannot draw');
  if (engine === 'spark') {
    await spark.update({ scene, camera }); renderer.render(scene, camera); draws++;
    await new Promise(requestAnimationFrame); renderer.render(scene, camera); draws++;
  } else {
    independent.update(); if (independent.sortPromise) await independent.sortPromise;
    independent.render(); draws++;
    await new Promise(requestAnimationFrame); independent.update();
    if (independent.sortPromise) await independent.sortPromise;
    independent.render(); draws++;
  }
}
for (const type of ['pointerdown', 'pointerup', 'wheel']) canvas.addEventListener(type, event => nativeInputs.push({ type, trusted: event.isTrusted, draws, timeStamp: event.timeStamp }), { passive: true });
document.addEventListener('visibilitychange', () => visibility.push({ state: document.visibilityState, draws, timeStamp: performance.now() }));
controls.addEventListener('change', () => { if (ready && !disposed) pending = pending.then(draw); });
const gl = renderer.getContext(), extension = gl.getExtension('WEBGL_debug_renderer_info');
function snapshot() {
  return { engine, ready, disposed, draws, initialCamera, camera: { matrixWorld: camera.matrixWorld.toArray(), projectionMatrix: camera.projectionMatrix.toArray(), position: camera.position.toArray(), target: controls.target.toArray() },
    viewport: [canvas.width, canvas.height], sourceCount: engine === 'spark' ? sample.packedSplats?.numSplats : independent.splatMesh.getSplatCount(),
    renderer: { memory: { ...renderer.info.memory }, render: { ...renderer.info.render } },
    graphics: { renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), vendor: gl.getParameter(gl.VENDOR) },
    decoderComparison, nativeInputs: [...nativeInputs], visibilityState: document.visibilityState, visibility: [...visibility], observations: [...observations] };
}
async function dispose() {
  await pending; controls.dispose(); ready = false;
  observations.push({ state: 'before-dispose', memory: { ...renderer.info.memory } });
  if (engine === 'spark') { scene.remove(sample, spark); sample.dispose(); spark.dispose(); renderer.render(scene, camera); }
  else await independent.dispose();
  disposed = true;
  observations.push({ state: 'after-dispose', memory: { ...renderer.info.memory } });
  return { disposed, observations: [...observations], completeMemoryAccounting: false };
}
await draw(); ready = true;
document.querySelector('#status').textContent = `${engine} · original shoe source · identical initial camera · source fidelity under investigation`;
window.__FIDELITY__ = Object.freeze({ snapshot, settle: async () => { await pending; return snapshot(); }, dispose });
