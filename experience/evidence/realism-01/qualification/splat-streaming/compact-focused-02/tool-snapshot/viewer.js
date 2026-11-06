import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from 'spark';

const reference = await (await fetch('/publisher-camera.json')).json();
const config = await (await fetch('/hall-config.json')).json();
const canvas = document.querySelector('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(960, 960, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 1, 1000);
camera.matrixWorld.fromArray(reference.camera.matrixWorld);
camera.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
camera.projectionMatrix.fromArray(reference.camera.projectionMatrix);
camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
camera.updateMatrixWorld(true);
const controls = new OrbitControls(camera, canvas);
controls.target.fromArray(config.settings.cameras[0].initial.target);
controls.enableDamping = false;
controls.update();
camera.matrixWorld.fromArray(reference.camera.matrixWorld);
camera.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
camera.updateMatrixWorld(true);
const settings = { enableLod: true, maxPagedSplats: 524288, lodSplatCount: 262144,
  numLodFetchers: 1, lodCleanupTimeoutMs: 3000, sortRadial: false, focalAdjustment: 2,
  autoUpdate: false, lodRaycast: 0 };
const spark = new SparkRenderer({ renderer, ...settings });
scene.add(spark);
const gl = renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
const nativeInputs = [], pageHistory = [], firstVisible = [], allocationHistory = [];
let sample = null, generation = 0, frames = 0, stopped = false, drawing = false, paused = false;
let firstForGeneration = false, lastPageKey = '', lastPageChangeAt = performance.now(), lastAllocationAt = 0;
let lastCameraChangeAt = performance.now(), framesAtCameraChange = 0;
const failures = [];
controls.addEventListener('change', () => { lastCameraChangeAt = performance.now(); framesAtCameraChange = frames; });

for (const type of ['pointerdown', 'pointerup', 'wheel']) {
  canvas.addEventListener(type, event => nativeInputs.push({ type, trusted: event.isTrusted, at: performance.now(), frames }), { passive: true });
}

function pages() {
  return spark.pager?.pageToSplatsChunk.flatMap((entry, page) => entry ? [{ page, chunk: entry.chunk }] : []) ?? [];
}

function allocation() {
  const seen = new Set(), buffers = new Set(), textures = [];
  let arrayBufferBytes = 0;
  function visit(value, path, depth) {
    if (!value || typeof value !== 'object' || seen.has(value) || depth > 9) return;
    seen.add(value);
    if (ArrayBuffer.isView(value)) {
      if (!buffers.has(value.buffer)) { buffers.add(value.buffer); arrayBufferBytes += value.buffer.byteLength; }
      return;
    }
    if (value instanceof ArrayBuffer) {
      if (!buffers.has(value)) { buffers.add(value); arrayBufferBytes += value.byteLength; }
      return;
    }
    if (value.isTexture) {
      const shape = value.image;
      const channels = new Map([[THREE.RedFormat, 1], [THREE.RedIntegerFormat, 1], [THREE.RGFormat, 2],
        [THREE.RGIntegerFormat, 2], [THREE.RGBFormat, 3], [THREE.RGBAFormat, 4], [THREE.RGBAIntegerFormat, 4]]);
      const elementBytes = new Map([[THREE.UnsignedByteType, 1], [THREE.ByteType, 1], [THREE.UnsignedShortType, 2],
        [THREE.ShortType, 2], [THREE.HalfFloatType, 2], [THREE.UnsignedIntType, 4], [THREE.IntType, 4], [THREE.FloatType, 4]]);
      const bytesPerTexel = (channels.get(value.format) ?? NaN) * (elementBytes.get(value.type) ?? NaN);
      const allocated = renderer.properties.has(value);
      const logicalBytes = shape && Number.isFinite(bytesPerTexel)
        ? shape.width * shape.height * (shape.depth ?? 1) * bytesPerTexel : null;
      textures.push({ path, allocated, width: shape?.width, height: shape?.height, depth: shape?.depth ?? 1,
        format: value.format, type: value.type, logicalBytes });
      if (shape?.data) visit(shape.data, `${path}.data`, depth + 1);
      return;
    }
    if (value instanceof Map) { for (const [key, item] of value) visit(item, `${path}.map`, depth + 1); return; }
    if (value instanceof Set) { for (const item of value) visit(item, `${path}.set`, depth + 1); return; }
    for (const [key, item] of Object.entries(value)) {
      if (['renderer', 'parent', 'children', 'material', 'geometry', 'worker', 'fetchSource', 'manager'].includes(key)) continue;
      visit(item, `${path}.${key}`, depth + 1);
    }
  }
  const pager = spark.pager;
  if (pager) {
    visit(pager.packedTexture.value, 'pager.packedTexture', 0);
    visit(pager.extTexture.value, 'pager.extTexture', 0);
    pager.shTextures.forEach((texture, index) => visit(texture.value, `pager.shTextures.${index}`, 0));
  }
  visit(spark.display, 'display', 0);
  visit(spark.current, 'current', 0);
  visit(spark, 'spark', 0);
  visit(sample, 'sample', 0);
  const allocated = textures.filter(texture => texture.allocated);
  return { at: performance.now(), arrayBufferBytes, arrayBufferCount: buffers.size,
    trackedLogicalGpuTextureBytes: allocated.reduce((sum, texture) => sum + (texture.logicalBytes ?? 0), 0),
    unknownTextureAllocationCount: allocated.filter(texture => texture.logicalBytes === null).length,
    textures, threeMemory: { ...renderer.info.memory }, workerLifecycle: structuredClone(window.__WORKERS__),
    completeMemoryAccounting: false,
    exclusions: ['worker/WASM heaps', 'driver-resident bytes', 'GPU buffers and renderbuffer storage', 'transient browser decoding allocations', 'unreachable or implementation-private arrays'] };
}

function snapshot() {
  const pager = spark.pager;
  const cameraMatchesLod = !!spark.currentLod && camera.position.distanceTo(spark.currentLod.pos) < 0.00001
    && Math.abs(camera.quaternion.dot(spark.currentLod.quat)) > 0.999999;
  const readyForCapture = sample?.paged?.numSplats > 0 && cameraMatchesLod && !spark.lodDirty
    && spark.lodWorker?.queue === null && spark.sortWorker?.queue === null
    && pager && !pager.isPending() && pager.readyUploads.length === 0
    && performance.now() - Math.max(lastCameraChangeAt, lastPageChangeAt) > 800 && frames > framesAtCameraChange + 2;
  return { generation, frames, paused, samplePresent: !!sample, sampleVisible: sample?.visible ?? false,
    readyForCapture: !!readyForCapture, cameraMatchesLod, lastCameraChangeAt,
    selectedSplats: sample?.paged?.numSplats ?? 0, displayedSplats: spark.display?.numSplats ?? 0,
    settings, camera: { matrixWorld: camera.matrixWorld.toArray(), projectionMatrix: camera.projectionMatrix.toArray() },
    pager: pager ? { maxPages: pager.maxPages, maxSplats: pager.maxSplats, pageSplats: pager.pageSplats,
      pages: pages(), freePages: pager.pageFreelist.length, fetchers: pager.fetchers.length,
      fetching: pager.isFetching(), pending: pager.isPending(), queued: pager.hasQueued(),
      readyUploads: pager.readyUploads.length, freeablePages: [...pager.freeablePages] } : null,
    lodTrees: spark.lodIds.size, lodInstances: spark.lodInstances.size,
    graphics: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    firstVisible: structuredClone(firstVisible), pageHistory: structuredClone(pageHistory),
    nativeInputs: structuredClone(nativeInputs), failures: [...failures],
    allocation: allocation(), stableForMs: performance.now() - lastPageChangeAt,
    resources: performance.getEntriesByType('resource').map(entry => ({ name: entry.name, startTime: entry.startTime,
      responseEnd: entry.responseEnd, transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize })) };
}

async function mount() {
  if (sample) throw new Error('Remove the current scene before remounting');
  generation += 1;
  firstForGeneration = false;
  sample = new SplatMesh({ url: '/converted/knock-original-lod.rad', paged: true });
  sample.rotation.z = Math.PI;
  scene.add(sample);
  await sample.initialized;
  return generation;
}

function remove(dispose = false) {
  if (!sample) throw new Error('No scene to remove');
  scene.remove(sample);
  if (dispose) sample.dispose();
  sample = null;
  return { at: performance.now(), epochMs: performance.timeOrigin + performance.now(), disposeRequested: dispose };
}

function resetCamera() {
  camera.matrixWorld.fromArray(reference.camera.matrixWorld);
  camera.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
  camera.updateMatrixWorld(true);
  controls.target.fromArray(config.settings.cameras[0].initial.target);
  lastCameraChangeAt = performance.now();
  framesAtCameraChange = frames;
  return snapshot();
}

async function draw() {
  if (stopped || drawing || paused) return;
  drawing = true;
  try {
    await spark.update({ scene, camera });
    renderer.render(scene, camera);
    frames += 1;
    const currentPages = pages();
    const key = JSON.stringify(currentPages);
    if (key !== lastPageKey) {
      lastPageKey = key;
      lastPageChangeAt = performance.now();
      pageHistory.push({ at: lastPageChangeAt, generation, frames, pages: currentPages });
    }
    if (!firstForGeneration && sample?.paged?.numSplats > 0 && spark.display?.numSplats > 0) {
      const pixels = new Uint8Array(960 * 960 * 4);
      gl.readPixels(0, 0, 960, 960, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let foregroundSamples = 0;
      for (let i = 0; i < pixels.length; i += 64) if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 24) foregroundSamples++;
      if (foregroundSamples > 100) {
        firstForGeneration = true;
        firstVisible.push({ generation, at: performance.now(), epochMs: performance.timeOrigin + performance.now(), frames,
          selectedSplats: sample.paged.numSplats, displayedSplats: spark.display.numSplats,
          foregroundSamples, pages: currentPages, benchmarkFullQualityReady: false });
        if (generation === 1) paused = true;
      }
    }
    if (performance.now() - lastAllocationAt >= 1000) {
      lastAllocationAt = performance.now();
      allocationHistory.push(allocation());
    }
  } catch (error) {
    failures.push({ at: performance.now(), message: error.message });
    stopped = true;
    throw error;
  } finally { drawing = false; }
  if (!stopped && !paused) requestAnimationFrame(draw);
}

async function dispose() {
  stopped = true;
  while (drawing) await new Promise(requestAnimationFrame);
  const before = allocation();
  controls.dispose();
  if (sample) { scene.remove(sample); sample.dispose(); sample = null; }
  scene.remove(spark);
  spark.dispose();
  renderer.render(scene, camera);
  return { before, after: allocation(), allocations: allocationHistory, firstVisible, pageHistory,
    completeMemoryAccounting: false };
}

function resume() { paused = false; requestAnimationFrame(draw); }
async function freeze() {
  paused = true;
  while (drawing) await new Promise(requestAnimationFrame);
  const state = snapshot();
  if (!state.readyForCapture) { resume(); return false; }
  return true;
}
window.__STREAM__ = Object.freeze({ snapshot, mount, remove, resetCamera, dispose, resume, freeze });
await mount();
requestAnimationFrame(draw);
