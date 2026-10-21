import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

const COPY = {
  en: { internal:'Internal review',eyebrow:'GEOGRAPHIC SITE WORKBENCH',title:'A place, in context.',chooseSite:'Review a site',scope:'Geographic context · architectural and access review required.',scopeDetail:'Orbit the source-derived scene. Walking and real-world routes have not been reviewed.',sources:'Sources & assumptions',review:'Review record',lightingCredits:'Lighting sources · CC0',illumination:'Day and night are authored illumination studies. The HDR environments were photographed in London and Berlin.',day:'Daylight',night:'Night',reset:'Reset view',contextTag:'GEOGRAPHIC CONTEXT',reviewTag:'REVIEW REQUIRED',retry:'Retry',controls:'Drag to orbit · right-drag or two fingers to pan · scroll or pinch to zoom. Keyboard: arrows orbit, Shift + arrows pan, + / − zoom, R reset. Click a surface to inspect.',inspector:'Surface record',inspectHint:'Choose a surface to see its source identity.',noFeature:'This surface has no attached source identity.',loading:'Loading and verifying the scene…',lightingLoading:'Loading illumination…',ready:'Scene ready · source and architecture review required.',error:'Unable to complete this view',bytes:'Model download',triangles:'Triangles',batches:'Mesh batches',features:'Source features',buildings:'Buildings',excluded:'Excluded features',authoredHeights:'Authored building heights',unreviewed:'Unreviewed',stage:'Interactive geographic context',lighting:'Illumination',source:'Source',sourceId:'Source identity',kind:'Feature type',height:'Height evidence',navigation:'Access review',sourceTags:'Source tags' },
  zh: { internal:'内部审阅',eyebrow:'地理场景工作台',title:'在场景中认识地方。',chooseSite:'选择审阅地点',scope:'地理环境示意 · 建筑与通行条件需要审阅。',scopeDetail:'旋转查看来源数据生成的场景。步行与现实路线尚未审阅。',sources:'来源与创作说明',review:'审阅记录',lightingCredits:'照明来源 · CC0',illumination:'日夜光线用于创作效果研究。HDR 环境照片拍摄于伦敦和柏林。',day:'白天',night:'夜晚',reset:'重置视角',contextTag:'地理环境示意',reviewTag:'需要审阅',retry:'重新尝试',controls:'拖动旋转 · 鼠标右键拖动或双指平移 · 滚轮或双指缩放。键盘：方向键旋转，Shift＋方向键平移，＋／−缩放，R 重置。点击表面查看来源。',inspector:'表面来源',inspectHint:'选择一个表面，查看它的来源标识。',noFeature:'这个表面没有附加来源标识。',loading:'正在加载并校验场景…',lightingLoading:'正在加载光线…',ready:'场景已就绪 · 来源与建筑细节需要审阅。',error:'无法完成当前视图',bytes:'模型下载',triangles:'三角形',batches:'网格批次',features:'来源要素',buildings:'建筑',excluded:'排除的要素',authoredHeights:'创作设定的建筑高度',unreviewed:'尚未审阅',stage:'可交互地理环境示意',lighting:'光线',source:'来源',sourceId:'来源标识',kind:'要素类型',height:'高度依据',navigation:'通行审阅',sourceTags:'来源标签' },
};
const $ = selector => document.querySelector(selector);
let locale = new URLSearchParams(location.search).get('lang') === 'zh' ? 'zh' : 'en';
const state = { phase:'loading',siteId:null,mode:'day',requestedMode:'day',error:null,renderedFrames:0,selectedFeature:null,modelSha256:null };
let sites = [], context = null, manifest = null, review = null, model = null;
let scene, renderer, camera, controls, environment, sun, fill, frameId = 0, needsFrame = false;
let sceneGeneration = 0, lightingGeneration = 0, siteController, lightController, initialView;
let currentOperation = 'site', disposed = false, lightingResources;
let sitePending = true, lightingPending = true, siteFailure = null, lightingFailure = null, fatalFailure = null, modelRendered = false;
COPY.en.metadata = 'Review details'; COPY.zh.metadata = '审阅详情';
const t = key => COPY[locale][key] || key;
const localText = value => typeof value === 'string' ? value : value?.[locale] || value?.en || '';
const clone = value => JSON.parse(JSON.stringify(value));

