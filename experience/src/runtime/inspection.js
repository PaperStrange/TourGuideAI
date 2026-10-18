import * as THREE from 'three';
import { featureForSurface, INSPECTION_FEATURES } from './inspection-features.js';

const clamp = value => Math.min(1, Math.max(0, value));
const round = value => Math.round(value * 1000) / 1000;

export function visibleSurface(mesh) {
  for (let node = mesh; node; node = node.parent) if (!node.visible) return false;
  return [mesh.material].flat().some(material => material?.visible !== false && material?.opacity > 0.05);
}

// 只检查最近的真实表面；其他建筑、地面或遮挡物会阻止穿透选择。
export function inspectIntersection(hit, camera, player, width, height, features = INSPECTION_FEATURES) {
  if (!hit?.face || !visibleSurface(hit.object)) return null;
  const material = Array.isArray(hit.object.material) ? hit.object.material[hit.face.materialIndex] : hit.object.material;
  if (!material || material.opacity < 0.98) return null;
  const feature = featureForSurface(hit.object, hit.face.materialIndex, features);
  if (!feature) return null;
  const normal = hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();
  const viewDirection = camera.position.clone().sub(hit.point).normalize();
  const facing = normal.dot(viewDirection);
  if (facing <= 0.12) return null;
  const distance = Math.hypot(hit.point.x - player.x, -hit.point.z - player.y);
  if (distance > 65) return null;
  const projected = hit.point.clone().project(camera);
  if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) return null;
  return {
    id: feature.id,
    point: { x: round(hit.point.x), y: round(-hit.point.z), height: round(hit.point.y) },
    screen: { x: round((projected.x + 1) * width / 2), y: round((1 - projected.y) * height / 2) },
    distance: round(distance), cameraDistance: round(hit.distance),
    readability: round(clamp(facing) * clamp(1 - hit.distance / 100)),
  };
}

export function createSurfaceInspection(roots, features = INSPECTION_FEATURES) {
  const meshes = [];
  for (const root of roots) root.traverse(object => {
    if (object.isMesh) { object.geometry.computeBoundingBox(); meshes.push(object); }
  });
  const raycaster = new THREE.Raycaster();
  let enabled = false, focus = null, selected = null, pointer = null, signature = null;
  const snapshot = () => structuredClone({ enabled, focus, selected });
  return {
    snapshot,
    isEnabled: () => enabled,
    setEnabled(value) {
      enabled = Boolean(value); signature = null;
      if (!enabled) { focus = null; selected = null; pointer = null; }
    },
    point(x, y) { pointer = Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null; signature = null; },
    clear() { selected = null; },
    update(camera, player, width, height) {
      if (!enabled) return false;
      camera.updateMatrixWorld();
      const visible = meshes.filter(visibleSurface);
      const next = [width, height, player.x, player.y, pointer?.x, pointer?.y,
        ...camera.matrixWorld.elements, ...camera.projectionMatrix.elements,
        ...visible.map(mesh => mesh.id + ':' + [mesh.material].flat().map(material => material.opacity).join(','))].join(':');
      if (signature === next) return false;
      signature = next;
      const x = pointer?.x ?? width / 2, y = pointer?.y ?? height / 2;
      raycaster.setFromCamera(new THREE.Vector2(x / width * 2 - 1, 1 - y / height * 2), camera);
      const hit = raycaster.intersectObjects(visible, false)[0];
      const previous = JSON.stringify(focus);
      focus = inspectIntersection(hit, camera, player, width, height, features);
      return previous !== JSON.stringify(focus);
    },
    select() { selected = focus ? structuredClone(focus) : null; return snapshot(); },
  };
}
