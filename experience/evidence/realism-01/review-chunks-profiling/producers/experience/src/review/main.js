import './styles.css';
import { copy } from './copy.js';

class ViewerModuleError extends Error {
  constructor(cause) {
    super('The 3D viewer module could not load', { cause });
    this.name = 'ViewerModuleError';
  }
}

const params = new URLSearchParams(window.location.search);
let language = params.get('lang') === 'zh' ? 'zh' : 'en';
let variant = params.get('variant') === 'original' ? 'original' : 'streamed';
let scene;
let tour;
let sceneState = { status: 'loading', phase: 'viewer', firstView: false };
let startupPending = false;
let disposed = false;
let firstViewMarked = false;

const icon = (paths) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const icons = {
  left: icon('<path d="m10 6-6 6 6 6M4 12h16"/>'),
  right: icon('<path d="m14 6 6 6-6 6M20 12H4"/>'),
  up: icon('<path d="m6 10 6-6 6 6M12 4v16"/>'),
  down: icon('<path d="m6 14 6 6 6-6M12 20V4"/>'),
  plus: icon('<path d="M12 5v14M5 12h14"/>'),
  minus: icon('<path d="M5 12h14"/>'),
  reset: icon('<path d="M4 5v5h5M4.6 10a8 8 0 1 1 .4 6"/>'),
  fullscreen: icon('<path d="M9 4H4v5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>'),
};

document.querySelector('#review-root').innerHTML = `
  <header class="review-header">
    <span class="study-label" data-copy="studyLabel"></span>
    <nav class="language-switch" data-label="language">
      <button id="language-en" type="button" lang="en" aria-label="English">EN</button>
      <button id="language-zh" type="button" lang="zh" aria-label="中文">中文</button>
    </nav>
  </header>
  <section class="opening" aria-labelledby="place-title">
    <div>
      <p class="eyebrow" data-copy="experience"></p>
      <h1 id="place-title" data-copy="place"></h1>
      <p class="introduction" data-copy="introduction"></p>
    </div>
    <p class="location" data-copy="location"></p>
  </section>
  <section class="review-workspace" aria-labelledby="place-title">
    <div class="comparison-bar">
      <div class="variant-switch" role="group" data-label="variantGroup">
        <button id="variant-streamed" type="button" data-variant="streamed" data-copy="streamed"></button>
        <button id="variant-original" type="button" data-variant="original"><span data-copy="original"></span> <small data-copy="originalSize"></small></button>
      </div>
      <div class="comparison-copy">
        <p data-copy="comparison"></p>
        <p id="variant-description"></p>
      </div>
    </div>
    <div id="scene-shell" class="scene-shell" data-first-view="false">
      <div class="canvas-frame">
        <canvas id="review-canvas" tabindex="0" role="application" data-label="canvasLabel" aria-describedby="gesture-help keyboard-help"></canvas>
        <div id="scene-status" class="scene-status" role="status" aria-live="polite" data-status="loading">
          <span class="status-indicator" aria-hidden="true"></span>
          <span id="status-text"></span>
        </div>
        <div id="error-panel" class="error-panel" hidden>
          <p id="error-help"></p>
          <button id="retry-scene" class="primary" type="button"></button>
        </div>
        <p id="gesture-help" class="gesture-help" data-copy="gestureHelp"></p>
      </div>
      <div class="tour-toolbar" role="group" data-label="tourControls">
        <div class="tour-buttons">
          <button id="tour-toggle" type="button" disabled></button>
          <button id="tour-reverse" type="button" data-copy="tourReverse" disabled></button>
        </div>
        <p id="tour-notice" role="status" aria-live="polite"></p>
      </div>
      <div class="camera-toolbar" role="group" data-label="cameraControls">
        <div class="camera-group">
          <span data-copy="rotate"></span>
          <div>
            <button type="button" data-action="rotate-left" data-label="rotateLeft" disabled>${icons.left}</button>
            <button type="button" data-action="rotate-right" data-label="rotateRight" disabled>${icons.right}</button>
          </div>
        </div>
        <div class="camera-group">
          <span data-copy="tilt"></span>
          <div>
            <button type="button" data-action="tilt-up" data-label="tiltUp" disabled>${icons.up}</button>
            <button type="button" data-action="tilt-down" data-label="tiltDown" disabled>${icons.down}</button>
          </div>
        </div>
        <div class="camera-group">
          <span data-copy="zoom"></span>
          <div>
            <button type="button" data-action="zoom-out" data-label="zoomOut" disabled>${icons.minus}</button>
            <button type="button" data-action="zoom-in" data-label="zoomIn" disabled>${icons.plus}</button>
          </div>
        </div>
        <div class="camera-actions">
          <button type="button" data-action="reset" data-label="reset" disabled>${icons.reset}<span data-copy="reset"></span></button>
          <button type="button" data-action="fullscreen" data-label="enterFullscreen">${icons.fullscreen}<span id="fullscreen-label"></span></button>
        </div>
      </div>
      <p id="control-notice" class="control-notice" role="status" aria-live="polite"></p>
    </div>
    <div class="under-view">
      <details class="view-help">
        <summary data-copy="help"></summary>
        <div class="help-content">
          <div><h2 data-copy="keyboardTitle"></h2><p id="keyboard-help" data-copy="keyboardHelp"></p></div>
          <div><h2 data-copy="touchTitle"></h2><p data-copy="touchHelp"></p></div>
          <div><h2 data-copy="captureTitle"></h2><p data-copy="captureHelp"></p></div>
        </div>
      </details>
      <a id="baseline-link" class="baseline-link" data-copy="baseline"></a>
    </div>
  </section>
  <footer class="review-footer">
    <p><span data-copy="creditLead"></span> <a href="https://superspl.at/scene/0ff2e6dc" target="_blank" rel="noopener noreferrer">scbenoit · Knock Community Hall</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" data-copy="license"></a></p>
    <p data-copy="creditChange"></p>
  </footer>
`;

