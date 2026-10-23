import { MOUSE, TOUCH } from 'three';

export function pointerOperation(controls, pointer, count) {
  if (!pointer || !count) return null;
  if (pointer.type === 'touch') {
    if (count === 1) return controls.touches.ONE === TOUCH.ROTATE ? 'rotate'
      : controls.touches.ONE === TOUCH.PAN ? 'pan' : null;
    if (count === 2) return controls.touches.TWO === TOUCH.DOLLY_PAN ? 'dolly-pan'
      : controls.touches.TWO === TOUCH.DOLLY_ROTATE ? 'dolly-rotate' : null;
    return null;
  }
  const action = controls.mouseButtons[['LEFT', 'MIDDLE', 'RIGHT'][pointer.button]];
  if (action === MOUSE.DOLLY) return 'dolly';
  if (action === MOUSE.ROTATE) return pointer.modified ? 'pan' : 'rotate';
  if (action === MOUSE.PAN) return pointer.modified ? 'rotate' : 'pan';
  return null;
}

// 仅判断已启用操作是否收到有效位移；实际旋转、平移和缩放仍由 OrbitControls 处理。
export function pointerMotionChangesCamera(controls, operation, previous, next, other) {
  const moved = previous.x !== next.x || previous.y !== next.y;
  if (!controls.enabled || !moved) return false;
  if (operation === 'rotate') return controls.enableRotate;
  if (operation === 'pan') return controls.enablePan;
  if (operation === 'dolly') return controls.enableZoom && previous.y !== next.y;
  if (operation !== 'dolly-pan' && operation !== 'dolly-rotate' || !other) return false;
  if (operation === 'dolly-pan' && controls.enablePan || operation === 'dolly-rotate' && controls.enableRotate) return true;
  return controls.enableZoom && Math.hypot(previous.x - other.x, previous.y - other.y)
    !== Math.hypot(next.x - other.x, next.y - other.y);
}
