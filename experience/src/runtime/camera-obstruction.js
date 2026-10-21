import * as THREE from 'three';

export function createCameraObstruction(isBlockingHit, { clearance = .35 } = {}) {
  const roots = new Map(), originals = new WeakMap();
  const ray = new THREE.Raycaster();
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  let revision = 0, previousSignature = '', previousResult = null;
  function addRoot(root) {
    const meshes = [];
    root.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.geometry.computeBoundingBox();
      const proxy = new THREE.Mesh(mesh.geometry, material);
      proxy.matrixAutoUpdate = false;
      originals.set(proxy, mesh); meshes.push(proxy);
    });
    roots.set(root, meshes); revision++;
  }
  function cast(origin, end, meshes) {
    const direction = end.clone().sub(origin), distance = direction.length();
    if (distance < .0001) return null;
    ray.set(origin, direction.divideScalar(distance)); ray.far = distance + clearance;
    return ray.intersectObjects(meshes, false).find(hit => isBlockingHit(originals.get(hit.object), hit)) ?? null;
  }
  return {
    addRoot, removeRoot(root) { if (roots.delete(root)) revision++; },
    resolve(camera, desiredTarget, player) {
      const signature = [revision, player.x, player.y, player.height ?? 0, ...desiredTarget, ...camera.matrixWorld.elements].join(':');
      if (signature === previousSignature) return previousResult;
      const meshes = [...roots.values()].flat();
      for (const mesh of meshes) mesh.matrixWorld.copy(originals.get(mesh).matrixWorld);
      const anchor = new THREE.Vector3(player.x, (player.height ?? 0) + 1.6, -player.y);
      const target = desiredTarget.clone(), aimHit = cast(anchor, target, meshes);
      if (aimHit) {
        const direction = target.clone().sub(anchor).normalize();
        target.copy(anchor).addScaledVector(direction, Math.max(0, aimHit.distance - clearance));
      }
      // 用户的环视距离保持在控制器中，实际相机在可见通道内缩短距离。
      const direction = camera.position.clone().sub(desiredTarget), desiredDistance = direction.length();
      direction.normalize();
      const desiredPosition = target.clone().addScaledVector(direction, desiredDistance);
      let allowed = desiredDistance, blocker = null;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      for (const [x, y] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const offset = right.clone().multiplyScalar(x * clearance).addScaledVector(up, y * clearance);
        const hit = cast(target.clone().add(offset), desiredPosition.clone().add(offset), meshes);
        if (hit && hit.distance - clearance < allowed) { allowed = Math.max(.2, hit.distance - clearance); blocker = hit; }
      }
      const position = target.clone().addScaledVector(direction, allowed);
      previousSignature = signature;
      previousResult = { position, target, active: Boolean(aimHit || blocker), desiredDistance, actualDistance: allowed,
        targetAdjusted: Boolean(aimHit) };
      return previousResult;
    },
    dispose() { roots.clear(); material.dispose(); },
  };
}
