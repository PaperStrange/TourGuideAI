import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSceneLighting } from '../runtime/lighting.js';
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

export async function createStudyRenderer(host, manifest, { manifestURL, appURL, signal, onContextLost, lightingMode = 'day', onLightingStatus }) {
  let disposed = false, renderer, lighting, observer, frame = 0, current;
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
    lighting?.dispose();
    for (const model of models) disposeTree(model);
    models.length = 0;
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

    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    host.appendChild(renderer.domElement);
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
    // Distant ground closes the horizon; it must not dilute shadow resolution
    // across hundreds of metres outside the source-backed study area.
    if (manifest.renderBounds) {
      const area = manifest.renderBounds;
      bounds.min.x = Math.max(bounds.min.x, area.minX); bounds.max.x = Math.min(bounds.max.x, area.maxX);
      bounds.min.z = Math.max(bounds.min.z, -area.maxY); bounds.max.z = Math.min(bounds.max.z, -area.minY);
    }
    lighting = createSceneLighting(renderer, scene, { roots: [street, ...(actor ? [actor] : [])], signal,
      rigURL: manifest.lightingRig ? localAsset(manifest.lightingRig, manifestURL, appURL) : new URL('lighting/rig.json', appURL),
      expectedRigHash: manifest.lightingRigSha256, onStatus: onLightingStatus, onChange: requestDraw });
    await lighting.setMode(lightingMode); abort();
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
      lighting.invalidateShadows();
      requestDraw();
    };
    const visible = node => {
      for (let parent = node; parent; parent = parent.parent) if (!parent.visible) return false;
      return true;
    };
    const visibility = () => {
      const meshes = []; street.traverse(node => { if (node.isMesh) meshes.push(node); });
      return {
        totalMeshes: meshes.length, visibleMeshes: meshes.filter(visible).length,
        hiddenMeshNames: meshes.filter(node => !visible(node)).map(node => node.name),
        requestedGroups: current.hiddenGroups.map(name => {
          const matches = [], children = new Set();
          street.traverse(node => { if (node.name === name || node.userData.semanticGroup === name) matches.push(node); });
          for (const match of matches) match.traverse(node => { if (node.isMesh) children.add(node); });
          return { name, matchedNodes: matches.length, totalMeshes: children.size,
            hiddenMeshes: [...children].filter(node => !visible(node)).length };
        }),
      };
    };
    selectView(manifest.views[0]);
    await renderer.compileAsync(scene, camera); abort();
    observer = new ResizeObserver(requestDraw); observer.observe(host);
    document.addEventListener('visibilitychange', requestDraw);
    requestDraw();
    return {
      selectView, resize: requestDraw,
      setLightingMode: lighting.setMode, getLightingState: lighting.snapshot,
      setLabel(value) { renderer.domElement.setAttribute('aria-label', value); },
      snapshot() {
        return { disposed, viewId: current?.id, modelHash, renderedFrames: renderCount,
          camera: { position: camera.position.toArray(), target: [...current.camera.target],
            up: camera.up.toArray(), fov: camera.fov, aspect: camera.aspect, near: camera.near, far: camera.far,
            projectionMatrix: camera.projectionMatrix.toArray(), matrixWorld: camera.matrixWorld.toArray() },
          hiddenGroups: [...current.hiddenGroups], render: { ...renderer.info.render },
          lighting: lighting.snapshot(), visibility: visibility(), shadowBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
          fog: scene.fog ? { color: `#${scene.fog.color.getHexString()}`, near: scene.fog.near, far: scene.fog.far } : null,
          memory: { ...renderer.info.memory }, pixelRatio: renderer.getPixelRatio(),
          canvas: { width: renderer.domElement.width, height: renderer.domElement.height } };
      },
      dispose() { signal.removeEventListener('abort', dispose); dispose(); },
    };
  } catch (error) {
    dispose(); signal.removeEventListener('abort', dispose); throw error;
  }
}
