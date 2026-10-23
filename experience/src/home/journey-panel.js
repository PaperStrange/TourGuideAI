import { buildMapsJourney, mapsShareText } from '../travel/maps.js';
import { createJourneySession, selectJourneyRoute, updateJourneyProgress,
  readJourneyRecord, writeJourneySession, isJourneySessionAvailable, JOURNEY_STORAGE_KEY } from '../journey/session.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const TEXT = {
  en: {
    heading: 'A whole neighborhood to wander', start: 'Start this walk', resume: 'Return to your walk',
    sights: 'sights', distance: 'walking distance', private: 'Your walk is remembered privately on this browser.',
    interests: 'What draws you here?', mustSee: 'Keep these in my suggestions', suggest: 'Find my walk',
    choose: 'Choose this walk', why: 'Why stop here?', walkTo: 'Walk to', up: 'Move earlier', down: 'Move later',
    suggestion: 'Suggested walk', suggestions: 'Suggested walks',
    suggestionReady: 'One reviewed walk is available. Choose it, then adjust its stops.',
    suggestionsReady: 'Choose a suggestion when you are ready. Your selected walk stays unchanged until then.',
    replace: 'Replace the unavailable saved walk', replaceNote: 'This replaces the saved route and view in this browser. Your kept places and their notes remain.',
    replaceAction: 'Replace with the available walk',
    currentWalk: 'Current walk', walkingTo: 'Walking to {name}', walkingPoint: 'Walking to your chosen point',
    walkDestination: 'Destination: {name}', walkPoint: 'Your chosen point',
    remaining: '{distance} m remaining', stopWalking: 'Stop walking', walkStopped: 'Stopped here. You can keep exploring.',
    waitingForStreet: 'Waiting for the next street section…', waitingForRetry: 'Street detail could not load. Use Retry in the view.',
    walkPaused: 'This walk is paused.',
    remove: 'Remove sight', add: 'Add a sight', select: 'Choose a sight', source: 'Source',
    maps: 'Open in Google Maps', copy: 'Copy Maps links', copied: 'Maps links copied.', manual: 'Select and copy these links.',
    note: 'The line follows mapped pedestrian connections. The virtual ground uses authored widths and heights; current access and grades are unverified. Google Maps calculates its own directions.',
    noOptions: 'No reviewed walk matches these selections. Adjust your preferences.',
    unavailable: 'This saved neighborhood version is unavailable. Its recorded view is preserved.',
    readError: 'Your recorded walk could not be read. Existing browser data is preserved.',
    changed: 'Your saved walk changed in another page. Reload to use it. The saved data is preserved.',
    reload: 'Reload saved walk',
    saveError: 'Your walk is open, but this change could not be remembered. Check browser storage.',
    openError: 'The walk could not fully open. Your selected route is preserved; retry the preview.',
    starting: 'Opening your walk…', saved: 'Your selected walk is remembered.',
    personal: 'Your edited walk', information: 'Approach and visiting information',
  },
  zh: {
    heading: '漫步完整街区', start: '开始这段漫步', resume: '返回你的漫步',
    sights: '个景点', distance: '步行距离', private: '这段漫步仅保存在当前浏览器。',
    interests: '什么吸引你来到这里？', mustSee: '推荐中保留这些景点', suggest: '寻找适合的路线',
    choose: '选择这段漫步', why: '为什么在这里停留？', walkTo: '步行前往', up: '提前游览', down: '推后游览',
    suggestion: '推荐路线', suggestions: '推荐路线',
    suggestionReady: '目前有一条已审核漫步可供选择。选择后，再调整停留景点。',
    suggestionsReady: '准备好后再选择推荐路线。在此之前，所选漫步保持不变。',
    replace: '替换暂不可用的已存漫步', replaceNote: '此操作会替换当前浏览器中保存的路线与视角，收藏的地点及其笔记仍然保留。',
    replaceAction: '替换为当前可用的漫步',
    currentWalk: '当前步行', walkingTo: '正在步行前往{name}', walkingPoint: '正在步行前往你选定的位置',
    walkDestination: '目的地：{name}', walkPoint: '你选定的位置',
    remaining: '剩余{distance}米', stopWalking: '停止自动行走', walkStopped: '已在此停下，你可以继续自由探索。',
    waitingForStreet: '正在等待下一段街道加载……', waitingForRetry: '街道细节未能加载，请使用场景中的重试按钮。',
    walkPaused: '当前步行已暂停。',
    remove: '移除景点', add: '添加景点', select: '选择景点', source: '来源',
    maps: '在 Google Maps 打开', copy: '复制地图链接', copied: '已复制地图链接。', manual: '请选择并复制这些链接。',
    note: '连线依据地图中的行人通道。虚拟地面的宽度与高度经过创作设定，当前通行情况与坡度尚未核实。Google Maps 会重新计算实地导航。',
    noOptions: '没有已审核路线满足全部选择，请调整你的偏好。',
    unavailable: '收藏的街区版本暂不可用，记录的视角仍然保留。',
    readError: '无法读取记录的漫步，浏览器中的已有数据仍然保留。',
    changed: '已保存的漫步在其他页面发生变化，请重新加载后继续。保存的数据仍然保留。',
    reload: '重新加载已存漫步',
    saveError: '漫步已经打开，但无法保存这次更改，请检查浏览器存储设置。',
    openError: '未能完整打开漫步，所选路线仍然保留，请重新加载预览。',
    starting: '正在打开你的漫步…', saved: '已记录所选漫步路线。',
    personal: '你调整的漫步', information: '到达方式与游览信息',
  },
};