function status(key, error = null) {
  state.error = error?.message || null;
  $('#status').textContent = error ? `${t('error')}: ${error.message}` : t(key);
  $('#status').dataset.error = String(Boolean(error));
  $('#retry').hidden = !error;
}

function refreshStatus() {
  const failure = fatalFailure || siteFailure || lightingFailure;
  currentOperation = fatalFailure ? 'reload' : siteFailure ? 'site' : lightingFailure ? 'lighting' : currentOperation;
  state.phase = failure ? 'error' : sitePending ? 'loading' : lightingPending ? 'lighting' : modelRendered ? 'ready' : 'rendering';
  status(state.phase === 'ready' ? 'ready' : state.phase === 'lighting' ? 'lightingLoading' : 'loading',failure);
}

function translate() {
  document.documentElement.lang = locale;
  document.title = `TourGuideAI · ${locale === 'zh' ? '地理场景工作台' : 'Site workbench'}`;
  document.querySelectorAll('[data-copy]').forEach(node => { node.textContent = t(node.dataset.copy); });
  $('#camera-help').textContent += locale === 'zh' ? ' Enter 查看视图中心的表面。' : ' Enter inspects the surface at the center.';
  document.querySelectorAll('[data-locale]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.locale === locale)));
  $('#stage').setAttribute('aria-label', t('stage'));
  $('#lighting-controls').setAttribute('aria-label', t('lighting'));
  for (const option of $('#site-selector').options) option.textContent = localText(sites.find(site => site.id === option.value)?.title) || option.value;
  renderMetadata();
  renderFeature();
  refreshStatus();
}

function renderMetadata() {
  $('#scene-title').textContent = localText(manifest?.title || sites.find(site => site.id === state.siteId)?.title) || '—';
  const stats = $('#site-stats');
  stats.replaceChildren();
  $('#source-summary').replaceChildren();
  $('#review-record').textContent = '';
  if (!manifest) return;
  const fields = [['bytes',`${(manifest.model.bytes / 1048576).toFixed(2)} MiB`],['triangles',manifest.geometry?.triangles],['batches',manifest.geometry?.batches],['features',review?.features],['buildings',review?.buildings],['excluded',review?.excluded?.length],['authoredHeights',review?.authoredBuildingHeights?.length]];
  for (const [key,value] of fields) {
    if (value === undefined) continue;
    const row = document.createElement('div'), label = document.createElement('dt'), output = document.createElement('dd');
    label.textContent = t(key); output.textContent = typeof value === 'number' ? value.toLocaleString(locale) : value;
    row.append(label,output); stats.append(row);
  }
  const source = $('#source-summary');
  source.replaceChildren();
  const sourceData = manifest.source || context?.source || {};
  const record = document.createElement('pre');
  record.textContent = JSON.stringify(sourceData, null, 2);
  source.append(record);
  $('#review-record').textContent = JSON.stringify(review, null, 2);
}

function renderFeature() {
  const feature = context?.features?.find(item => item.sourceId === state.selectedFeature);
  $('#inspector-hint').hidden = Boolean(feature);
  $('#inspector-hint').textContent = t(state.selectedFeature ? 'noFeature' : 'inspectHint');
  $('#feature-record').hidden = !feature;
  if (feature) $('#feature-record').textContent = JSON.stringify({ [t('sourceId')]:feature.sourceId,[t('kind')]:feature.kind,[t('height')]:feature.height,[t('navigation')]:t('unreviewed'),[t('sourceTags')]:feature.sourceTags },null,2);
}

async function fetchChecked(url, signal) {
  const response = await fetch(url, { signal,cache:'no-store' });
  if (!response.ok) throw new Error(`${response.status} · ${url}`);
  return response;
}

async function digest(bytes) {
  const value = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(value)].map(byte => byte.toString(16).padStart(2,'0')).join('');
}

