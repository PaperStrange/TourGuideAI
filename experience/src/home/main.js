import './styles.css';
import { copy } from './copy.js';
import { createPerspectiveView } from '../perspective/live-view.js';
import { createRoomClient } from './room-client.js';
import { searchCenters, findNearby, DISCOVERY_ATTRIBUTION } from '../discovery/provider.js';
import { suggestRoutes } from '../discovery/routes.js';
import { resolveStops } from '../travel/places.js';
import { buildMapsJourney, mapsShareText } from '../travel/maps.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const params = new URLSearchParams(location.search);
let locale = params.get('lang') === 'zh' ? 'zh' : 'en';
const t = key => copy(locale, key);
let mode = params.get('mode') === 'together' ? 'together' : 'explore';
let center = kyotoCenter(), results = [], routes = [], nearbyPlaces = [], selectedRoute = 0;
let liveView, worldMap, scenePromise, mapPromise, localPreview = false, lighting = 'day', room = null, session = null, subscription;
let serviceReady = false, aiReady = false, searchRequest, nearbyRequest, routeState = '', sceneState = 'loading';
let messageKey = '', roomMessage = 'serviceChecking', busy = false;
const api = createRoomClient({ baseURL: import.meta.env.VITE_TRAVEL_API_URL || '' });

function kyotoCenter() {
  const place = resolveStops(['crossing'], locale)[0];
  return { ...place, kind: 'poi', source: 'OpenStreetMap', url: place.source };
}
const isDetailed = place => Math.abs(place.latitude - 35.00376) < 0.00055 && Math.abs(place.longitude - 135.75995) < 0.00065;
const fromCatalog = place => ({ ...place, title: place.name, url: place.sourceUrl, source: 'Shared destination' });
const toCatalog = place => ({ id: place.id, name: place.title, latitude: place.latitude, longitude: place.longitude,
  kind: ['country', 'city'].includes(place.kind) ? place.kind : 'poi', sourceUrl: place.url || undefined,
  country: place.country || undefined, city: place.locality || undefined });
const catalogPlace = id => room?.catalog.find(place => place.id === id);
const currentStops = () => routes[selectedRoute]?.stops || [center];
function setMessage(key) { messageKey = key; $('#action-status').textContent = t(key); }

