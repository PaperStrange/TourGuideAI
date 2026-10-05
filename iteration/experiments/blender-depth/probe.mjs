// Bounded renderer experiment, not a game migration or a new repository gate.
// Reading the generated GLB is necessary: only the exported bytes can establish
// whether Blender geometry, materials and dependencies actually load in-browser.
// Generated HTML, image fallback and evidence belong in scratch, not source control.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { WORLD, TARGETS } from '../../game/src/content.js';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const value = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const output = resolve(value('--out', '/workspace/scratch/blender-depth'));
const modelPath = resolve(value('--glb', join(output, 'block.glb')));
const fallbackPath = resolve(value('--fallback', join(output, 'render.png')));
const glb = readFileSync(modelPath);
if (glb.readUInt32LE(0) !== 0x46546c67 || glb.readUInt32LE(4) !== 2) throw new Error('Expected glTF2 GLB');
const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
const externalUris = [...(gltf.buffers ?? []), ...(gltf.images ?? [])].flatMap(item => item.uri && !item.uri.startsWith('data:') ? [item.uri] : []);
if (externalUris.length) throw new Error('Offline proof requires embedded buffers/textures: ' + externalUris.join(', '));
const compressed = (gltf.extensionsRequired ?? []).filter(name => /draco|basisu|meshopt/.test(name));
if (compressed.length) throw new Error('This proof deliberately has no decoder dependency: ' + compressed.join(', '));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const metadata = {
  generatedAt: new Date().toISOString(), modelPath, modelSha256: sha256(glb), modelBytes: glb.length,
  generator: gltf.asset?.generator, threeVersion: '0.186.1', renderer: 'WebGL2',
  meshes: gltf.meshes?.length ?? 0, nodes: gltf.nodes?.length ?? 0,
  primitives: (gltf.meshes ?? []).reduce((count, mesh) => count + mesh.primitives.length, 0),
  materials: gltf.materials?.length ?? 0, textures: gltf.textures?.length ?? 0,
  embeddedImageBytes: (gltf.images ?? []).reduce((count, image) => count + (gltf.bufferViews?.[image.bufferView]?.byteLength ?? 0), 0),
  externalUris, extensionsUsed: gltf.extensionsUsed ?? [], extensionsRequired: gltf.extensionsRequired ?? [],
  coordinates: 'source(x,north,height) => glTF/Three(x,height,-north), metres',
  fallback: existsSync(fallbackPath) ? { path: fallbackPath, sha256: sha256(readFileSync(fallbackPath)) } : null,
};
mkdirSync(output, { recursive: true });