const canvas = document.querySelector('#review-canvas');
const shell = document.querySelector('#scene-shell');
const statusElement = document.querySelector('#scene-status');
const cameraButtons = [...document.querySelectorAll('[data-action]')];
const fullscreenButton = document.querySelector('[data-action="fullscreen"]');
const controlNotice = document.querySelector('#control-notice');
const tourButton = document.querySelector('#tour-toggle');
const reverseButton = document.querySelector('#tour-reverse');

Object.defineProperty(window, '__REALISM_REVIEW__', {
  value: Object.freeze({ snapshot: () => {
    const view = scene?.getView();
    return view ? { ...view, tour: tour?.getState() ?? null } : null;
  } }),
  configurable: false,
  writable: false,
});

function updateLocation() {
  const url = new URL(window.location.href);
  url.searchParams.set('lang', language);
  url.searchParams.set('variant', variant);
  window.history.replaceState(null, '', url);
}

function updateFullscreen() {
  const active = document.fullscreenElement === shell;
  const supported = Boolean(document.fullscreenEnabled && shell.requestFullscreen);
  fullscreenButton.disabled = !supported;
  fullscreenButton.setAttribute('aria-label', copy[language][active ? 'exitFullscreen' : 'enterFullscreen']);
  fullscreenButton.setAttribute('aria-pressed', String(active));
  fullscreenButton.title = supported ? '' : copy[language].fullscreenUnavailable;
  const label = !supported ? 'fullscreenUnavailableLabel' : active ? 'exitFullscreen' : 'fullscreen';
  document.querySelector('#fullscreen-label').textContent = copy[language][label];
}

