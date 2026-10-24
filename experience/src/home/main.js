import './styles.css';
import { copy } from './copy.js';
import { createRoomClient } from './room-client.js';
import { SERVICE_SELECTION_KEY, defaultServiceURL, normalizeServiceURL, parseServiceSelection, roomCredentialKey } from './service-config.js';
import { searchCenters, findNearby, DEFAULT_RADIUS_METERS, DISCOVERY_ATTRIBUTION } from '../discovery/provider.js';
import { suggestRoutes } from '../discovery/routes.js';
import { resolveStops } from '../travel/places.js';
import { buildMapsJourney, mapsShareText } from '../travel/maps.js';
import { areaAtView, hasDetailedStreet } from '../solo/state.js';
import { createSoloController, soloControlsMarkup, keptPlacesMarkup, soloDialogsMarkup } from '../solo/controller.js';
import { getPack, getPackForPlace, getPackPlace, listPacks } from '../packs/registry.js';
import geography from '../neighborhoods/shijo-east/geography.json' with { type: 'json' };
import { SIGHTS } from '../neighborhoods/shijo-east/sights.js';
import { createJourneyPlanner } from '../journey/recommendations.js';
import { createNeighborhoodJourney, journeyPanelMarkup } from './journey-panel.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const params = new URLSearchParams(location.search);
let locale = params.get('lang') === 'zh' ? 'zh' : 'en';
const t = key => copy(locale, key);
let mode = params.get('mode') === 'together' ? 'together' : 'explore';
let center = getPackPlace(params.get('pack'), locale) || kyotoCenter(), discoveryCenter = center, results = [], routes = [], nearbyPlaces = [], selectedRoute = 0;
let liveView, worldMap, scenePromise, mapPromise, localPreview = false, lighting = 'day', room = null, session = null, subscription;
let scenePackId = null, sceneGeneration = 0, sceneController;
let serviceReady = false, aiReady = false, searchRequest, nearbyRequest, routeState = '', sceneState = 'loading';
let messageKey = '', searchMessage = '', roomMessage = 'serviceChecking', busy = false;
const defaultEndpoint = defaultServiceURL(import.meta.env.VITE_TRAVEL_API_URL || '', location.href);
let serviceSettings = { endpoint: defaultEndpoint, transport: 'sse' }, serviceSettingsSaved = true;
try { serviceSettings = parseServiceSelection(sessionStorage.getItem(SERVICE_SELECTION_KEY)) || serviceSettings; }
catch { serviceSettingsSaved = false; }
let api = createRoomClient({ baseURL: serviceSettings.endpoint, transport: serviceSettings.transport });
let serviceGeneration = 0, serviceController = new AbortController();
let connectionMessage = 'serviceChecking', connectionPending = false;
let invitationNeedsConfirmation = false;
let solo, soloPaused = false, restoring = false, keptRoute = false, mapViewToRestore = null, restoreGeneration = 0;
let previewRepresentation = null, restoreController;
let touchControls = matchMedia('(pointer: coarse)').matches, inputHelpDirty = false;
let neighborhood, streamingState = null, cameraConstrained = false;
const neighborhoodId = geography.id;
const showingNeighborhood = () => mode === 'explore' && getPackForPlace(center)?.id === neighborhoodId;
const currentRoute = () => showingNeighborhood() ? neighborhood?.getRoute() : routes[selectedRoute];

function kyotoCenter() {
  const place = resolveStops(['crossing'], locale)[0];
  return { ...place, kind: 'poi', source: 'OpenStreetMap', url: place.source };
}
const isDetailed = hasDetailedStreet;
const fromCatalog = place => ({ ...place, title: place.name, url: place.sourceUrl, source: 'Shared destination' });
const toCatalog = place => ({ id: place.id, name: place.title, latitude: place.latitude, longitude: place.longitude,
  kind: ['country', 'city'].includes(place.kind) ? place.kind : 'poi', sourceUrl: place.url || undefined,
  country: place.country || undefined, city: place.locality || undefined });
const catalogPlace = id => room?.catalog.find(place => place.id === id);
const currentStops = () => currentRoute()?.stops || [center];
function setMessage(key) { messageKey = key; $('#action-status').textContent = t(key); }
function localizePackPlace(place) {
  const translated = getPackPlace(getPackForPlace(place)?.id, locale);
  return translated?.id === place.id ? { ...place, title: translated.title } : place;
}

