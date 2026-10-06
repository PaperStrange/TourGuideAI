import './styles.css';
import { t } from '../ui/i18n.js';
import { validateManifest, localAsset } from './manifest.js';
import { createStudyRenderer } from './study-renderer.js';
import fontLicense from '../ui/assets/NOTO-LICENSE.txt?raw';
import runtimeNotices from '../ui/assets/THIRD-PARTY-NOTICES.txt?raw';

const appURL = new URL(import.meta.env.BASE_URL, document.baseURI);
const manifestURL = new URL('render-study/manifest.json', appURL);
const params = new URLSearchParams(location.search);
let locale = params.get('lang') === 'zh' ? 'zh' : 'en';
let manifest, selected, renderer, controller, requestId = 0, mode = 'both';
let manifestStatus = 'loading', realtimeStatus = 'loading', imageStatus = 'loading';
const text = (key, vars) => t(locale, key, vars);
const label = value => value?.[locale] ?? value?.en ?? '';
const $ = selector => document.querySelector(selector);
const notice = document.createElement('script');
notice.type = 'text/plain'; notice.id = 'third-party-notices';
notice.textContent = `${fontLicense}\n\n${runtimeNotices}`; document.head.appendChild(notice);

$('#comparison-app').innerHTML = `
  <header class="study-header"><a id="back-link" href="./index.html" data-i18n="comparisonBack"></a><div class="language-switch" id="study-language" role="group"><button type="button" data-locale="en">EN</button><button type="button" data-locale="zh">中文</button></div></header>
  <main>
    <div class="study-heading"><span class="eyebrow">KYOTO · SHIJO</span><h1 data-i18n="comparisonTitle"></h1><p data-i18n="comparisonIntro"></p></div>
    <section class="study-controls"><label class="view-control" for="study-view"><span data-i18n="comparisonViewLabel"></span><select id="study-view" disabled></select></label><fieldset id="study-mode"><legend data-i18n="comparisonModeLabel"></legend><label><input type="radio" name="mode" value="both" checked><span data-i18n="comparisonSideBySide"></span></label><label><input type="radio" name="mode" value="realtime"><span data-i18n="comparisonRealtimeOnly"></span></label><label><input type="radio" name="mode" value="still"><span data-i18n="comparisonStillOnly"></span></label></fieldset></section>
    <div id="manifest-status" role="status"></div><button type="button" id="study-retry" data-i18n="comparisonRetry" hidden></button>
    <div class="study-panels" id="study-panels" data-mode="both">
      <section class="study-panel" id="realtime-panel" aria-labelledby="realtime-title"><div class="panel-heading"><span class="panel-letter" aria-hidden="true">A</span><h2 id="realtime-title" data-i18n="comparisonRealtimeTitle"></h2></div><div class="study-frame"><div id="realtime-stage"></div><div class="frame-status" id="realtime-status" role="status"></div></div><p class="panel-caption" data-i18n="comparisonRealtimeCaption"></p></section>
      <section class="study-panel" id="still-panel" aria-labelledby="still-title"><div class="panel-heading"><span class="panel-letter" aria-hidden="true">B</span><h2 id="still-title" data-i18n="comparisonStillTitle"></h2></div><div class="study-frame"><img id="study-image" alt="" hidden><div class="frame-status" id="image-status" role="status"></div></div><p class="panel-caption" data-i18n="comparisonStillCaption"></p></section>
    </div>
    <p class="scope" data-i18n="comparisonScope"></p><p class="local-note" data-i18n="comparisonLocalOnly"></p>
    <details id="study-details"><summary data-i18n="comparisonRendererDetails"></summary><pre id="study-metrics"></pre></details>
    <div class="sr-only" id="study-announcement" role="status" aria-live="polite"></div>
  </main><footer>© OpenStreetMap contributors · ODbL · <a href="./credits.html" data-i18n="photoCredits"></a></footer>`;

function updateStatus() {
  $('#manifest-status').textContent = manifestStatus === 'ready' ? '' : text(manifestStatus === 'loading' ? 'comparisonLoading' : 'comparisonManifestUnavailable');
  const statuses = [['#realtime-status', realtimeStatus, 'comparisonUnavailable'], ['#image-status', imageStatus, 'comparisonImageUnavailable']];
  for (const [id, status, failureKey] of statuses) {
    $(id).textContent = status === 'ready' ? '' : text(status === 'loading' ? 'comparisonLoading' : failureKey);
    $(id).hidden = status === 'ready';
  }
  $('#study-retry').hidden = ![manifestStatus, realtimeStatus, imageStatus].includes('unavailable');
  $('#study-view').disabled = manifestStatus !== 'ready';
  $('#study-metrics').textContent = JSON.stringify({
    view: selected?.id ?? null, camera: selected?.camera ?? null,
    hiddenGroups: selected?.hiddenGroups ?? [],
    modelSha256: renderer?.snapshot().modelHash ?? manifest?.modelSha256 ?? null,
    renderSha256: selected?.renderSha256 ?? null,
    stillRenderer: manifest?.renderEngine ?? 'Blender Cycles',
    realtimeRenderer: 'Three.js r186 · WebGL2 · PBR Neutral',
    lighting: manifest?.lighting ?? null,
    fog: manifest?.fog ?? null,
    offlineLighting: manifest?.offlineLighting ?? null,
    renderingDifference: label(manifest?.renderDifference) || null,
  }, null, 2);
}

