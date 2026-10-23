import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSceneLighting } from './lighting.js';
import { createSurfaceInspection } from './inspection.js';
import { contactShadow, disposeTree } from './world-view.js';
import { verifiedBytes } from './pack-assets.js';
import { createSectionAssets } from './section-assets.js';
import { createSectionStream } from './section-stream.js';
import { validateSectionManifest, cellsAtPoint } from './section-residency.js';
import { toScene } from './camera.js';
import { waitForTask } from './cancellation.js';
import { PLAYER_RADIUS } from '../simulation/world.js';
import { createCameraObstruction } from './camera-obstruction.js';
import { estimateMaterialTextures } from './texture-memory.js';

export async function createRouteWorldView(renderer, { pack, signal, onProgress, lightingMode = 'day',
  onLightingStatus, onInvalidate, onStreamingChange, initialPosition = pack.world.spawn, camera, qualityTier } = {}) {
  const appURL = new URL(import.meta.env.BASE_URL, document.baseURI);
  const manifestURL = new URL(pack.assets.sections, appURL);
  const manifestBytes = await verifiedBytes(manifestURL, undefined, signal);
  const manifest = validateSectionManifest(JSON.parse(new TextDecoder().decode(manifestBytes.bytes)), pack);
  const scene = new THREE.Scene(), scenery = new THREE.Group(); scenery.name = 'StreamedNeighborhood'; scene.add(scenery);
  const assets = createSectionAssets(manifestURL, { signal });
  const roots = new Map(), occluders = new Map(), walkable = [];
  let ground, context, traveller, lighting, stream, inspection, disposed = false, currentCamera = camera;
  let lastActor = '', activeFixtures = [], fadedGroups = [], restoreTarget = null, restoreRequest = null;
  let lastPosition = { ...initialPosition };
  const shadow = contactShadow(); scene.add(shadow);
  const down = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  const pointerRay = new THREE.Raycaster(), occlusionRay = new THREE.Raycaster();
  const cameraObstruction = createCameraObstruction((mesh, hit) => {
    if (mesh.userData.occlusionGroup?.startsWith('Canopy_') || mesh.userData.semanticGroup?.includes('Canopy')) return true;
    const index = mesh.geometry.getAttribute('_source_index')?.getX(hit.face.a);
    const source = (mesh.userData.featureTable ?? manifest.featureTable)?.[index];
    return source?.kind === 'building' || source?.sourceId?.startsWith('kyoto-city:bldg_') === true;
  });
  let groundBounds;
  const groundAt = (x, north) => {
    down.ray.origin.set(x, groundBounds.max.y + 2, -north);
    down.far = groundBounds.max.y - groundBounds.min.y + 4;
    const hit = down.intersectObjects(walkable, false)[0];
    if (!hit) return null;
    const index = hit.object.geometry.getAttribute('_source_index')?.getX(hit.face.a);
    const source = (hit.object.userData.featureTable ?? manifest.featureTable)?.[index];
    return { height: hit.point.y, surfaceId: hit.object.userData.surfaceId ?? hit.object.name,
      sourceIndex: index ?? null, sourceId: source?.sourceId ?? null };
  };
  const floorHeight = (x, north) => {
    const hit = groundAt(x, north);
    if (!hit) throw new Error('Resident walking surface does not cover the route position');
    return hit.height;
  };
  function dispose() {
    if (disposed) return; disposed = true;
    restoreRequest?.abort();
    stream?.dispose(); cameraObstruction.dispose(); lighting?.dispose(); ground?.release(); context?.release();
    if (traveller) disposeTree(traveller);
    disposeTree(shadow); assets.dispose(); scene.clear();
  }
  try {
    onProgress?.(0.1);
    const groundBundle = await assets.download(manifest.ground, signal);
    try { ground = await assets.parse(groundBundle, signal); } catch (error) { groundBundle.release(); throw error; }
    scene.add(ground.root);
    ground.root.traverse(object => {
      if (!object.isMesh) return;
      object.receiveShadow = true;
      if (object.userData.walkable) walkable.push(object);
    });
    ground.root.updateMatrixWorld(true); groundBounds = new THREE.Box3().setFromObject(ground.root);
    if (!walkable.length) throw new Error('Neighborhood ground contains no reviewed walking surfaces');
    floorHeight(initialPosition.x, initialPosition.y);
    // 常驻地面在开始前覆盖全部路线；远处分区加载失败不会改变脚下的几何。
    for (const edge of pack.navigation.edges) {
      if (edge.accessible === false || edge.reviewed === false) continue;
      const radius = edge.width / 2 - (pack.navigation.playerRadius ?? PLAYER_RADIUS);
      for (let index = 1; index < edge.points.length; index++) {
        const a = edge.points[index - 1], b = edge.points[index];
        const length = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.ceil(length);
        for (let step = 0; step <= steps; step++) for (const side of [-1, 0, 1]) {
          const t = step / steps, x = a.x + (b.x - a.x) * t - (b.y - a.y) / length * radius * side;
          const y = a.y + (b.y - a.y) * t + (b.x - a.x) / length * radius * side;
          const actual = floorHeight(x, y), expected = a.height + (b.height - a.height) * t;
          if (Math.abs(actual - expected) > .03) throw new Error('Route ground and navigation height disagree');
        }
      }
    }
    if (manifest.context) {
      const bundle = await assets.download(manifest.context, signal);
      try { context = await assets.parse(bundle, signal); } catch (error) { bundle.release(); throw error; }
      context.root.traverse(mesh => {
        if (!mesh.isMesh) return;
        mesh.receiveShadow = mesh.userData.retainedStreetDetail === true;
        mesh.castShadow = mesh.receiveShadow && mesh.userData.retainedStreetCastShadow === true;
      });
      scene.add(context.root);
      context.root.updateMatrixWorld(true); cameraObstruction.addRoot(context.root);
    }
    const actorURL = new URL(pack.assets.traveller, appURL);
    const actorBytes = await verifiedBytes(actorURL, undefined, signal);
    traveller = (await new GLTFLoader().parseAsync(actorBytes.bytes, new URL('.', actorURL).href)).scene;
    signal?.throwIfAborted();
    traveller.traverse(mesh => { if (mesh.isMesh) { mesh.castShadow = false; mesh.receiveShadow = true; } });
    scene.add(traveller);
    const permanentRoots = [ground.root, traveller, ...(context ? [context.root] : [])];
    inspection = createSurfaceInspection(permanentRoots, pack.inspection.features, pack.inspection.maxDistance);
    lighting = createSceneLighting(renderer, scene, { roots: [...permanentRoots], signal,
      rigURL: new URL(manifest.lighting.file, manifestURL), expectedRigHash: manifest.lighting.sha256,
      onStatus: onLightingStatus, onChange: onInvalidate });
    lighting.updateRegion({ ...initialPosition, height: floorHeight(initialPosition.x, initialPosition.y), fixtures: [] });
    await lighting.setMode(lightingMode); signal?.throwIfAborted();
    stream = createSectionStream(manifest, assets, { signal, tier: qualityTier ?? (matchMedia('(max-width: 720px)').matches ? 'compact' : 'desktop'),
      onChange() { onInvalidate?.(); if (stream && !disposed) onStreamingChange?.(stream.snapshot()); },
      async attach(root, cell, level, ownerSignal) {
        const groups = new Map();
        root.userData.cellId = cell.id;
        root.traverse(mesh => {
          if (!mesh.isMesh) return;
          mesh.receiveShadow = true; mesh.castShadow = true;
          mesh.userData.cellId = cell.id;
          mesh.userData.featureTable ??= cell.featureTable ?? manifest.featureTable;
          const group = mesh.userData.occlusionGroup;
          if (!group) return;
          const materials = [mesh.material].flat().map(material => { const copy = material.clone(); copy.forceSinglePass = true; return copy; });
          mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
          if (!groups.has(group)) groups.set(group, { name: cell.id + ':' + group, meshes: [], opacity: 1 });
          groups.get(group).meshes.push(mesh);
        });
        root.updateMatrixWorld(true);
        for (const group of groups.values()) {
          group.box = new THREE.Box3();
          for (const mesh of group.meshes) group.box.union(new THREE.Box3().setFromObject(mesh));
        }
        roots.set(root, { cell, level }); occluders.set(root, [...groups.values()]); lighting.addRoot(root);
        await waitForTask(renderer.compileAsync(root, currentCamera, scene), ownerSignal); ownerSignal.throwIfAborted();
        scenery.add(root); inspection.addRoot(root); scene.updateMatrixWorld(true); cameraObstruction.addRoot(root); onInvalidate?.();
      },
      detach(root) {
        cameraObstruction.removeRoot(root); inspection.removeRoot(root); lighting.removeRoot(root); roots.delete(root); occluders.delete(root); root.removeFromParent(); onInvalidate?.();
      },
    });
    await stream.ensure(initialPosition); signal?.throwIfAborted(); onProgress?.(0.75);
  } catch (error) { dispose(); throw error; }
  const actor = traveller.getObjectByName('Traveller') ?? traveller;
  const limbs = Object.fromEntries(['LeftLeg', 'RightLeg', 'LeftArm', 'RightArm'].map(name => [name, actor.getObjectByName(name)]));
  return {
    scene, actor, floorHeight, groundAt, resolveCamera: cameraObstruction.resolve, admit: (from, next) => stream.admit(from, next),
    async ensurePosition(point, requestSignal) {
      restoreRequest?.abort(); const request = new AbortController(); restoreRequest = request;
      restoreTarget = point;
      const retained = cellsAtPoint(manifest.cells, lastPosition).map(cell => cell.id);
      const combined = requestSignal ? AbortSignal.any([request.signal, requestSignal]) : request.signal;
      try { await stream.ensure(point, retained, combined); }
      finally { if (restoreTarget === point) restoreTarget = null; }
    },
    getStreamState: stream.snapshot, retryStreaming: stream.retry, setSuspended: stream.setSuspended,
    setLightingMode: lighting.setMode, getLightingState: lighting.snapshot,
    getInspectionState: inspection.snapshot, setInspecting: inspection.setEnabled,
    setInspectionPoint: inspection.point, clearInspection: inspection.clear, selectInspection: inspection.select,
    updateInspection(viewCamera, player, width, height) {
      if (!inspection.isEnabled()) return false;
      scene.updateMatrixWorld(true); return inspection.update(viewCamera, player, width, height);
    },
    pickGround(viewCamera, x, y, width, height) {
      pointerRay.setFromCamera(new THREE.Vector2(x / width * 2 - 1, 1 - y / height * 2), viewCamera);
      const hit = pointerRay.intersectObjects(walkable, false)[0];
      return hit ? { x: hit.point.x, y: -hit.point.z } : null;
    },
    update(state, viewCamera, { dt = 16, reducedMotion = false } = {}) {
      currentCamera = viewCamera;
      lastPosition = { x: state.x, y: state.y };
      const selected = inspection.snapshot().selected;
      const pinned = selected?.cellId ? [selected.cellId] : selected
        ? manifest.cells.filter(cell => cell.featureIds?.includes(selected.id)).map(cell => cell.id) : [];
      if (restoreTarget) {
        for (const cell of manifest.cells) if (state.x >= cell.bounds.minX && state.x <= cell.bounds.maxX &&
          state.y >= cell.bounds.minY && state.y <= cell.bounds.maxY) pinned.push(cell.id);
      }
      stream.update(restoreTarget ?? state, pinned);
      const fixtures = [...roots.values()].flatMap(({ cell }) => cell.fixtures ?? []);
      const unique = [...new Map(fixtures.map(fixture => [fixture.id, fixture])).values()];
      unique.sort((a, b) => Math.hypot(a.position[0] - state.x, -a.position[2] - state.y) -
        Math.hypot(b.position[0] - state.x, -b.position[2] - state.y));
      let shadows = 0;
      activeFixtures = unique.slice(0, 4).map(fixture => ({ ...fixture,
        shadow: fixture.shadow?.enabled && ++shadows > 3 ? { ...fixture.shadow, enabled: false } : fixture.shadow }));
      const height = floorHeight(state.x, state.y);
      lighting.updateRegion({ x: state.x, y: state.y, height, fixtures: activeFixtures });
      let changed = false;
      const signature = [state.x, state.y, state.heading, state.moving, state.moving ? state.tick : 0].join(':');
      if (signature !== lastActor) {
        actor.position.copy(toScene(state.x, state.y, height)); actor.rotation.y = -state.heading;
        const gait = state.moving && !reducedMotion ? Math.sin(state.tick * 0.24) : 0;
        for (const [name, direction, scale] of [['LeftLeg', 1, .34], ['RightLeg', -1, .34], ['LeftArm', -1, .22], ['RightArm', 1, .22]]) {
          if (limbs[name]) limbs[name].rotation.x = gait * direction * scale;
        }
        shadow.position.copy(toScene(state.x, state.y, height + .016)); shadow.rotation.z = state.heading;
        lastActor = signature; changed = true;
      }
      const aim = toScene(state.x, state.y, height + .9), distance = viewCamera.position.distanceTo(aim);
      occlusionRay.set(viewCamera.position, aim.sub(viewCamera.position).normalize()); occlusionRay.far = Math.max(0, distance - .4);
      fadedGroups = [];
      for (const groups of occluders.values()) for (const group of groups) {
        const blocked = group.box.containsPoint(viewCamera.position) || occlusionRay.ray.intersectsBox(group.box) &&
          occlusionRay.intersectObjects(group.meshes, false).length > 0;
        const target = blocked ? 0 : 1;
        const next = reducedMotion ? target : group.opacity + (target - group.opacity) * Math.min(1, dt / 90);
        const opacity = Math.abs(next - target) < .005 ? target : next;
        if (blocked) fadedGroups.push(group.name);
        if (opacity === group.opacity) continue;
        group.opacity = opacity; changed = true;
        for (const mesh of group.meshes) {
          if (mesh.visible !== (opacity > .01)) lighting.invalidateShadows();
          mesh.visible = opacity > .01;
          for (const material of [mesh.material].flat()) {
            material.opacity = opacity; const transparent = opacity < .999;
            if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
            material.depthWrite = !transparent;
          }
        }
      }
      return changed;
    },
    stats() {
      let meshes = 0, triangles = 0;
      scenery.traverse(mesh => { if (mesh.isMesh) { meshes++; triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3; } });
      let residentMeshes = 0, residentTriangles = 0;
      for (const root of [ground.root, traveller, context?.root].filter(Boolean)) root.traverse(mesh => {
        if (mesh.isMesh) { residentMeshes++; residentTriangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3; }
      });
      const shared = assets.snapshot(), actorAndContact = estimateMaterialTextures([traveller, shadow]);
      const lightingMemory = lighting.snapshot().textureMemory;
      const textureMemory = { estimatedBytes: shared.estimatedTextureBytes + actorAndContact.estimatedBytes + lightingMemory.estimatedBytes,
        sharedSceneBytes: shared.estimatedTextureBytes, actorAndContact, lightingBytes: lightingMemory.estimatedBytes,
        complete: actorAndContact.complete && lightingMemory.complete,
        sharedSceneAssumption: 'Unique shared image textures estimated as RGBA8 with a full mip chain (4/3 multiplier)',
        exclusions: lightingMemory.exclusions };
      return { packId: pack.id, revision: pack.revision, manifestSha256: manifestBytes.sha256, disposed, textureMemory,
        cameraCollision: cameraObstruction.snapshot(),
        streetMeshes: meshes, streetTriangles: triangles, meshes: meshes + residentMeshes, triangles: triangles + residentTriangles,
        residentMeshes, residentTriangles, markerCount: 0,
        walkableSurfaces: walkable.length, actorPosition: actor.position.toArray(), actorHeading: actor.rotation.y,
        fadedGroups: [...fadedGroups], streaming: stream.snapshot(), architecturalMaterials: { policy: 'shared-pbr' } };
    },
    dispose,
  };
}