async function waitForVisible(signal) {
  if (signal.aborted) throw signal.reason;
  if (!document.hidden) return;
  await new Promise((resolveVisible,reject) => {
    const cleanup = () => { document.removeEventListener('visibilitychange',visible); signal.removeEventListener('abort',aborted); };
    const visible = () => { if (!document.hidden) { cleanup(); resolveVisible(); } };
    const aborted = () => { cleanup(); reject(signal.reason); };
    document.addEventListener('visibilitychange',visible);
    signal.addEventListener('abort',aborted,{once:true});
  });
}

function invalidate() {
  needsFrame = true;
  if (disposed || document.hidden || frameId || !renderer) return;
  frameId = requestAnimationFrame(() => {
    frameId = 0;
    if (document.hidden || disposed || !needsFrame) return;
    needsFrame = false;
    renderer.render(scene,camera);
    state.renderedFrames += 1;
    if (model && environment && !modelRendered) { modelRendered = true; refreshStatus(); }
  });
}

function disposeModel(object) {
  if (!object) return;
  const geometries = new Set(), materials = new Set(), textures = new Set();
  object.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  geometries.forEach(value => value.dispose());
  materials.forEach(value => value.dispose());
  textures.forEach(value => { value.dispose(); value.image?.close?.(); });
  object.removeFromParent();
}

function frameModel() {
  const bounds = new THREE.Box3().setFromObject(model);
  if (bounds.isEmpty()) throw new Error('Model contains no visible geometry');
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.x,size.y,size.z,1);
  controls.target.copy(center);
  camera.near = Math.max(radius / 10000,0.02); camera.far = radius * 30;
  controls.minDistance = radius * .025; controls.maxDistance = radius * 6;
  const distance = radius * .9 / Math.min(camera.aspect,1);
  camera.position.copy(center).add(new THREE.Vector3(distance * .7,distance * .85,distance));
  camera.updateProjectionMatrix(); controls.update();
  initialView = { position:camera.position.clone(),target:center.clone() };
  sun.position.copy(center).add(new THREE.Vector3(radius * .5,radius,radius * .7));
  sun.target.position.copy(center);
  const shadow = sun.shadow.camera;
  shadow.position.copy(sun.position); shadow.lookAt(center); shadow.updateMatrixWorld(true);
  const lightBounds = new THREE.Box3();
  for (const x of [bounds.min.x,bounds.max.x]) for (const y of [bounds.min.y,bounds.max.y]) for (const z of [bounds.min.z,bounds.max.z]) {
    lightBounds.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(shadow.matrixWorldInverse));
  }
  // 按实际场景范围分配阴影精度，偏移量保持在一个阴影像素以内。
  const margin = radius * .015;
  shadow.left = lightBounds.min.x-margin; shadow.right = lightBounds.max.x+margin;
  shadow.bottom = lightBounds.min.y-margin; shadow.top = lightBounds.max.y+margin;
  shadow.near = Math.max(.1,-lightBounds.max.z-margin); shadow.far = Math.max(shadow.near+1,-lightBounds.min.z+margin);
  shadow.updateProjectionMatrix();
  const texelWorld = Math.max((shadow.right-shadow.left)/sun.shadow.mapSize.x,(shadow.top-shadow.bottom)/sun.shadow.mapSize.y);
  sun.shadow.normalBias = texelWorld * .4;
  sun.shadow.bias = -texelWorld * .35 / (shadow.far-shadow.near);
  sun.shadow.needsUpdate = true;
  invalidate();
}

function resetView() {
  if (!initialView) return;
  camera.position.copy(initialView.position); controls.target.copy(initialView.target); controls.update(); invalidate();
}

