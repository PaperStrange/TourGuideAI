import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PagedSplats, SparkRenderer, SplatFileType, SplatMesh } from '@sparkjsdev/spark';

const SOURCE_CAMERA = Object.freeze({
  position: [-25.0948486328125, 6.711593151092529, 22.9617862701416],
  target: [-11.19845319602572, 4.008741439866709, 7.849568533379339],
  fov: 75,
});

class ReviewPagedSplats extends PagedSplats {
  async fetchDecodeChunk(chunk) {
    try {
      return await super.fetchDecodeChunk(chunk);
    } catch (error) {
      this.onFailure?.(error);
      throw error;
    }
  }
}

export function createReviewScene({ canvas, assets, onState = () => {} }) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('A review canvas is required');
  for (const variant of ['original', 'streamed']) {
    if (!assets?.[variant]) throw new TypeError(`Missing ${variant} asset URL`);
    new URL(assets[variant]);
  }
  const sourceCamera = assets.camera ?? SOURCE_CAMERA;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(sourceCamera.fov, 1, 0.001, 10000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.minDistance = 1;
  controls.maxDistance = 300;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = Math.PI - 0.05;
  controls.enabled = false;

  let active = null;
  let requested = null;
  let queue = Promise.resolve();
  let drawing = Promise.resolve();
  let animationFrame = 0;
  let disposed = false;
  let frames = 0;
  let drawnView = null;
  let requestId = 0;
  let state = { variant: null, status: 'loading', phase: 'downloading', firstView: false,
    loadedBytes: 0, totalBytes: null, error: null, requiresReload: false };
  const requests = [];

  function emit(session, changes = {}) {
    if (disposed || requested !== session) return;
    state = { ...state, ...changes, variant: session.variant,
      loadedBytes: session.loadedBytes, totalBytes: session.totalBytes };
    onState({ ...state });
  }

  function fail(session, error, { requiresReload = false } = {}) {
    if (session.controller.signal.aborted || disposed || requested !== session || session.failed) return;
    session.failed = true;
    session.controller.abort();
    session.paged?.abortController.abort();
    controls.enabled = false;
    emit(session, { status: 'error', error: error.message ?? String(error), requiresReload });
  }

  async function fetchBytes(session, url, signal, range) {
    const request = { id: ++requestId, url, status: 'pending', loadedBytes: 0,
      startedAt: performance.now(), endedAt: null };
    requests.push(request);
    if (requests.length > 80) requests.shift();
    const combinedSignal = signal
      ? AbortSignal.any([signal, session.controller.signal]) : session.controller.signal;
    try {
      const response = await fetch(url, { signal: combinedSignal,
        headers: range ? { Range: `bytes=${range.offset}-${range.offset + range.bytes - 1}` } : undefined });
      if (!response.ok || !response.body) throw new Error(`Asset request failed (${response.status})`);
      const length = Number(response.headers.get('Content-Length'));
      if (session.variant === 'original') {
        session.totalBytes = length > 0 && !response.headers.get('Content-Encoding') ? length : null;
      }
      const reader = response.body.getReader();
      const chunks = [];
      let lastProgress = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        request.loadedBytes += value.byteLength;
        session.loadedBytes += value.byteLength;
        if (performance.now() - lastProgress > 100) {
          emit(session);
          lastProgress = performance.now();
        }
      }
      combinedSignal.throwIfAborted();
      const bytes = new Uint8Array(request.loadedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      request.status = 'complete';
      emit(session);
      return bytes;
    } catch (error) {
      request.status = combinedSignal.aborted ? 'aborted' : 'error';
      fail(session, error);
      throw error;
    } finally {
      request.endedAt = performance.now();
    }
  }

  async function initialize(session) {
    if (session.variant === 'original') {
      const bytes = await fetchBytes(session, assets.original);
      session.controller.signal.throwIfAborted();
      emit(session, { phase: 'decoding' });
      session.mesh = new SplatMesh({ fileBytes: bytes, fileType: SplatFileType.PCSOGSZIP, lod: false });
      await session.mesh.initialized;
    } else {
      const rootUrl = assets.streamed;
      const fetchSource = {
        fetchRange: (signal, offset, bytes) => fetchBytes(session, rootUrl, signal, { offset, bytes }),
        fetchChunkFile: (signal, filename) => fetchBytes(session, new URL(filename, rootUrl).href, signal),
        fetchChunkById: () => { throw new Error('This review requires a chunked RAD manifest'); },
      };
      session.paged = new ReviewPagedSplats({ fileType: SplatFileType.RAD, fetchSource });
      session.paged.onFailure = error => fail(session, error);
      await session.paged.getRadMeta();
      session.controller.signal.throwIfAborted();
      session.mesh = new SplatMesh({ paged: session.paged });
      await session.mesh.initialized;
    }
    session.controller.signal.throwIfAborted();
    // 两种表示使用同一来源的坐标转换、相机和 focalAdjustment。
    session.mesh.rotation.z = Math.PI;
    session.spark = new SparkRenderer({ renderer, autoUpdate: false, sortRadial: false,
      focalAdjustment: 2, enableLod: session.variant === 'streamed', maxPagedSplats: 524288,
      lodSplatCount: 262144, numLodFetchers: 1, lodCleanupTimeoutMs: 3000, lodRaycast: 0 });
    scene.add(session.mesh, session.spark);
    session.ready = true;
    emit(session, { phase: 'rendering' });
    scheduleFrame();
  }

  function scheduleFrame() {
    if (!disposed && !animationFrame) animationFrame = requestAnimationFrame(draw);
  }

  function draw() {
    animationFrame = 0;
    const session = active;
    if (disposed || !session?.ready || session.controller.signal.aborted || session.failed) return;
    drawing = (async () => {
      try {
        controls.update();
        await session.spark.update({ scene, camera });
        if (disposed || active !== session || session.controller.signal.aborted) return;
        renderer.render(scene, camera);
        frames += 1;
        drawnView = { matrixWorld: camera.matrixWorld.toArray(),
          projectionMatrix: camera.projectionMatrix.toArray(), frames, variant: session.variant };
        const displayed = session.spark.display?.numSplats ?? 0;
        const selected = session.variant === 'streamed' ? session.paged.numSplats : session.mesh.numSplats;
        if (displayed > 0 && selected > 0 && session.spark.activeSplats > 0) {
          controls.enabled = true;
          const pager = session.spark.pager;
          const lod = session.spark.currentLod;
          const cameraMatchesLod = lod && camera.position.distanceTo(lod.pos) < 0.00001
            && Math.abs(camera.quaternion.dot(lod.quat)) > 0.999999;
          const streaming = session.variant === 'streamed' && (!cameraMatchesLod || session.spark.lodDirty
            || pager?.isPending() || pager?.readyUploads.length > 0 || session.spark.lodWorker?.queue);
          const status = streaming ? 'streaming' : 'interactive';
          if (!state.firstView || state.status !== status) {
            emit(session, { status, phase: 'view', firstView: true });
          }
        }
      } catch (error) {
        fail(session, error);
      }
    })();
    drawing.then(() => {
      if (active === session && !session.failed && !session.controller.signal.aborted) scheduleFrame();
    });
  }

  function abort(session) {
    session?.controller.abort();
    session?.paged?.abortController.abort();
  }

  async function release(session) {
    if (!session) return;
    abort(session);
    // Decoder 完成后释放其输出；切换过程中只保留一个来源表示。
    await session.loadTask?.catch(() => {});
    await drawing;
    if (session.mesh) {
      scene.remove(session.mesh);
      session.mesh.dispose();
      session.mesh = null;
    } else session.paged?.dispose();
    if (session.spark) {
      scene.remove(session.spark);
      session.spark.dispose();
      session.spark = null;
    }
    session.paged = null;
    renderer.renderLists.dispose();
    if (!disposed) renderer.clear();
    if (active === session) active = null;
  }

  function setVariant(variant, { force = false } = {}) {
    if (!['original', 'streamed'].includes(variant)) throw new TypeError('Unknown review variant');
    if (disposed) throw new Error('Review scene is disposed');
    if (!force && requested?.variant === variant) return queue;
    const session = { variant, controller: new AbortController(), loadedBytes: 0,
      totalBytes: null, ready: false, failed: false, mesh: null, spark: null, paged: null };
    abort(requested);
    abort(active);
    requested = session;
    controls.enabled = false;
    emit(session, { status: 'loading', phase: 'downloading', firstView: false, error: null, requiresReload: false });
    queue = queue.then(async () => {
      await release(active);
      if (disposed || requested !== session) return false;
      active = session;
      session.loadTask = initialize(session);
      try {
        await session.loadTask;
        return requested === session && !session.controller.signal.aborted;
      } catch (error) {
        fail(session, error);
        await release(session);
        return false;
      }
    });
    return queue;
  }

  function resize({ width = canvas.clientWidth, height = canvas.clientHeight } = {}) {
    if (disposed || width <= 0 || height <= 0) return;
    const aspect = width / height;
    camera.aspect = aspect;
    camera.fov = aspect > 1
      ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(sourceCamera.fov / 2)) / aspect))
      : sourceCamera.fov;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function reset() {
    if (disposed) return;
    camera.position.fromArray(sourceCamera.position);
    controls.target.fromArray(sourceCamera.target);
    camera.lookAt(controls.target);
    controls.update();
  }

  function moveCamera({ azimuth = 0, polar = 0, scale = 1 }) {
    if (disposed || !controls.enabled) return;
    const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    spherical.theta += azimuth;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + polar, controls.minPolarAngle, controls.maxPolarAngle);
    spherical.radius = THREE.MathUtils.clamp(spherical.radius * scale, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    controls.update();
  }

  function getView() {
    camera.updateMatrixWorld(true);
    return { position: camera.position.toArray(), target: controls.target.toArray(),
      quaternion: camera.quaternion.toArray(), fov: camera.fov, matrixWorld: camera.matrixWorld.toArray(),
      projectionMatrix: camera.projectionMatrix.toArray(), ...state, frames, disposed,
      drawnView: drawnView ? { ...drawnView, matrixWorld: [...drawnView.matrixWorld],
        projectionMatrix: [...drawnView.projectionMatrix] } : null,
      drawnSplats: active?.spark?.activeSplats ?? 0, loadedVariant: active?.variant ?? null,
      sceneObjects: scene.children.length, rendererMemory: { ...renderer.info.memory },
      requests: requests.map(request => ({ ...request })) };
  }

  function contextLost(event) {
    event.preventDefault();
    if (requested) fail(requested, new Error('The graphics context was lost. Reload this page to resume.'),
      { requiresReload: true });
  }
  canvas.addEventListener('webglcontextlost', contextLost);
  reset();
  resize();

  async function dispose() {
    if (disposed) return;
    disposed = true;
    abort(requested);
    abort(active);
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    controls.dispose();
    canvas.removeEventListener('webglcontextlost', contextLost);
    await queue;
    await release(active);
    renderer.dispose();
    renderer.forceContextLoss();
    state = { ...state, status: 'disposed', firstView: false };
    onState({ ...state });
  }

  return Object.freeze({ setVariant, reset, resize, dispose, getView,
    rotate: radians => moveCamera({ azimuth: radians }),
    tilt: radians => moveCamera({ polar: radians }),
    zoom: scale => moveCamera({ scale }) });
}
