import './styles.css';
import { PLACES, resolveStops } from './places.js';
import { buildMapsJourney, mapsShareText, journeyCSV } from './maps.js';
import { readJourney, writeJourney, readSelectedStops, buildCompanionURL } from './state.js';
import { createLocationController, assessProximity } from './location.js';
import { text } from './copy.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let locale = new URLSearchParams(location.search).get('lang') === 'zh' ? 'zh' : 'en';
let storage;
try { storage = localStorage; } catch { /* 浏览器禁止存储时，当前页面仍可使用。 */ }
let journey = readJourney(storage);
const requestedStops = readSelectedStops(location.search);
if (requestedStops !== null) journey.selected = requestedStops;
let storageOK = true;
const t = key => text(locale, key);
const local = value => value[locale];
const asset = path => new URL(path, new URL(import.meta.env.BASE_URL, document.baseURI)).href;
const selectedStops = () => resolveStops(journey.selected, locale);
let locationState = { status: 'idle', active: false, fix: null };

// 示意图使用同一地理投影放置地点与定位圆；地图供应商负责实际步行路线。
const mapScale = 4;
const metresPerLatitude = 111195;
const metresPerLongitude = metresPerLatitude * Math.cos(35.00366 * Math.PI / 180);
const project = point => ({
  x: 340 + (point.longitude - 135.7600) * metresPerLongitude * mapScale,
  y: 170 - (point.latitude - 35.00366) * metresPerLatitude * mapScale,
});
const controller = createLocationController({
  geolocation: navigator.geolocation,
  isVisible: () => document.visibilityState === 'visible',
  subscribeVisibility(callback) {
    document.addEventListener('visibilitychange', callback);
    return () => document.removeEventListener('visibilitychange', callback);
  },
  onChange(value) { locationState = value; if ($('#location-status')) renderLocation(); },
});

function mapHTML() {
  return `<svg id="place-map" viewBox="0 0 680 340" role="img" aria-label="${escape(t('diagram'))}">
    <title>${escape(t('mapLabel'))}</title>
    ${Array.from({ length: 10 }, (_, index) => `<path d="M${index * 80} 0V340" class="grid-line"/>`).join('')}
    ${Array.from({ length: 5 }, (_, index) => `<path d="M0 ${index * 80}H680" class="grid-line"/>`).join('')}
    <text x="22" y="29" class="map-caption">SHIJŌ–KARASUMA</text><text x="658" y="29" text-anchor="end" class="map-caption">↑ ${escape(t('north'))}</text>
    <g id="gps-layer" aria-hidden="true" style="display:none"><circle id="gps-accuracy" class="map-accuracy"/><circle id="gps-dot" r="7" class="map-dot"/></g>
    ${PLACES.map(place => {
      const p = project(place), index = journey.selected.indexOf(place.id);
      return `<g><title>${escape(local(place.title))}</title><circle class="map-pin" cx="${p.x}" cy="${p.y}" r="14" opacity="${index < 0 ? '.4' : '1'}"/><text class="map-number" x="${p.x}" y="${p.y}">${index < 0 ? '·' : index + 1}</text></g>`;
    }).join('')}
    <path d="M25 303H105M25 299V307M105 299V307" stroke="#748468"/><text x="25" y="326" class="map-caption">20 m</text>
  </svg>`;
}

