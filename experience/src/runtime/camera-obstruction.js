import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

export function createCameraObstruction(isBlockingHit, { clearance = .35 } = {}) {
  const roots = new Map(), originals = new WeakMap();
  const trees = new Map();
  const ray = new THREE.Raycaster();
  // 材质批次可能同时包含遮挡与非遮挡来源，必须保留所有交点再按来源判断。
  ray.firstHitOnly = false;
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const projectionCamera = new THREE.PerspectiveCamera();
  let revision = 0, previousSignature = '', previousResult = null, buildMilliseconds = 0;
  let previousPlayer = null, previousDirection = null;
  let renderedResult = null, collisionMeshes = [];
  function addRoot(root) {
    if (roots.has(root)) return;
    const meshes = [];
    root.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.geometry.computeBoundingBox();
      let entry = trees.get(mesh.geometry);
      if (!entry) {
        const started = performance.now();
        const tree = new MeshBVH(mesh.geometry, { indirect: true });
        const buffers = MeshBVH.serialize(tree, { cloneBuffers: false });
        entry = { tree, references: 0, bytes: buffers.roots.reduce((sum, buffer) => sum + buffer.byteLength, 0)
          + (buffers.indirectBuffer?.byteLength ?? 0) };
        trees.set(mesh.geometry, entry); buildMilliseconds += performance.now() - started;
      }
      entry.references++;
      const proxy = new THREE.Mesh(mesh.geometry, material);
      proxy.matrixAutoUpdate = false;
      proxy.raycast = (raycaster, intersections) => entry.tree.raycastObject3D(proxy, raycaster, intersections);
      originals.set(proxy, mesh); meshes.push(proxy);
    });
    roots.set(root, meshes); revision++;
  }
  function removeRoot(root) {
    const meshes = roots.get(root);
    if (!meshes) return;
    for (const mesh of meshes) {
      const entry = trees.get(mesh.geometry);
      if (--entry.references === 0) trees.delete(mesh.geometry);
    }
    roots.delete(root); collisionMeshes = []; previousSignature = ''; revision++;
  }
  function cast(origin, end, meshes) {
    const direction = end.clone().sub(origin), distance = direction.length();
    if (distance < .0001) return null;
    ray.set(origin, direction.divideScalar(distance)); ray.far = distance + clearance;
    return ray.intersectObjects(meshes, false).find(hit => isBlockingHit(originals.get(hit.object), hit)) ?? null;
  }
  function constrain(target, direction, distance, meshes) {
    const desiredPosition = target.clone().addScaledVector(direction, distance);
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right).normalize();
    let allowed = distance, blocked = false;
    for (const [x, y] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const offset = right.clone().multiplyScalar(x * clearance).addScaledVector(up, y * clearance);
      const hit = cast(target.clone().add(offset), desiredPosition.clone().add(offset), meshes);
      if (hit && hit.distance - clearance < allowed) { allowed = Math.max(0, hit.distance - clearance); blocked = true; }
    }
    return { position: target.clone().addScaledVector(direction, allowed), target,
      actualDistance: allowed, blocked };
  }
  function framing(candidate, camera, player) {
    projectionCamera.copy(camera); projectionCamera.position.copy(candidate.position);
    projectionCamera.lookAt(candidate.target); projectionCamera.updateMatrixWorld(true);
    let extent = 0; const projectedY = [];
    for (const height of [0, 1.75]) {
      const point = new THREE.Vector3(player.x, (player.height ?? 0) + height, -player.y).project(projectionCamera);
      if (point.z < -1 || point.z > 1 || !Number.isFinite(point.x + point.y)) return { extent: Infinity, occupancy: Infinity };
      extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y));
      projectedY.push(point.y);
    }
    return { extent, occupancy: Math.abs(projectedY[1] - projectedY[0]) / 2 };
  }
  function renderRecovery(camera, player, ideal, { deltaMs, reducedMotion, preserveActorFrame }) {
    let result = ideal, settling = false;
    if (!reducedMotion && renderedResult && (ideal.framingRecovered || renderedResult.framingRecovered || renderedResult.settling)) {
      // 每帧仅使用主循环传入的时间；事件中的零时间同步只验证当前视点。
      const amount = 1 - Math.exp(-Math.max(0, deltaMs) / 180);
      const target = ideal.framingRecovered ? ideal.target.clone() : renderedResult.target.clone().lerp(ideal.target, amount);
      const fromOffset = renderedResult.position.clone().sub(renderedResult.target);
      const toOffset = ideal.position.clone().sub(ideal.target);
      const fromDistance = fromOffset.length(), toDistance = toOffset.length();
      const turn = new THREE.Quaternion().setFromUnitVectors(fromOffset.clone().normalize(), toOffset.clone().normalize());
      const position = fromOffset.normalize().applyQuaternion(new THREE.Quaternion().slerp(turn, amount))
        .multiplyScalar(THREE.MathUtils.lerp(fromDistance, toDistance, amount)).add(target);
      const direction = position.clone().sub(target), distance = direction.length();
      if (distance > .001) {
        const candidate = constrain(target, direction.divideScalar(distance), distance, collisionMeshes);
        const frame = framing(candidate, camera, player);
        const anchor = new THREE.Vector3(player.x, (player.height ?? 0) + 1.1, -player.y);
        const framed = frame.extent <= .95 && frame.occupancy <= .5 && candidate.actualDistance >= ideal.minimumSceneDistance;
        if (!cast(anchor, target, collisionMeshes) && (preserveActorFrame ? framed : candidate.actualDistance >= Math.min(1, ideal.actualDistance))) {
          settling = candidate.position.distanceToSquared(ideal.position) > 1e-6 || candidate.target.distanceToSquared(ideal.target) > 1e-6;
          result = settling ? { ...ideal, position: candidate.position, target: candidate.target,
            actualDistance: candidate.actualDistance, actorInFrame: frame.extent <= .95,
            actorVerticalOccupancy: frame.occupancy, recoveryFits: framed } : ideal;
        }
      }
    }
    renderedResult = { ...result, settling };
    return renderedResult;
  }
  return {
    addRoot, removeRoot,
    snapshot() { return { roots: roots.size, trees: trees.size, estimatedCpuBytes: [...trees.values()].reduce((sum, entry) => sum + entry.bytes, 0),
      buildMilliseconds, storageMeaning: 'BVH node and indirect-index buffers; excludes shared source geometry and JavaScript object overhead' }; },
    resolve(camera, desiredTarget, player, { preserveActorFrame = true, minimumSceneDistance = 5, deltaMs = 0, reducedMotion = true } = {}) {
      const signature = [revision, player.x, player.y, player.height ?? 0, preserveActorFrame, minimumSceneDistance, ...desiredTarget,
        ...camera.matrixWorld.elements, ...camera.projectionMatrix.elements].join(':');
      const motion = { deltaMs, reducedMotion, preserveActorFrame };
      if (signature === previousSignature) return renderRecovery(camera, player, previousResult, motion);
      if (previousPlayer && Math.hypot(player.x - previousPlayer.x, player.y - previousPlayer.y) >= 1) renderedResult = null;
      const meshes = [...roots.values()].flat(); collisionMeshes = meshes;
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
      let result = constrain(target, direction, desiredDistance, meshes);
      const active = Boolean(aimHit || result.blocked);
      const minimumDistance = Math.min(minimumSceneDistance, desiredDistance);
      let frame = framing(result, camera, player), framingRecovered = false, angleOffset = 0;
      const fits = (candidate, measured) => measured.extent <= .95 && measured.occupancy <= .5 && candidate.actualDistance >= minimumDistance;
      if (active && (result.actualDistance < 1 || preserveActorFrame && !fits(result, frame))) {
        // 碰撞压缩导致人物裁切时，以人物为构图中心；仅实际相机改变，保存的环视意图保持原值。
        const actorTarget = new THREE.Vector3(player.x, (player.height ?? 0) + 1.1, -player.y);
        let best = null, bestFrame = null, bestScore = Infinity;
        const vertical = new THREE.Vector3(0, 1, 0);
        const continuous = previousResult?.framingRecovered && previousPlayer
          && Math.hypot(player.x - previousPlayer.x, player.y - previousPlayer.y) < 1
          && previousDirection?.dot(direction) > .999;
        const preferredAngle = continuous ? previousResult.angleOffset : 0;
        function evaluate(angle) {
            const candidate = constrain(actorTarget, direction.clone().applyAxisAngle(vertical, angle), desiredDistance, meshes);
            const measured = framing(candidate, camera, player);
            const score = Math.max(0, measured.extent - .95) + Math.max(0, measured.occupancy - .5)
              + Math.max(0, minimumDistance - candidate.actualDistance) / minimumDistance;
            if (score < bestScore) { best = candidate; bestFrame = measured; bestScore = score; angleOffset = angle; }
            return { candidate, measured, valid: fits(candidate, measured) };
        }
        const preferred = evaluate(preferredAngle);
        if (!preferred.valid) for (let step = 1; step <= 18; step++) {
          for (const sign of [1, -1]) {
            const angle = preferredAngle + sign * step * Math.PI / 18;
            if (!evaluate(angle).valid) continue;
            // 保持已有通道方向；新方向在相邻角度间收敛，避免步进搜索引起画面跳变。
            let invalidAngle = preferredAngle + sign * (step - 1) * Math.PI / 18, validAngle = angle;
            for (let iteration = 0; iteration < 6; iteration++) {
              const middle = (invalidAngle + validAngle) / 2;
              if (evaluate(middle).valid) validAngle = middle; else invalidAngle = middle;
            }
            const selected = evaluate(validAngle);
            best = selected.candidate; bestFrame = selected.measured; angleOffset = validAngle;
            break;
          }
          if (best && fits(best, bestFrame)) break;
        }
        if (best) { result = best; frame = bestFrame; framingRecovered = true; }
      }
      previousSignature = signature;
      previousPlayer = { x: player.x, y: player.y }; previousDirection = direction.clone();
      previousResult = { position: result.position, target: result.target, active, desiredDistance, actualDistance: result.actualDistance,
        targetAdjusted: Boolean(aimHit), framingRecovered, actorInFrame: frame.extent <= .95,
        actorVerticalOccupancy: frame.occupancy, recoveryFits: fits(result, frame), minimumSceneDistance: minimumDistance,
        clearance, angleOffset };
      return renderRecovery(camera, player, previousResult, motion);
    },
    dispose() { roots.clear(); trees.clear(); previousResult = null; renderedResult = null;
      collisionMeshes = []; previousSignature = ''; material.dispose(); },
  };
}