export const journeyPanelMarkup = () => '<section id="neighborhood-journey" class="paper-card journey-card" hidden></section>';

export function describeJourneyWalking(route, planner, locale = 'en') {
  if (!route || route.id !== planner.routeId || route.revision !== planner.revision || !route.goal) return null;
  if (!Number.isFinite(route.remainingDistanceMeters) || route.remainingDistanceMeters < 0
    || !Number.isFinite(route.goal.x) || !Number.isFinite(route.goal.y)) throw new TypeError('Invalid active neighborhood walk');
  const lang = locale === 'zh' ? 'zh' : 'en', words = TEXT[lang];
  // 名称来自当前排队路径的终点；已保存的 focusedSightId 不能代表正在行走的目的地。
  const sight = planner.sights.find(value => Math.hypot(value.position.x - route.goal.x, value.position.y - route.goal.y) <= .15);
  const phase = route.blocked ? route.blocked.reason === 'section-failed' ? 'failed' : 'loading' : route.paused ? 'paused' : 'walking';
  const remainingMeters = Math.ceil(route.remainingDistanceMeters);
  return { sightId: sight?.id ?? null, phase, remainingMeters,
    target: sight ? (phase === 'walking' ? words.walkingTo : words.walkDestination).replace('{name}', sight.title[lang])
      : phase === 'walking' ? words.walkingPoint : words.walkPoint,
    distance: words.remaining.replace('{distance}', new Intl.NumberFormat(lang).format(remainingMeters)),
    detail: phase === 'failed' ? words.waitingForRetry : phase === 'loading' ? words.waitingForStreet : phase === 'paused' ? words.walkPaused : '' };
}