function render(focusId = document.activeElement?.id) {
  document.documentElement.lang = locale;
  document.title = `${t('title')} · TourGuideAI`;
  const stops = selectedStops(), maps = buildMapsJourney(stops), disabled = stops.length ? '' : 'disabled';
  $('#travel-app').innerHTML = `
    <header class="header"><a class="brand" href="./index.html">↗ TourGuideAI</a><nav aria-label="${escape(t('language'))}"><a class="back" href="./perspective.html?lang=${locale}">${escape(t('preview'))}</a><button id="locale-en" class="language" data-locale="en" aria-pressed="${locale === 'en'}">EN</button><button id="locale-zh" class="language" data-locale="zh" aria-pressed="${locale === 'zh'}">中文</button></nav></header>
    <main><span class="eyebrow">${escape(t('eyebrow'))}</span><h1>${escape(t('title'))}</h1><p class="intro">${escape(t('intro'))}</p>
    <div class="layout"><div class="left">
      <section class="panel location-panel" aria-labelledby="location-heading"><h2 id="location-heading">${escape(t('locationTitle'))}</h2><p>${escape(t('locationPurpose'))}</p>
        <div class="actions"><button id="location-start" class="primary">${escape(t('start'))}</button><button id="location-stop" class="button secondary" hidden>${escape(t('stop'))}</button></div>
        <p id="location-status" role="status" aria-live="polite"></p><p id="location-accuracy"></p><p id="outside-area" class="small" hidden>${escape(t('offsite'))}</p>
        <div class="map-shell">${mapHTML()}</div><div class="legend"><span>${escape(t('diagram'))}</span><span id="gps-legend" hidden>● ${escape(t('you'))}</span></div>
        <p class="small">${escape(t('mapNote'))}</p><p class="small">${escape(t('privacy'))}</p>
      </section>
      <section aria-labelledby="places-heading"><h2 id="places-heading">${escape(t('places'))}</h2><p>${escape(t('placesIntro'))}</p>
        <div class="place-grid">${PLACES.map(place => `<article class="place" data-place="${place.id}"><img src="${asset(place.image)}" alt="" loading="lazy"><div class="place-body"><h3>${escape(local(place.title))}</h3><p class="place-detail">${escape(local(place.detail))}</p><div class="place-meta" data-distance="${place.id}"></div><label class="select-row"><input id="include-${place.id}" data-include="${place.id}" type="checkbox" ${journey.selected.includes(place.id) ? 'checked' : ''}>${escape(t('include'))}</label><button id="mark-${place.id}" class="mark" data-meaning="${place.id}" aria-pressed="${journey.meaningful.includes(place.id)}">${journey.meaningful.includes(place.id) ? '♥' : '♡'} ${escape(t(journey.meaningful.includes(place.id) ? 'meaningful' : 'matters'))}</button></div></article>`).join('')}</div>
        <p class="small">${escape(t('privateMark'))}</p><button id="clear-marks" class="quiet" ${journey.meaningful.length ? '' : 'hidden'}>${escape(t('clear'))}</button>
      </section>
    </div><aside class="right">
      <section class="panel" aria-labelledby="journey-heading"><span class="eyebrow">${stops.length} ${escape(t('count'))}</span><h2 id="journey-heading">${escape(t('selected'))}</h2>
        <ol id="selected-list">${stops.map((stop, index) => `<li class="stop" data-place-id="${stop.id}"><span class="stop-number">0${index + 1}</span><span class="stop-name">${escape(stop.title)}</span><div class="order-controls"><button id="up-${stop.id}" data-up="${stop.id}" aria-label="${escape(t('up') + ' · ' + stop.title)}" ${index === 0 ? 'disabled' : ''}>↑</button><button id="down-${stop.id}" data-down="${stop.id}" aria-label="${escape(t('down') + ' · ' + stop.title)}" ${index === stops.length - 1 ? 'disabled' : ''}>↓</button><button id="remove-${stop.id}" data-remove="${stop.id}" aria-label="${escape(t('remove') + ' · ' + stop.title)}">×</button></div></li>`).join('')}</ol>
        ${stops.length ? '' : `<p id="empty-journey">${escape(t('empty'))}</p>`}
        <div id="maps-links" class="routes">${maps.parts.map((part, index) => `<a class="button" href="${escape(part.url)}" target="_blank" rel="noopener noreferrer">${escape(t('open'))}${maps.parts.length > 1 ? ` · ${index + 1}/${maps.parts.length}` : ''} ↗</a>`).join('')}</div>
        <p class="small">${escape(t('routeNote'))}</p><div class="actions"><button id="copy-maps" class="button secondary" ${disabled}>${escape(t('copy'))}</button><button id="native-share" class="button secondary" ${disabled}>${escape(t('share'))}</button></div>
        <label class="only-sr" for="share-text">${escape(t('linksLabel'))}</label><textarea id="share-text" class="share-text" readonly ${stops.length ? '' : 'hidden'}>${escape(mapsShareText(stops, locale))}</textarea>
        <p id="status" role="status" aria-live="polite"></p><p id="storage-status" class="small" role="status">${storageOK ? '' : escape(t('storage'))}</p>
        ${maps.legs.length ? `<details><summary>${escape(t('legTitle'))}</summary><p class="small">${escape(t('legNote'))}</p><div class="leg-links">${maps.legs.map(leg => `<a href="${escape(leg.url)}" target="_blank" rel="noopener noreferrer">${escape(stops[leg.startIndex].title)} → ${escape(stops[leg.endIndex].title)} ↗</a>`).join('')}</div></details>` : ''}
        <details><summary>${escape(t('myMaps'))}</summary><p class="small">${escape(t('myMapsBody'))}</p><button id="download-csv" class="button secondary" ${disabled}>${escape(t('download'))}</button><p class="small">${escape(t('noUpload'))}</p><a class="small" href="https://support.google.com/mymaps/answer/3024836?hl=${locale === 'zh' ? 'zh-Hans' : 'en'}" target="_blank" rel="noopener noreferrer">${escape(t('importHelp'))} ↗</a></details>
      </section>
      <section class="panel memory-panel"><h2>${escape(t('memories'))}</h2><p>${escape(t('memoriesBody'))}</p><a class="button secondary" href="./perspective.html?lang=${locale}">${escape(t('memoryLink'))} ↗</a></section>
    </aside></div></main>
    <footer class="footer"><p>${escape(t('scope'))}</p><details><summary>${escape(t('sources'))}</summary><p>${escape(t('sourceNote'))}</p><ul class="source-list">${PLACES.map(place => `<li><a href="${escape(place.source)}" target="_blank" rel="noopener noreferrer">${escape(local(place.title))}</a> · ${escape(typeof place.anchor === 'object' ? local(place.anchor) : place.anchor)}</li>`).join('')}</ul><a href="./credits.html">${escape(t('sourceLinks'))}</a></details><p>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors · ODbL</a></p></footer>`;
  renderLocation();
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
}

