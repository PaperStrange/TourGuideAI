import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { approachPoint, PLAYER_RADIUS } from '../simulation/world.js';
import { getPack, DEFAULT_PACK_ID } from '../packs/registry.js';
import { toScene } from './camera.js';
import { createSceneLighting } from './lighting.js';
import { KYOTO_ARCHITECTURAL_PROFILE } from './architectural-profile.js';
import { prepareArchitecturalMaterials, loadArchitecturalFinishTextures,
  disposeArchitecturalFinishTextures } from './architectural-materials.js';
import { createSurfaceInspection } from './inspection.js';
import { loadPackManifest, verifiedBytes } from './pack-assets.js';

function disposeTree(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean)) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const item of [...textures, ...materials, ...geometries]) item.dispose();
}


function contactShadow() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 3, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(20,28,35,.46)');
  gradient.addColorStop(0.45, 'rgba(20,28,35,.24)');
  gradient.addColorStop(1, 'rgba(20,28,35,0)');
  context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.9), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
  }));
  mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = 2;
  return mesh;
}

export async function createWorldView(renderer, { pack = getPack(DEFAULT_PACK_ID), encounters = true, solo = false, signal, onProgress, lightingMode = 'day', onLightingStatus, onInvalidate } = {}) {
  const scene = new THREE.Scene();
  let lighting;
  const loader = new GLTFLoader();
  const appURL = new URL(import.meta.env.BASE_URL, document.baseURI);
  const assetHashes = {};
  const loaded = [];
  async function asset(name, expected) {
    const url = new URL(name, appURL), result = await verifiedBytes(url, expected, signal);
    assetHashes[name] = result.sha256;
    const gltf = await loader.parseAsync(result.bytes, new URL('.', url).href);
    loaded.push(gltf.scene);
    signal?.throwIfAborted();
    return gltf.scene;
  }
  let street, traveller, finishAssets, architecturalMaterials, manifest;
  try {
    onProgress?.(0.15);
    manifest = await loadPackManifest(pack, appURL, signal);
    const results = await Promise.allSettled([asset(pack.assets.scene, manifest?.model), asset(pack.assets.traveller),
      pack.assets.finishes ? loadArchitecturalFinishTextures(new URL(pack.assets.finishes, appURL), { signal }) : Promise.resolve(null)]);
    if (results[2].status === 'fulfilled') finishAssets = results[2].value;
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
    [street, traveller] = results.map(result => result.value);
    architecturalMaterials = pack.assets.materialPolicy === 'kyoto-architectural'
      ? prepareArchitecturalMaterials(street, renderer.capabilities.getMaxAnisotropy(), finishAssets)
      : { policy: 'embedded-pbr', appliedFinishes: 0 };
    finishAssets = null;
    onProgress?.(0.65);
  } catch (error) {
    disposeArchitecturalFinishTextures(finishAssets);
    for (const model of loaded) disposeTree(model);
    lighting?.dispose(); disposeTree(scene);
    throw error;
  }
  scene.add(street, traveller);
  const actor = traveller.getObjectByName('Traveller') ?? traveller;
  const limbs = Object.fromEntries(['LeftLeg', 'RightLeg', 'LeftArm', 'RightArm'].map(name => [name, actor.getObjectByName(name)]));
  const walkable = [], occluders = [];
  const groups = new Map();
  street.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = !object.userData.walkable;
    object.receiveShadow = true;
    if (object.userData.walkable) walkable.push(object);
    const group = object.userData.occlusionGroup ?? object.userData.semanticGroup;
    if (object.userData.occlusionGroup || (pack.id === DEFAULT_PACK_ID &&
        /^(?:(North|South)(Ground|Upper|Roof|Shell|Canopy|CanopyPosts)|ContextBuilding_\d+)$/.test(group ?? ''))) {
      const materials = [object.material].flat().map(material => { const copy = material.clone(); copy.forceSinglePass = true; return copy; });
      object.material = Array.isArray(object.material) ? materials : materials[0];
      if (!groups.has(group)) groups.set(group, { meshes: [], opacity: 1 });
      groups.get(group).meshes.push(object);
    }
  });
  street.updateMatrixWorld(true);
  for (const [name, group] of groups) {
    group.name = name; group.box = new THREE.Box3();
    for (const mesh of group.meshes) group.box.union(new THREE.Box3().setFromObject(mesh));
    occluders.push(group);
  }
  traveller.traverse(object => { if (object.isMesh) { object.castShadow = false; object.receiveShadow = true; } });
  const sceneBounds = new THREE.Box3().setFromObject(street);
  const down = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0,
    sceneBounds.max.y - sceneBounds.min.y + 2);
  const pointerRay = new THREE.Raycaster();
  function groundAt(x, north) {
    down.ray.origin.set(x, sceneBounds.max.y + 1, -north);
    const hit = down.intersectObjects(walkable, false)[0];
    return hit ? { height: hit.point.y, surfaceId: hit.object.userData.surfaceId ?? hit.object.userData.semanticGroup ?? hit.object.name } : null;
  }
  function floorHeight(x, north) {
    const hit = groundAt(x, north);
    if (hit) return hit.height;
    if (pack.id === DEFAULT_PACK_ID) return 0.05;
    throw new Error('Detailed pack is missing a walkable surface at the navigation position');
  }
  // 发布 ready 前验证实际模型覆盖角色可达范围，包括转角和有限端点的圆弧。
  if (pack.navigation.kind === 'corridor') {
    try {
      const points = pack.navigation.centerline, radius = pack.navigation.width / 2 - PLAYER_RADIUS;
      for (const point of points) for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        floorHeight(point.x + Math.cos(angle) * radius, point.y + Math.sin(angle) * radius);
      }
      for (let index = 1; index < points.length; index++) {
        const a = points[index - 1], b = points[index], length = Math.hypot(b.x - a.x, b.y - a.y);
        const nx = -(b.y - a.y) / length, ny = (b.x - a.x) / length, steps = Math.ceil(length * 2);
        for (let step = 0; step <= steps; step++) for (const side of [-1, 0, 1]) {
          floorHeight(a.x + (b.x - a.x) * step / steps + nx * radius * side,
            a.y + (b.y - a.y) * step / steps + ny * radius * side);
        }
      }
    } catch (error) { disposeTree(scene); scene.clear(); throw error; }
  }
  const shadow = contactShadow(); scene.add(shadow);
  const markers = (encounters ? pack.targets : []).map(target => {
    const point = approachPoint(target);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.56, 40),
      new THREE.MeshBasicMaterial({ color: '#b38642', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(toScene(point.x, point.y, floorHeight(point.x, point.y) + 0.025));
    ring.renderOrder = 3; scene.add(ring);
    return { target, ring };
  });
  const sightRay = new THREE.Ray(), intersection = new THREE.Vector3();
  const occlusionRay = new THREE.Raycaster();
  const inspection = solo ? createSurfaceInspection([street, traveller], pack.inspection.features, pack.inspection.maxDistance) : null;
  let lastActor = '', lastCue = '', fadedGroups = [];
  lighting = createSceneLighting(renderer, scene, { roots: [street, traveller], signal,
    rigURL: new URL(pack.lighting.rig, appURL), expectedRigHash: manifest?.lighting.sha256,
    profile: pack.lighting.profile === 'kyoto-architectural' ? KYOTO_ARCHITECTURAL_PROFILE : undefined,
    onStatus: onLightingStatus, onChange: onInvalidate });
  try { await lighting.setMode(lightingMode); signal?.throwIfAborted(); }
  catch (error) { lighting.dispose(); disposeTree(scene); scene.clear(); throw error; }
  let disposed = false;

  return {
    scene, actor, floorHeight, groundAt,
    setLightingMode: lighting.setMode, getLightingState: lighting.snapshot,
    getInspectionState: () => inspection?.snapshot() ?? { enabled: false, focus: null, selected: null },
    setInspecting(value) { inspection?.setEnabled(value); },
    setInspectionPoint(x, y) { inspection?.point(x, y); },
    clearInspection() { inspection?.clear(); },
    selectInspection: () => inspection?.select() ?? null,
    updateInspection(camera, player, width, height) {
      if (!inspection?.isEnabled()) return false;
      scene.updateMatrixWorld(true);
      return inspection.update(camera, player, width, height);
    },
    pickGround(camera, x, y, width, height) {
      pointerRay.setFromCamera(new THREE.Vector2(x / width * 2 - 1, 1 - y / height * 2), camera);
      const hit = pointerRay.intersectObjects(walkable, false)[0];
      return hit ? { x: hit.point.x, y: -hit.point.z } : null;
    },
    update(state, camera, { dt = 16, reducedMotion = false } = {}) {
      let changed = false;
      const height = floorHeight(state.x, state.y);
      const signature = [state.x, state.y, state.heading, state.moving, state.moving ? state.tick : 0].join(':');
      if (signature !== lastActor) {
        actor.position.copy(toScene(state.x, state.y, height));
        actor.rotation.y = -state.heading;
        const gait = state.moving && !reducedMotion ? Math.sin(state.tick * 0.24) : 0;
        if (limbs.LeftLeg) limbs.LeftLeg.rotation.x = gait * 0.34;
        if (limbs.RightLeg) limbs.RightLeg.rotation.x = -gait * 0.34;
        if (limbs.LeftArm) limbs.LeftArm.rotation.x = -gait * 0.22;
        if (limbs.RightArm) limbs.RightArm.rotation.x = gait * 0.22;
        shadow.position.copy(toScene(state.x, state.y, height + 0.016));
        shadow.rotation.z = state.heading;
        lastActor = signature; changed = true;
      }
      const cue = [state.nearbyTargetId, state.selectedTargetId, state.visitedIds.join(',')].join(':');
      if (cue !== lastCue) {
        for (const { target, ring } of markers) {
          const nearby = state.nearbyTargetId === target.id;
          const selected = state.selectedTargetId === target.id;
          ring.material.color.set(state.visitedIds.includes(target.id) ? '#34775e' : target.modelled ? '#b48232' : '#8c969a');
          ring.material.opacity = nearby ? 0.95 : selected ? 0.75 : 0.32;
          ring.scale.setScalar(nearby ? 1.2 : selected ? 1.05 : 0.9);
        }
        lastCue = cue; changed = true;
      }
      const aim = toScene(state.x, state.y, height + 0.9);
      const distance = camera.position.distanceTo(aim);
      sightRay.set(camera.position, aim.sub(camera.position).normalize());
      occlusionRay.ray.copy(sightRay); occlusionRay.far = Math.max(0, distance - 0.4);
      fadedGroups = [];
      for (const group of occluders) {
        const hit = sightRay.intersectBox(group.box, intersection);
        // Bounds handle cameras inside a volume. Outside, real mesh hits avoid
        // erasing a whole frontage merely because the ray passes between posts.
        const blocked = group.box.containsPoint(camera.position) ||
          (hit && camera.position.distanceTo(hit) < distance - 0.4 && occlusionRay.intersectObjects(group.meshes, false).length > 0);
        const target = blocked ? 0 : 1;
        const next = reducedMotion ? target : group.opacity + (target - group.opacity) * Math.min(1, dt / 90);
        const opacity = Math.abs(next - target) < 0.005 ? target : next;
        if (blocked) fadedGroups.push(group.name);
        if (opacity !== group.opacity) {
          group.opacity = opacity; changed = true;
          for (const mesh of group.meshes) {
            const visible = opacity > 0.01;
            if (mesh.visible !== visible) lighting.invalidateShadows();
            mesh.visible = visible;
            const transparent = opacity < 0.999;
            for (const material of [mesh.material].flat()) {
              material.opacity = opacity;
              if (material.transparent !== transparent) {
                material.transparent = transparent; material.needsUpdate = true;
              }
              material.depthWrite = !transparent;
            }
          }
        }
      }
      return changed;
    },
    stats() {
      let meshes = 0, triangles = 0, streetMeshes = 0, streetTriangles = 0;
      for (const root of [street, traveller]) root.traverse(object => {
        if (object.isMesh) {
          const count = (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
          meshes++; triangles += count;
          if (root === street) { streetMeshes++; streetTriangles += count; }
        }
      });
      const bounds = new THREE.Box3().setFromObject(street);
      return { packId: pack.id, revision: pack.revision, modelSha256: assetHashes[pack.assets.scene], assetHashes: { ...assetHashes }, disposed,
        meshes, triangles, streetMeshes, streetTriangles, architecturalMaterials, walkableSurfaces: walkable.length, markerCount: markers.length, fadedGroups: [...fadedGroups],
        actorPosition: actor.position.toArray(), actorHeading: actor.rotation.y,
        streetBounds: [...bounds.min.toArray(), ...bounds.max.toArray()] };
    },
    dispose() { if (disposed) return; disposed = true; lighting.dispose(); disposeTree(scene); scene.clear(); },
  };
}