function renderState() {
  const text = copy[language];
  const { status, phase, firstView } = sceneState;
  statusElement.dataset.status = status;
  shell.dataset.firstView = String(Boolean(firstView));
  canvas.setAttribute('aria-busy', String(status === 'loading'));
  const key = status === 'error' ? 'error'
    : status === 'streaming' ? 'streaming'
      : status === 'interactive' ? 'ready'
        : phase === 'viewer' ? 'viewerLoading'
          : phase === 'decoding' ? 'decoding'
          : phase === 'rendering' ? 'rendering' : 'loading';
  const knownDownload = status === 'loading' && phase === 'downloading' && variant === 'original'
    && Number.isFinite(sceneState.totalBytes) && sceneState.totalBytes > 0
    && Number.isFinite(sceneState.loadedBytes) && sceneState.loadedBytes >= 0 && sceneState.loadedBytes <= sceneState.totalBytes;
  document.querySelector('#status-text').textContent = knownDownload
    ? text.originalProgress.replace('{percent}', String(Math.floor(sceneState.loadedBytes / sceneState.totalBytes * 100)))
    : text[key];
  document.querySelector('#error-panel').hidden = status !== 'error';
  document.querySelector('#gesture-help').hidden = !firstView || status === 'error';
  const errorHelpKey = sceneState.errorStage === 'viewer' ? 'viewerLoadError' : sceneState.requiresReload ? 'contextLost' : 'errorHelp';
  document.querySelector('#error-help').textContent = text[errorHelpKey];
  document.querySelector('#retry-scene').textContent = text[sceneState.requiresReload ? 'reload' : 'retry'];
  cameraButtons.forEach((button) => {
    if (button.dataset.action !== 'fullscreen') button.disabled = !firstView || status === 'error';
  });
  document.querySelectorAll('[data-variant]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.variant === variant));
  });
  document.querySelector('#variant-description').textContent = text[`${variant}Description`];
  if (!firstView || status === 'error') tour?.pause(status === 'error' ? 'error' : 'loading');
  renderTour();
}

function renderTour() {
  const state = tour?.getState() ?? { status: 'idle', direction: 1 };
  const text = copy[language];
  const enabled = Boolean(tour && sceneState.firstView && sceneState.status !== 'error');
  tourButton.disabled = !enabled;
  reverseButton.disabled = !enabled;
  tourButton.dataset.status = state.status;
  const buttonKey = { idle: 'tourStart', running: 'tourPause', paused: 'tourResume', complete: 'tourAgain' }[state.status];
  tourButton.textContent = text[buttonKey];
  tourButton.setAttribute('aria-pressed', String(state.status === 'running'));
  reverseButton.setAttribute('aria-pressed', String(state.direction === -1));
  let notice = 'tourHint';
  if (state.status === 'running') notice = state.phase === 'approach' ? 'tourApproach' : 'tourRunning';
  if (state.status === 'paused') notice = 'tourPaused';
  if (state.status === 'complete') notice = 'tourComplete';
  const element = document.querySelector('#tour-notice');
  if (element.textContent !== text[notice]) element.textContent = text[notice];
}

function renderLanguage() {
  const text = copy[language];
  document.documentElement.lang = language;
  document.title = text.documentTitle;
  document.querySelectorAll('[data-copy]').forEach((element) => {
    element.textContent = text[element.dataset.copy];
  });
  document.querySelectorAll('[data-label]').forEach((element) => {
    element.setAttribute('aria-label', text[element.dataset.label]);
    if (element.matches('button[data-action]')) element.title = text[element.dataset.label];
  });
  document.querySelector('#language-en').setAttribute('aria-pressed', String(language === 'en'));
  document.querySelector('#language-zh').setAttribute('aria-pressed', String(language === 'zh'));
  const baseline = new URL('https://paperstrange.github.io/TourGuideAI/previews/shijo-east-c13/');
  if (language === 'zh') baseline.searchParams.set('lang', 'zh');
  document.querySelector('#baseline-link').href = baseline.href;
  controlNotice.textContent = '';
  updateFullscreen();
  renderState();
}