async function selectSite(id) {
  const generation = ++sceneGeneration;
  siteController?.abort(); siteController = new AbortController();
  const signal = siteController.signal;
  state.siteId = id; state.selectedFeature = null; state.modelSha256 = null;
  sitePending = true; siteFailure = null; modelRendered = false;
  currentOperation = 'site'; manifest = null; context = null; review = null; initialView = null;
  disposeModel(model); model = null;
  $('#site-selector').value = id; renderMetadata(); renderFeature(); refreshStatus(); invalidate();
  try {
    const base = `/sites/${encodeURIComponent(id)}/`;
    const [manifestBytes,contextBytes,reviewBytes] = await Promise.all(['manifest.json','context.json','review.json'].map(async filename => (await fetchChecked(base + filename,signal)).arrayBuffer()));
    const decoder = new TextDecoder('utf-8',{fatal:true});
    const nextManifest = JSON.parse(decoder.decode(manifestBytes));
    if (!/^[a-f0-9]{64}$/i.test(nextManifest.contextSha256 || '') || await digest(contextBytes) !== nextManifest.contextSha256.toLowerCase()) throw new Error('Context SHA-256 does not match the manifest');
    const nextContext = JSON.parse(decoder.decode(contextBytes)), nextReview = JSON.parse(decoder.decode(reviewBytes));
    if (nextManifest.schemaVersion !== 1 || nextManifest.id !== id || nextContext.id !== id || nextReview.siteId !== id) throw new Error('Site metadata identity does not match');
    for (const record of [nextManifest,nextContext,nextReview]) {
      if (record.representation !== 'geographic-context' || record.navigation !== 'unreviewed') throw new Error('Site review status does not match');
      if (!/^[a-f0-9]{64}$/i.test(record.configSha256 || '') || record.configSha256 !== nextManifest.configSha256) throw new Error('Site configuration SHA-256 does not match');
      if (!/^[a-f0-9]{64}$/i.test(record.source?.sha256 || '') || record.source.sha256 !== nextManifest.source?.sha256) throw new Error('Site source SHA-256 does not match');
    }
    if (!nextManifest.model || !/^[a-f0-9]{64}$/i.test(nextManifest.model.sha256 || '') || !Number.isSafeInteger(nextManifest.model.bytes) || nextManifest.model.bytes <= 0 || nextManifest.model.file !== 'scene.glb') throw new Error('Model identity is invalid');
    const bytes = await (await fetchChecked(base + nextManifest.model.file,signal)).arrayBuffer();
    if (bytes.byteLength !== nextManifest.model.bytes || await digest(bytes) !== nextManifest.model.sha256.toLowerCase()) throw new Error('Model SHA-256 or byte length does not match the manifest');
    if (generation !== sceneGeneration) return;
    const loader = new GLTFLoader();
    // 所有模型资源必须内嵌，来源目录不会授权任意网络请求。
    loader.register(parser => ({ name:'WorkbenchEmbeddedResources',beforeRoot() {
      for (const entry of [...(parser.json.buffers || []),...(parser.json.images || [])]) {
        if (entry.uri && !entry.uri.startsWith('data:')) throw new Error('External model resources are not permitted');
      }
    } }));
    const gltf = await loader.parseAsync(bytes,'');
    if (generation !== sceneGeneration || disposed) { disposeModel(gltf.scene); return; }
    if (gltf.scene.userData.siteId !== id || gltf.scene.userData.contextSha256 !== nextManifest.contextSha256 || gltf.scene.userData.sourceSha256 !== nextManifest.source.sha256) { disposeModel(gltf.scene); throw new Error('Model source identity does not match the site metadata'); }
    manifest = nextManifest; context = nextContext; review = nextReview; model = gltf.scene;
    state.modelSha256 = nextManifest.model.sha256;
    model.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    scene.add(model); frameModel(); renderMetadata();
    sitePending = false; refreshStatus();
    invalidate();
  } catch (error) {
    if (generation !== sceneGeneration || error.name === 'AbortError') return;
    sitePending = false; siteFailure = error; refreshStatus();
  }
}

