import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, MOUSE, TOUCH } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { pointerOperation, pointerMotionChangesCamera, touchPanChangesTarget } from '../src/runtime/camera-input.js';

test('native middle-button dolly adopts only vertical movement and respects public button mappings', () => {
  const controls = new OrbitControls(new PerspectiveCamera(), null);
  const pointer = { type: 'mouse', button: 1, modified: false, x: 20, y: 30 };
  assert.equal(pointerOperation(controls, pointer, 1), 'dolly');
  assert.equal(pointerMotionChangesCamera(controls, 'dolly', pointer, { ...pointer, x: 40 }), false);
  assert.equal(pointerMotionChangesCamera(controls, 'dolly', pointer, { ...pointer, y: 31 }), true);
  controls.enableZoom = false;
  assert.equal(pointerMotionChangesCamera(controls, 'dolly', pointer, { ...pointer, y: 31 }), false);
  controls.mouseButtons.MIDDLE = MOUSE.PAN;
  assert.equal(pointerOperation(controls, pointer, 1), 'pan');
  assert.equal(pointerOperation(controls, { ...pointer, modified: true }, 1), 'rotate');
});

test('three touch pointers have no camera operation while valid one- and two-pointer gestures retain native meaning', () => {
  const controls = new OrbitControls(new PerspectiveCamera(), null);
  const pointer = { type: 'touch', x: 0, y: 5 };
  assert.equal(pointerOperation(controls, pointer, 1), 'rotate');
  assert.equal(pointerOperation(controls, pointer, 2), 'dolly-pan');
  assert.equal(pointerOperation(controls, pointer, 3), null);
  assert.equal(pointerMotionChangesCamera(controls, null, pointer, { x: 12, y: 17 }, { x: 50, y: 50 }), false);
  controls.enablePan = false;
  assert.equal(pointerMotionChangesCamera(controls, 'dolly-pan', pointer, { x: 3, y: 4 }, { x: 0, y: 0 }), false,
    'An equal-radius move with pan disabled produces no pinch zoom.');
  assert.equal(pointerMotionChangesCamera(controls, 'dolly-pan', pointer, { x: 0, y: 6 }, { x: 0, y: 0 }), true);
  controls.touches.TWO = TOUCH.DOLLY_ROTATE;
  assert.equal(pointerOperation(controls, pointer, 2), 'dolly-rotate');
  assert.equal(pointerMotionChangesCamera(controls, 'dolly-rotate', pointer, { x: 3, y: 4 }, { x: 0, y: 0 }), true);
  controls.enabled = false;
  assert.equal(pointerMotionChangesCamera(controls, 'dolly-rotate', pointer, { x: 3, y: 4 }, { x: 0, y: 0 }), false);
});

test('a symmetric two-touch pinch retains its target while later translation in the same gesture changes it', () => {
  const controls = new OrbitControls(new PerspectiveCamera(), null);
  const start = [{ x: 100, y: 120 }, { x: 200, y: 120 }];
  const pinched = [{ x: 80, y: 120 }, { x: 220, y: 120 }];
  assert.equal(touchPanChangesTarget(controls, 'dolly-pan', start, pinched), false);
  const translated = pinched.map(point => ({ x: point.x + 15, y: point.y - 8 }));
  assert.equal(touchPanChangesTarget(controls, 'dolly-pan', start, translated), true);
  assert.equal(touchPanChangesTarget(controls, 'dolly-rotate', start, translated), false);
  assert.equal(touchPanChangesTarget(controls, 'dolly-pan', start, start), false);
  assert.equal(touchPanChangesTarget(controls, 'dolly-pan', start, [translated[0]]), false);
  controls.enablePan = false;
  assert.equal(touchPanChangesTarget(controls, 'dolly-pan', start, translated), false);
  controls.enablePan = true; controls.enabled = false;
  assert.equal(touchPanChangesTarget(controls, 'dolly-pan', start, translated), false);
});