function markup() {
  return `<header class="home-header"><a class="brand" href="./index.html"><span aria-hidden="true">↗</span> TourGuideAI</a><nav aria-label="${t('language')}"><a data-link="memories" href="./perspective.html?lang=${locale}">${t('memories')}</a><button id="locale-en" data-locale="en">EN</button><button id="locale-zh" data-locale="zh">中文</button></nav></header>
  <main class="home-main"><div class="opening"><div><p class="eyebrow" data-copy="opening"></p><h1 data-copy="title"></h1><p class="subtitle" data-copy="subtitle"></p></div><div class="mode-switch" role="group"><button id="mode-explore" data-mode="explore" data-copy="explore"></button><button id="mode-together" data-mode="together" data-copy="together"></button></div></div>
  <section class="search-panel" aria-labelledby="search-label"><div><p class="eyebrow" id="journey-step"></p><h2 id="search-label"></h2></div><form id="place-search"><label class="sr-only" for="place-query" data-copy="searchLabel"></label><input id="place-query" name="place" type="search" maxlength="160" autocomplete="off" required><button id="search-submit" class="primary" type="submit" data-copy="search"></button></form><div id="search-status" role="status"></div><div id="search-results" class="search-results"></div></section>
  <section id="walkable-places" class="walkable-places" aria-labelledby="walkable-heading"><span id="walkable-heading" class="small" data-copy="walkablePlaces"></span><div id="pack-options"></div></section>
  <div class="journey-layout"><section class="visual-column"><div class="preview-heading"><div><span id="preview-kind" class="eyebrow"></span><h2 id="preview-title"></h2></div><div class="preview-actions"><div id="lighting-controls" class="segmented"><button id="lighting-day" data-lighting="day" data-copy="day"></button><button id="lighting-night" data-lighting="night" data-copy="night"></button></div><button id="back-world" class="secondary" data-copy="backWorld" hidden></button></div></div>
  <div class="preview-frame"><div id="live-stage" tabindex="0" role="region"></div><div id="world-map" hidden></div><span id="inspection-cue" class="inspection-cue" aria-hidden="true" hidden></span><div class="preview-tools"><button id="preview-reset" data-copy="reset"></button></div><div id="scene-status" class="scene-status" role="status"></div><button id="scene-retry" class="primary scene-retry" data-copy="retry" hidden></button><div id="view-guidance" class="view-guidance"></div></div>
  <p id="camera-guidance" class="small camera-guidance" role="status" aria-live="polite" hidden></p>
  <div class="preview-caption"><span id="preview-note"></span><a id="center-source" target="_blank" rel="noopener noreferrer" data-copy="source"></a></div>
  ${soloControlsMarkup()}
  <div id="center-actions" class="center-actions"><button id="street-map-toggle" class="secondary" hidden></button><button id="add-dream" class="primary" data-copy="addDream" hidden></button><a class="text-link" id="walk-link" href="./walk.html" data-copy="legacy"></a><a class="text-link" id="companion-link" href="./travel.html" data-copy="companion"></a></div>
  <section id="routes-section" class="route-section" aria-labelledby="routes-heading"><p class="eyebrow" data-copy="furtherStep"></p><h2 id="routes-heading" data-copy="routesTitle"></h2><p id="routes-status" role="status"></p><button id="routes-retry" class="secondary" data-copy="retryNearby" hidden></button><div id="route-options" class="route-options"></div><p class="small" data-copy="routeNote"></p></section>
  </section><aside class="journey-sidebar">${journeyPanelMarkup()}<section id="explore-plan" class="paper-card"><span class="eyebrow" data-copy="yourWalk"></span><h2 id="route-title"></h2><ol id="route-stops" class="stop-list"></ol><div id="route-maps" class="map-links"></div><button id="copy-maps" class="secondary" data-copy="copyMaps"></button><label class="sr-only" for="maps-text" data-copy="copyMaps"></label><textarea id="maps-text" readonly hidden></textarea></section>
  ${keptPlacesMarkup()}
  <section id="together-panel" hidden><div class="paper-card" id="room-setup"><h2 data-copy="together"></h2><p data-copy="roomIntro"></p><label for="traveler-name" data-copy="name"></label><input id="traveler-name" maxlength="60" autocomplete="nickname"><label for="room-title" data-copy="roomTitle"></label><input id="room-title" maxlength="120"><button id="room-create" class="primary" data-copy="create"></button><button id="room-join" class="primary" data-copy="join" hidden></button></div>
  <div class="paper-card" id="room-shared" hidden><span class="eyebrow" data-copy="ourJourney"></span><h2 id="shared-title"></h2><button id="room-invite" class="secondary" data-copy="invite"></button><label class="sr-only" for="invite-url" data-copy="inviteLabel"></label><textarea id="invite-url" readonly hidden></textarea><p class="small" data-copy="inviteNote"></p><h3 data-copy="people"></h3><div id="participant-list"></div><h3 data-copy="dreams"></h3><div id="dream-list"></div></div>
  <p id="room-status" class="service-status" role="status"></p><details id="testing-connection" class="testing-connection"><summary data-copy="testingConnection"></summary><form id="service-connection-form" novalidate><label for="service-endpoint" data-copy="serviceAddress"></label><input id="service-endpoint" type="url" inputmode="url" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="http://localhost:8787" aria-describedby="service-data service-connection-status"><p id="service-data" class="small" data-copy="serviceData"></p><label for="service-transport" data-copy="serviceTransport"></label><select id="service-transport" aria-describedby="service-transport-help"><option value="sse" data-copy="serviceSse"></option><option value="poll" data-copy="servicePoll"></option></select><p id="service-transport-help" class="small" data-copy="serviceTransportHelp"></p><div class="service-actions"><button id="service-connect" type="submit" class="primary" data-copy="serviceConnect"></button><button id="service-reset" type="button" class="secondary" data-copy="serviceReset"></button></div><p id="service-connection-status" class="small" role="status" aria-live="polite"></p><p class="small" data-copy="serviceLocal"></p><p class="small" data-copy="serviceInvite"></p><p class="small" data-copy="serviceSession"></p></form></details><div class="paper-card" id="ai-panel" hidden><h2 data-copy="planTitle"></h2><label for="preferences" data-copy="preferences"></label><textarea id="preferences" maxlength="2000" rows="3"></textarea><button id="generate-plan" class="primary" data-copy="generate"></button><p class="small" id="ai-status"></p><div id="shared-plan"></div><button id="accept-plan" class="secondary" data-copy="accept" hidden></button></div></section>
  <p id="action-status" role="status" aria-live="polite"></p></aside></div>
  </main><footer class="home-footer"><span data-copy="footer"></span><div><span data-copy="networkNote"></span><a href="./credits.html" data-copy="credits"></a></div></footer>${soloDialogsMarkup()}`;
}