function renderLocation() {
  locationState = controller.getState();
  const { status, active, fix } = locationState;
  $('#location-status').textContent = t(status);
  $('#location-status').dataset.state = status;
  $('#location-status').dataset.status = status;
  $('#location-start').hidden = active;
  $('#location-start').textContent = t(status === 'paused' ? 'resume' : 'start');
  $('#location-stop').hidden = !active;
  const usable = fix && ['tracking', 'uncertain'].includes(status);
  $('#location-accuracy').textContent = usable ? `${t('accuracy')} ±${Math.ceil(fix.accuracyM)} ${t('unit')}` : '';
  const point = usable ? project(fix) : null;
  const inMap = Boolean(point && point.x >= 10 && point.x <= 670 && point.y >= 10 && point.y <= 330);
  const layer = $('#gps-layer');
  layer.style.display = inMap ? '' : 'none';
  layer.setAttribute('aria-hidden', String(!inMap));
  layer.dataset.quality = usable ? status === 'tracking' ? 'fresh' : 'uncertain' : 'unavailable';
  if (inMap) {
    for (const id of ['gps-dot', 'gps-accuracy']) {
      $('#' + id).setAttribute('cx', point.x); $('#' + id).setAttribute('cy', point.y);
    }
    $('#gps-accuracy').setAttribute('r', fix.accuracyM * mapScale);
  }
  $('#gps-legend').hidden = !inMap;
  $('#outside-area').hidden = !usable || inMap || status === 'uncertain';
  for (const place of PLACES) {
    const element = document.querySelector(`[data-distance="${place.id}"]`);
    const proximity = usable ? assessProximity(fix, place, { radiusM: 80 }) : null;
    element.dataset.proximity = proximity?.status ?? 'unknown';
    element.textContent = proximity?.status === 'nearby'
      ? `${t('nearby')} · ≈${Math.round(proximity.distanceM)} ${t('unit')}`
      : usable && status === 'tracking' && inMap && proximity?.status !== 'unknown' && Number.isFinite(proximity?.distanceM)
        ? `${t('distance')} ≈${Math.round(proximity.distanceM)} ${t('unit')}` : '';
  }
}

