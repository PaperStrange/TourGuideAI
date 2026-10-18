import { SOLO_STORAGE_KEY, MAX_KEPT_PLACES, parseKeptPlaces, writeKeptPlaces, normalizeKeptPlace } from './state.js';
import { getInspectionFeature } from '../runtime/inspection-features.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export const soloControlsMarkup = () => `<div id="solo-controls" class="solo-controls"><button id="solo-inspect" class="secondary" data-copy="lookCloser" aria-pressed="false" aria-describedby="solo-hint"></button><button id="solo-detail" class="secondary" data-copy="inspectDetail" aria-controls="solo-inspection" hidden></button><button id="solo-area" class="secondary" data-copy="exploreArea" hidden></button><button id="solo-keep" class="primary" data-copy="keepPlace" disabled></button><p id="solo-hint" class="small"></p></div><div id="solo-inspection" class="inspection-card" role="region" aria-labelledby="inspection-title" aria-live="polite" hidden><div><h3 id="inspection-title"></h3><button id="solo-close-detail" class="quiet" data-copy="closeDetail"></button></div><p id="inspection-detail"></p><div id="inspection-sources"></div></div>`;
export const keptPlacesMarkup = () => `<section id="solo-places" class="paper-card"><h2 data-copy="keptPlaces"></h2><p class="small" data-copy="privatePlaces"></p><p id="solo-empty" class="small" data-copy="noKeptPlaces"></p><ul id="kept-place-list" class="kept-place-list"></ul><p id="solo-status" class="small" role="status"></p></section>`;
export const soloDialogsMarkup = () => `<dialog id="keep-place-dialog" class="solo-dialog" aria-labelledby="keep-dialog-title"><form id="keep-place-form"><h2 id="keep-dialog-title" data-copy="keepPlace"></h2><p class="small" data-copy="keepExplanation"></p><label for="kept-title" data-copy="placeName"></label><input id="kept-title" maxlength="100" required><label for="kept-note" data-copy="yourWords"></label><textarea id="kept-note" maxlength="280" rows="3"></textarea><p id="keep-error" role="status" class="small"></p><div class="solo-dialog-actions"><button id="solo-cancel-keep" type="button" class="secondary" data-copy="cancel"></button><button class="primary" type="submit" data-copy="savePrivate"></button></div></form></dialog><dialog id="remove-place-dialog" class="solo-dialog" aria-labelledby="remove-dialog-title"><h2 id="remove-dialog-title" data-copy="removeKeptPlace"></h2><p id="remove-place-title"></p><p id="remove-error" role="status" class="small"></p><div class="solo-dialog-actions"><button id="solo-cancel-remove" class="secondary" data-copy="cancel"></button><button id="solo-confirm-remove" class="primary" data-copy="remove"></button></div></dialog>`;

