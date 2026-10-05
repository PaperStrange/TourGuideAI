import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WORLD, TARGETS, approachPoint } from '../simulation/world.js';
import { toScene } from './camera.js';

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

function daylightEnvironment(renderer) {
  const environment = new THREE.Scene();
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec3 direction; void main(){
      vec3 d=normalize(direction);
      vec3 horizon=vec3(0.77,0.83,0.87), zenith=vec3(0.43,0.60,0.75), ground=vec3(0.24,0.26,0.28);
      vec3 sky=mix(horizon,zenith,pow(max(d.y,0.0),0.65));
      float cloud=smoothstep(0.25,0.9,sin(d.x*7.0+d.z*2.0)*cos(d.z*5.0-d.x*3.0));
      sky=mix(sky,vec3(0.93,0.94,0.94),cloud*0.4*max(d.y,0.0));
      vec3 color=mix(ground,sky,smoothstep(-0.08,0.12,d.y));
      float sun=pow(max(dot(d,normalize(vec3(-0.26,0.93,0.27))),0.0),180.0);
      gl_FragColor=vec4(color+vec3(4.5,4.3,4.0)*sun,1.0);
    }`,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(80, 24, 12), material);
  environment.add(sphere);
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromScene(environment, 0.04, 0.1, 120);
  generator.dispose(); sphere.geometry.dispose(); material.dispose();
  return target;
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

export async function createWorldView(renderer, { signal, onProgress } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dbe3e9');
  scene.fog = new THREE.Fog('#dbe3e9', 105, 185);
  const environment = daylightEnvironment(renderer);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.52;
  scene.add(new THREE.HemisphereLight('#f3f7fa', '#9b9992', 1.35));
  const sun = new THREE.DirectionalLight('#fff5e8', 2.25);
  sun.position.set(4, 105, 36); sun.target.position.set(32, 0, 7);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 46, bottom: -44, near: 1, far: 175 });
  sun.shadow.bias = -0.0007; sun.shadow.normalBias = 0.07;
  scene.add(sun, sun.target);
  const loader = new GLTFLoader();
  const assetBase = new URL(import.meta.env.BASE_URL + 'models/', document.baseURI);
  const loaded = [];
  async function asset(name) {
    const response = await fetch(new URL(name, assetBase), { signal });
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
    environment.dispose(); disposeTree(scene);
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
    if (/^(North|South)(Ground|Upper|Roof|Shell|Canopy|CanopyPosts)$/.test(group ?? '')) {
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
  const markers = TARGETS.map(target => {
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

  return {
    scene, actor, floorHeight,
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
            mesh.visible = opacity > 0.01;
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
      return { meshes, triangles, walkableSurfaces: walkable.length, fadedGroups: [...fadedGroups],
        actorPosition: actor.position.toArray(), actorHeading: actor.rotation.y,
        streetBounds: [...bounds.min.toArray(), ...bounds.max.toArray()] };
    },
    dispose() { disposeTree(scene); environment.dispose(); scene.clear(); },
  };
}