const source = `
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const MODEL = ${JSON.stringify(glb.toString('base64'))};
const META = ${JSON.stringify(metadata)};
const WORLD = ${JSON.stringify(WORLD)};
const TARGETS = ${JSON.stringify(TARGETS.map(({id,x,y,title,kind})=>({id,x,y,title,kind})))};
const stage = document.querySelector('#stage');
const status = document.querySelector('#status');
const fallback = document.querySelector('#fallback');
const labelRoot = document.querySelector('#labels');
let locale = 'en';
let renderer, scene, camera, controls, model;
let ready = false, frame = 0, loadMs = null, firstFrameMs = null, firstRender = null, lost = false;
let currentPreset = 'guided';
let lastNow = null;
const frameSamples = [];
const labels = [];
const text = {
 en: {title:'Shijō, with depth', subtitle:'Blender → glTF → live 3D', intro:'A small architectural study of our existing street. Drag to look around; scroll to move closer.', note:'Research proof · authored building heights, materials and street furniture · source geometry retained', left:'Look left', reset:'Reset view', right:'Look right', zoom:'Move closer', still:'Fixed-view fallback', details:'Technical details', canvasLabel:'Interactive Blender street scene. Drag to orbit and scroll to zoom.', toolsLabel:'Guided camera', languageLabel:'Change language', fallbackIntro:'This fixed image is the Blender reference render. Camera controls are unavailable.', noImage:'Live 3D is unavailable. No fixed image is bundled in this preliminary proof. The playable game and saved journey are unchanged.', ready:'Live 3D · guided camera', error:'Live 3D is unavailable on this device. This fixed view shows the same Blender scene. The playable game and saved journey are unchanged.', loading:'Loading the Blender scene…'},
 zh: {title:'四条街，有了纵深', subtitle:'Blender → glTF → 实时 3D', intro:'现有街区的小型建筑研究。拖动调整视角，滚动靠近观察。', note:'研究原型 · 建筑高度、材质和街具为设计表达 · 保留来源几何', left:'向左看', reset:'恢复视角', right:'向右看', zoom:'靠近', still:'固定视图后备画面', details:'技术信息', canvasLabel:'可交互 Blender 街景。拖动旋转镜头，滚动缩放。', toolsLabel:'引导镜头', languageLabel:'切换语言', fallbackIntro:'当前显示 Blender 参考渲染图。固定视图不支持镜头控制。', noImage:'实时 3D 暂时不可用。此初步原型尚未包含固定参考图。现有游戏和已保存旅程不受影响。', ready:'实时 3D · 引导镜头', error:'此设备暂时无法显示实时 3D。这里呈现同一 Blender 场景的固定视图。现有游戏和已保存旅程不受影响。', loading:'正在载入 Blender 场景…'}
};
function translate() {
 document.documentElement.lang = locale === 'zh' ? 'zh-Hans' : 'en';
 for (const el of document.querySelectorAll('[data-text]')) el.textContent = text[locale][el.dataset.text];
 status.textContent = text[locale][lost ? (META.fallback ? 'error' : 'noImage') : ready ? 'ready' : 'loading'];
 document.querySelector('[data-text=intro]').textContent = text[locale][lost ? (META.fallback ? 'fallbackIntro' : 'noImage') : 'intro'];
 renderer?.domElement.setAttribute('aria-label',text[locale].canvasLabel);
 document.querySelector('#tools').setAttribute('aria-label',text[locale].toolsLabel);
 document.querySelector('#locale').setAttribute('aria-label',text[locale].languageLabel);
 for (const label of labels) label.el.textContent = label.target.title[locale];
}
document.querySelector('#locale').addEventListener('click', () => { locale = locale === 'en' ? 'zh' : 'en'; translate(); });
function fail(message) {
 lost = true; ready = false; stage.dataset.state = 'unavailable';
 renderer?.setAnimationLoop(null); if (controls) controls.enabled = false;
 fallback.hidden = false; labelRoot.hidden = true;
 document.querySelector('#tools').hidden = true;
 document.querySelector('#error-detail').textContent = message;
 translate();
}
function mapped(x, north, height = 0) { return new THREE.Vector3(x, height, -north); }
function cameraState() {
 if (!camera || !controls) return null;
 return {position:camera.position.toArray(), target:controls.target.toArray(), distance:camera.position.distanceTo(controls.target), azimuth:controls.getAzimuthalAngle(), polar:controls.getPolarAngle(), preset:currentPreset};
}
function snapshot() {
 const gl = lost ? null : renderer?.getContext();
 const debug = gl?.getExtension('WEBGL_debug_renderer_info');
 return {ready,lost,frame,loadMs,firstFrameMs,firstRender,shadowPolicy:'Static proof geometry and lighting: shadow map drawn once, camera remains interactive. Animated production actors need shadow invalidation.',loadTiming:'Measured from GLB base64 decoding through parse/setup and first renderer.render; excludes HTML transfer and JS parsing.',metadata:META,worldBounds:WORLD.bounds,camera:cameraState(),
  webgl:gl ? {version:gl.getParameter(gl.VERSION),renderer:debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE)} : null,
  viewport:{width:stage.clientWidth,height:stage.clientHeight,dpr:renderer?.getPixelRatio() ?? null},
  render:renderer ? {...renderer.info.render,memory:{...renderer.info.memory}} : null,
  model:model ? {bounds:new THREE.Box3().setFromObject(model).min.toArray().concat(new THREE.Box3().setFromObject(model).max.toArray()),meshInstances:model.userData.meshInstances,triangles:model.userData.triangles} : null,
  frameIntervalMs:frameSamples.length ? {count:frameSamples.length,median:[...frameSamples].sort((a,b)=>a-b)[Math.floor(frameSamples.length/2)],max:Math.max(...frameSamples),note:'Cloud browser observation only; not a device performance budget.'} : null};
}
window.__DEPTH_PROBE__ = Object.freeze({snapshot});
function setPreset(azimuth = 0.17, distance = 73) {
 currentPreset = azimuth < 0 ? 'left' : azimuth > 0.3 ? 'right' : 'guided';
 const polar = 0.83;
 // Flush pending drag/zoom inertia through the public API before setting an
 // exact pose; otherwise old spherical deltas make Reset drift on later frames.
 const damping = controls.enableDamping;
 controls.enableDamping = false;
 controls.update();
 camera.position.copy(controls.target).add(new THREE.Vector3().setFromSphericalCoords(distance,polar,azimuth));
 controls.update();
 controls.enableDamping = damping;
}
async function start() {
 try {
  renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  stage.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Interactive Blender street scene. Drag to orbit and scroll to zoom.');
  renderer.domElement.addEventListener('webglcontextlost', event => {event.preventDefault();fail('WebGL context lost');});
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#cad4cc');
  scene.fog = new THREE.Fog('#cad4cc',125,220);
  camera = new THREE.PerspectiveCamera(38,1,0.2,350);
  controls = new OrbitControls(camera,renderer.domElement);
  controls.target.copy(mapped((WORLD.bounds.minX+WORLD.bounds.maxX)/2,WORLD.roadCenterY,1.3));
  controls.enablePan = false;
  controls.enableDamping = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.dampingFactor = 0.09;
  controls.minDistance = 38; controls.maxDistance = 94;
  controls.minPolarAngle = 0.6; controls.maxPolarAngle = 1.04;
  controls.minAzimuthAngle = -0.6; controls.maxAzimuthAngle = 0.6;
  controls.rotateSpeed = 0.5; controls.zoomSpeed = 0.75;
  const hemisphere = new THREE.HemisphereLight('#eaf7ff','#655144',2.2); scene.add(hemisphere);
  const sun = new THREE.DirectionalLight('#ffe9c9',3.2);
  sun.position.set(-14,48,25); sun.target.position.copy(controls.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-50,right:50,top:48,bottom:-42,near:1,far:140});
  sun.shadow.normalBias = 0.08; sun.shadow.bias = -0.001;
  scene.add(sun,sun.target);
  const start = performance.now();
  const bytes = Uint8Array.from(atob(MODEL), char => char.charCodeAt(0));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer,'');
  model = gltf.scene;
  let meshInstances = 0,triangles = 0;
  model.traverse(object => {
   if (!object.isMesh) return;
   object.castShadow = true; object.receiveShadow = true; meshInstances++;
   triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count)/3;
  });
  model.userData.meshInstances = meshInstances; model.userData.triangles = triangles;
  scene.add(model);
  for (const target of TARGETS.filter(target=>target.kind!=='placeholder')) {
   const el = document.createElement('span'); el.className = 'place-label'; labelRoot.append(el);
   labels.push({el,target,position:mapped(target.x,target.y,2.4)});
  }
  function resize() {
   const width=stage.clientWidth,height=stage.clientHeight;
   renderer.setSize(width,height,false); camera.aspect=width/height; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize(); setPreset();
  document.querySelector('#left').onclick = () => setPreset(-0.48,70);
  document.querySelector('#reset').onclick = () => setPreset();
  document.querySelector('#right').onclick = () => setPreset(0.48,70);
  document.querySelector('#zoom').onclick = () => setPreset(controls.getAzimuthalAngle(),Math.max(controls.minDistance,controls.getDistance()-10));
  ready=true; stage.dataset.state='ready'; loadMs=Math.round((performance.now()-start)*10)/10; translate();
  renderer.setAnimationLoop(now=>{
   if (lost) return;
   if(lastNow!==null && frame>10){frameSamples.push(now-lastNow);if(frameSamples.length>180)frameSamples.shift();} lastNow=now;
   controls.update(); renderer.render(scene,camera); frame++; if(firstFrameMs===null){firstFrameMs=Math.round((performance.now()-start)*10)/10;firstRender={...renderer.info.render};}
   for(const label of labels){
    const p=label.position.clone().project(camera);
    label.el.style.transform='translate(-50%,-100%) translate('+((p.x+1)*stage.clientWidth/2)+'px,'+((-p.y+1)*stage.clientHeight/2)+'px)';
    label.el.hidden=p.z>1||Math.abs(p.x)>1||Math.abs(p.y)>1;
   }
  });
 } catch(error) { fail(error.message); }
}
translate(); start();
`;