async function setLighting(mode) {
  const generation = ++lightingGeneration;
  lightController?.abort(); lightController = new AbortController();
  const signal = lightController.signal;
  state.requestedMode = mode; currentOperation = 'lighting'; lightingPending = true; lightingFailure = null; refreshStatus();
  try {
    lightingResources ||= await (await fetchChecked('/lighting/resources.json',signal)).json();
    const resource = lightingResources.resources.find(item => item.id === mode);
    if (!resource) throw new Error('Lighting resource unavailable');
    const bytes = await (await fetchChecked(`/lighting/${resource.file}`,signal)).arrayBuffer();
    if (await digest(bytes) !== resource.sha256) throw new Error('Lighting SHA-256 does not match its source record');
    await waitForVisible(signal);
    if (generation !== lightingGeneration || disposed) return;
    const texture = new HDRLoader().createDataTexture(bytes);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    const generator = new THREE.PMREMGenerator(renderer);
    const next = generator.fromEquirectangular(texture);
    texture.dispose(); generator.dispose(); environment?.dispose(); environment = next;
    scene.environment = next.texture;
    scene.background = new THREE.Color(mode === 'day' ? '#dce3d8' : '#18262c');
    scene.environmentIntensity = mode === 'day' ? .8 : .5;
    sun.intensity = mode === 'day' ? 2.2 : .35; sun.color.set(mode === 'day' ? '#fff4da' : '#b9cbe0');
    fill.intensity = mode === 'day' ? .7 : .3;
    renderer.toneMappingExposure = mode === 'day' ? 1 : .85;
    state.mode = mode;
    document.querySelectorAll('[data-lighting]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.lighting === mode)));
    lightingPending = false; modelRendered = false; refreshStatus(); invalidate();
  } catch (error) {
    if (generation !== lightingGeneration || error.name === 'AbortError') return;
    lightingPending = false; lightingFailure = error; refreshStatus();
  }
}

function inspect(event) {
  if (!model) return;
  const bounds = renderer.domElement.getBoundingClientRect();
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1),camera);
  const hit = ray.intersectObject(model,true)[0];
  let node = hit?.object;
  state.selectedFeature = null;
  const indices = hit?.object.geometry?.getAttribute('_source_index');
  if (indices && hit.face) {
    const sourceIndex = indices.getX(hit.face.a);
    if (Number.isInteger(sourceIndex)) state.selectedFeature = manifest.features?.[sourceIndex]?.sourceId || null;
  }
  while (node && !state.selectedFeature) {
    const id = node.userData.sourceId || node.userData.source_id;
    if (id) { state.selectedFeature = String(id); break; }
    node = node.parent;
  }
  if (hit && !state.selectedFeature) state.selectedFeature = '__unmapped__';
  renderFeature();
}

function keyboard(event) {
  const keys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_','r','R','Enter'];
  if (!keys.includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'Enter') { const bounds = renderer.domElement.getBoundingClientRect(); inspect({clientX:bounds.left+bounds.width/2,clientY:bounds.top+bounds.height/2}); return; }
  if (event.key.toLowerCase() === 'r') { resetView(); return; }
  const offset = camera.position.clone().sub(controls.target);
  if (event.shiftKey && event.key.startsWith('Arrow')) {
    const scale = offset.length() * .035;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);
    const delta = event.key === 'ArrowLeft' ? right.multiplyScalar(-scale) : event.key === 'ArrowRight' ? right.multiplyScalar(scale) : up.multiplyScalar(event.key === 'ArrowUp' ? scale : -scale);
    camera.position.add(delta); controls.target.add(delta);
  } else {
    const spherical = new THREE.Spherical().setFromVector3(offset);
    if (event.key === 'ArrowLeft') spherical.theta += .08;
    if (event.key === 'ArrowRight') spherical.theta -= .08;
    if (event.key === 'ArrowUp') spherical.phi -= .06;
    if (event.key === 'ArrowDown') spherical.phi += .06;
    if (['+','='].includes(event.key)) spherical.radius *= .9;
    if (['-','_'].includes(event.key)) spherical.radius *= 1.1;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi,.05,Math.PI*.49);
    spherical.radius = THREE.MathUtils.clamp(spherical.radius,controls.minDistance,controls.maxDistance);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
  }
  controls.update(); invalidate();
}

