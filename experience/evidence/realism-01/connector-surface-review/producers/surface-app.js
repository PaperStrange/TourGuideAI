const response = await fetch(new URL('surface-data.json', import.meta.url));
if (!response.ok) throw new Error(`Surface evidence returned ${response.status}`);
const data = await response.json();
if (data.schemaVersion !== 1 || data.routeQualified !== false || !Array.isArray(data.views) || !data.views.length) {
  throw new Error('Verified surface data and source views are required');
}
const translations = {
  en: {
    place: 'Kyoto · Shijō–Karasuma', title: 'A closer look at Kyoto',
    intro: 'Explore the surfaces reconstructed from four real street photographs.', scope: 'Surface study · captured daylight · relative scale',
    viewerTitle: 'Photograph and reconstruction', position: 'Capture position', photo: 'Photograph', surface: '3D surface',
    load: 'Load the 3D surface', loading: 'Loading the reconstructed surface…', ready: 'Selected capture view', inspecting: 'Free inspection',
    left: 'Turn left', right: 'Turn right', closer: 'Closer', farther: 'Farther', reset: 'Reset view',
    guidance: 'Drag to inspect, scroll to zoom. Focus the 3D view to use arrow keys, + / − and Home. Reset returns to the selected photograph’s camera.',
    resultTitle: 'What this experiment shows', evaluationTitle: 'Photographs kept for evaluation',
    evaluationIntro: 'Two adjacent captures were reserved before reconstruction. Their results measure this capture sequence; independent place recognition remains a separate check.',
    qualification: 'The complete 1.35 km walk remains under construction. Street coverage, measured ground, real-world scale and realistic appearance still require validation.',
    performance: 'The 3D download and graphics memory still exceed the intended delivery budgets. Loading remains optional for this research view.',
    credits: 'Photographs and derived surfaces: Irvin Chen / Panoramax Taiwan · CC BY-SA 4.0. Virtual views are projections of the original panoramas.',
    evidence: 'Sources, measurements and earlier trials', mode: 'View mode', canvas: 'Interactive reconstructed surface',
    failed: 'The surface is unavailable for this trial.', sourceAlt: 'Projected original panorama from capture position',
    sourceCaption: '17 February 2026 · Irvin Chen / Panoramax Taiwan · CC BY-SA 4.0 · source panorama projection',
    download: '3D asset download', sourcePosition: 'Position', noSurface: 'Surface trial result', loadError: 'The surface could not be loaded. The error is recorded in the browser console.',
    reservedPhoto: 'Reserved photograph', reprojection: 'Surface reprojection',
  },
  zh: {
    place: '京都 · 四条乌丸', title: '走近京都的建筑',
    intro: '查看由四个真实街景拍摄位置重建的建筑表面。', scope: '表面重建研究 · 拍摄时的日光 · 相对尺度',
    viewerTitle: '原始照片与重建结果', position: '拍摄位置', photo: '原始照片', surface: '三维表面',
    load: '加载三维表面', loading: '正在加载重建表面……', ready: '所选拍摄视角', inspecting: '自由观察',
    left: '向左转动', right: '向右转动', closer: '拉近', farther: '拉远', reset: '恢复拍摄视角',
    guidance: '拖动查看，滚动缩放。选中三维视图后，可使用方向键、加减键和 Home 键。恢复按钮会返回所选照片的拍摄视角。',
    resultTitle: '本次实验的结果', evaluationTitle: '预先保留的评估照片',
    evaluationIntro: '重建前预留了相邻的两个拍摄位置用于评估。结果适用于本次拍摄序列，独立的地点识别测试仍需单独验证。',
    qualification: '完整的 1.35 公里步行路线仍在建设中。街道覆盖、实测地面、真实尺度与外观真实性仍需验证。',
    performance: '三维资源下载量与图形内存仍超过预期的交付预算。本研究视图通过手动操作加载三维资源。',
    credits: '照片与衍生表面：Irvin Chen / Panoramax Taiwan · CC BY-SA 4.0。虚拟视图由原始全景照片投影生成。',
    evidence: '来源、测量结果与此前实验', mode: '视图模式', canvas: '可交互的重建表面',
    failed: '本次实验尚无可加载的表面。', sourceAlt: '拍摄位置的原始全景投影视图',
    sourceCaption: '2026 年 2 月 17 日 · Irvin Chen / Panoramax Taiwan · CC BY-SA 4.0 · 原始全景投影',
    download: '三维资源下载量', sourcePosition: '拍摄位置', noSurface: '表面实验结果', loadError: '表面加载失败，浏览器控制台已记录具体错误。',
    reservedPhoto: '预留照片', reprojection: '表面重投影',
  },
};
const element = selector => document.querySelector(selector);
let language = new URL(location.href).searchParams.get('lang') === 'zh' ? 'zh' : 'en';
let selected = data.views[0];
let loaded = false;
let inspecting = false;
let mode = 'photo';
let renderer, camera, controls, scene, THREE, OrbitControls;
let viewPending = false;
let viewGeneration = 0;
let draws = 0;
let meshTriangles = 0;
let texturedMeshes = 0;
const materialObservations = [];
const textureObservations = new Map();
const geometryBuffers = new Set();
let currentPose;
const dictionary = () => translations[language];
const textValue = value => typeof value === 'string' ? value : value[language];
function translated() {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.title = language === 'zh' ? '京都 · 表面重建研究' : 'Kyoto · reconstructed surfaces';
  for (const node of document.querySelectorAll('[data-text]')) node.textContent = dictionary()[node.dataset.text];
  element('#language').textContent = language === 'zh' ? 'English' : '中文';
  element('#language').lang = language === 'zh' ? 'en' : 'zh';
  element('#mode-group').setAttribute('aria-label', dictionary().mode);
  element('#surface-canvas').setAttribute('aria-label', dictionary().canvas);
  element('#view-status').textContent = inspecting ? dictionary().inspecting : dictionary().ready;
  element('#loading').textContent = dictionary().loading;
  element('#download-size').textContent = `${dictionary().download} · ${(data.model.bytes / 1048576).toFixed(2)} MiB`;
  element('#result-description').textContent = textValue(data.description);
  for (const [index, option] of [...element('#view').options].entries()) option.textContent = `${dictionary().sourcePosition} ${data.views[index].rank}`;
  element('#source-photo').alt = `${dictionary().sourceAlt} ${selected.rank}`;
  element('#source-caption').textContent = `${dictionary().sourcePosition} ${selected.rank} · ${dictionary().sourceCaption}`;
  element('#measurements').replaceChildren();
  for (const measurement of data.measurements) {
    const group = document.createElement('div'), label = document.createElement('dt'), value = document.createElement('dd');
    label.textContent = textValue(measurement.label); value.textContent = measurement.value;
    group.append(label, value); element('#measurements').append(group);
  }
  element('#heldout-results').replaceChildren();
  for (const item of data.heldout) {
    const article = document.createElement('article'); article.className = 'heldout'; article.dataset.rank = item.rank;
    const title = document.createElement('h3'), description = document.createElement('p');
    title.textContent = `${dictionary().sourcePosition} ${item.rank}`; description.textContent = textValue(item.description);
    article.append(title, description);
    if (item.comparison) {
      const pair = document.createElement('div'); pair.className = 'image-pair';
      for (const [key, label] of [['referenceImage', 'reservedPhoto'], ['renderImage', 'reprojection']]) {
        const figure = document.createElement('figure'), image = document.createElement('img'), caption = document.createElement('figcaption');
        image.src = item.comparison[key]; image.alt = `${dictionary()[label]} · ${item.rank}`; image.loading = 'lazy';
        caption.textContent = dictionary()[label]; figure.append(image, caption); pair.append(figure);
      }
      article.append(pair);
    }
    element('#heldout-results').append(article);
  }
  element('#evidence-links').replaceChildren();
  for (const link of data.evidence) {
    const item = document.createElement('li'), anchor = document.createElement('a');
    anchor.href = link.path; anchor.textContent = textValue(link.label); item.append(anchor); element('#evidence-links').append(item);
  }
  if (data.model.status === 'failed') element('#load-surface').textContent = dictionary().failed;
}
function draw() {
  if (!renderer || mode !== 'surface') return;
  renderer.render(scene, camera);
  draws += 1;
  document.documentElement.dataset.surfaceFrame = String(draws);
}
function setMode(value) {
  if (value === 'surface' && !loaded) return;
  mode = value;
  element('#source-photo').hidden = value !== 'photo';
  element('#surface-canvas').hidden = value !== 'surface';
  element('#controls').hidden = value !== 'surface';
  element('#show-photo').setAttribute('aria-pressed', String(value === 'photo'));
  element('#show-surface').setAttribute('aria-pressed', String(value === 'surface'));
  if (controls) controls.enabled = value === 'surface';
  draw();
}
function resize() {
  if (!renderer) return;
  const box = element('#stage').getBoundingClientRect();
  renderer.setSize(Math.round(box.width), Math.round(box.width * selected.height / selected.width), false);
  draw();
}
async function selectView(id) {
  const requested = data.views.find(view => view.id === id);
  if (!requested) throw new Error('Unknown fitted capture view');
  const generation = ++viewGeneration;
  viewPending = true;
  const photo = new Image(); photo.src = requested.referenceImage;
  await photo.decode();
  if (generation !== viewGeneration) return;
  selected = requested;
  element('#view').value = selected.id;
  element('#stage').style.aspectRatio = `${selected.width} / ${selected.height}`;
  element('#source-photo').src = selected.referenceImage;
  inspecting = false;
  if (loaded) {
    const matrix = new THREE.Matrix4().set(...selected.camFromWorld[0], ...selected.camFromWorld[1], ...selected.camFromWorld[2], 0, 0, 0, 1).invert();
    // COLMAP 使用向下的 Y 轴和向前的 Z 轴，Three 相机使用相反的两根轴。
    matrix.multiply(new THREE.Matrix4().makeScale(1, -1, -1));
    matrix.decompose(camera.position, camera.quaternion, new THREE.Vector3());
    camera.up.setFromMatrixColumn(matrix, 1).normalize();
    currentPose = matrix.toArray();
    camera.near = selected.near;
    camera.far = selected.far;
    camera.projectionMatrix.makePerspective(-selected.cx * camera.near / selected.fx,
      (selected.width - selected.cx) * camera.near / selected.fx,
      selected.cy * camera.near / selected.fy, -(selected.height - selected.cy) * camera.near / selected.fy,
      camera.near, camera.far, THREE.WebGLCoordinateSystem);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    const target = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(selected.orbitDistance));
    controls?.dispose();
    controls = new OrbitControls(camera, element('#surface-canvas'));
    controls.target.copy(target); controls.enableDamping = false; controls.enablePan = false;
    controls.minDistance = selected.orbitDistance * 0.15; controls.maxDistance = selected.orbitDistance * 4;
    controls.update();
    controls.addEventListener('change', () => { inspecting = true; element('#view-status').textContent = dictionary().inspecting; draw(); });
    controls.enabled = mode === 'surface';
    camera.updateMatrixWorld(true);
    resize();
  }
  viewPending = false;
  translated();
}
function move(operation, value) {
  if (!loaded || mode !== 'surface') return;
  controls[operation](value);
}
async function loadSurface() {
  element('#load-surface').disabled = true;
  element('#loading').hidden = false;
  THREE = await import('three');
  const orbitModule = await import('./surface/vendor/OrbitControls.js');
  OrbitControls = orbitModule.OrbitControls;
  let object;
  if (data.model.format === 'gltf') {
    const { GLTFLoader } = await import('./surface/vendor/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(data.model.gltf);
    object = gltf.scene;
  } else if (data.model.format === 'obj') {
    const [{ OBJLoader }, { MTLLoader }] = await Promise.all([import('./surface/vendor/OBJLoader.js'), import('./surface/vendor/MTLLoader.js')]);
    const manager = new THREE.LoadingManager();
    let rejectTextures;
    const texturesReady = new Promise((resolve, reject) => { manager.onLoad = resolve; rejectTextures = reject; });
    manager.onError = url => rejectTextures(new Error(`Surface texture failed: ${url}`));
    const materialsResponse = await fetch(data.model.mtl);
    if (!materialsResponse.ok) throw new Error(`Surface material returned ${materialsResponse.status}`);
    const materials = new MTLLoader(manager).setMaterialOptions({ invertTrProperty: data.model.mtlTrAsOpacity })
      .parse(await materialsResponse.text(), new URL('.', new URL(data.model.mtl, location.href)).href);
    materials.preload();
    object = await new OBJLoader().setMaterials(materials).loadAsync(data.model.obj);
    if (data.model.textures.length) await texturesReady;
  } else {
    throw new Error('Unsupported retained surface format');
  }
  object.traverse(node => {
    if (node.isLight) throw new Error('Captured-color study requires an asset without added lights');
    if (!node.isMesh) return;
    const position = node.geometry.getAttribute('position');
    meshTriangles += (node.geometry.index ? node.geometry.index.count : position.count) / 3;
    for (const attribute of Object.values(node.geometry.attributes)) geometryBuffers.add(attribute.array.buffer);
    if (node.geometry.index) geometryBuffers.add(node.geometry.index.array.buffer);
    const convert = material => {
      if (material.map) {
        const sourceSampler = { generateMipmaps: material.map.generateMipmaps, minFilter: material.map.minFilter, magFilter: material.map.magFilter };
        material.map.colorSpace = THREE.SRGBColorSpace;
        // 浏览器使用完整分辨率和正常 mipmaps，原生 glTF 文件保持原样。
        material.map.generateMipmaps = true; material.map.minFilter = THREE.LinearMipmapLinearFilter;
        material.map.magFilter = THREE.LinearFilter; material.map.needsUpdate = true;
        texturedMeshes += 1;
        const texture = material.map;
        let width = texture.image.width, height = texture.image.height, mipPixels = width * height;
        if (texture.generateMipmaps) while (width > 1 || height > 1) {
          width = Math.max(1, Math.floor(width / 2)); height = Math.max(1, Math.floor(height / 2)); mipPixels += width * height;
        }
        textureObservations.set(texture.uuid, { width: texture.image.width, height: texture.image.height,
          generateMipmaps: texture.generateMipmaps, minFilter: texture.minFilter, magFilter: texture.magFilter,
          format: texture.format, type: texture.type, colorSpace: texture.colorSpace, sourceSampler, estimatedRGBA8Bytes: mipPixels * 4 });
      }
      const captured = new THREE.MeshBasicMaterial({ color: material.color, map: material.map,
        vertexColors: Boolean(node.geometry.getAttribute('color')), side: material.side,
        opacity: material.opacity, transparent: material.transparent, alphaTest: material.alphaTest });
      materialObservations.push({ name: material.name, opacity: captured.opacity, transparent: captured.transparent,
        sourceSide: material.side, renderedSide: captured.side, color: captured.color.toArray(),
        textureWidth: captured.map?.image?.width ?? null, textureHeight: captured.map?.image?.height ?? null });
      material.dispose();
      return captured;
    };
    node.material = Array.isArray(node.material) ? node.material.map(convert) : convert(node.material);
  });
  if (meshTriangles !== data.model.triangles || !Number.isFinite(meshTriangles) || meshTriangles <= 0) throw new Error('Decoded geometry differs from retained triangle count');
  if (data.model.status === 'textured' && texturedMeshes === 0) throw new Error('Textured result contains no loaded texture');
  renderer = new THREE.WebGLRenderer({ canvas: element('#surface-canvas'), antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  scene = new THREE.Scene(); scene.background = new THREE.Color('#e6ece5'); scene.add(object);
  camera = new THREE.PerspectiveCamera();
  loaded = true;
  await selectView(element('#view').value);
  element('#loading').hidden = true;
  element('#load-surface').hidden = true;
  element('#show-surface').disabled = false;
  setMode('surface');
  document.documentElement.dataset.surfaceReady = 'true';
}
element('#language').addEventListener('click', () => {
  language = language === 'zh' ? 'en' : 'zh';
  const url = new URL(location.href); url.searchParams.set('lang', language); history.replaceState(null, '', url); translated();
});
for (const view of data.views) { const option = document.createElement('option'); option.value = view.id; element('#view').append(option); }
element('#view').addEventListener('change', event => selectView(event.target.value));
element('#load-surface').addEventListener('click', loadSurface);
element('#show-photo').addEventListener('click', async () => { await selectView(element('#view').value); setMode('photo'); });
element('#show-surface').addEventListener('click', () => setMode('surface'));
element('#reset').addEventListener('click', () => selectView(element('#view').value));
element('#turn-left').addEventListener('click', () => move('rotateLeft', Math.PI / 24));
element('#turn-right').addEventListener('click', () => move('rotateLeft', -Math.PI / 24));
element('#zoom-in').addEventListener('click', () => move('dollyIn', 0.9));
element('#zoom-out').addEventListener('click', () => move('dollyOut', 0.9));
element('#surface-canvas').addEventListener('keydown', event => {
  const actions = { ArrowLeft: ['rotateLeft', Math.PI / 24], ArrowRight: ['rotateLeft', -Math.PI / 24],
    ArrowUp: ['rotateUp', Math.PI / 24], ArrowDown: ['rotateUp', -Math.PI / 24], '+': ['dollyIn', 0.9],
    '=': ['dollyIn', 0.9], '-': ['dollyOut', 0.9] };
  if (actions[event.key]) { event.preventDefault(); move(...actions[event.key]); }
  if (event.key === 'Home') { event.preventDefault(); selectView(element('#view').value); }
});
window.addEventListener('resize', resize);
window.addEventListener('unhandledrejection', () => { element('#loading').hidden = false; element('#loading').textContent = dictionary().loadError; });
window.__surfaceReview = Object.freeze({ projectReferences() {
  if (!camera) throw new Error('Surface camera is unavailable');
  camera.updateMatrixWorld(true);
  return selected.projectionReferences.map(reference => {
    const projected = new THREE.Vector3().fromArray(reference.xyz).project(camera);
    return { pointId: reference.pointId, pixel: [(projected.x + 1) * selected.width / 2, (1 - projected.y) * selected.height / 2] };
  });
}, snapshot() {
  camera?.updateMatrixWorld(true);
  let allocations = null;
  if (renderer) {
    const gl = renderer.getContext();
    const bits = { red: gl.getParameter(gl.RED_BITS), green: gl.getParameter(gl.GREEN_BITS), blue: gl.getParameter(gl.BLUE_BITS),
      alpha: gl.getParameter(gl.ALPHA_BITS), depth: gl.getParameter(gl.DEPTH_BITS), stencil: gl.getParameter(gl.STENCIL_BITS) };
    const colorBytes = (bits.red + bits.green + bits.blue + bits.alpha) / 8;
    const depthStencilBytes = (bits.depth + bits.stencil) / 8;
    const samples = gl.getParameter(gl.SAMPLES), pixels = gl.drawingBufferWidth * gl.drawingBufferHeight;
    const estimatedAttachmentBytes = pixels * ((colorBytes + depthStencilBytes) * Math.max(1, samples) + (samples > 1 ? colorBytes : 0));
    const textures = [...textureObservations.values()];
    const estimatedTextureBytes = textures.reduce((sum, texture) => sum + texture.estimatedRGBA8Bytes, 0);
    allocations = { drawingBufferWidth: gl.drawingBufferWidth, drawingBufferHeight: gl.drawingBufferHeight,
      devicePixelRatio, appliedPixelRatio: renderer.getPixelRatio(), contextAttributes: gl.getContextAttributes(), samples, bits, textures,
      rendererTextureCount: renderer.info.memory.textures, explicitRenderTargets: 0,
      estimatedTextureBytes, estimatedAttachmentBytes, estimatedTextureAndAttachmentBytes: estimatedTextureBytes + estimatedAttachmentBytes,
      decodedGeometryBufferBytes: [...geometryBuffers].reduce((sum, buffer) => sum + buffer.byteLength, 0),
      physicalAllocationKnown: false,
      limitations: 'RGBA8 texture mip-chain and reported default framebuffer attachment estimate. Driver padding, backing buffers, compositor and browser image memory are unknown; this is not physical GPU allocation or a performance acceptance.' };
  }
  return { loaded, mode, language, selectedView: selected.id, inspecting, viewPending, draws, meshTriangles, texturedMeshes,
    materials: materialObservations, allocations,
    orbitDistance: controls ? controls.getDistance() : null,
    camera: camera ? { world: camera.matrixWorld.toArray(), projection: camera.projectionMatrix.toArray(), expectedSourceWorld: currentPose } : null,
    renderer: renderer ? { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls,
      outputColorSpace: renderer.outputColorSpace, toneMapping: renderer.toneMapping } : null };
} });
await selectView(selected.id);
element('#view').disabled = false;
element('#show-photo').disabled = false;
element('#load-surface').disabled = data.model.status === 'failed';
document.documentElement.dataset.reviewReady = 'true';