export function createNeighborhoodJourney({ planner, frame, startPlace, interestLabels, locale, onEnter, onChange, onStop,
  storage = localStorage }) {
  const host = document.querySelector('#neighborhood-journey');
  let session = null, plan = null, alternatives = [], status = '', storageError = false, busy = false;
  let inNeighborhood = false, visible = true, saveTimer, pendingProgress = null;
  let draftInterests = [], draftMustSee = [], alternativesOpen = false;
  let walking = null, stoppedHere = false, stoppedPosition = null;
  let storedRaw = null, storageChanged = false, sessionEpoch = 0;
  const language = () => locale() === 'zh' ? 'zh' : 'en';
  const t = key => TEXT[language()][key];
  const matchingSession = () => session && isJourneySessionAvailable(session, planner);
  const unavailableSession = () => Boolean(session && !matchingSession());
  const mutationsBlocked = () => busy || storageError || storageChanged || unavailableSession();
  const currentStatus = () => storageError ? 'readError' : unavailableSession() ? 'unavailable' : storageChanged ? 'changed' : status;
  try { const record = readJourneyRecord(storage); session = record.session; storedRaw = record.raw; }
  catch { storageError = true; status = 'readError'; }
  if (matchingSession()) {
    plan = planner.route(session.stopIds, session);
    draftInterests = [...session.interests]; draftMustSee = [...session.mustSeeIds];
  } else if (session) status = 'unavailable';
  alternatives = planner.recommend({ interests: draftInterests, mustSeeIds: draftMustSee });
  if (!plan) plan = alternatives[0] ?? null;

  const pointCoordinates = point => [frame.origin.longitude + point.x / frame.metresPerDegreeLon,
    frame.origin.latitude + point.y / frame.metresPerDegreeLat];
  function displayRoute() {
    if (!plan) return null;
    const lang = language();
    const firstAtStart = plan.stops[0]?.nodeId === plan.startNodeId;
    const start = firstAtStart ? [] : [{ ...startPlace, title: typeof startPlace.title === 'string' ? startPlace.title : startPlace.title[lang] }];
    return { id: `${plan.routeId}:${plan.variantId}`, title: plan.title[lang], kind: plan.kind,
      distanceMeters: plan.distanceMeters, stopIds: [...plan.stopIds],
      stops: [...start, ...plan.stops.map(sight => ({ ...sight, id: `${planner.routeId}:${sight.id}`, kind: 'poi', title: sight.title[lang] }))],
      ...(plan.points.length > 1 ? { geometry: { type: 'LineString', coordinates: plan.points.map(pointCoordinates) } } : {}) };
  }
  function receiveStoredChange() {
    clearTimeout(saveTimer); saveTimer = undefined; pendingProgress = null;
    storageChanged = true; sessionEpoch++;
    try {
      const record = readJourneyRecord(storage); storedRaw = record.raw; session = record.session;
      storageError = false;
      if (matchingSession()) {
        plan = planner.route(session.stopIds, session);
        draftInterests = [...session.interests]; draftMustSee = [...session.mustSeeIds];
      }
      status = unavailableSession() ? 'unavailable' : 'changed';
    } catch { storageError = true; status = 'readError'; }
    render(); onChange?.();
  }
  function storageIsCurrent() {
    if (storageError) return false;
    try {
      if (storage.getItem(JOURNEY_STORAGE_KEY) === storedRaw) return true;
    } catch { storageError = true; status = 'readError'; render(); return false; }
    receiveStoredChange(); return false;
  }
  function persist(next, { replace = false } = {}) {
    if (!next || storageError || storageChanged && !replace) return false;
    try {
      session = writeJourneySession(storage, next, { expectedRaw: storedRaw });
      storedRaw = JSON.stringify(session);
      if (replace) storageChanged = false;
      if (status === 'saveError') status = '';
      return true;
    } catch (error) {
      if (error.code === 'journey-storage-conflict') receiveStoredChange();
      else status = 'saveError';
      return false;
    }
  }
  function flush() {
    clearTimeout(saveTimer); saveTimer = undefined;
    const progress = pendingProgress; pendingProgress = null;
    if (progress && matchingSession() && !storageChanged) persist(updateJourneyProgress(session, progress));
  }
  function capture(view, lighting) {
    if (storageError || storageChanged || !matchingSession() || !view || view.packId !== planner.routeId || view.revision !== planner.revision) return;
    pendingProgress = { view, lighting };
    if (!saveTimer) saveTimer = setTimeout(() => { flush(); if (status === 'saveError') render(); }, 750);
  }
  function select(next) {
    if (mutationsBlocked() || !storageIsCurrent()) return false;
    flush();
    if (mutationsBlocked()) return false;
    const selected = matchingSession() ? selectJourneyRoute(session, next) : createJourneySession(next);
    if (!persist(selected)) { render(); return false; }
    plan = next;
    draftInterests = [...session.interests]; draftMustSee = [...session.mustSeeIds];
    alternativesOpen = false;
    status = 'saved'; render(); onChange?.();
    return true;
  }
  function replaceUnavailable() {
    if (!unavailableSession() || busy || storageError || !plan || !storageIsCurrent()) return;
    const replacement = createJourneySession(plan);
    // 只有独立的替换操作可以覆盖不可用版本；写入失败时继续保留原记录。
    if (!persist(replacement, { replace: true })) { render(); return; }
    pendingProgress = null; sessionEpoch++;
    draftInterests = [...session.interests]; draftMustSee = [...session.mustSeeIds];
    status = 'saved'; render(); onChange?.();
  }
  async function enter(sightId = null) {
    if (!plan || mutationsBlocked() || !storageIsCurrent()) return;
    if (!matchingSession() && !select(plan)) return;
    flush();
    if (mutationsBlocked()) return;
    const epoch = sessionEpoch;
    busy = true; status = 'starting'; render();
    try {
      await onEnter({ plan, progress: structuredClone(session.progress), sightId });
      if (epoch !== sessionEpoch || !storageIsCurrent() || storageChanged) return;
      status = status === 'saveError' ? status : '';
      if (sightId) persist(updateJourneyProgress(session, { focusedSightId: sightId }));
    } catch (error) { if (!storageChanged && !storageError) status = error.name === 'AbortError' ? '' : 'openError'; }
    finally { busy = false; render(); }
  }
  function preferencesMarkup() {
    const lang = language();
    return `<details class="journey-preferences"><summary>${t('interests')}</summary>
      <fieldset ${mutationsBlocked() ? 'disabled' : ''}><legend>${t('interests')}</legend>${planner.interestIds.map(id => {
        const label = interestLabels[id]?.[lang];
        if (!label) throw new Error(`Missing ${lang} neighborhood interest label: ${id}`);
        return `<label><input type="checkbox" data-journey-interest="${escape(id)}" ${draftInterests.includes(id) ? 'checked' : ''}>${escape(label)}</label>`;
      }).join('')}</fieldset>
      <fieldset ${mutationsBlocked() ? 'disabled' : ''}><legend>${t('mustSee')}</legend>${planner.sights.map(sight => `<label><input type="checkbox" data-journey-must="${escape(sight.id)}" ${draftMustSee.includes(sight.id) ? 'checked' : ''}>${escape(sight.title[lang])}</label>`).join('')}</fieldset>
      <button id="journey-suggest" class="secondary" ${mutationsBlocked() ? 'disabled' : ''}>${t('suggest')}</button></details>`;
  }
  function replacementMarkup() {
    if (storageChanged && !unavailableSession() && !storageError) return `<button id="journey-reload" class="secondary" ${busy ? 'disabled' : ''}>${t('reload')}</button>`;
    return unavailableSession() ? `<details class="journey-replacement"><summary>${t('replace')}</summary>
      <p class="small">${t('replaceNote')}</p><button id="journey-replace" class="secondary" ${busy || storageError || !plan ? 'disabled' : ''}>${t('replaceAction')}</button></details>` : '';
  }
  function alternativesMarkup() {
    const lang = language();
    return alternatives.length ? `<details class="journey-alternatives" ${alternativesOpen ? 'open' : ''}><summary>${t(alternatives.length === 1 ? 'suggestion' : 'suggestions')}</summary>${alternatives.map((option, index) => `<div>
      <strong>${escape(option.title[lang])}</strong><p class="small">${new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(option.distanceMeters / 1000)} km · ${option.stopIds.length} ${t('sights')}</p>
      <p class="small">${option.stops.map(sight => escape(sight.title[lang])).join(' → ')}</p>
      <button class="secondary" data-journey-choice="${index}" ${mutationsBlocked() ? 'disabled' : ''}>${t('choose')}</button></div>`).join('')}</details>` : '';
  }
  function walkingMarkup() {
    return `<section id="journey-walking" class="journey-walking" aria-label="${t('currentWalk')}" hidden>
      <p id="journey-walk-target" aria-live="polite" aria-atomic="true"></p>
      <p id="journey-walk-distance" class="small"></p><p id="journey-walk-detail" class="small" role="status"></p>
      <button id="journey-stop" class="secondary">${t('stopWalking')}</button></section>`;
  }
  function renderWalking() {
    const section = host.querySelector('#journey-walking');
    if (!section) return;
    const guidance = inNeighborhood && visible ? describeJourneyWalking(walking, planner, language()) : null;
    section.hidden = !guidance && !stoppedHere;
    const text = (selector, value) => {
      const node = section.querySelector(selector);
      if (node.textContent !== value) node.textContent = value;
    };
    text('#journey-walk-target', guidance?.target ?? '');
    text('#journey-walk-distance', guidance?.distance ?? '');
    text('#journey-walk-detail', guidance?.detail || (stoppedHere ? t('walkStopped') : ''));
    const stop = section.querySelector('#journey-stop');
    stop.hidden = !guidance; stop.disabled = !guidance || typeof onStop !== 'function';
  }
  function render() {
    host.hidden = !visible;
    if (!visible) return;
    const lang = language(), route = displayRoute();
    const remaining = planner.sights.filter(sight => !plan?.stopIds.includes(sight.id));
    if (!inNeighborhood) {
      host.innerHTML = `<span class="eyebrow">${lang === 'zh' ? '京都 · 连续街区漫步' : 'KYOTO · A CONNECTED WALK'}</span><h2>${t('heading')}</h2>
        ${plan ? `<p class="journey-distance"><strong>${new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(plan.distanceMeters / 1000)} km</strong> · ${plan.stopIds.length} ${t('sights')}</p>` : ''}
        <p class="small">${t('private')}</p><button id="journey-enter" class="primary" ${mutationsBlocked() || !plan ? 'disabled' : ''}>${t(matchingSession() ? 'resume' : 'start')}</button>${replacementMarkup()}
        <p class="small journey-status" role="status">${currentStatus() ? t(currentStatus()) : ''}</p>`;
      return;
    }
    host.innerHTML = `<span class="eyebrow">${lang === 'zh' ? '京都 · 街区漫步' : 'KYOTO · NEIGHBORHOOD WALK'}</span>
      <h2>${t('heading')}</h2>${plan ? `<p class="journey-distance"><strong>${new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(plan.distanceMeters / 1000)} km</strong> · ${plan.stopIds.length} ${t('sights')}</p>` : ''}
      <p class="small">${t('private')}</p>
      <button id="journey-enter" class="primary" ${mutationsBlocked() || !plan ? 'disabled' : ''}>${t(matchingSession() ? 'resume' : 'start')}</button>${replacementMarkup()}${walkingMarkup()}
      ${preferencesMarkup()}
      ${alternativesMarkup()}
      ${plan ? `<ol class="stop-list journey-stops">${plan.stops.map((sight, index) => `<li><span class="stop-index">${index + 1}</span><div>
        <button class="journey-sight" data-journey-focus="${escape(sight.id)}" aria-label="${escape(t('walkTo') + ' ' + sight.title[lang])}" ${mutationsBlocked() ? 'disabled' : ''}>${escape(sight.title[lang])} ↗</button>
        <details><summary>${t('why')}</summary><p>${escape(sight.reason[lang])}</p>${sight.practical?.[lang] ? `<p>${escape(sight.practical[lang])}</p>` : ''}
          ${sight.sources.map(source => `<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.label?.[lang] ?? source.label ?? t('source'))} ↗</a>`).join('')}</details>
        <div class="journey-stop-actions"><button data-journey-up="${escape(sight.id)}" aria-label="${escape(t('up') + ' · ' + sight.title[lang])}" ${index === 0 || mutationsBlocked() ? 'disabled' : ''}>↑</button><button data-journey-down="${escape(sight.id)}" aria-label="${escape(t('down') + ' · ' + sight.title[lang])}" ${index === plan.stops.length - 1 || mutationsBlocked() ? 'disabled' : ''}>↓</button><button data-journey-remove="${escape(sight.id)}" ${plan.stops.length <= 1 || mutationsBlocked() ? 'disabled' : ''}>${t('remove')}</button></div>
        </div></li>`).join('')}</ol>` : ''}
      ${remaining.length && plan && plan.stopIds.length < 8 ? `<div class="journey-add"><label for="journey-add-sight" class="sr-only">${t('select')}</label><select id="journey-add-sight" ${mutationsBlocked() ? 'disabled' : ''}>${remaining.map(sight => `<option value="${escape(sight.id)}">${escape(sight.title[lang])}</option>`).join('')}</select><button id="journey-add" class="secondary" ${mutationsBlocked() ? 'disabled' : ''}>${t('add')}</button></div>` : ''}
      ${route ? `<div class="map-links">${buildMapsJourney(route.stops).parts.map((part, index, parts) => `<a class="primary" href="${escape(part.url)}" target="_blank" rel="noopener noreferrer">${t('maps')}${parts.length > 1 ? ` · ${index + 1}/${parts.length}` : ''} ↗</a>`).join('')}</div><button id="journey-copy" class="secondary">${t('copy')}</button><textarea id="journey-maps-text" aria-label="${t('copy')}" readonly hidden></textarea><p class="small">${t('note')}</p>` : ''}
      <p class="small journey-status" role="status">${currentStatus() ? t(currentStatus()) : ''}</p>`;
    renderWalking();
  }
  host.addEventListener('change', event => {
    if (mutationsBlocked()) return;
    if (event.target.dataset.journeyInterest !== undefined) draftInterests = [...host.querySelectorAll('[data-journey-interest]:checked')].map(input => input.dataset.journeyInterest);
    if (event.target.dataset.journeyMust !== undefined) draftMustSee = [...host.querySelectorAll('[data-journey-must]:checked')].map(input => input.dataset.journeyMust);
  });
  host.addEventListener('toggle', event => {
    if (event.target.matches('.journey-alternatives')) alternativesOpen = event.target.open;
  }, true);
  const storedChange = event => {
    if (event.storageArea === storage && (event.key === JOURNEY_STORAGE_KEY || event.key === null)) storageIsCurrent();
  };
  window.addEventListener('storage', storedChange);
  async function handleClick(button) {
    if (!host.contains(button)) return false;
    if (button.id === 'journey-reload') { if (!button.disabled) location.reload(); return true; }
    if (button.id === 'journey-stop') {
      const position = walking?.position;
      if (!button.disabled && walking?.goal && onStop?.()) {
        walking = null; stoppedHere = true; stoppedPosition = position; renderWalking();
      }
      return true;
    }
    if (button.id === 'journey-replace') { replaceUnavailable(); return true; }
    if (button.disabled || (button.id !== 'journey-copy' && (mutationsBlocked() || !storageIsCurrent()))) return true;
    if (button.id === 'journey-enter') await enter();
    else if (button.dataset.journeyFocus) await enter(button.dataset.journeyFocus);
    else if (button.id === 'journey-suggest') {
      alternatives = planner.recommend({ interests: draftInterests, mustSeeIds: draftMustSee });
      alternativesOpen = true;
      status = alternatives.length === 1 ? 'suggestionReady' : alternatives.length ? 'suggestionsReady' : 'noOptions'; render();
    } else if (button.dataset.journeyChoice !== undefined) select(alternatives[Number(button.dataset.journeyChoice)]);
    else if (button.dataset.journeyRemove) select(planner.edit(plan, { type: 'remove', sightId: button.dataset.journeyRemove }));
    else if (button.id === 'journey-add') select(planner.edit(plan, { type: 'add', sightId: host.querySelector('#journey-add-sight').value }));
    else if (button.dataset.journeyUp || button.dataset.journeyDown) {
      const id = button.dataset.journeyUp || button.dataset.journeyDown, order = [...plan.stopIds], index = order.indexOf(id);
      const destination = index + (button.dataset.journeyUp ? -1 : 1);
      [order[index], order[destination]] = [order[destination], order[index]];
      select(planner.edit(plan, { type: 'reorder', stopIds: order }));
    } else if (button.id === 'journey-copy') {
      const text = mapsShareText(displayRoute().stops, language());
      try { await navigator.clipboard.writeText(text); status = 'copied'; render(); }
      catch {
        status = 'manual'; render();
        const field = host.querySelector('#journey-maps-text'); field.hidden = false; field.value = text; field.focus(); field.select();
      }
    }
    return true;
  }
  return { render, handleClick, enter, capture, flush, getRoute: displayRoute,
    updateWalking(value) {
      walking = value?.id === planner.routeId && value.revision === planner.revision ? value : null;
      if (walking?.goal || !walking || (stoppedPosition && walking.position
        && Math.hypot(stoppedPosition.x - walking.position.x, stoppedPosition.y - walking.position.y) > .01)) stoppedHere = false;
      renderWalking();
    },
    selectStops(ids) { return mutationsBlocked() ? false : select(planner.route(ids)); },
    getSession: () => session && !storageChanged && !storageError ? structuredClone(session) : null,
    setContext(value) {
      const changed = visible !== (value.mode === 'explore') || inNeighborhood !== value.inNeighborhood;
      visible = value.mode === 'explore'; inNeighborhood = value.inNeighborhood;
      if (!visible || !inNeighborhood) { walking = null; stoppedHere = false; }
      if (changed) render();
    },
    snapshot: () => ({ selected: plan?.stopIds ?? [], routeId: planner.routeId, revision: planner.revision,
      distanceMeters: plan?.distanceMeters ?? null, active: Boolean(matchingSession()) && !storageChanged && !storageError,
      inNeighborhood, busy, storageError, storageChanged, status: currentStatus(),
      walking: describeJourneyWalking(walking, planner, language()) }),
    destroy() { window.removeEventListener('storage', storedChange); flush(); },
  };
}