export function createSoloController({ t, locale, context, pause, openPlace, inspect, inspectCenter, clearInspection, exploreArea }) {
  let places = [], storageError = false, statusKey = '', draft = null, removingId = null, selectedId = null, opening = 0;
  let inspection = { enabled: false, focus: null, selected: null };
  const readStorage = () => {
    try { places = parseKeptPlaces(localStorage.getItem(SOLO_STORAGE_KEY)); storageError = false; if (statusKey === 'keptReadError') statusKey = ''; }
    catch { storageError = true; statusKey = 'keptReadError'; }
  };
  readStorage();
  function renderPlaces() {
    $('#solo-empty').hidden = Boolean(places.length) || storageError;
    $('#kept-place-list').innerHTML = storageError ? '' : places.map(place => `<li><div><button class="kept-open" data-kept-open="${escape(place.id)}">${escape(place.title)}</button><span class="small">${t(place.representation === 'street' ? 'savedStreet' : 'savedMap')} · ${escape(new Date(place.savedAt).toLocaleDateString(locale()))}</span>${place.note ? `<p>${escape(place.note)}</p>` : ''}</div><button class="quiet" data-kept-remove="${escape(place.id)}" aria-label="${escape(t('remove') + ' ' + place.title)}">${t('remove')}</button></li>`).join('');
    $('#solo-status').textContent = statusKey ? t(statusKey) : '';
  }
  function renderInspection() {
    const state = context(), active = state.mode === 'explore' && state.street;
    const focus = inspection.enabled && active ? inspection.focus : null;
    const cue = $('#inspection-cue');
    cue.hidden = !focus;
    if (focus) { cue.style.left = `${focus.screen.x}px`; cue.style.top = `${focus.screen.y}px`; }
    const selected = active ? getInspectionFeature(inspection.selected?.id) : null;
    const signature = selected ? `${selected.id}:${locale()}` : null;
    $('#solo-inspection').hidden = !selected;
    if (signature !== selectedId) {
      selectedId = signature;
      $('#inspection-title').textContent = selected?.title[locale()] || '';
      $('#inspection-detail').textContent = selected?.detail[locale()] || '';
      $('#inspection-sources').innerHTML = selected?.sources.map(source => `<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.label)}</a>`).join('') || '';
    }
    $('#solo-inspect').setAttribute('aria-pressed', String(inspection.enabled));
    $('#solo-inspect').textContent = t(inspection.enabled ? 'keepWalking' : 'lookCloser');
    $('#solo-detail').hidden = !active || !inspection.enabled;
    $('#solo-detail').disabled = !focus;
  }
  function update() {
    const state = context(), solo = state.mode === 'explore';
    $('#solo-controls').hidden = !solo; $('#solo-places').hidden = !solo;
    $('#solo-inspect').hidden = !state.street; $('#solo-inspect').disabled = !state.ready;
    $('#solo-area').hidden = state.street; $('#solo-area').disabled = !state.view || state.view.zoom < 12;
    $('#solo-keep').disabled = !state.ready || !state.view || storageError || places.length >= MAX_KEPT_PLACES || state.restoring;
    $('#solo-hint').textContent = t(places.length >= MAX_KEPT_PLACES ? 'keptLimit'
      : state.street ? inspection.enabled ? matchMedia('(pointer: coarse)').matches ? 'inspectionTouchHelp' : 'inspectionHelp' : 'soloHelp' : state.view?.zoom >= 12 ? 'areaHelp' : 'zoomArea');
    renderInspection();
  }
  const dialogClosed = () => { draft = null; pause(false); update(); };
  $('#keep-place-dialog').addEventListener('close', dialogClosed);
  $('#remove-place-dialog').addEventListener('close', () => { removingId = null; pause(false); update(); });
  $('#keep-place-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!draft) return;
    const value = normalizeKeptPlace({ ...draft, title: $('#kept-title').value, note: $('#kept-note').value });
    if (!value) { $('#keep-error').textContent = t('keepInvalid'); return; }
    try {
      const latest = parseKeptPlaces(localStorage.getItem(SOLO_STORAGE_KEY));
      if (latest.length >= MAX_KEPT_PLACES) { $('#keep-error').textContent = t('keptLimit'); return; }
      places = writeKeptPlaces(localStorage, [value, ...latest]);
      statusKey = 'keptSaved'; renderPlaces(); $('#keep-place-dialog').close();
    } catch { $('#keep-error').textContent = t('keptWriteError'); }
  });
  window.addEventListener('storage', event => { if (event.key === SOLO_STORAGE_KEY || event.key === null) { readStorage(); renderPlaces(); update(); } });
  return {
    render() { renderPlaces(); update(); },
    update,
    onInspection(value) { const changed = value.enabled !== inspection.enabled; inspection = value; if (changed) update(); else renderInspection(); },
    snapshot() { return { count: places.length, storageError, inspection: structuredClone(inspection) }; },
    async handleClick(button) {
      if (button.id === 'solo-inspect') { inspect(!inspection.enabled); update(); }
      else if (button.id === 'solo-detail') inspectCenter();
      else if (button.id === 'solo-close-detail') clearInspection();
      else if (button.id === 'solo-area') await exploreArea();
      else if (button.id === 'solo-keep') {
        const state = context();
        if (state.mode !== 'explore' || !state.ready || !state.view) return;
        draft = { id: crypto.randomUUID(), title: state.center.title.slice(0, 100), note: '', savedAt: new Date().toISOString(),
          center: state.center, origin: state.origin, route: state.route, representation: state.street ? 'street' : 'map',
          view: state.view, lighting: state.lighting };
        pause(true); $('#kept-title').value = draft.title; $('#kept-note').value = ''; $('#keep-error').textContent = '';
        $('#keep-place-dialog').showModal();
      } else if (button.id === 'solo-cancel-keep') $('#keep-place-dialog').close();
      else if (button.dataset.keptOpen) {
        const place = places.find(value => value.id === button.dataset.keptOpen);
        if (place) { const request = ++opening; statusKey = 'keptOpening'; renderPlaces();
          try { const opened = await openPlace(structuredClone(place)); if (request !== opening) return; statusKey = opened ? 'keptOpened' : ''; }
          catch (error) { if (request !== opening) return; statusKey = error.name === 'AbortError' ? '' : 'keptOpenError'; }
          renderPlaces(); update();
        }
      } else if (button.dataset.keptRemove) {
        removingId = button.dataset.keptRemove;
        $('#remove-place-title').textContent = places.find(value => value.id === removingId)?.title || '';
        $('#remove-error').textContent = ''; pause(true); $('#remove-place-dialog').showModal();
      } else if (button.id === 'solo-cancel-remove') $('#remove-place-dialog').close();
      else if (button.id === 'solo-confirm-remove') {
        try {
          const latest = parseKeptPlaces(localStorage.getItem(SOLO_STORAGE_KEY));
          places = writeKeptPlaces(localStorage, latest.filter(place => place.id !== removingId));
          statusKey = 'keptRemoved'; renderPlaces(); $('#remove-place-dialog').close();
        } catch { $('#remove-error').textContent = t('keptWriteError'); }
      }
    },
  };
}