function markup() {
  return `<header class="home-header"><a class="brand" href="./index.html"><span aria-hidden="true">↗</span> TourGuideAI</a><nav aria-label="${t('language')}"><a data-link="memories" href="./perspective.html?lang=${locale}">${t('memories')}</a><button id="locale-en" data-locale="en">EN</button><button id="locale-zh" data-locale="zh">中文</button></nav></header>
  <main class="home-main"><div class="opening"><div><p class="eyebrow">A WORLD TO FEEL / 一个值得感受的世界</p><h1 data-copy="title"></h1><p class="subtitle" data-copy="subtitle"></p></div><div class="mode-switch" aria-label="Travel mode"><button id="mode-explore" data-mode="explore" data-copy="explore"></button><button id="mode-together" data-mode="together" data-copy="together"></button></div></div>
  <section class="search-panel" aria-labelledby="search-label"><div><p class="eyebrow" id="journey-step"></p><h2 id="search-label"></h2></div><form id="place-search"><label class="sr-only" for="place-query" data-copy="searchLabel"></label><input id="place-query" name="place" type="search" maxlength="160" autocomplete="off" required><button id="search-submit" class="primary" type="submit" data-copy="search"></button></form><div id="search-status" role="status"></div><div id="search-results" class="search-results"></div></section>
  <div class="journey-layout"><section class="visual-column"><div class="preview-heading"><div><span id="preview-kind" class="eyebrow"></span><h2 id="preview-title"></h2></div><div class="preview-actions"><div id="lighting-controls" class="segmented"><button id="lighting-day" data-lighting="day" data-copy="day"></button><button id="lighting-night" data-lighting="night" data-copy="night"></button></div><button id="back-world" class="secondary" data-copy="backWorld" hidden></button></div></div>
  <div class="preview-frame"><div id="live-stage" tabindex="0" role="region"></div><div id="world-map" hidden></div><div class="preview-tools"><button id="preview-reset" data-copy="reset"></button></div><div id="scene-status" class="scene-status" role="status"></div><button id="scene-retry" class="primary scene-retry" data-copy="retry" hidden></button><div id="view-guidance" class="view-guidance"></div></div>
  <div class="preview-caption"><span id="preview-note"></span><a id="center-source" target="_blank" rel="noopener noreferrer" data-copy="source"></a></div>
  <div id="center-actions" class="center-actions"><button id="add-dream" class="primary" data-copy="addDream" hidden></button><a class="text-link" id="walk-link" href="./walk.html" data-copy="legacy"></a><a class="text-link" id="companion-link" href="./travel.html" data-copy="companion"></a></div>
  <section id="routes-section" class="route-section" aria-labelledby="routes-heading"><p class="eyebrow">02 / A LITTLE FURTHER</p><h2 id="routes-heading" data-copy="routesTitle"></h2><p id="routes-status" role="status"></p><div id="route-options" class="route-options"></div><p class="small" data-copy="routeNote"></p></section>
  </section><aside class="journey-sidebar"><section id="explore-plan" class="paper-card"><span class="eyebrow">YOUR WALK / 你的漫步</span><h2 id="route-title"></h2><ol id="route-stops" class="stop-list"></ol><div id="route-maps" class="map-links"></div><button id="copy-maps" class="secondary" data-copy="copyMaps"></button><label class="sr-only" for="maps-text" data-copy="copyMaps"></label><textarea id="maps-text" readonly hidden></textarea></section>
  <section id="together-panel" hidden><div class="paper-card" id="room-setup"><h2 data-copy="together"></h2><p data-copy="roomIntro"></p><label for="traveler-name" data-copy="name"></label><input id="traveler-name" maxlength="60" autocomplete="nickname"><label for="room-title" data-copy="roomTitle"></label><input id="room-title" maxlength="120"><button id="room-create" class="primary" data-copy="create"></button><button id="room-join" class="primary" data-copy="join" hidden></button></div>
  <div class="paper-card" id="room-shared" hidden><span class="eyebrow">OUR JOURNEY / 共同旅程</span><h2 id="shared-title"></h2><button id="room-invite" class="secondary" data-copy="invite"></button><label class="sr-only" for="invite-url" data-copy="inviteLabel"></label><textarea id="invite-url" readonly hidden></textarea><p class="small" data-copy="inviteNote"></p><h3 data-copy="people"></h3><div id="participant-list"></div><h3 data-copy="dreams"></h3><div id="dream-list"></div></div>
  <p id="room-status" class="service-status" role="status"></p><div class="paper-card" id="ai-panel" hidden><h2 data-copy="planTitle"></h2><label for="preferences" data-copy="preferences"></label><textarea id="preferences" maxlength="2000" rows="3"></textarea><button id="generate-plan" class="primary" data-copy="generate"></button><p class="small" id="ai-status"></p><div id="shared-plan"></div><button id="accept-plan" class="secondary" data-copy="accept" hidden></button></div></section>
  <p id="action-status" role="status" aria-live="polite"></p></aside></div>
  </main><footer class="home-footer"><span data-copy="footer"></span><div><span data-copy="networkNote"></span><a href="./credits.html" data-copy="credits"></a></div></footer>`;
}

