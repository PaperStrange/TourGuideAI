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
  let renderRequested = false;
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
      responseBodyBytes: 0, httpEncodedBytes: null, httpContentEncoding: null,
      startedAt: performance.now(), endedAt: null };
    requests.push(request);
    if (requests.length > 80) requests.shift();
    const combinedSignal = signal
      ? AbortSignal.any([signal, session.controller.signal]) : session.controller.signal;
    try {
      const response = await fetch(url, { signal: combinedSignal,
        headers: range ? { Range: `bytes=${range.offset}-${range.offset + range.bytes - 1}` } : undefined });
      if (!response.ok || !response.body) throw new Error(`Asset request failed (${response.status})`);
      request.httpStatus = response.status;
      request.httpContentEncoding = response.headers.get('Content-Encoding');
      const length = Number(response.headers.get('Content-Length'));
      if (session.variant === 'original') {
        session.totalBytes = length > 0 && !request.httpContentEncoding ? length : null;
      }
      const reader = response.body.getReader();
      const chunks = [];
      let lastProgress = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          request.loadedBytes += value.byteLength;
          request.responseBodyBytes += value.byteLength;
          session.loadedBytes += value.byteLength;
          if (performance.now() - lastProgress > 100) {
            emit(session);
            lastProgress = performance.now();
          }
        }
      } finally {
        reader.releaseLock();
      }
      combinedSignal.throwIfAborted();
      const bytes = new Uint8Array(request.loadedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const timing = performance.getEntriesByName(url, 'resource')
        .filter(entry => entry.startTime >= request.startedAt).at(-1);
      request.httpEncodedBytes = timing?.encodedBodySize ?? null;
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

  function waitForInitialView(session, signal) {
    const combinedSignal = signal
      ? AbortSignal.any([signal, session.controller.signal]) : session.controller.signal;
    combinedSignal.throwIfAborted();
    if (session.detailReleasedAt !== null) return Promise.resolve();
    return new Promise((resolve, reject) => {
      function cleanup() {
        session.detailWaiters.delete(release);
        combinedSignal.removeEventListener('abort', aborted);
      }
      function release() { cleanup(); resolve(); }
      function aborted() { cleanup(); reject(combinedSignal.reason); }
      session.detailWaiters.add(release);
      combinedSignal.addEventListener('abort', aborted, { once: true });
    });
  }

  function releaseInitialView(session) {
    if (session.detailReleaseFrame || session.detailReleasedAt !== null) return;
    // 首次实际绘制后留出浏览器呈现机会，再继续下载其余细节。
    session.detailReleaseFrame = requestAnimationFrame(() => {
      session.detailReleaseFrame = 0;
      if (disposed || active !== session || session.controller.signal.aborted || session.failed) return;
      session.detailReleasedAt = performance.now();
      for (const release of [...session.detailWaiters]) release();
    });
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
        fetchChunkFile: async (signal, filename) => {
          const url = new URL(filename, rootUrl).href;
          if (url !== session.rootChunkUrl) await waitForInitialView(session, signal);
          return fetchBytes(session, url, signal);
        },
        fetchChunkById: () => { throw new Error('This review requires a chunked RAD manifest'); },
      };
      session.paged = new ReviewPagedSplats({ fileType: SplatFileType.RAD, fetchSource });
      session.paged.onFailure = error => fail(session, error);
      const { meta } = await session.paged.getRadMeta();
      if (!meta.chunks[0]?.filename) throw new Error('This review requires a separate root chunk');
      session.rootChunkUrl = new URL(meta.chunks[0].filename, rootUrl).href;
      session.controller.signal.throwIfAborted();
      session.mesh = new SplatMesh({ paged: session.paged });
      await session.mesh.initialized;
    }
    session.controller.signal.throwIfAborted();
    // 两种表示使用同一来源的坐标转换、相机和 focalAdjustment。
    session.mesh.rotation.z = Math.PI;
    session.spark = new SparkRenderer({ renderer, autoUpdate: true, onDirty: scheduleFrame, sortRadial: false,
      focalAdjustment: 2, enableLod: session.variant === 'streamed', maxPagedSplats: 524288,
      lodSplatCount: 262144, numLodFetchers: 1, lodCleanupTimeoutMs: 3000, lodRaycast: 0 });
    scene.add(session.mesh, session.spark);
    session.ready = true;
    emit(session, { phase: 'rendering' });
    scheduleFrame();
  }

  function scheduleFrame() {
    renderRequested = true;
    scheduleObservation();
  }

  function scheduleObservation() {
    if (!disposed && !document.hidden && active?.ready && !active.failed
      && !active.controller.signal.aborted && !animationFrame) animationFrame = requestAnimationFrame(draw);
  }

  function contentIdentity(session) {
    const spark = session.spark;
    return { drawnSplats: spark.activeSplats, displayedSplats: spark.display.numSplats,
      selectedSplats: session.variant === 'streamed' ? session.paged.numSplats : session.mesh.numSplats,
      currentVersion: spark.current.version, displayVersion: spark.display.version,
      currentMappingVersion: spark.current.mappingVersion, displayMappingVersion: spark.display.mappingVersion,
      meshVersion: session.mesh.version, lastSortTime: spark.lastSortTime };
  }

  function sameContent(first, second) {
    return Object.keys(first).every(key => first[key] === second[key]);
  }

  function sameCamera(first, second) {
    return ['matrixWorld', 'projectionMatrix'].every(key => first[key]
      .every((value, index) => Math.abs(value - second[key][index]) < 1e-7));
  }

  function observeSubmittedView(session, observation) {
    const previous = drawnView;
    if (!previous || previous.variant !== session.variant || previous.frames <= session.observedFrame) return;
    session.observedFrame = previous.frames;
    const stable = previous.drawnSplats > 0 && previous.pagingBeforeRender.idle && observation.paging.idle
      && sameCamera(previous.beforeRender, previous) && sameCamera(previous, observation)
      && sameContent(previous.beforeRender.content, previous.content) && sameContent(previous.content, observation.content);
    if (!stable) {
      session.stableDraws = [];
      session.settledFrames = 0;
      session.settledView = null;
      return;
    }
    const last = session.stableDraws.at(-1);
    if (last && (!sameCamera(last, previous) || !sameContent(last.content, previous.content))) session.stableDraws = [];
    session.stableDraws.push({ frames: previous.frames, submittedAt: previous.submittedAt,
      matrixWorld: [...previous.matrixWorld], projectionMatrix: [...previous.projectionMatrix],
      content: { ...previous.content }, beforeRender: previous.beforeRender,
      pagingBeforeRender: previous.pagingBeforeRender, paging: previous.paging,
      observedAt: observation.observedAt, observation });
    if (session.stableDraws.length > 3) session.stableDraws.shift();
    session.settledFrames = session.stableDraws.length;
    if (session.settledFrames === 3) {
      // 稳定记录归属上一幅实际画面；保留绘制后瞬时队列状态及后续观察证据。
      session.settledView = { ...previous, observedAt: observation.observedAt,
        observation, qualifiedFrames: [...session.stableDraws] };
      if (session.firstSettledAt === null) {
        session.firstSettledAt = observation.observedAt;
        session.firstSettledFrame = previous.frames;
      }
    }
  }

  function pagingState(session) {
    const pager = session?.spark?.pager;
    const lod = session?.spark?.currentLod;
    const streamed = session?.variant === 'streamed';
    const cameraMatchesLod = !streamed || Boolean(lod && camera.position.distanceTo(lod.pos) < 0.00001
      && Math.abs(camera.quaternion.dot(lod.quat)) > 0.999999);
    // 与 SDK 的 LoD 更新阈值一致，避免微小位移永远等待不会触发的重新遍历。
    const cameraCoveredByLod = !streamed || Boolean(lod
      && Math.max(0, 1 - camera.position.distanceTo(lod.pos))
        * Math.max(0, 1 - (1 - camera.quaternion.dot(lod.quat)) / 0.01) >= 0.999);
    const drawnMatchesCamera = Boolean(drawnView && drawnView.variant === session?.variant
      && drawnView.matrixWorld.every((value, index) => Math.abs(value - camera.matrixWorld.elements[index]) < 1e-7)
      && drawnView.projectionMatrix.every((value, index) => Math.abs(value - camera.projectionMatrix.elements[index]) < 1e-7));
    const result = { cameraMatchesLod, cameraCoveredByLod, drawnMatchesCamera,
      pending: Boolean(streamed && pager?.isPending()),
      residentPages: pager?.pageToSplatsChunk.filter(Boolean).length ?? 0, pageCapacity: pager?.maxPages ?? 0,
      fetchLimit: pager?.numFetchers ?? 0, lodTrees: session?.spark?.lodIds.size ?? 0,
      fetchers: pager?.fetchers.length ?? 0, priorityEntries: pager?.fetchPriority.length ?? 0,
      fetched: pager?.fetched.length ?? 0, newUploads: pager?.newUploads.length ?? 0,
      treeUpdates: pager?.lodTreeUpdates.length ?? 0, readyUploads: pager?.readyUploads.length ?? 0,
      lodDirty: Boolean(streamed && session?.spark?.lodDirty), workerBusy: Boolean(streamed && session?.spark?.lodWorker?.queue),
      sorting: Boolean(session?.spark?.sorting), sortDirty: Boolean(session?.spark?.sortDirty),
      mappingMatches: Boolean(session?.spark && session.spark.current.mappingVersion === session.spark.display.mappingVersion) };
    result.idle = Boolean(session?.ready && !session.failed && !session.controller.signal.aborted
      && cameraCoveredByLod && !result.pending && !result.readyUploads
      && !result.lodDirty && !result.workerBusy && !result.sorting && !result.sortDirty && result.mappingMatches);
    // 优先级列表包含已驻留的页面；稳定证据必须绑定当前实际提交的相机。
    result.settled = result.idle && drawnMatchesCamera && session.settledFrames >= 3;
    return result;
  }

  function draw() {
    animationFrame = 0;
    const session = active;
    if (disposed || !session?.ready || session.controller.signal.aborted || session.failed) return;
    drawing = (async () => {
      try {
        controls.update();
        if (disposed || active !== session || session.controller.signal.aborted) return;
        const pagingBeforeRender = pagingState(session);
        const beforeRender = { matrixWorld: camera.matrixWorld.toArray(), projectionMatrix: camera.projectionMatrix.toArray(),
          content: contentIdentity(session), paging: pagingBeforeRender, observedAt: performance.now() };
        observeSubmittedView(session, beforeRender);
        const mustRender = renderRequested;
        renderRequested = false;
        if (!mustRender && (!pagingBeforeRender.idle || session.settledFrames >= 3)) {
          if (state.firstView && pagingBeforeRender.idle && state.status !== 'interactive') {
            emit(session, { status: 'interactive', phase: 'view', firstView: true });
          }
          return;
        }
        const renderStartedAt = performance.now();
        // Spark 在其标准渲染回调中更新；当前画面无需等待后台排序完成。
        renderer.render(scene, camera);
        frames += 1;
        drawnView = { matrixWorld: camera.matrixWorld.toArray(),
          projectionMatrix: camera.projectionMatrix.toArray(), frames, variant: session.variant,
          submittedAt: performance.now(), drawnSplats: session.spark.activeSplats,
          renderDurationMs: performance.now() - renderStartedAt, pagingBeforeRender,
          beforeRender, content: contentIdentity(session) };
        const displayed = session.spark.display?.numSplats ?? 0;
        const selected = session.variant === 'streamed' ? session.paged.numSplats : session.mesh.numSplats;
        if (displayed > 0 && selected > 0 && session.spark.activeSplats > 0) {
          controls.enabled = true;
          if (session.firstVisibleAt === null) {
            session.firstVisibleAt = drawnView.submittedAt;
            session.firstVisibleFrame = frames;
            if (session.variant === 'streamed') releaseInitialView(session);
          }
          const paging = pagingState(session);
          drawnView.paging = { ...paging, settled: false };
          const streaming = session.variant === 'streamed' && (!paging.cameraCoveredByLod
            || paging.pending || paging.readyUploads > 0 || paging.lodDirty || paging.workerBusy);
          const status = streaming ? 'streaming' : 'interactive';
          if (!state.firstView || state.status !== status) {
            emit(session, { status, phase: 'view', firstView: true });
          }
        }
        // 观察实际已提交的画面；仍有工作时依靠 Spark 的 onDirty 唤醒。
        scheduleObservation();
      } catch (error) {
        fail(session, error);
      }
    })();
  }

  function abort(session) {
    session?.controller.abort();
    session?.paged?.abortController.abort();
    if (session?.detailReleaseFrame) {
      cancelAnimationFrame(session.detailReleaseFrame);
      session.detailReleaseFrame = 0;
    }
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
      totalBytes: null, ready: false, failed: false, mesh: null, spark: null, paged: null,
      firstVisibleAt: null, firstVisibleFrame: null, firstSettledAt: null, firstSettledFrame: null,
      settledFrames: 0, settledView: null, stableDraws: [], observedFrame: 0, rootChunkUrl: null,
      detailWaiters: new Set(), detailReleaseFrame: 0, detailReleasedAt: null };
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
    scheduleFrame();
  }

  function reset() {
    if (disposed) return;
    camera.position.fromArray(sourceCamera.position);
    controls.target.fromArray(sourceCamera.target);
    camera.lookAt(controls.target);
    controls.update();
    scheduleFrame();
  }

  function moveCamera({ azimuth = 0, polar = 0, scale = 1 }) {
    if (disposed || !controls.enabled) return;
    const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    spherical.theta += azimuth;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + polar, controls.minPolarAngle, controls.maxPolarAngle);
    spherical.radius = THREE.MathUtils.clamp(spherical.radius * scale, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    controls.update();
    scheduleFrame();
  }

  function setCameraPose({ position, target }) {
    for (const vector of [position, target]) {
      if (!Array.isArray(vector) || vector.length !== 3 || !vector.every(Number.isFinite)) {
        throw new TypeError('Camera pose requires finite position and target vectors');
      }
    }
    const distance = Math.hypot(...position.map((value, index) => value - target[index]));
    if (distance < controls.minDistance || distance > controls.maxDistance) {
      throw new RangeError('Camera pose exceeds the review distance limits');
    }
    if (disposed || !controls.enabled || !state.firstView || state.status === 'error') return false;
    camera.position.fromArray(position);
    controls.target.fromArray(target);
    controls.update();
    scheduleFrame();
    return true;
  }

  function getView() {
    camera.updateMatrixWorld(true);
    return { position: camera.position.toArray(), target: controls.target.toArray(),
      quaternion: camera.quaternion.toArray(), fov: camera.fov, matrixWorld: camera.matrixWorld.toArray(),
      projectionMatrix: camera.projectionMatrix.toArray(), ...state, frames, disposed,
      drawnView: drawnView ? structuredClone(drawnView) : null,
      settledView: requested?.settledView ? structuredClone(requested.settledView) : null,
      drawnSplats: active?.spark?.activeSplats ?? 0, loadedVariant: active?.variant ?? null,
      firstVisibleAt: requested?.firstVisibleAt ?? null, firstVisibleFrame: requested?.firstVisibleFrame ?? null,
      firstSettledAt: requested?.firstSettledAt ?? null, firstSettledFrame: requested?.firstSettledFrame ?? null,
      paging: pagingState(active),
      transportMetrics: { encoding: 'identity', responseBodyBytes: requested?.loadedBytes ?? 0 },
      loadingSchedule: { rootChunkUrl: requested?.rootChunkUrl ?? null,
        detailReleasedAt: requested?.detailReleasedAt ?? null, waitingChunks: requested?.detailWaiters.size ?? 0 },
      sceneObjects: scene.children.length, rendererMemory: { ...renderer.info.memory },
      requests: requests.map(request => ({ ...request })) };
  }

  function contextLost(event) {
    event.preventDefault();
    if (requested) fail(requested, new Error('The graphics context was lost. Reload this page to resume.'),
      { requiresReload: true });
  }
  canvas.addEventListener('webglcontextlost', contextLost);
  controls.addEventListener('change', scheduleFrame);
  function visibilityChanged() { if (!document.hidden) scheduleFrame(); }
  document.addEventListener('visibilitychange', visibilityChanged);
  reset();
  resize();

  async function dispose() {
    if (disposed) return;
    disposed = true;
    abort(requested);
    abort(active);
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    controls.removeEventListener('change', scheduleFrame);
    controls.dispose();
    canvas.removeEventListener('webglcontextlost', contextLost);
    document.removeEventListener('visibilitychange', visibilityChanged);
    await queue;
    await release(active);
    renderer.dispose();
    renderer.forceContextLoss();
    state = { ...state, status: 'disposed', firstView: false };
    onState({ ...state });
  }

  return Object.freeze({ setVariant, reset, resize, dispose, getView, setCameraPose, requestFrame: scheduleFrame,
    rotate: radians => moveCamera({ azimuth: radians }),
    tilt: radians => moveCamera({ polar: radians }),
    zoom: scale => moveCamera({ scale }) });
}
