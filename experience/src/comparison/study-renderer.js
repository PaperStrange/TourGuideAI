import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { daylightEnvironment } from '../runtime/world-view.js';
import { localAsset } from './manifest.js';

function disposeTree(root) {
  const resources = new Set(), images = new Set();
  root.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    for (const material of [node.material].flat().filter(Boolean)) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) {
        resources.add(value);
        if (typeof value.image?.close === 'function') images.add(value.image);
      }
    }
  });
  for (const resource of resources) resource.dispose();
  for (const image of images) image.close();
}

export async function createStudyRenderer(host, manifest, { manifestURL, appURL, signal, onContextLost }) {
  let disposed = false, renderer, environment, observer, frame = 0, current;
  let modelHash = null, renderCount = 0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const models = [];
  const abort = () => { if (signal.aborted || disposed) throw new DOMException('Cancelled', 'AbortError'); };
  const contextLost = event => { event.preventDefault(); onContextLost?.(); };
  const draw = () => {
    frame = 0;
    if (disposed || !current || !renderer || document.hidden) return;
    const rect = host.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    renderer.setSize(Math.round(rect.width), Math.round(rect.height), false);
    renderer.render(scene, camera); renderCount++;
  };
  const requestDraw = () => { if (!disposed && !frame) frame = requestAnimationFrame(draw); };
  const dispose = () => {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(frame); observer?.disconnect();
    document.removeEventListener('visibilitychange', requestDraw);
    renderer?.domElement.removeEventListener('webglcontextlost', contextLost);
    for (const model of models) disposeTree(model);
    models.length = 0;
    environment?.dispose();
    scene.traverse(node => node.shadow?.map?.dispose());
    scene.clear(); renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove();
  };
  signal.addEventListener('abort', dispose, { once: true });
  try {
    abort();
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = manifest.lighting?.exposure ?? 1;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    host.appendChild(renderer.domElement);
    scene.background = new THREE.Color(manifest.lighting?.background ?? '#dbe3e9');
    environment = daylightEnvironment(renderer);
    scene.environment = environment.texture;
    scene.environmentIntensity = manifest.lighting?.environmentIntensity ?? 0.52;
    scene.add(new THREE.HemisphereLight('#f3f7fa', '#9b9992', manifest.lighting?.hemisphereIntensity ?? 1.35));
    const sun = new THREE.DirectionalLight(manifest.lighting?.sunColor ?? '#fff5e8', manifest.lighting?.sunIntensity ?? 2.25);
    sun.position.fromArray(manifest.lighting?.sunPosition ?? [4, 105, 36]);
    sun.target.position.fromArray(manifest.lighting?.sunTarget ?? [32, 0, 7]);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0007; sun.shadow.normalBias = 0.07;
    scene.add(sun, sun.target);
    const manager = new THREE.LoadingManager();
    manager.setURLModifier(url => url.startsWith('blob:') || url.startsWith('data:') ? url : localAsset(url, manifestURL, appURL).href);
    const loader = new GLTFLoader(manager);
    async function load(path, main = false) {
      const url = localAsset(path, manifestURL, appURL);
      const version = main ? manifest.modelSha256 : manifest.actor?.modelSha256;
      if (version) url.searchParams.set('v', version);
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error('Study model unavailable');
      const bytes = await response.arrayBuffer(); abort();
      if (main && crypto.subtle) {
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        modelHash = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
        if (manifest.modelSha256 && modelHash !== manifest.modelSha256) throw new Error('Study model version mismatch');
      }
      const gltf = await loader.parseAsync(bytes, new URL('./', url).href);
      if (signal.aborted || disposed) { disposeTree(gltf.scene); abort(); }
      models.push(gltf.scene);
      return gltf.scene;
    }
    const results = await Promise.allSettled([
      load(manifest.model, true),
      manifest.actor ? load(manifest.actor.model) : Promise.resolve(null),
    ]);
    abort();
    const failure = results.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
    const street = results[0].value, actor = results[1].value;
    scene.add(street);
    if (actor) {
      actor.position.fromArray(manifest.actor.position);
      actor.rotation.y = manifest.actor.rotationY ?? 0;
      scene.add(actor);
    }
    scene.traverse(node => {
      if (node.isMesh) { node.castShadow = !node.userData.walkable; node.receiveShadow = true; }
    });
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(street);
    const shadowCamera = sun.shadow.camera;
    shadowCamera.position.copy(sun.position); shadowCamera.lookAt(sun.target.position); shadowCamera.updateMatrixWorld(true);
    const lightBounds = bounds.clone().applyMatrix4(shadowCamera.matrixWorldInverse);
    Object.assign(shadowCamera, { left: lightBounds.min.x - 2, right: lightBounds.max.x + 2,
      bottom: lightBounds.min.y - 2, top: lightBounds.max.y + 2,
      near: Math.max(0.1, -lightBounds.max.z - 5), far: Math.max(180, -lightBounds.min.z + 5) });
    shadowCamera.updateProjectionMatrix();
    const selectView = view => {
      current = view;
      const config = view.camera;
      camera.fov = config.fov; camera.aspect = config.aspect;
      camera.near = config.near ?? 0.15; camera.far = config.far ?? 260;
      camera.up.fromArray(config.up ?? [0, 1, 0]);
      camera.position.fromArray(config.position); camera.lookAt(new THREE.Vector3().fromArray(config.target));
      camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
      const hidden = new Set(view.hiddenGroups);
      street.traverse(node => { node.visible = !hidden.has(node.name) && !hidden.has(node.userData.semanticGroup); });
      renderer.shadowMap.needsUpdate = true;
      requestDraw();
    };
    selectView(manifest.views[0]);
    await renderer.compileAsync(scene, camera); abort();
    observer = new ResizeObserver(requestDraw); observer.observe(host);
    document.addEventListener('visibilitychange', requestDraw);
    requestDraw();
    return {
      selectView, resize: requestDraw,
      setLabel(value) { renderer.domElement.setAttribute('aria-label', value); },
      snapshot() {
        return { disposed, viewId: current?.id, modelHash, renderedFrames: renderCount,
          camera: { position: camera.position.toArray(), target: [...current.camera.target],
            up: camera.up.toArray(), fov: camera.fov, aspect: camera.aspect, near: camera.near, far: camera.far,
            projectionMatrix: camera.projectionMatrix.toArray(), matrixWorld: camera.matrixWorld.toArray() },
          hiddenGroups: [...current.hiddenGroups], render: { ...renderer.info.render },
          memory: { ...renderer.info.memory }, pixelRatio: renderer.getPixelRatio(),
          canvas: { width: renderer.domElement.width, height: renderer.domElement.height } };
      },
      dispose() { signal.removeEventListener('abort', dispose); dispose(); },
    };
  } catch (error) {
    dispose(); signal.removeEventListener('abort', dispose); throw error;
  }
}