async function startScene() {
  if (startupPending || disposed) return;
  startupPending = true;
  sceneState = { status: 'loading', phase: 'viewer', firstView: false };
  renderState();
  try {
    const manifestUrl = new URL('./review-assets.json', window.location.href);
    // 页面控制先显示，Three 与 Spark 模块和来源清单并行加载。
    const modules = Promise.all([import('./scene.js'), import('./camera-tour.js')]).then(result => {
      performance.mark('review-scene-module-ready');
      return result;
    }, error => { throw new ViewerModuleError(error); });
    const [response, [{ createReviewScene }, { createCameraTour }]] = await Promise.all([fetch(manifestUrl), modules]);
    if (!response.ok) throw new Error(`Review manifest returned ${response.status}`);
    const manifest = await response.json();
    if (typeof manifest.original !== 'string' || typeof manifest.streamed !== 'string') {
      throw new Error('Review manifest requires original and streamed asset paths');
    }
    if (disposed) return;
    const assets = {
      original: new URL(manifest.original, manifestUrl).href,
      streamed: new URL(manifest.streamed, manifestUrl).href,
      camera: manifest.camera,
    };
    scene = createReviewScene({
      canvas,
      assets,
      onState(state) {
        if (disposed) return;
        if (state.firstView && !firstViewMarked) {
          firstViewMarked = true;
          performance.mark('review-first-visible');
        }
        sceneState = state;
        renderState();
      },
    });
    tour = createCameraTour({ scene, reference: assets.camera ?? scene.getView(), onChange: renderTour });
    renderTour();
    await scene.setVariant(variant);
  } catch (error) {
    sceneState = { status: 'error', firstView: false, error,
      errorStage: error instanceof ViewerModuleError ? 'viewer' : 'source', requiresReload: error instanceof ViewerModuleError };
    renderState();
  } finally {
    startupPending = false;
  }
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement === shell) await document.exitFullscreen();
    else await shell.requestFullscreen();
    controlNotice.textContent = '';
  } catch {
    controlNotice.textContent = copy[language].fullscreenFailed;
  }
}

function moveCamera(action) {
  if (!scene || !sceneState.firstView || sceneState.status === 'error') return;
  if (action === 'reset') tour?.reset();
  else tour?.pause('manual');
  const commands = {
    'rotate-left': () => scene.rotate(-0.15),
    'rotate-right': () => scene.rotate(0.15),
    'tilt-up': () => scene.tilt(-0.1),
    'tilt-down': () => scene.tilt(0.1),
    'zoom-in': () => scene.zoom(0.8),
    'zoom-out': () => scene.zoom(1.25),
    reset: () => {
      scene.reset();
      controlNotice.textContent = copy[language].focusNotice;
    },
  };
  commands[action]?.();
}

cameraButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.action === 'fullscreen') { tour?.pause('manual'); void toggleFullscreen(); }
    else moveCamera(button.dataset.action);
  });
});

tourButton.addEventListener('click', () => {
  if (tour?.getState().status === 'running') tour.pause('button');
  else tour?.start();
});
reverseButton.addEventListener('click', () => tour?.reverse());
canvas.addEventListener('pointerdown', () => tour?.pause('manual'), { capture: true, passive: true });
canvas.addEventListener('wheel', () => tour?.pause('manual'), { capture: true, passive: true });

canvas.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const actions = {
    ArrowLeft: 'rotate-left', ArrowRight: 'rotate-right',
    ArrowUp: 'tilt-up', ArrowDown: 'tilt-down',
    '+': 'zoom-in', '=': 'zoom-in', '-': 'zoom-out', '_': 'zoom-out',
    r: 'reset', R: 'reset',
  };
  if (actions[event.key]) {
    event.preventDefault();
    moveCamera(actions[event.key]);
  }
});

document.querySelectorAll('[data-variant]').forEach((button) => {
  button.addEventListener('click', () => {
    const selected = button.dataset.variant;
    if (selected === variant) return;
    tour?.pause('variant');
    variant = selected;
    controlNotice.textContent = '';
    updateLocation();
    renderState();
    if (scene) void scene.setVariant(variant);
  });
});

for (const locale of ['en', 'zh']) {
  document.querySelector(`#language-${locale}`).addEventListener('click', () => {
    language = locale;
    updateLocation();
    renderLanguage();
  });
}

document.querySelector('#retry-scene').addEventListener('click', () => {
  if (sceneState.requiresReload) window.location.reload();
  else if (scene) void scene.setVariant(variant, { force: true });
  else void startScene();
});

const resizeObserver = new ResizeObserver(() => scene?.resize());
resizeObserver.observe(canvas);
document.addEventListener('fullscreenchange', () => {
  updateFullscreen();
  scene?.resize();
});
window.addEventListener('pagehide', (event) => {
  tour?.pause('hidden');
  if (event.persisted) return;
  disposed = true;
  resizeObserver.disconnect();
  tour?.dispose();
  scene?.dispose();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) tour?.pause('hidden');
});

renderLanguage();
performance.mark('review-controls-ready');
void startScene();