function applyLocale(next) {
  locale = next === 'zh' ? 'zh' : 'en';
  document.documentElement.lang = locale;
  document.title = `TourGuideAI · ${text('comparisonTitle')}`;
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = text(node.dataset.i18n); });
  document.querySelectorAll('[data-locale]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.locale === locale)));
  $('#study-language').setAttribute('aria-label', text('languageLabel'));
  for (const option of $('#study-view').options) option.textContent = label(manifest.views.find(view => view.id === option.value).label);
  const name = label(selected?.label);
  $('#study-image').alt = `${text('comparisonImageLabel')}${name ? ` · ${name}` : ''}`;
  renderer?.setLabel(`${text('comparisonCanvasLabel')}${name ? ` · ${name}` : ''}`);
  updateStatus();
}

function setMode(value) {
  mode = ['both', 'realtime', 'still'].includes(value) ? value : 'both';
  $('#study-panels').dataset.mode = mode;
  $('#realtime-panel').hidden = mode === 'still';
  $('#still-panel').hidden = mode === 'realtime';
  renderer?.resize();
}

function selectView(id, announce = true) {
  selected = manifest.views.find(view => view.id === id) ?? manifest.views[0];
  $('#study-view').value = selected.id;
  document.querySelectorAll('.study-frame').forEach(node => node.style.setProperty('--view-aspect', selected.camera.aspect));
  renderer?.selectView(selected);
  imageStatus = 'loading'; $('#study-image').hidden = true;
  const imageAsset = localAsset(selected.file, manifestURL, appURL);
  if (selected.renderSha256) imageAsset.searchParams.set('v', selected.renderSha256);
  const imageURL = imageAsset.href;
  $('#study-image').onload = () => {
    if ($('#study-image').src !== imageURL) return;
    const ratio = $('#study-image').naturalWidth / $('#study-image').naturalHeight;
    imageStatus = Math.abs(ratio - selected.camera.aspect) < 0.005 ? 'ready' : 'unavailable';
    $('#study-image').hidden = imageStatus !== 'ready'; updateStatus();
  };
  $('#study-image').onerror = () => {
    if ($('#study-image').src === imageURL) { imageStatus = 'unavailable'; updateStatus(); }
  };
  $('#study-image').src = imageURL;
  if (announce) $('#study-announcement').textContent = text('comparisonViewChanged', { name: label(selected.label) });
  applyLocale(locale);
}

async function load() {
  const sequence = ++requestId;
  controller?.abort(); renderer?.dispose(); renderer = null;
  controller = new AbortController(); const signal = controller.signal;
  manifestStatus = realtimeStatus = imageStatus = 'loading'; updateStatus();
  try {
    const response = await fetch(manifestURL, { signal, cache: 'no-cache' });
    if (!response.ok) throw new Error('Study manifest unavailable');
    manifest = validateManifest(await response.json());
    localAsset(manifest.model, manifestURL, appURL);
    for (const view of manifest.views) localAsset(view.file, manifestURL, appURL);
    if (sequence !== requestId) return;
    manifestStatus = 'ready';
    $('#study-view').replaceChildren(...manifest.views.map(view => {
      const option = document.createElement('option'); option.value = view.id; option.textContent = label(view.label); return option;
    }));
    selectView(selected?.id ?? manifest.views[0].id, false);
  } catch (error) {
    if (signal.aborted || sequence !== requestId) return;
    manifestStatus = realtimeStatus = imageStatus = 'unavailable'; updateStatus(); return;
  }
  try {
    const candidate = await createStudyRenderer($('#realtime-stage'), manifest, {
      manifestURL, appURL, signal,
      onContextLost() { controller.abort(); renderer = null; realtimeStatus = 'unavailable'; updateStatus(); },
    });
    if (sequence !== requestId || signal.aborted) { candidate.dispose(); return; }
    renderer = candidate; renderer.selectView(selected); realtimeStatus = 'ready'; applyLocale(locale);
  } catch (error) {
    if (sequence !== requestId || signal.aborted) return;
    realtimeStatus = 'unavailable'; updateStatus();
  }
}

$('#study-view').addEventListener('change', event => selectView(event.target.value));
$('#study-mode').addEventListener('change', event => setMode(event.target.value));
$('#study-retry').addEventListener('click', load);
$('#study-language').addEventListener('click', event => {
  const button = event.target.closest('[data-locale]'); if (button) applyLocale(button.dataset.locale);
});
window.addEventListener('pagehide', () => { controller?.abort(); renderer?.dispose(); renderer = null; });
window.addEventListener('pageshow', event => { if (event.persisted) load(); });
if (import.meta.env.DEV || params.get('qa') === '1') {
  window.__TOUR_COMPARISON__ = Object.freeze({
    snapshot: () => ({ locale, mode, selectedViewId: selected?.id ?? null,
      status: { manifest: manifestStatus, realtime: realtimeStatus, image: imageStatus },
      manifest: manifest ? structuredClone(manifest) : null,
      renderer: renderer?.snapshot() ?? null,
      image: { src: $('#study-image').src, width: $('#study-image').naturalWidth, height: $('#study-image').naturalHeight },
    }),
  });
}
applyLocale(locale); load();
