import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { daylightEnvironment } from './lighting-fallback.js';
import { lightingMode, validateLightingRig, localLightingURL } from './lighting-contract.js';

const digest = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
  .map(byte => byte.toString(16).padStart(2, '0')).join('');

export function createSceneLighting(renderer, scene, {
  roots, signal, rigURL = new URL(import.meta.env.BASE_URL + 'lighting/rig.json', document.baseURI),
  expectedRigHash, onStatus, onChange,
} = {}) {
  const appURL = new URL(import.meta.env.BASE_URL, document.baseURI);
  rigURL = localLightingURL(rigURL, document.baseURI, appURL);
  let rig, rigHash = null, phase = 'loading', mode = null, requestedMode = 'day';
  let sequence = 0, pending = null, disposed = false, staleRequests = 0, fallbackReason = null;
  let environmentInfo = { status: 'loading', file: null, sha256: null, expectedSha256: null };
  let fallback, activeLights = [], shadowUpdates = 0;
  const cache = new Map(), materials = [], originals = new Set();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const group = new THREE.Group(); group.name = 'AuthoredLightingRig'; scene.add(group);
  for (const root of roots) root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const copied = [mesh.material].flat().map(material => {
      if (!material.emissive) return material;
      const copy = material.clone(); originals.add(material);
      let owner = mesh;
      while (owner && !owner.userData.semanticGroup) owner = owner.parent;
      materials.push({ mesh, material: copy, semanticGroup: owner?.userData.semanticGroup ?? null,
        baseColor: copy.emissive.clone(), baseIntensity: copy.emissiveIntensity, baseMap: copy.emissiveMap });
      return copy;
    });
    mesh.material = Array.isArray(mesh.material) ? copied : copied[0];
  });
  for (const material of originals) material.dispose();

  const snapshot = () => ({
    requestedMode, mode, phase, disposed, fallbackReason,
    rig: { status: rig ? 'ready' : phase === 'loading' ? 'loading' : 'unavailable', sha256: rigHash, expectedSha256: expectedRigHash ?? null },
    environment: { ...environmentInfo, textureId: scene.environment?.uuid ?? null },
    environmentIntensity: scene.environmentIntensity, environmentRotationY: scene.environmentRotation.y,
    exposure: renderer.toneMappingExposure,
    lights: activeLights.map(light => ({ id: light.name, type: light.type, intensity: light.intensity,
      color: `#${light.color.getHexString()}`, position: light.position.toArray(), target: light.target?.position.toArray() ?? null,
      castShadow: Boolean(light.castShadow), mapSize: light.shadow?.mapSize.toArray() ?? null,
      shadowNeedsUpdate: light.shadow?.needsUpdate ?? false })),
    emissiveMeshes: materials.filter(({ material }) => material.emissiveIntensity > 0 && material.emissive.getHex() !== 0)
      .map(({ mesh, material, semanticGroup }) => ({ name: mesh.name, material: material.name, semanticGroup,
        color: `#${material.emissive.getHexString()}`, intensity: material.emissiveIntensity,
        usesBaseColorMap: Boolean(material.map && material.emissiveMap === material.map) })),
    cacheEntries: cache.size, pendingRequests: pending ? 1 : 0, staleRequests, shadowUpdates,
    memory: { ...renderer.info.memory },
  });
  const publish = () => { if (!disposed) onStatus?.(snapshot()); };
  const invalidateShadows = () => {
    if (disposed) return;
    for (const light of activeLights) if (light.castShadow) light.shadow.needsUpdate = true;
    renderer.shadowMap.needsUpdate = true; shadowUpdates++; onChange?.();
  };
  const clearLights = () => {
    for (const light of activeLights) { light.shadow?.map?.dispose(); light.shadow?.mapPass?.dispose(); light.dispose?.(); }
    group.clear(); activeLights = [];
  };
  function shadow(light, config) {
    light.castShadow = Boolean(config?.enabled);
    if (!light.castShadow) return;
    light.shadow.mapSize.setScalar(Math.min(config.mapSize, renderer.capabilities.maxTextureSize));
    light.shadow.bias = config.bias; light.shadow.normalBias = config.normalBias; light.shadow.radius = config.radius;
    light.shadow.autoUpdate = false;
    light.shadow.camera.near = config.near; light.shadow.camera.far = config.far;
    if (light.isDirectionalLight) {
      const bounds = new THREE.Box3();
      for (const root of roots) bounds.union(new THREE.Box3().setFromObject(root));
      if (rig.renderBounds) {
        bounds.min.x = Math.max(bounds.min.x, rig.renderBounds.minX); bounds.max.x = Math.min(bounds.max.x, rig.renderBounds.maxX);
        bounds.min.z = Math.max(bounds.min.z, -rig.renderBounds.maxY); bounds.max.z = Math.min(bounds.max.z, -rig.renderBounds.minY);
      }
      const camera = light.shadow.camera;
      camera.position.copy(light.position); camera.lookAt(light.target.position); camera.updateMatrixWorld(true);
      const local = bounds.applyMatrix4(camera.matrixWorldInverse);
      Object.assign(camera, { left: local.min.x, right: local.max.x, bottom: local.min.y, top: local.max.y });
    }
    light.shadow.camera.updateProjectionMatrix();
  }
  function apply(config, environment) {
    scene.background = new THREE.Color(config.backgroundColor);
    scene.fog = config.fog ? new THREE.Fog(config.fog.color, config.fog.near, config.fog.far) : null;
    scene.environment = environment.texture; scene.environmentIntensity = config.environment.intensity;
    scene.environmentRotation.set(0, config.environment.rotationY, 0);
    renderer.toneMappingExposure = config.exposure;
    clearLights();
    const hemisphere = new THREE.HemisphereLight(config.hemisphere.skyColor, config.hemisphere.groundColor, config.hemisphere.intensity);
    hemisphere.name = 'hemisphere'; group.add(hemisphere); activeLights.push(hemisphere);
    for (const configLight of [{ ...config.sun, id: 'sun', type: 'directional' }, ...config.fixtures]) {
      if (!configLight.enabled || configLight.intensity <= 0) continue;
      const light = configLight.type === 'directional'
        ? new THREE.DirectionalLight(configLight.color, configLight.intensity)
        : configLight.type === 'spot'
          ? new THREE.SpotLight(configLight.color, configLight.intensity, configLight.distance, configLight.angle, configLight.penumbra, configLight.decay)
          : new THREE.PointLight(configLight.color, configLight.intensity, configLight.distance, configLight.decay);
      light.name = configLight.id; light.position.fromArray(configLight.position); group.add(light);
      if (light.target) { light.target.position.fromArray(configLight.target); group.add(light.target); }
      shadow(light, configLight.shadow); activeLights.push(light);
    }
    for (const item of materials) {
      const { material, semanticGroup } = item, previousMap = material.emissiveMap;
      material.emissive.copy(item.baseColor); material.emissiveIntensity = item.baseIntensity; material.emissiveMap = item.baseMap;
      for (const rule of config.materials) {
        if (!rule.match.includes(material.name) || (rule.semanticGroups && !rule.semanticGroups.includes(semanticGroup))) continue;
        material.emissive.set(rule.emissiveColor); material.emissiveIntensity = rule.emissiveIntensity;
        material.emissiveMap = rule.emissiveFromBaseColor ? material.map : null;
      }
      if (previousMap !== material.emissiveMap) material.needsUpdate = true;
    }
    scene.updateMatrixWorld(true); invalidateShadows();
  }
  async function loadRig(abortSignal) {
    const response = await fetch(rigURL, { signal: abortSignal, cache: 'no-cache' });
    if (!response.ok) throw new Error('rig-unavailable');
    const bytes = await response.arrayBuffer(), hash = await digest(bytes);
    if (expectedRigHash && hash !== expectedRigHash) throw new Error('rig-version-mismatch');
    const parsed = validateLightingRig(JSON.parse(new TextDecoder().decode(bytes)));
    for (const config of Object.values(parsed.modes)) localLightingURL(config.environment.file, rigURL, appURL);
    return { parsed, hash };
  }
  async function loadEnvironment(config, abortSignal, token) {
    const url = localLightingURL(config.file, rigURL, appURL);
    const key = `${url.href}:${config.sha256}`;
    if (cache.has(key)) return cache.get(key);
    const response = await fetch(url, { signal: abortSignal, cache: 'no-cache' });
    if (!response.ok) throw new Error('environment-unavailable');
    const bytes = await response.arrayBuffer(), hash = await digest(bytes);
    if (hash !== config.sha256) throw new Error('environment-version-mismatch');
    if (abortSignal.aborted || disposed || token !== sequence) throw new DOMException('Cancelled', 'AbortError');
    const texture = new HDRLoader().createDataTexture(bytes);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    let target;
    try { target = pmrem.fromEquirectangular(texture); } finally { texture.dispose(); }
    if (abortSignal.aborted || disposed || token !== sequence) { target.dispose(); throw new DOMException('Cancelled', 'AbortError'); }
    const entry = { texture: target.texture, target, file: url.pathname, sha256: hash };
    cache.set(key, entry);
    return entry;
  }
  async function setMode(value) {
    if (disposed) return snapshot();
    const requested = lightingMode(value), token = ++sequence;
    pending?.abort(); const controller = new AbortController(); pending = controller;
    requestedMode = requested; phase = 'loading'; fallbackReason = null; publish();
    let config, environment, envError;
    try {
      if (!rig) {
        const loaded = await loadRig(controller.signal);
        if (disposed || token !== sequence || controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        rig = loaded.parsed; rigHash = loaded.hash;
      }
      config = rig.modes[requested];
      try { environment = await loadEnvironment(config.environment, controller.signal, token); }
      catch (error) {
        if (error.name === 'AbortError' || disposed || token !== sequence) throw error;
        envError = error.message;
        fallback ??= daylightEnvironment(renderer);
        environment = { texture: fallback.texture, file: null, sha256: null };
      }
      if (disposed || token !== sequence || controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      apply(config, environment); mode = requested; phase = envError ? 'fallback' : 'ready';
      fallbackReason = envError ?? null;
      environmentInfo = { status: envError ? 'fallback' : 'ready', file: environment.file, sha256: environment.sha256,
        expectedSha256: config.environment.sha256 };
      if (!envError && fallback) { fallback.dispose(); fallback = null; }
    } catch (error) {
      if (disposed || token !== sequence || controller.signal.aborted || error.name === 'AbortError') { staleRequests++; return snapshot(); }
      phase = 'fallback'; fallbackReason = 'rig-unavailable';
      if (!scene.environment) { fallback ??= daylightEnvironment(renderer); scene.environment = fallback.texture; }
      environmentInfo = { status: 'fallback', file: null, sha256: null, expectedSha256: null }; onChange?.();
    } finally { if (token === sequence) pending = null; }
    publish(); return snapshot();
  }
  const dispose = () => {
    if (disposed) return;
    disposed = true; sequence++; pending?.abort(); pending = null; clearLights(); scene.remove(group);
    scene.environment = null; fallback?.dispose(); fallback = null;
    for (const entry of cache.values()) entry.target.dispose(); cache.clear(); pmrem.dispose();
    signal?.removeEventListener('abort', dispose);
  };
  signal?.addEventListener('abort', dispose, { once: true });
  if (signal?.aborted) dispose();
  return { setMode, snapshot, invalidateShadows, dispose };
}
