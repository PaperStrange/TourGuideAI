import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WORLD, TARGETS, approachPoint } from '../simulation/world.js';
import { toScene } from './camera.js';
import { createSceneLighting } from './lighting.js';

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

export async function createWorldView(renderer, { encounters = true, signal, onProgress, lightingMode = 'day', onLightingStatus, onInvalidate } = {}) {
  const scene = new THREE.Scene();
  let lighting;
  const loader = new GLTFLoader();
  const assetBase = new URL(import.meta.env.BASE_URL + 'models/', document.baseURI);
  const loaded = [];
  async function asset(name) {
    const response = await fetch(new URL(name, assetBase), { signal, cache: 'no-cache' });
    if (!response.ok) throw new Error('Could not load scene asset ' + name + ' (' + response.status + ')');
    const gltf = await loader.parseAsync(await response.arrayBuffer(), assetBase.href);
    loaded.push(gltf.scene);
    if (signal?.aborted) { disposeTree(gltf.scene); throw new DOMException('Scene loading cancelled', 'AbortError'); }
    return gltf.scene;
  }
  let street, traveller;
  try {
    onProgress?.(0.15);
    const results = await Promise.allSettled([asset('shijo-block.glb'), asset('traveller.glb')]);
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
    [street, traveller] = results.map(result => result.value);
    onProgress?.(0.65);
  } catch (error) {
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
    const group = object.userData.semanticGroup;
    if (/^(?:(North|South)(Ground|Upper|Roof|Shell|Canopy|CanopyPosts)|ContextBuilding_\d+)$/.test(group ?? '')) {
      object.material = object.material.clone();
      object.material.forceSinglePass = true;
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
  const down = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 60);
  const pointerRay = new THREE.Raycaster();
  function floorHeight(x, north) {
    down.ray.origin.set(x, 40, -north);
    return down.intersectObjects(walkable, false)[0]?.point.y ?? 0.05;
  }
  const shadow = contactShadow(); scene.add(shadow);
  const markers = (encounters ? TARGETS : []).map(target => {
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
  let lastActor = '', lastCue = '', fadedGroups = [];
  lighting = createSceneLighting(renderer, scene, { roots: [street, traveller], signal, onStatus: onLightingStatus, onChange: onInvalidate });
  await lighting.setMode(lightingMode);

  return {
    scene, actor, floorHeight,
    setLightingMode: lighting.setMode, getLightingState: lighting.snapshot,
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
            mesh.material.opacity = opacity;
            const transparent = opacity < 0.999;
            if (mesh.material.transparent !== transparent) {
              mesh.material.transparent = transparent; mesh.material.needsUpdate = true;
            }
            mesh.material.depthWrite = !transparent;
          }
        }
      }
      return changed;
    },
    stats() {
      let meshes = 0, triangles = 0;
      for (const root of [street, traveller]) root.traverse(object => {
        if (object.isMesh) { meshes++; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3; }
      });
      const bounds = new THREE.Box3().setFromObject(street);
      return { meshes, triangles, walkableSurfaces: walkable.length, markerCount: markers.length, fadedGroups: [...fadedGroups],
        actorPosition: actor.position.toArray(), actorHeading: actor.rotation.y,
        streetBounds: [...bounds.min.toArray(), ...bounds.max.toArray()] };
    },
    dispose() { lighting.dispose(); disposeTree(scene); scene.clear(); },
  };
}