function applyCopy() {
  if (routes[0]?.id === 'shijo') {
    routes = [{ id: 'shijo', title: t('localRoute'), stops: resolveStops(['crossing', 'mitsui', 'mufg'], locale).map(place => ({ ...place, url: place.source })) }];
    const translated = routes[0].stops.find(place => place.id === center.id);
    if (translated) center = { ...center, title: translated.title };
  } else if (nearbyPlaces.length) {
    const previousId = routes[selectedRoute]?.id;
    routes = suggestRoutes(center, nearbyPlaces, { locale });
    selectedRoute = Math.max(0, routes.findIndex(route => route.id === previousId));
  }
  document.documentElement.lang = locale;
  document.title = `${t('title')} · TourGuideAI`;
  document.querySelectorAll('[data-copy]').forEach(node => { node.textContent = t(node.dataset.copy); });
  document.querySelectorAll('[data-locale]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.locale === locale)));
  $('#place-query').placeholder = t('searchPlaceholder'); $('#traveler-name').placeholder = t('namePlaceholder');
  $('#room-title').placeholder = t('roomPlaceholder'); $('#preferences').placeholder = t('preferencesPlaceholder');
  $('[data-link="memories"]').href = `./perspective.html?lang=${locale}`;
  $('[data-link="memories"]').textContent = t('memories');
  $('#walk-link').href = `./walk.html?lang=${locale}`; $('#companion-link').href = `./travel.html?lang=${locale}`;
  $('#live-stage').setAttribute('aria-label', t('live')); $('#world-map').setAttribute('aria-label', t('world'));
  liveView?.setLocale(locale); updateMode(); renderResults(); renderRoutes(); renderRoom();
  if (messageKey) setMessage(messageKey);
}

function syncURL() {
  const url = new URL(location.href); url.searchParams.set('lang', locale); url.searchParams.set('mode', mode);
  history.replaceState(null, '', url);
}

function updateMode() {
  const together = mode === 'together';
  document.querySelectorAll('[data-mode]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.mode === mode)));
  $('#journey-step').textContent = t(together ? 'togetherStep' : 'exploreStep');
  $('#search-label').textContent = t(together ? 'dreamLabel' : 'searchLabel');
  $('label[for="place-query"]').textContent = t(together ? 'dreamLabel' : 'searchLabel');
  $('#together-panel').hidden = !together; $('#explore-plan').hidden = together && !localPreview;
  $('#routes-section').hidden = together && !localPreview;
  $('#add-dream').hidden = !together || !localPreview;
  showPreview();
}

async function ensureScene() {
  if (liveView || scenePromise) return scenePromise;
  sceneState = 'loading'; updatePreviewCopy();
  scenePromise = createPerspectiveView($('#live-stage'), { locale,
    onStatus(value) { sceneState = value.status; updatePreviewCopy(); },
  }).then(view => { liveView = view; sceneState = 'ready'; view.setPaused(!usesStreet()); updatePreviewCopy(); })
    .catch(() => { sceneState = 'error'; updatePreviewCopy(); })
    .finally(() => { scenePromise = null; });
  return scenePromise;
}
function usesStreet() { return (mode === 'explore' || localPreview) && isDetailed(center); }
async function ensureMap() {
  if (worldMap || mapPromise) return mapPromise;
  $('#world-map').dataset.mapStatus = 'loading';
  mapPromise = import('./world-map.js').then(({ createWorldMap }) => {
    worldMap = createWorldMap($('#world-map'), { onSelect: selectCenter,
      onStatus() { updatePreviewCopy(); } });
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
  } else { worldMap.setPlaces(currentStops(), [{ stops: currentStops() }]); worldMap.local(center); }
}
function showPreview() {
  const street = usesStreet();
  $('#live-stage').hidden = !street; $('#world-map').hidden = street;
  liveView?.setPaused(!street);
  if (street) ensureScene(); else { ensureMap().then(() => { worldMap?.resize(); updateMap(); }); }
  updatePreviewCopy();
}
function updatePreviewCopy() {
  if (!$('#preview-kind')) return;
  const world = mode === 'together' && !localPreview, street = usesStreet();
  $('#preview-kind').textContent = t(world ? 'world' : street ? 'live' : center.kind === 'country' ? 'country' : 'map3d');
  $('#preview-title').textContent = world ? room?.title || t('together') : center.title;
  $('#preview-note').textContent = t(world ? 'worldNote' : street ? 'streetNote' : center.kind === 'country' ? 'countryNote' : 'areaNote');
  $('#view-guidance').textContent = t(street ? 'walkHelp' : 'mapHelp');
  $('#lighting-controls').hidden = !street; $('#preview-reset').hidden = !street;
  $('#back-world').hidden = mode !== 'together' || !localPreview;
  $('#walk-link').hidden = !street; $('#companion-link').hidden = !street;
  $('#center-source').hidden = world || !center.url;
  if (center.url) $('#center-source').href = center.url;
  for (const value of ['day', 'night']) $('#lighting-' + value).setAttribute('aria-pressed', String(lighting === value));
  const mapState = $('#world-map').dataset.mapStatus;
  $('#scene-status').textContent = street ? sceneState === 'ready' ? '' : t(sceneState === 'loading' ? 'sceneLoading' : 'sceneError')
    : mapState === 'ready' ? '' : t(mapState === 'error' ? 'mapError' : 'mapLoading');
  $('#scene-status').hidden = !$('#scene-status').textContent;
  $('#scene-retry').hidden = !(street && !['ready', 'loading'].includes(sceneState));
}

function renderResults() {
  $('#search-results').innerHTML = results.map((place, index) => `<button data-result="${index}" class="search-result"><span>${escape(place.title)}</span><small>${escape([place.locality, place.country].filter(Boolean).join(' · '))}</small><span aria-hidden="true">↗</span></button>`).join('');
}
function renderRoutes() {
  $('#routes-status').textContent = routeState ? t(routeState) : '';
  $('#route-options').innerHTML = routes.map((route, index) => `<button class="route-option" data-route="${index}" aria-pressed="${index === selectedRoute}"><span class="route-index">0${index + 1}</span><strong>${escape(route.title)}</strong><span>${route.stops.length} ${t('stops')}</span></button>`).join('');
  const route = routes[selectedRoute], stops = currentStops();
  $('#route-title').textContent = route?.title || center.title;
  $('#route-stops').innerHTML = stops.map((place, index) => `<li><span class="stop-index">${index + 1}</span><div><button data-stop="${index}">${escape(place.title)}</button>${place.url ? `<a href="${escape(place.url)}" target="_blank" rel="noopener noreferrer">${t('source')} ↗</a>` : ''}</div></li>`).join('');
  $('#route-maps').innerHTML = buildMapsJourney(stops).parts.map((part, index, parts) => `<a class="primary" href="${escape(part.url)}" target="_blank" rel="noopener noreferrer">${t('openMaps')}${parts.length > 1 ? ` · ${index + 1}/${parts.length}` : ''} ↗</a>`).join('');
  $('#maps-text').value = mapsShareText(stops, locale);
}

async function selectCenter(place) {
  nearbyRequest?.abort(); nearbyRequest = new AbortController();
  const request = nearbyRequest;
  center = place; localPreview = mode === 'together'; results = []; renderResults();
  routes = []; nearbyPlaces = []; selectedRoute = 0; routeState = 'routesLoading'; renderRoutes(); updateMode();
  if (session?.participantToken) mutate({ type: 'presence.focus', destinationId: catalogPlace(place.id) ? place.id : null });
  if (place.kind === 'country') { routeState = 'countryNote'; renderRoutes(); updateMap(); return; }
  try {
    const places = await findNearby(place, { locale, signal: request.signal });
    if (request !== nearbyRequest) return;
    nearbyPlaces = places; routes = suggestRoutes(place, places, { locale }); routeState = routes.length ? '' : 'routesEmpty';
  } catch (error) { if (request.signal.aborted) return; routeState = 'routesError'; }
  renderRoutes(); updateMap();
}

function roomSessionKey(id) { return `tourguideai:room-session:${id}`; }
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
  subscription = api.subscribe(session, { onRoom: applyRoom,
    onStatus(status) { roomMessage = status === 'connected' ? 'connected' : status === 'connecting' ? 'connecting' : 'disconnected'; renderRoom(); },
    onError(error) { if (error.status === 401 || error.status === 404) { roomMessage = 'roomError'; renderRoom(); } },
  });
}
function reportRoomError(error) {
  if (error.room) applyRoom(error.room);
  setMessage(error.code === 'revision_conflict' ? 'conflict' : error.code === 'llm_unconfigured' ? 'aiUnavailable' : 'roomError');
}
async function mutate(action) {
  if (!room || !session?.participantToken) { setMessage('joinFirst'); return false; }
  try { const result = await api.action(session, { expectedRevision: room.revision, action }); applyRoom(result.room); return true; }
  catch (error) { reportRoomError(error); return false; }
}
function renderRoom() {
  const joined = Boolean(session?.participantToken && room);
  $('#room-setup').hidden = joined;
  $('#room-shared').hidden = !room; $('#ai-panel').hidden = !joined;
  $('#room-create').hidden = Boolean(session); $('#room-join').hidden = !session;
  $('#room-title').hidden = Boolean(session); $('label[for="room-title"]').hidden = Boolean(session);
  $('#room-create').disabled = !serviceReady || busy; $('#room-join').disabled = !serviceReady || busy;
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
  try {
    const health = await api.health(); serviceReady = health.ok === true;
    aiReady = health.capabilities?.planning === true;
    roomMessage = serviceReady ? 'roomIntro' : 'serviceUnavailable';
    if (session && serviceReady) { const response = await api.read(session); applyRoom(response.room); listenRoom(); }
  } catch { serviceReady = false; roomMessage = 'serviceUnavailable'; }
  renderRoom();
}

async function copyValue(value, field) {
  try { await navigator.clipboard.writeText(value); setMessage('copied'); }
  catch { field.hidden = false; field.value = value; field.focus(); field.select(); setMessage('copyManual'); }
}
async function handleClick(event) {
  const button = event.target.closest('button'); if (!button || button.disabled) return;
  if (button.dataset.locale) {
    locale = button.dataset.locale; syncURL(); applyCopy(); return;
  }
  if (button.dataset.mode) { mode = button.dataset.mode; localPreview = false; syncURL(); updateMode(); return; }
  if (button.dataset.result !== undefined) { await selectCenter(results[Number(button.dataset.result)]); return; }
  if (button.dataset.route !== undefined) { selectedRoute = Number(button.dataset.route); renderRoutes(); updateMap(); return; }
  if (button.dataset.stop !== undefined) {
    const place = currentStops()[Number(button.dataset.stop)]; center = place; localPreview = mode === 'together'; showPreview(); return;
  }
  if (button.dataset.preview || button.dataset.follow) { await selectCenter(fromCatalog(catalogPlace(button.dataset.preview || button.dataset.follow))); return; }
  if (button.dataset.removeDream) { await mutate({ type: 'dream.remove', dreamId: button.dataset.removeDream }); return; }
  if (button.dataset.lighting && liveView) {
    button.disabled = true;
    try { await liveView.setLightingMode(button.dataset.lighting); lighting = liveView.getLightingState().mode; }
    finally { button.disabled = false; updatePreviewCopy(); }
    return;
  }
  if (button.id === 'preview-reset') { liveView?.resetCamera(); return; }
  if (button.id === 'scene-retry') { liveView?.destroy(); liveView = null; await ensureScene(); return; }
  if (button.id === 'back-world') { localPreview = false; updateMode(); return; }
  if (button.id === 'copy-maps') { await copyValue($('#maps-text').value, $('#maps-text')); return; }
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
    busy = true; renderRoom();
    try {
      const response = button.id === 'room-create' ? await api.create({ title: $('#room-title').value.trim() || t('roomPlaceholder'), displayName, catalog: [toCatalog(kyotoCenter())] })
        : await api.join(session, { displayName, expectedRevision: room.revision });
      session = { roomId: response.room.id, inviteToken: response.inviteToken || session.inviteToken,
        participantId: response.participantId, participantToken: response.participantToken };
      saveSession(); applyRoom(response.room); listenRoom();
    } catch (error) { reportRoomError(error); }
    finally { busy = false; renderRoom(); }
    return;
  }
  if (button.id === 'generate-plan') {
    busy = true; renderRoom(); $('#generate-plan').textContent = t('generating');
    try {
      const response = await api.plan(session, { preferences: $('#preferences').value, locale });
      if (response.basedOnRevision !== room.revision) { setMessage('conflict'); return; }
      await mutate({ type: 'plan.propose', title: response.plan.title, summary: response.plan.summary, stopIds: response.plan.stopIds });
    } catch (error) { reportRoomError(error); }
    finally { busy = false; renderRoom(); $('#generate-plan').textContent = t('generate'); }
  }
}

function boot() {
  const invitation = new URLSearchParams(location.hash.slice(1));
  if (invitation.has('room') && invitation.has('invite')) {
    if (!params.has('mode')) mode = 'together';
    session = { roomId: invitation.get('room'), inviteToken: invitation.get('invite') };
    try { const saved = JSON.parse(sessionStorage.getItem(roomSessionKey(session.roomId))); if (saved?.inviteToken === session.inviteToken) session = saved; } catch { /* 邀请仍可通过当前页面加入。 */ }
  }
  $('#home-app').innerHTML = markup();
  $('#place-query').maxLength = 120; $('#place-query').minLength = 2;
  const attribution = document.createElement('p'); attribution.className = 'data-attribution';
  for (const source of DISCOVERY_ATTRIBUTION) {
    const link = document.createElement('a'); link.href = source.url; link.textContent = source.label;
    link.target = '_blank'; link.rel = 'noopener noreferrer'; attribution.append(link);
  }
  $('.home-footer').append(attribution);
  routes = [{ id: 'shijo', title: t('localRoute'), stops: resolveStops(['crossing', 'mitsui', 'mufg'], locale).map(place => ({ ...place, url: place.source })) }];
  applyCopy(); checkService();
  $('#home-app').addEventListener('click', handleClick);
  $('#traveler-name').addEventListener('input', () => $('#traveler-name').setCustomValidity(''));
  $('#place-search').addEventListener('submit', async event => {
    event.preventDefault(); searchRequest?.abort(); searchRequest = new AbortController(); const request = searchRequest;
    $('#search-submit').disabled = true; $('#search-status').textContent = t('searching');
    try {
      const found = await searchCenters($('#place-query').value, { locale, signal: request.signal });
      if (request !== searchRequest) return;
      results = found; renderResults(); $('#search-status').textContent = t(results.length ? 'selectResult' : 'noResults');
    } catch (error) { if (!request.signal.aborted) $('#search-status').textContent = t('searchError'); }
    finally { if (request === searchRequest) $('#search-submit').disabled = false; }
  });
  window.addEventListener('pagehide', event => {
    subscription?.close(); nearbyRequest?.abort(); searchRequest?.abort();
    if (event.persisted) liveView?.setPaused(true);
    else { liveView?.destroy(); worldMap?.destroy(); }
  });
  window.addEventListener('pageshow', event => { if (event.persisted) { showPreview(); if (session && serviceReady) listenRoom(); } });
  if (import.meta.env.DEV || params.get('qa') === '1') window.__HOME__ = Object.freeze({ snapshot: () => ({ mode, center: { ...center }, localPreview, sceneState,
    lighting, room: room ? structuredClone(room) : null, serviceReady, aiReady, map: worldMap?.snapshot() || null,
    routes: routes.map(route => ({ id: route.id, stops: route.stops.map(p => p.id) })) }) });
}

if (params.has('lighting')) location.replace(`./walk.html${location.search}${location.hash}`);
else boot();
