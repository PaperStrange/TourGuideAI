import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from 'spark';

const config = await (await fetch('/hall-config.json')).json();
const published = config.settings.cameras[0].initial;
const canvas = document.querySelector('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000);
const fov = innerWidth > innerHeight ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(published.fov / 2)) * innerHeight / innerWidth)) : published.fov;
const camera = new THREE.PerspectiveCamera(fov, innerWidth / innerHeight, .001, 10000);
camera.position.fromArray(published.position);
const target = new THREE.Vector3().fromArray(published.target); camera.lookAt(target);
// 发布者使用 Z 轴半周旋转；直接沿用源坐标与相机，避免通过调图掩盖格式问题。
const scene = new THREE.Scene(); scene.background = new THREE.Color(0);
const spark = new SparkRenderer({ renderer, autoUpdate: false, enableLod: false, sortRadial: false }); scene.add(spark);
const sample = new SplatMesh({ url: '/hall.sog', lod: false }); sample.rotation.z = Math.PI; scene.add(sample);
await sample.initialized;
const controls = new OrbitControls(camera, canvas); controls.target.copy(target); controls.enableDamping = false; controls.update();
let pending = Promise.resolve(), draws = 0, ready = false, disposed = false;
const nativeInputs = [], visibility = [], observations = [];
const actualReference = await (await fetch('/publisher-camera.json')).json();
if (actualReference.camera) {
  camera.projectionMatrix.fromArray(actualReference.camera.projectionMatrix);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}
camera.updateMatrixWorld(true);
async function draw() {
  if (disposed) throw new Error('Disposed scene');
  await spark.update({ scene, camera }); renderer.render(scene, camera); draws++;
  await new Promise(requestAnimationFrame); renderer.render(scene, camera); draws++;
}
controls.addEventListener('change', () => { if (ready && !disposed) pending = pending.then(draw); });
for (const type of ['pointerdown', 'pointerup', 'wheel']) canvas.addEventListener(type, event => nativeInputs.push({ type, trusted: event.isTrusted, draws }), { passive: true });
document.addEventListener('visibilitychange', () => visibility.push({ state: document.visibilityState, draws, timeStamp: performance.now() }));
const gl = renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
function snapshot() {
  return { ready, disposed, draws, sourceCount: sample.packedSplats.numSplats, viewport: [canvas.width, canvas.height],
    camera: { matrixWorld: camera.matrixWorld.toArray(), projectionMatrix: camera.projectionMatrix.toArray(), position: camera.position.toArray(), target: controls.target.toArray() },
    assetTransform: sample.matrixWorld.toArray(), nativeInputs: [...nativeInputs], visibility: [...visibility], visibilityState: document.visibilityState,
    graphics: { renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) },
    memory: { ...renderer.info.memory }, render: { ...renderer.info.render }, observations: [...observations] };
}
async function dispose() {
  await pending; controls.dispose(); ready = false; observations.push({ state: 'before-dispose', memory: { ...renderer.info.memory } });
  scene.remove(sample, spark); sample.dispose(); spark.dispose(); renderer.render(scene, camera); disposed = true;
  observations.push({ state: 'after-dispose', memory: { ...renderer.info.memory } });
  return { disposed, observations: [...observations], completeMemoryAccounting: false };
}
await draw(); ready = true;
window.__HALL__ = Object.freeze({ snapshot, settle: async () => { await pending; return snapshot(); }, dispose });