function applyCopy() {
  center = localizePackPlace(center); discoveryCenter = localizePackPlace(discoveryCenter);
  routes = routes.map(route => ({ ...route, stops: route.stops.map(localizePackPlace) }));
  if (center.kind === 'area') center = { ...center, title: t('unnamedArea') };
  if (discoveryCenter.kind === 'area') discoveryCenter = { ...discoveryCenter, title: t('unnamedArea') };
  if (routes[0]?.id === 'shijo') {
    routes = [{ id: 'shijo', title: t('localRoute'), stops: resolveStops(['crossing', 'mitsui', 'mufg'], locale).map(place => ({ ...place, url: place.source })) }];
    const translated = routes[0].stops.find(place => place.id === center.id);
    if (translated) center = { ...center, title: translated.title };
  } else if (keptRoute) {
    routes = routes.map(route => ({ ...route, title: t('keptOrder'), stops: route.stops.map(place => place.kind === 'area' ? { ...place, title: t('unnamedArea') } : place) }));
  } else if (nearbyPlaces.length) {
    const previousId = routes[selectedRoute]?.id;
    routes = suggestRoutes(discoveryCenter, nearbyPlaces, { locale });
    selectedRoute = Math.max(0, routes.findIndex(route => route.id === previousId));
  }
  document.documentElement.lang = locale;
  document.title = `${t('title')} · TourGuideAI`;
  document.querySelectorAll('[data-copy]').forEach(node => { node.textContent = t(node.dataset.copy); });
  document.querySelectorAll('[data-locale]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.locale === locale)));
  $('#place-query').placeholder = t('searchPlaceholder'); $('#traveler-name').placeholder = t('namePlaceholder');
  $('#room-title').placeholder = t('roomPlaceholder'); $('#preferences').placeholder = t('preferencesPlaceholder');
  $('.home-header .brand').href = `./index.html?lang=${locale}`;
  $('.home-header nav').setAttribute('aria-label', t('language'));
  $('.mode-switch').setAttribute('aria-label', t('travelMode'));
  $('.home-footer [data-copy="credits"]').href = `./credits.html?lang=${locale}`;
  $('[data-link="memories"]').href = `./perspective.html?lang=${locale}`;
  $('[data-link="memories"]').textContent = t('memories');
  $('#walk-link').href = `./walk.html?lang=${locale}`; $('#companion-link').href = `./travel.html?lang=${locale}`;
  $('#live-stage').setAttribute('aria-label', t('live'));
  $('#pack-options').innerHTML = listPacks().map(pack => `<button class="pack-option" data-pack="${escape(pack.id)}">${escape(pack.title[locale])}</button>`).join('');
  liveView?.setLocale(locale); worldMap?.setLocale(locale); updateMode(); renderResults(); renderRoutes(); renderRoom(); renderConnection();
  $('#search-status').textContent = searchMessage ? t(searchMessage) : '';
  if (messageKey) setMessage(messageKey);
  solo?.render();
  neighborhood?.render();
}

function syncURL() {
  const url = new URL(location.href); url.searchParams.set('lang', locale); url.searchParams.set('mode', mode);
  const pack = getPackForPlace(center);
  if (pack) url.searchParams.set('pack', pack.id); else url.searchParams.delete('pack');
  history.replaceState(null, '', url);
}

function updateMode() {
  const together = mode === 'together';
  document.querySelectorAll('[data-mode]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.mode === mode)));
  $('#journey-step').textContent = t(together ? 'togetherStep' : 'exploreStep');
  $('#search-label').textContent = t(together ? 'dreamLabel' : 'searchLabel');
  $('label[for="place-query"]').textContent = t(together ? 'dreamLabel' : 'searchLabel');
  $('#together-panel').hidden = !together; $('#explore-plan').hidden = together && !localPreview || showingNeighborhood();
  $('#routes-section').hidden = together && !localPreview || showingNeighborhood();
  $('#add-dream').hidden = !together || !localPreview;
  $('#walkable-places').hidden = together;
  $('.journey-layout').dataset.neighborhood = String(showingNeighborhood());
  if (together) liveView?.setInspecting(false);
  neighborhood?.setContext({ mode, inNeighborhood: showingNeighborhood() });
  showPreview();
}

function releaseScene() {
  neighborhood?.flush();
  neighborhood?.updateWalking(null);
  sceneGeneration++; sceneController?.abort(); sceneController = null; scenePromise = null;
  liveView?.destroy(); liveView = null; scenePackId = null; streamingState = null;
  cameraConstrained = false; updateCameraGuidance();
  solo?.onInspection({ enabled: false, focus: null, selected: null });
}
async function ensureScene() {
  const pack = getPackForPlace(center);
  if (!pack) return;
  if (scenePackId === pack.id && (liveView || scenePromise || sceneState === 'error')) return scenePromise;
  releaseScene();
  const generation = sceneGeneration, request = new AbortController();
  sceneController = request; scenePackId = pack.id; sceneState = 'loading';
  const current = () => generation === sceneGeneration && !request.signal.aborted;
  updatePreviewCopy();
  scenePromise = import('../perspective/live-view.js').then(({ createPerspectiveView }) => {
    if (!current()) return null;
    const saved = neighborhood?.getSession();
    return createPerspectiveView($('#live-stage'), { locale, solo: true, packId: pack.id,
      signal: request.signal, initialLighting: lighting,
      initialView: pack.id === neighborhoodId && saved?.routeId === pack.id && saved.revision === pack.revision ? saved.progress.view : undefined,
      onStatus(value) { if (current()) { sceneState = value.status; updatePreviewCopy(); } },
      onState() { if (current()) updateNeighborhoodWalking(); },
      onInspectionChange(value) { if (current()) solo?.onInspection(value); },
      onCameraConstraintChange(value) {
        if (!current() || cameraConstrained === value) return;
        cameraConstrained = value; updateCameraGuidance();
      },
      onStreamingChange(value) {
        if (!current()) return;
        const previous = streamNotice(streamingState);
        streamingState = value;
        const next = streamNotice(value);
        // 保留实时行走状态；仅在可见提示或重试条件变化时刷新界面。
        if (previous.message !== next.message || previous.failed !== next.failed) updatePreviewCopy();
        updateNeighborhoodWalking();
      },
      onViewChange(value) {
        if (!current()) return;
        solo?.update(); neighborhood?.capture(value, liveView?.getLightingState()?.mode || lighting);
      },
    });
  }).then(view => {
    if (!view) return;
    if (!current()) { view.destroy(); return; }
    liveView = view; view.setLocale(locale); sceneState = 'ready';
    view.setPaused(!usesStreet() || soloPaused); view.setVisible(usesStreet()); updatePreviewCopy();
  }).catch(error => {
    if (current() && error.name !== 'AbortError') { sceneState = 'error'; updatePreviewCopy(); }
  }).finally(() => { if (current()) scenePromise = null; });
  return scenePromise;
}
function usesStreet() { return previewRepresentation !== 'map' && (mode === 'explore' || localPreview) && isDetailed(center); }
function updateNeighborhoodWalking() {
  neighborhood?.updateWalking(showingNeighborhood() && usesStreet() && scenePackId === neighborhoodId
    ? liveView?.getRouteState() || null : null);
}
async function ensureMap() {
  if (worldMap || mapPromise) return mapPromise;
  $('#world-map').dataset.mapStatus = 'loading';
  mapPromise = import('./world-map.js').then(({ createWorldMap }) => {
    worldMap = createWorldMap($('#world-map'), { locale, onSelect: selectCenter,
      onStatus() { updatePreviewCopy(); }, onViewChange() { solo?.update(); } });
    worldMap.resize(); updateMap();
  }).catch(() => { $('#world-map').dataset.mapStatus = 'error'; updatePreviewCopy(); })
    .finally(() => { mapPromise = null; });
  return mapPromise;
}
function updateMap() {
  if (!worldMap) return;
  if (mode === 'together' && !localPreview) {
    const ids = room?.plan?.stopIds || [...new Set(room?.dreams.map(dream => dream.destinationId) || [])];
    const places = ids.map(catalogPlace).filter(Boolean).map(fromCatalog);
    worldMap.setPlaces(places, places.length ? [{ stops: places }] : []); worldMap.world(places);
  } else {
    worldMap.setPlaces(currentStops(), [currentRoute() || { stops: currentStops() }]);
    if (mapViewToRestore) {
      worldMap.restoreView(mapViewToRestore, center); mapViewToRestore = null;
      if (showingNeighborhood()) worldMap.retainRoute(currentRoute());
    } else if (showingNeighborhood()) worldMap.fitRoute(currentRoute());
    else worldMap.local(center);
  }
}
function showPreview() {
  const street = usesStreet();
  if (street && scenePackId && scenePackId !== getPackForPlace(center)?.id) releaseScene();
  if (!street && scenePromise) releaseScene();
  $('#live-stage').hidden = !street; $('#world-map').hidden = street;
  liveView?.setPaused(!street || soloPaused);
  liveView?.setVisible(street);
  updateNeighborhoodWalking();
  if (street) ensureScene(); else { ensureMap().then(() => { worldMap?.resize(); updateMap(); }); }
  updatePreviewCopy();
}
function streamNotice(state) {
  const failed = Boolean(state?.cells.some(cell => cell.error));
  const message = state?.blocked?.reason === 'section-failed' ? 'streetSectionFailed'
    : state?.blocked ? 'streetSectionLoading' : failed ? 'streetDetailFailed' : '';
  return { failed, message };
}
function updateCameraGuidance() {
  const element = $('#camera-guidance');
  if (!element) return;
  const visible = cameraConstrained && usesStreet() && sceneState === 'ready';
  const message = visible ? t('viewConstrained') : '';
  if (element.hidden !== !visible) element.hidden = !visible;
  // 仅在状态或语言改变时更新提示，保留原有操作说明和焦点。
  if (element.textContent !== message) element.textContent = message;
}
function updatePreviewCopy() {
  if (!$('#preview-kind')) return;
  inputHelpDirty = false;
  const world = mode === 'together' && !localPreview, street = usesStreet(), pack = getPackForPlace(center);
  $('.preview-frame').dataset.scenePack = street ? pack.id : '';
  $('#world-map').setAttribute('aria-label', t(world ? 'world' : center.kind === 'country' ? 'country' : 'map3d'));
  $('#preview-kind').textContent = t(world ? 'world' : street ? 'live' : center.kind === 'country' ? 'country' : 'map3d');
  $('#preview-title').textContent = world ? room?.title || t('together') : center.title;
  $('#preview-note').textContent = street ? pack.description[locale] : t(world ? 'worldNote' : center.kind === 'country' ? 'countryNote' : 'areaNote');
  const touch = touchControls;
  $('#view-guidance').textContent = t(street ? touch ? 'walkTouchHelp' : 'walkHelp' : touch ? 'mapTouchHelp' : 'mapHelp');
  updateCameraGuidance();
  $('#lighting-controls').hidden = !street; $('#preview-reset').hidden = !street;
  $('#back-world').hidden = mode !== 'together' || !localPreview;
  const kyoto = street && pack.id === 'shijo-karasuma';
  $('#walk-link').hidden = !kyoto; $('#companion-link').hidden = !kyoto;
  $('#street-map-toggle').hidden = world || !pack;
  $('#street-map-toggle').textContent = t(street ? 'surroundingMap' : 'enterStreet');
  document.querySelectorAll('[data-pack]').forEach(button => button.setAttribute('aria-pressed', String(street && button.dataset.pack === pack?.id)));
  $('#center-source').hidden = world || !center.url;
  if (center.url) $('#center-source').href = center.url;
  const light = liveView?.getLightingState();
  const lightingFailed = light && ['fallback', 'unavailable'].includes(light.phase);
  for (const value of ['day', 'night']) {
    const button = $('#lighting-' + value);
    button.setAttribute('aria-pressed', String((light?.requestedMode || lighting) === value));
    button.disabled = sceneState !== 'ready' || light?.phase === 'loading';
  }
  $('#lighting-controls').setAttribute('aria-busy', String(light?.phase === 'loading'));
  const mapState = $('#world-map').dataset.mapStatus;
  const lightingMessage = light?.phase === 'loading' ? 'lightingLoading' : lightingFailed
    ? light.fallbackReason === 'rig-unavailable' || light.phase === 'unavailable' ? 'lightingUnavailable' : 'lightingFallback' : '';
  const { failed: streamFailed, message: streamMessage } = streamNotice(streamingState);
  $('#scene-status').textContent = street ? sceneState === 'ready' ? streamMessage || lightingMessage ? t(streamMessage || lightingMessage) : '' : t(sceneState === 'loading' ? 'sceneLoading' : 'sceneError')
    : mapState === 'ready' ? '' : t(mapState === 'error' ? 'mapError' : 'mapLoading');
  $('#scene-status').hidden = !$('#scene-status').textContent;
  $('#scene-retry').hidden = street ? sceneState === 'loading' || (sceneState === 'ready' && !lightingFailed && !streamFailed) : mapState !== 'error';
  $('#scene-retry').textContent = t(street && sceneState === 'ready' && streamFailed ? 'streetSectionRetry'
    : street && sceneState === 'ready' && lightingFailed ? 'lightingRetry' : 'retry');
  solo?.update();
}

async function selectLighting(value) {
  const view = liveView;
  if (!view) return;
  const pending = view.setLightingMode(value);
  updatePreviewCopy();
  try { await pending; if (liveView === view) { lighting = view.getLightingState()?.mode || lighting; neighborhood?.capture(view.captureView(), lighting); } }
  finally { updatePreviewCopy(); }
}

function renderResults() {
  $('#search-results').innerHTML = results.map((place, index) => `<button data-result="${index}" class="search-result"><span>${escape(place.title)}</span><small>${escape([place.locality, place.country].filter(Boolean).join(' · '))}</small><span aria-hidden="true">↗</span></button>`).join('');
}
function renderRoutes() {
  $('#routes-status').textContent = routeState ? t(routeState) : '';
  $('#routes-retry').hidden = routeState !== 'routesError';
  $('#route-options').innerHTML = routes.map((route, index) => `<button class="route-option" data-route="${index}" aria-pressed="${index === selectedRoute}"><span class="route-index">0${index + 1}</span><strong>${escape(route.title)}</strong><span>${route.stops.length} ${t('stops')}</span></button>`).join('');
  const route = currentRoute(), stops = currentStops();
  $('[data-copy="routeNote"]').textContent = t(center.kind === 'country' ? 'countryNote'
    : route?.id === 'shijo' ? 'routeCuratedNote' : keptRoute ? 'keptOrderNote' : nearbyPlaces.length ? 'routeNearbyNote' : 'routeNote').replace('{radius}', new Intl.NumberFormat(locale).format(DEFAULT_RADIUS_METERS / 1000));
  $('#route-title').textContent = route?.title || center.title;
  $('#route-stops').innerHTML = stops.map((place, index) => `<li><span class="stop-index">${index + 1}</span><div><button data-stop="${index}">${escape(place.title)}</button>${place.url ? `<a href="${escape(place.url)}" target="_blank" rel="noopener noreferrer">${t('source')} ↗</a>` : ''}</div></li>`).join('');
  $('#route-maps').innerHTML = buildMapsJourney(stops).parts.map((part, index, parts) => `<a class="primary" href="${escape(part.url)}" target="_blank" rel="noopener noreferrer">${t(part.stops.length === 1 ? 'openPlaceMaps' : 'openMaps')}${parts.length > 1 ? ` · ${index + 1}/${parts.length}` : ''} ↗</a>`).join('');
  $('#maps-text').value = mapsShareText(stops, locale);
}

async function selectCenter(place, { preserveMapView = false } = {}) {
  if (mode === 'explore' && place.id?.startsWith(neighborhoodId + ':')) {
    const sightId = place.id.slice(neighborhoodId.length + 1);
    if (SIGHTS.some(sight => sight.id === sightId)) return neighborhood.enter(sightId);
  }
  restoreGeneration++; restoreController?.abort(); restoring = false; keptRoute = false; mapViewToRestore = null; previewRepresentation = null;
  searchRequest?.abort(); searchRequest = null; $('#place-search').setAttribute('aria-busy', 'false');
  if (preserveMapView) worldMap?.retainLocal(place);
  nearbyRequest?.abort(); nearbyRequest = new AbortController();
  const request = nearbyRequest;
  center = place; discoveryCenter = place; localPreview = mode === 'together'; results = []; renderResults();
  syncURL();
  searchMessage = ''; $('#search-status').textContent = '';
  routes = []; nearbyPlaces = []; selectedRoute = 0; routeState = 'routesLoading'; renderRoutes(); updateMode();
  if (showingNeighborhood()) { routeState = ''; renderRoutes(); updateMap(); return; }
  if (mode === 'together' && session?.participantToken) mutate({ type: 'presence.focus', destinationId: catalogPlace(place.id) ? place.id : null });
  if (place.kind === 'country') { routeState = 'countryNote'; renderRoutes(); updateMap(); return; }
  try {
    const places = await findNearby(place, { locale, signal: request.signal });
    if (request !== nearbyRequest) return;
    nearbyPlaces = places; routes = suggestRoutes(localizePackPlace(place), places, { locale }); routeState = routes.length ? '' : 'routesEmpty';
  } catch (error) { if (request.signal.aborted) return; routeState = 'routesError'; }
  renderRoutes(); updateMap();
}

function soloContext() {
  const street = usesStreet(), light = liveView?.getLightingState();
  const pack = getPackForPlace(center);
  return { mode, center, origin: discoveryCenter, street, pack, restoring, touch: touchControls,
    ready: street ? scenePackId === pack?.id && sceneState === 'ready' && light?.phase === 'ready' : $('#world-map')?.dataset.mapStatus === 'ready',
    lighting: light?.mode || lighting, view: street ? liveView?.captureView() : worldMap?.captureView(),
    route: currentRoute() || { id: 'selected-place', title: center.title, stops: [center] } };
}

async function openKeptPlace(place) {
  if (place.representation === 'street') {
    const pack = getPack(place.view.packId);
    if (!pack || pack.revision !== place.view.revision || getPackForPlace(place.center)?.id !== pack.id) throw new Error('solo-pack-unavailable');
  }
  if (getPackForPlace(place.center)?.id === neighborhoodId) {
    const selected = neighborhood.selectStops(place.route.stops.map(stop => stop.id).filter(id => id.startsWith(neighborhoodId + ':')).map(id => id.slice(neighborhoodId.length + 1)));
    if (!selected) throw new Error('solo-view-unavailable');
  }
  const generation = ++restoreGeneration;
  restoreController?.abort(); restoreController = new AbortController(); const request = restoreController;
  nearbyRequest?.abort(); searchRequest?.abort(); searchRequest = null; $('#place-search').setAttribute('aria-busy', 'false'); restoring = true;
  mode = 'explore'; localPreview = false; center = place.center; discoveryCenter = place.origin;
  lighting = place.lighting;
  searchMessage = ''; $('#search-status').textContent = '';
  results = []; nearbyPlaces = []; routes = [place.route]; selectedRoute = 0; routeState = ''; keptRoute = true;
  mapViewToRestore = place.representation === 'map' ? place.view : null;
  previewRepresentation = place.representation;
  syncURL(); applyCopy();
  try {
    if (place.representation === 'street') {
      await ensureScene();
      if (generation !== restoreGeneration) return false;
      const view = liveView;
      if (!view || view.getPackInfo().packId !== place.view.packId) throw new Error('solo-view-unavailable');
      const restored = await view.restoreView(place.view, { signal: request.signal });
      if (generation !== restoreGeneration || liveView !== view) return false;
      if (!restored) return false;
      await selectLighting(place.lighting);
      if (generation !== restoreGeneration) return false;
      if (liveView !== view || view.getLightingState().phase !== 'ready') throw new Error('solo-lighting-unavailable');
    } else {
      await ensureMap(); if (!worldMap) throw new Error('solo-map-unavailable');
      if (generation !== restoreGeneration) return false;
      await worldMap.whenReady(request.signal);
    }
    return generation === restoreGeneration;
  } finally { if (generation === restoreGeneration) { restoring = false; solo?.update(); } }
}

function roomSessionKey(id) { return roomCredentialKey(serviceSettings.endpoint, id); }
function serviceOperation(timeout = 15000) {
  return { generation: serviceGeneration, api, signal: AbortSignal.any([serviceController.signal, AbortSignal.timeout(timeout)]) };
}
function isCurrent(operation) { return operation.generation === serviceGeneration && !serviceController.signal.aborted; }
function renderConnection() {
  $('#service-connect').disabled = connectionPending;
  $('#service-connection-status').textContent = [t(connectionMessage), !serviceSettingsSaved ? t('serviceUnsaved') : ''].filter(Boolean).join(' ');
}
function clearRoomInvitation() {
  room = null; session = null; invitationNeedsConfirmation = false; busy = false; messageKey = ''; $('#action-status').textContent = '';
  $('#invite-url').value = ''; $('#invite-url').hidden = true;
  $('#room-title').value = ''; $('#preferences').value = ''; $('#generate-plan').textContent = t('generate');
  const url = new URL(location.href), hash = new URLSearchParams(url.hash.slice(1));
  hash.delete('room'); hash.delete('invite'); url.hash = hash.toString(); history.replaceState(null, '', url);
}
async function connectService(reset = false) {
  let next;
  try {
    next = reset ? { endpoint: defaultEndpoint, transport: 'sse' }
      : { endpoint: normalizeServiceURL($('#service-endpoint').value), transport: $('#service-transport').value };
  } catch {
    connectionMessage = 'serviceInvalid'; $('#service-endpoint').setAttribute('aria-invalid', 'true');
    renderConnection(); $('#service-endpoint').focus(); return;
  }
  const endpointChanged = next.endpoint !== serviceSettings.endpoint;
  // 每次重新连接都使旧请求失效；服务变更时清除当前邀请，保留其他旅行记录。
  serviceGeneration++; serviceController.abort(); subscription?.close(); subscription = null;
  serviceController = new AbortController();
  if (endpointChanged) clearRoomInvitation();
  else if (!reset) invitationNeedsConfirmation = false;
  busy = false; serviceReady = false; aiReady = false; roomMessage = 'serviceChecking';
  $('#generate-plan').textContent = t('generate');
  serviceSettings = next; api = createRoomClient({ baseURL: next.endpoint, transport: next.transport });
  try {
    if (reset) sessionStorage.removeItem(SERVICE_SELECTION_KEY);
    else sessionStorage.setItem(SERVICE_SELECTION_KEY, JSON.stringify(next));
    serviceSettingsSaved = true;
  } catch { serviceSettingsSaved = false; }
  $('#service-endpoint').value = next.endpoint; $('#service-transport').value = next.transport;
  $('#service-endpoint').removeAttribute('aria-invalid');
  renderRoom(); updateMap(); updatePreviewCopy();
  await checkService();
}
function saveSession() {
  try { sessionStorage.setItem(roomSessionKey(session.roomId), JSON.stringify(session)); } catch { /* 当前标签页仍可协作。 */ }
  const hash = new URLSearchParams({ room: session.roomId, invite: session.inviteToken });
  history.replaceState(null, '', `${location.pathname}?lang=${locale}&mode=together#${hash}`);
}
function applyRoom(value) {
  if (!value || room && value.id === room.id && value.revision < room.revision) return;
  room = value; renderRoom(); if (mode === 'together') { updateMap(); updatePreviewCopy(); }
}
function listenRoom() {
  subscription?.close();
  const generation = serviceGeneration;
  subscription = api.subscribe(session, { signal: serviceController.signal,
    onRoom(value) { if (generation === serviceGeneration) applyRoom(value); },
    onStatus(status) {
      if (generation !== serviceGeneration) return;
      roomMessage = status === 'connected' ? serviceSettings.transport === 'poll' ? 'connectedPolling' : 'connected'
        : status === 'connecting' ? 'connecting' : 'disconnected'; renderRoom();
    },
    onError(error) { if (generation === serviceGeneration && (error.status === 401 || error.status === 404)) { roomMessage = 'roomError'; renderRoom(); } },
  });
}
function reportRoomError(error) {
  if (error.room) applyRoom(error.room);
  setMessage(error.code === 'revision_conflict' ? 'conflict' : error.code === 'llm_unconfigured' ? 'aiUnavailable' : 'roomError');
}
async function mutate(action) {
  if (!room || !session?.participantToken) { setMessage('joinFirst'); return false; }
  const operation = serviceOperation();
  try {
    const result = await operation.api.action(session, { expectedRevision: room.revision, action }, operation);
    if (!isCurrent(operation)) return false;
    applyRoom(result.room); return true;
  } catch (error) { if (isCurrent(operation)) reportRoomError(error); return false; }
}
function renderRoom() {
  const joined = Boolean(session?.participantToken && room);
  $('#room-setup').hidden = joined;
  $('#room-shared').hidden = !room; $('#ai-panel').hidden = !joined;
  $('#room-create').hidden = Boolean(session); $('#room-join').hidden = !session;
  $('#room-title').hidden = Boolean(session); $('label[for="room-title"]').hidden = Boolean(session);
  $('#room-create').disabled = !serviceReady || busy; $('#room-join').disabled = !serviceReady || !room || busy;
  $('#room-status').textContent = t(roomMessage);
  $('#generate-plan').disabled = !aiReady || busy || !joined || (room?.dreams.length || 0) < 2;
  $('#ai-status').textContent = t(!aiReady ? 'aiUnavailable' : (room?.dreams.length || 0) < 2 ? 'planMissing' : 'aiNote');
  if (!room) return;
  $('#shared-title').textContent = room.title;
  $('#participant-list').innerHTML = room.participants.map((person, index) => {
    const focused = catalogPlace(person.focusedDestinationId);
    return `<div class="person"><span class="avatar avatar-${index % 4}">${escape(person.displayName.slice(0, 1))}</span><div><strong>${escape(person.displayName)}</strong>${focused ? `<small>${t('looking')} ${escape(focused.name)}</small>` : ''}</div>${focused ? `<button class="quiet" data-follow="${escape(focused.id)}">${t('follow')}</button>` : ''}</div>`;
  }).join('');
  $('#dream-list').innerHTML = room.dreams.length ? room.dreams.map(dream => {
    const place = catalogPlace(dream.destinationId), person = room.participants.find(p => p.id === dream.participantId);
    return `<article class="dream"><small>${escape(person?.displayName)}</small><button class="dream-place" data-preview="${escape(dream.destinationId)}">${escape(place?.name)} <span>↗</span></button><div><button class="quiet" data-preview="${escape(dream.destinationId)}">${t('preview')}</button>${dream.participantId === session?.participantId ? `<button class="quiet" data-remove-dream="${escape(dream.id)}">${t('remove')}</button>` : ''}</div></article>`;
  }).join('') : `<p class="small">${t('noDreams')}</p>`;
  $('#shared-plan').innerHTML = room.plan ? `<span class="plan-state">${t(room.plan.status === 'accepted' ? 'accepted' : 'proposed')} · ${room.plan.acceptedBy.length}/${room.participants.length}</span><h3>${escape(room.plan.title)}</h3><p>${escape(room.plan.summary)}</p><ol class="shared-stops">${room.plan.stopIds.map(id => `<li><button data-preview="${escape(id)}">${escape(catalogPlace(id)?.name)} ↗</button></li>`).join('')}</ol>` : '';
  $('#accept-plan').hidden = !room.plan;
  $('#accept-plan').disabled = Boolean(room.plan?.acceptedBy.includes(session?.participantId)) || busy;
}

async function checkService() {
  const operation = serviceOperation();
  connectionPending = true; connectionMessage = 'serviceChecking'; renderConnection();
  try {
    const health = await operation.api.health(operation);
    if (!isCurrent(operation)) return;
    serviceReady = health.ok === true && health.capabilities?.rooms === true;
    aiReady = serviceReady && health.capabilities?.planning === true;
    connectionMessage = serviceReady ? invitationNeedsConfirmation ? 'serviceConfirmInvitation' : 'serviceConnected' : 'serviceFailed';
    roomMessage = serviceReady ? invitationNeedsConfirmation ? 'serviceConfirmInvitation' : 'roomIntro' : 'serviceUnavailable';
    if (session && serviceReady && !invitationNeedsConfirmation) {
      try {
        const response = await operation.api.read(session, operation);
        if (!isCurrent(operation)) return;
        applyRoom(response.room); listenRoom();
      } catch { if (isCurrent(operation)) roomMessage = 'roomError'; }
    }
  } catch {
    if (isCurrent(operation)) { serviceReady = false; aiReady = false; roomMessage = 'serviceUnavailable'; connectionMessage = 'serviceFailed'; }
  } finally {
    if (isCurrent(operation)) { connectionPending = false; renderConnection(); renderRoom(); }
  }
}

async function copyValue(value, field) {
  try { await navigator.clipboard.writeText(value); setMessage('copied'); }
  catch { field.hidden = false; field.value = value; field.focus(); field.select(); setMessage('copyManual'); }
}
async function handleClick(event) {
  const button = event.target.closest('button'); if (!button || button.disabled) return;
  if (await neighborhood?.handleClick(button)) return;
  if (button.id.startsWith('solo-') || button.dataset.keptOpen || button.dataset.keptRemove) { await solo.handleClick(button); return; }
  if (button.dataset.locale) {
    locale = button.dataset.locale; syncURL(); applyCopy(); return;
  }
  if (button.dataset.mode) { restoreGeneration++; restoreController?.abort(); restoring = false; mode = button.dataset.mode; localPreview = false; syncURL(); updateMode(); return; }
  if (button.dataset.pack) {
    if (button.dataset.pack === neighborhoodId) await neighborhood.enter();
    else await selectCenter(getPackPlace(button.dataset.pack, locale));
    return;
  }
  if (button.dataset.result !== undefined) { await selectCenter(results[Number(button.dataset.result)]); return; }
  if (button.dataset.route !== undefined) { selectedRoute = Number(button.dataset.route); renderRoutes(); updateMap(); return; }
  if (button.dataset.stop !== undefined) {
    restoreGeneration++; restoreController?.abort(); restoring = false; previewRepresentation = null;
    const place = currentStops()[Number(button.dataset.stop)]; center = place; localPreview = mode === 'together'; syncURL(); showPreview(); return;
  }
  if (button.dataset.preview || button.dataset.follow) { await selectCenter(fromCatalog(catalogPlace(button.dataset.preview || button.dataset.follow))); return; }
  if (button.dataset.removeDream) { await mutate({ type: 'dream.remove', dreamId: button.dataset.removeDream }); return; }
  if (button.dataset.lighting && liveView) {
    await selectLighting(button.dataset.lighting);
    return;
  }
  if (button.id === 'preview-reset') { liveView?.resetCamera(); return; }
  if (button.id === 'street-map-toggle') {
    restoreGeneration++; restoreController?.abort(); restoring = false;
    previewRepresentation = usesStreet() ? 'map' : null; mapViewToRestore = null;
    showPreview(); return;
  }
  if (button.id === 'scene-retry') {
    if (usesStreet()) {
      if (sceneState === 'ready' && streamingState?.cells.some(cell => cell.error)) liveView.retryStreaming();
      else if (sceneState === 'ready' && liveView) await selectLighting(liveView.getLightingState().requestedMode || lighting);
      else if (showingNeighborhood()) await neighborhood.enter();
      else { releaseScene(); await ensureScene(); }
    }
    else if (worldMap) worldMap.retry();
    else await ensureMap();
    return;
  }
  if (button.id === 'back-world') { localPreview = false; updateMode(); return; }
  if (button.id === 'copy-maps') { await copyValue($('#maps-text').value, $('#maps-text')); return; }
  if (button.id === 'routes-retry') { await selectCenter(discoveryCenter, { preserveMapView: !usesStreet() }); return; }
  if (button.id === 'service-reset') { await connectService(true); return; }
  if (button.id === 'room-invite') {
    const url = new URL('./index.html', location.href); url.searchParams.set('lang', locale); url.searchParams.set('mode', 'together');
    url.hash = new URLSearchParams({ room: session.roomId, invite: session.inviteToken }).toString();
    await copyValue(url.href, $('#invite-url')); return;
  }
  if (button.id === 'add-dream') {
    if (!session?.participantToken) { setMessage('joinFirst'); $('#traveler-name').focus(); return; }
    if (!catalogPlace(center.id) && !await mutate({ type: 'catalog.add', place: toCatalog(center) })) return;
    if (await mutate({ type: 'dream.add', destinationId: center.id })) { setMessage('saved'); localPreview = false; updateMode(); }
    return;
  }
  if (button.id === 'accept-plan') { await mutate({ type: 'plan.accept' }); return; }
  if (button.id === 'room-create' || button.id === 'room-join') {
    const displayName = $('#traveler-name').value.trim();
    if (!displayName) { $('#traveler-name').focus(); $('#traveler-name').setCustomValidity(t('name')); $('#traveler-name').reportValidity(); return; }
    const operation = serviceOperation();
    busy = true; renderRoom();
    try {
      const response = button.id === 'room-create' ? await operation.api.create({ title: $('#room-title').value.trim() || t('roomPlaceholder'), displayName, catalog: [toCatalog(kyotoCenter())] }, operation)
        : await operation.api.join(session, { displayName, expectedRevision: room.revision }, operation);
      if (!isCurrent(operation)) return;
      session = { roomId: response.room.id, inviteToken: response.inviteToken || session.inviteToken,
        participantId: response.participantId, participantToken: response.participantToken };
      saveSession(); applyRoom(response.room); listenRoom();
    } catch (error) { if (isCurrent(operation)) reportRoomError(error); }
    finally { if (isCurrent(operation)) { busy = false; renderRoom(); } }
    return;
  }
  if (button.id === 'generate-plan') {
    const operation = serviceOperation(60000);
    busy = true; renderRoom(); $('#generate-plan').textContent = t('generating');
    try {
      const response = await operation.api.plan(session, { preferences: $('#preferences').value, locale }, operation);
      if (!isCurrent(operation)) return;
      if (response.basedOnRevision !== room.revision) { setMessage('conflict'); return; }
      await mutate({ type: 'plan.propose', title: response.plan.title, summary: response.plan.summary, stopIds: response.plan.stopIds });
    } catch (error) { if (isCurrent(operation)) reportRoomError(error); }
    finally { if (isCurrent(operation)) { busy = false; renderRoom(); $('#generate-plan').textContent = t('generate'); } }
  }
}

async function enterNeighborhood({ progress, sightId }) {
  const generation = ++restoreGeneration;
  restoreController?.abort(); nearbyRequest?.abort(); searchRequest?.abort();
  if (scenePackId === neighborhoodId && sceneState === 'error') releaseScene();
  const continuing = scenePackId === neighborhoodId && Boolean(liveView);
  mode = 'explore'; localPreview = false; restoring = true; keptRoute = false;
  previewRepresentation = null; mapViewToRestore = null;
  center = getPackPlace(neighborhoodId, locale); discoveryCenter = center;
  if (!continuing) lighting = progress.lighting;
  results = []; routeState = ''; searchMessage = '';
  $('#place-search').setAttribute('aria-busy', 'false');
  syncURL(); applyCopy();
  try {
    await ensureScene();
    if (generation !== restoreGeneration) throw new DOMException('Neighborhood opening cancelled', 'AbortError');
    if (!liveView || scenePackId !== neighborhoodId || sceneState !== 'ready') throw new Error('Neighborhood view is unavailable');
    if (sightId && !liveView.focusSight(sightId)) throw new Error('Neighborhood sight is unavailable');
    if (sightId && matchMedia('(max-width: 1100px)').matches) {
      $('#live-stage').scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
    neighborhood.capture(liveView.captureView(), liveView.getLightingState()?.mode || lighting);
  } finally {
    if (generation === restoreGeneration) { restoring = false; solo?.update(); }
  }
}

function boot() {
  const invitation = new URLSearchParams(location.hash.slice(1));
  if (invitation.has('room') && invitation.has('invite')) {
    if (!params.has('mode')) mode = 'together';
    session = { roomId: invitation.get('room'), inviteToken: invitation.get('invite') };
    invitationNeedsConfirmation = true;
    try {
      const saved = JSON.parse(sessionStorage.getItem(roomSessionKey(session.roomId)));
      if (saved?.roomId === session.roomId && saved.inviteToken === session.inviteToken
        && typeof saved.participantId === 'string' && saved.participantId
        && typeof saved.participantToken === 'string' && saved.participantToken) {
        session = saved; invitationNeedsConfirmation = false;
      }
    } catch { /* 确认服务地址后仍可通过当前邀请加入。 */ }
  }
  $('#home-app').innerHTML = markup();
  $('#service-endpoint').value = serviceSettings.endpoint; $('#service-transport').value = serviceSettings.transport;
  $('#testing-connection').open = invitationNeedsConfirmation;
  $('#place-query').maxLength = 120; $('#place-query').minLength = 2;
  const attribution = document.createElement('p'); attribution.className = 'data-attribution';
  for (const source of DISCOVERY_ATTRIBUTION) {
    const link = document.createElement('a'); link.href = source.url; link.textContent = source.label;
    link.target = '_blank'; link.rel = 'noopener noreferrer'; attribution.append(link);
  }
  $('.home-footer').append(attribution);
  const planner = createJourneyPlanner({ routeId: geography.id, revision: geography.revision,
    graph: geography.navigation, startNodeId: geography.startNodeId, sights: SIGHTS });
  neighborhood = createNeighborhoodJourney({ planner, frame: geography.frame, locale: () => locale,
    startPlace: { ...getPackPlace(neighborhoodId, locale), title: geography.title }, interestLabels: planner.interestLabels,
    onEnter: enterNeighborhood,
    onStop() { return scenePackId === neighborhoodId && Boolean(liveView?.stopWalking()); },
    onChange() { renderRoutes(); if (showingNeighborhood()) updateMap(); } });
  routes = getPackForPlace(center)?.id === 'ginza-wako' ? []
    : [{ id: 'shijo', title: t('localRoute'), stops: resolveStops(['crossing', 'mitsui', 'mufg'], locale).map(place => ({ ...place, url: place.source })) }];
  solo = createSoloController({ t, locale: () => locale, context: soloContext, openPlace: openKeptPlace,
    pause(value) { soloPaused = value; liveView?.setPaused(value || !usesStreet()); },
    inspect(value) { liveView?.setInspecting(value); if (value) $('#live-stage').focus({ preventScroll: true }); },
    inspectCenter() { const point = liveView?.getInspectionState()?.focus?.screen; if (point) liveView.inspectAt(point.x, point.y); },
    clearInspection() { liveView?.clearInspection(); },
    async exploreArea() {
      const area = areaAtView(worldMap?.captureView(), t('unnamedArea'));
      if (area) await selectCenter(area, { preserveMapView: true });
    },
  });
  applyCopy(); checkService();
  $('#home-app').addEventListener('click', handleClick);
  $('#home-app').addEventListener('click', () => { if (inputHelpDirty) updatePreviewCopy(); });
  // 混合输入设备以实际操作方式显示提示；媒体查询仅决定初始提示。
  $('#home-app').addEventListener('pointerdown', event => {
    if (!['touch', 'mouse'].includes(event.pointerType)) return;
    const touch = event.pointerType === 'touch';
    if (touch !== touchControls) {
      touchControls = touch; inputHelpDirty = true;
      if (event.target.closest('#live-stage, #world-map')) updatePreviewCopy();
    }
  }, { passive: true, capture: true });
  $('#live-stage').addEventListener('keydown', event => {
    if (touchControls && !event.altKey && !event.ctrlKey && !event.metaKey) { touchControls = false; updatePreviewCopy(); }
  });
  $('#service-connection-form').addEventListener('submit', event => { event.preventDefault(); void connectService(); });
  $('#service-endpoint').addEventListener('input', () => $('#service-endpoint').removeAttribute('aria-invalid'));
  $('#traveler-name').addEventListener('input', () => $('#traveler-name').setCustomValidity(''));
  $('#place-search').addEventListener('submit', async event => {
    event.preventDefault(); searchRequest?.abort(); searchRequest = new AbortController(); const request = searchRequest;
    $('#place-search').setAttribute('aria-busy', 'true'); searchMessage = 'searching'; $('#search-status').textContent = t(searchMessage);
    try {
      const found = await searchCenters($('#place-query').value, { locale, signal: request.signal });
      if (request !== searchRequest) return;
      results = found; renderResults(); searchMessage = results.length ? 'selectResult' : 'noResults'; $('#search-status').textContent = t(searchMessage);
    } catch (error) { if (!request.signal.aborted) { searchMessage = 'searchError'; $('#search-status').textContent = t(searchMessage); } }
    finally { if (request === searchRequest) $('#place-search').setAttribute('aria-busy', 'false'); }
  });
  window.addEventListener('pagehide', event => {
    neighborhood?.capture(liveView?.captureView(), liveView?.getLightingState()?.mode || lighting); neighborhood?.flush();
    serviceGeneration++; serviceController.abort(); subscription?.close(); nearbyRequest?.abort(); searchRequest?.abort();
    if (event.persisted) liveView?.setPaused(true);
    else { releaseScene(); worldMap?.destroy(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { neighborhood?.capture(liveView?.captureView(), liveView?.getLightingState()?.mode || lighting); neighborhood?.flush(); }
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      serviceController = new AbortController(); busy = false; $('#generate-plan').textContent = t('generate');
      showPreview(); checkService();
    }
  });
  if (import.meta.env.DEV || params.get('qa') === '1') window.__HOME__ = Object.freeze({ snapshot: () => ({ mode, center: { ...center }, localPreview, sceneState,
    pack: liveView?.getPackInfo() || null, requestedPack: getPackForPlace(center)?.id || null,
    lighting, room: room ? structuredClone(room) : null, serviceReady, aiReady,
    solo: solo?.snapshot(), currentView: soloContext().view, touchControls, neighborhood: neighborhood?.snapshot(), streaming: streamingState,
    serviceEndpoint: serviceSettings.endpoint, serviceTransport: serviceSettings.transport, connectionPending, invitationNeedsConfirmation, map: worldMap?.snapshot() || null,
    routes: routes.map(route => ({ id: route.id, stops: route.stops.map(p => p.id) })) }) });
  if (params.get('pack') === 'ginza-wako' && mode === 'explore') void selectCenter(center);
  if (params.get('pack') === neighborhoodId && mode === 'explore') void neighborhood.enter();
}

if (params.has('lighting')) location.replace(`./walk.html${location.search}${location.hash}`);
else boot();