function syncURL() { history.replaceState(null, '', buildCompanionURL(journey.selected, location.href, locale)); }
function persist() { storageOK = writeJourney(storage, journey); syncURL(); }
function message(key) { $('#status').textContent = t(key); }
function manualCopy() { $('#share-text').focus(); $('#share-text').select(); message('manualCopy'); }

$('#travel-app').addEventListener('change', event => {
  const id = event.target.dataset.include;
  if (!id) return;
  journey.selected = event.target.checked ? [...journey.selected, id] : journey.selected.filter(value => value !== id);
  persist(); render();
});
$('#travel-app').addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.locale) { locale = button.dataset.locale; syncURL(); render(); return; }
  if (button.id === 'location-start') { controller.start(); return; }
  if (button.id === 'location-stop') { controller.stop(); return; }
  if (button.dataset.meaning) {
    const id = button.dataset.meaning;
    const removing = journey.meaningful.includes(id);
    journey.meaningful = removing ? journey.meaningful.filter(value => value !== id) : [...journey.meaningful, id];
    persist(); render(); message(storageOK ? removing ? 'markRemoved' : 'markSaved' : 'storage'); return;
  }
  if (button.id === 'clear-marks') { journey.meaningful = []; persist(); render(); message(storageOK ? 'cleared' : 'storage'); return; }
  if (button.dataset.up || button.dataset.down || button.dataset.remove) {
    const id = button.dataset.up || button.dataset.down || button.dataset.remove;
    const index = journey.selected.indexOf(id);
    let focusId;
    if (button.dataset.remove) {
      journey.selected.splice(index, 1);
      const adjacent = journey.selected[index] ?? journey.selected[index - 1];
      focusId = adjacent ? `remove-${adjacent}` : `include-${id}`;
    }
    else {
      const next = index + (button.dataset.up ? -1 : 1);
      [journey.selected[index], journey.selected[next]] = [journey.selected[next], journey.selected[index]];
      focusId = button.dataset.up ? `${next === 0 ? 'down' : 'up'}-${id}`
        : `${next === journey.selected.length - 1 ? 'up' : 'down'}-${id}`;
    }
    persist(); render(focusId); return;
  }
  if (button.id === 'copy-maps') {
    try { await navigator.clipboard.writeText($('#share-text').value); message('copied'); }
    catch { manualCopy(); }
  }
  if (button.id === 'native-share') {
    if (!navigator.share) { manualCopy(); return; }
    const stops = selectedStops(), parts = buildMapsJourney(stops).parts;
    const data = parts.length === 1 ? { title: t('selected'), text: stops.map(stop => stop.title).join(' → '), url: parts[0].url }
      : { title: t('selected'), text: mapsShareText(stops, locale) };
    try { await navigator.share(data); message('handedOff'); }
    catch (error) { message(error.name === 'AbortError' ? 'cancelled' : 'shareFailed'); }
  }
  if (button.id === 'download-csv') {
    const url = URL.createObjectURL(new Blob([journeyCSV(selectedStops())], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'kyoto-journey-mymaps.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
});

render();
window.addEventListener('pagehide', () => controller.stop());