async function initialize() {
  if (matchMedia('(max-width:620px)').matches) $('#metadata-panel').open = false;
  translate();
  renderer = new THREE.WebGLRenderer({ antialias:true,alpha:false });
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $('#canvas-host').append(renderer.domElement);
  scene = new THREE.Scene(); scene.background = new THREE.Color('#dce3d8');
  camera = new THREE.PerspectiveCamera(45,1,.1,10000);
  controls = new OrbitControls(camera,renderer.domElement); controls.enableDamping = false; controls.maxPolarAngle = Math.PI*.49;
  controls.addEventListener('change',invalidate);
  sun = new THREE.DirectionalLight('#fff4da',2.2); fill = new THREE.HemisphereLight('#e9f1e6','#6c7765',.7);
  sun.castShadow = true; sun.shadow.mapSize.set(1024,1024);
  scene.add(sun,sun.target,fill);
  const resize = new ResizeObserver(() => { const {width,height} = $('#stage').getBoundingClientRect(); if (!width || !height) return; renderer.setSize(width,height,false); camera.aspect = width/height; camera.updateProjectionMatrix(); invalidate(); });
  resize.observe($('#stage'));
  document.addEventListener('visibilitychange',() => { if (document.hidden) { cancelAnimationFrame(frameId); frameId = 0; } else invalidate(); });
  $('#stage').addEventListener('keydown',keyboard);
  let pointerStart;
  const activePointers = new Set();
  renderer.domElement.addEventListener('pointerdown',event => { activePointers.add(event.pointerId); pointerStart = activePointers.size === 1 ? {x:event.clientX,y:event.clientY,id:event.pointerId} : null; $('#stage').focus({preventScroll:true}); });
  renderer.domElement.addEventListener('pointerup',event => { if (pointerStart?.id === event.pointerId && Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)<5) inspect(event); activePointers.delete(event.pointerId); pointerStart = null; });
  renderer.domElement.addEventListener('pointercancel',event => { activePointers.delete(event.pointerId); pointerStart = null; });
  renderer.domElement.addEventListener('webglcontextlost',event => { event.preventDefault(); fatalFailure = new Error('WebGL context lost. Reload this page.'); refreshStatus(); });
  document.querySelectorAll('[data-locale]').forEach(button => button.addEventListener('click',() => { locale = button.dataset.locale; translate(); }));
  document.querySelectorAll('[data-lighting]').forEach(button => button.addEventListener('click',() => setLighting(button.dataset.lighting)));
  $('#reset-view').addEventListener('click',resetView);
  $('#site-selector').addEventListener('change',event => selectSite(event.target.value));
  $('#retry').addEventListener('click',() => currentOperation === 'reload' ? location.reload() : currentOperation === 'lighting' ? setLighting(state.requestedMode) : selectSite(state.siteId));
  window.addEventListener('pagehide',() => { disposed = true; siteController?.abort(); lightController?.abort(); cancelAnimationFrame(frameId); resize.disconnect(); controls.dispose(); disposeModel(model); environment?.dispose(); sun.shadow.map?.dispose(); renderer.dispose(); });
  sites = (await (await fetchChecked('/api/sites')).json()).sites;
  if (!sites.length) throw new Error('No sites were provided');
  for (const site of sites) { const option = document.createElement('option'); option.value = site.id; option.textContent = localText(site.title) || site.id; $('#site-selector').append(option); }
  $('#site-selector').disabled = false;
  await Promise.all([selectSite(sites[0].id),setLighting('day')]);
}

Object.defineProperty(window,'__SITE_WORKBENCH__',{ value:Object.freeze({snapshot:() => {
  const bounds = renderer?.domElement.getBoundingClientRect();
  return clone({ ...state,locale,hidden:document.hidden,camera:camera ? { position:camera.position.toArray(),target:controls.target.toArray(),near:camera.near,far:camera.far,projectionMatrix:camera.projectionMatrix.toArray(),matrixWorld:camera.matrixWorld.toArray() } : null,viewport:bounds ? {x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height,bufferWidth:renderer.domElement.width,bufferHeight:renderer.domElement.height,pixelRatio:renderer.getPixelRatio()} : null,shadow:sun ? {mapSize:sun.shadow.mapSize.toArray(),bias:sun.shadow.bias,normalBias:sun.shadow.normalBias,near:sun.shadow.camera.near,far:sun.shadow.camera.far,left:sun.shadow.camera.left,right:sun.shadow.camera.right,top:sun.shadow.camera.top,bottom:sun.shadow.camera.bottom} : null,renderer:renderer ? { geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles } : null,representation:manifest?.representation || null,navigation:manifest?.navigation || null });
}}),writable:false });
initialize().catch(error => { fatalFailure = error; refreshStatus(); $('#retry').onclick = () => location.reload(); });