const bundle = await build({stdin:{contents:source,resolveDir:here,sourcefile:'depth-proof-entry.js'},bundle:true,write:false,minify:true,format:'iife',target:'es2022',legalComments:'inline'});
const threeLicense = readFileSync(join(here,'node_modules/three/LICENSE'),'utf8');
const fallbackImage = metadata.fallback ? 'data:image/png;base64,' + readFileSync(fallbackPath).toString('base64') : '';
const html = `<!doctype html><!-- Bundled Three.js licence:\n${threeLicense}\n--><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shijō · Blender depth proof</title><link rel="icon" href="data:,"><style>
*{box-sizing:border-box}body{margin:0;background:#cbd5cd;color:#263c32;font:15px/1.45 system-ui,sans-serif}button{font:inherit;border:1px solid #9cae9e;background:#f6f5eade;border-radius:24px;padding:10px 18px;cursor:pointer;color:#263c32}button:hover{background:white}button:focus-visible{outline:3px solid #b3733f;outline-offset:4px}#stage{position:relative;width:100vw;height:100vh;min-height:600px;overflow:hidden}canvas{display:block;width:100%;height:100%;touch-action:none}header{position:absolute;left:36px;top:28px;max-width:360px;pointer-events:none}h1{font:600 36px/1.1 Georgia,serif;margin:10px 0}.eyebrow{letter-spacing:.14em;text-transform:uppercase;font-size:11px;font-weight:700}header p{margin:12px 0;font-size:14px}#locale{position:absolute;right:28px;top:28px}#status{position:absolute;right:28px;top:80px;max-width:330px;font-size:12px;background:#f6f5eab8;padding:7px 12px;border-radius:20px}#tools{position:absolute;left:50%;bottom:56px;transform:translateX(-50%);display:flex;gap:8px;white-space:nowrap}footer a{color:inherit}footer{position:absolute;bottom:20px;text-align:center;width:100%;font-size:11px;letter-spacing:.025em}.place-label{position:absolute;top:0;left:0;max-width:190px;padding:5px 9px;background:#faf7e7e8;border:1px solid #b7b29c;border-radius:5px;font-size:11px;font-weight:600;box-shadow:0 3px 8px #24382b20;pointer-events:none}#fallback{position:absolute;inset:0;background:#d5dfd3;z-index:2}#fallback img{width:100%;height:100%;object-fit:contain}#fallback-notice{position:absolute;left:24px;bottom:90px;background:#fffbef;padding:20px;max-width:460px}#error-detail{display:block;font:11px monospace;margin-top:8px}#fallback[hidden],#tools[hidden]{display:none}header,#locale,#status,#tools,footer{z-index:3}@media(max-width:800px){header{left:20px;top:18px;max-width:240px}h1{font-size:28px}header p{font-size:12px}#status{top:75px;right:18px;max-width:190px}#locale{top:18px;right:18px}#tools{gap:4px;bottom:58px}button{padding:9px 12px;font-size:12px}footer{padding:0 20px}}
</style><main id="stage" data-state="loading"><div id="labels"></div><div id="fallback" hidden>${fallbackImage ? '<img alt="Fixed Blender render of the same scene" src="'+fallbackImage+'">' : ''}<div id="fallback-notice"><strong data-text="still"></strong><details><summary data-text="details"></summary><span id="error-detail"></span></details></div></div><header><div class="eyebrow" data-text="subtitle"></div><h1 data-text="title"></h1><p data-text="intro"></p></header><button id="locale" aria-label="Change language">EN / 中文</button><div id="status" role="status"></div><nav id="tools" aria-label="Guided camera"><button id="left" data-text="left"></button><button id="reset" data-text="reset"></button><button id="right" data-text="right"></button><button id="zoom" data-text="zoom"></button></nav><footer><span data-text="note"></span><br>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors · ODbL</a> · Three.js · MIT</footer></main><script>${bundle.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script></html>`;
const htmlPath = join(output,'depth-proof.html');
writeFileSync(htmlPath,html);
metadata.htmlPath = htmlPath;
metadata.htmlBytes = Buffer.byteLength(html);
metadata.htmlGzipBytes = gzipSync(html).length;
metadata.htmlSha256 = sha256(html);
writeFileSync(join(output,'build-report.json'),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify(metadata,null,2));
if(args.includes('--serve')) {
  const port = Number(value('--port','4180'));
  createServer((req,res)=>{
    if(req.url!=='/' && req.url!=='/depth-proof.html'){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);
  }).listen(port,'0.0.0.0',()=>console.log('Depth proof: http://127.0.0.1:'+port+'/'));
}
