import '../ui/styles.css';
import { createGame } from '../runtime/create-game.js';
import { TARGETS, PRIMARY_TARGET_IDS } from '../content/kyoto.js';
import { t } from '../ui/i18n.js';
import { STORAGE_KEY, readSavedJourney, readPersonalNotes } from './journey-store.js';
import { installShareDialog } from './share-dialog.js';
import { readAppearance, writeAppearance } from './appearance.js';
import fontLicense from '../ui/assets/NOTO-LICENSE.txt?raw';
import runtimeNotices from '../ui/assets/THIRD-PARTY-NOTICES.txt?raw';

// Keep the font and runtime notices available in the application document.
const fontNotice = document.createElement('script');
fontNotice.type = 'text/plain';
fontNotice.id = 'font-license';
fontNotice.textContent = `${fontLicense}\n\n${runtimeNotices}`;
document.head.appendChild(fontNotice);

const byId = new Map(TARGETS.map(target => [target.id, target]));
const primary = PRIMARY_TARGET_IDS.map(id => byId.get(id));
const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let saved = {};
try { saved = readSavedJourney(localStorage); } catch { saved = {}; }
if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
let notes = readPersonalNotes(saved.notes, byId);
let noteDraft = '';
const noteDrafts = new Map();
let sceneStatus = 'loading';
const returning = Boolean(saved.game?.visitedIds?.length);
let locale = saved.locale === 'zh' ? 'zh' : 'en';
let hints = saved.hints !== false;
let appearanceStorage;
try { appearanceStorage = localStorage; } catch { /* The scene also works without storage. */ }
let appearanceMode = readAppearance(appearanceStorage, location.search);
let lightingState = { mode: null, requestedMode: appearanceMode, phase: 'loading' };
let appearanceRemembered = true, appearanceTouched = false, appearanceRequest = 0;
// The engine validates saved game data before publishing the initial snapshot.
// Render a safe empty state until that snapshot arrives.
let state = {visitedIds:[],readSourceIds:[],choiceIds:{},selectedTargetId:'crossing'};
let game, activeTarget = null, sourceExpanded = false, chosenOutcome = null;
let lastUI = '', lastPrompt = '', lastSaved = '', lastSaveAt = 0, saveAvailable = true, toastTimer;
const text = (key, vars) => t(locale,key,vars);
const local = value => typeof value === 'string' ? value : value?.[locale] ?? value?.en ?? '';
const label = target => local(target.title);

const app = document.querySelector('#app');
app.innerHTML = `
<header class="topbar">
  <div class="brand"><span class="brand-mark" aria-hidden="true"></span><div><span data-i18n="brand"></span><small data-i18n="productTag"></small></div></div>
  <div class="topbar-center" data-i18n="chapterLabel"></div>
  <div class="header-actions"><div class="language-switch" role="group" id="language-switch"><button type="button" data-locale="en">EN</button><button type="button" data-locale="zh">中文</button></div><button type="button" class="icon-button" id="reset-button" aria-label="Restart"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
</header>
<main class="workspace">
  <aside class="sidebar">
    <div class="intro-section"><div class="eyebrow" data-i18n="chapterLabel"></div><h1 class="city-heading" id="city-title">Kyoto.</h1><div class="city-jp" style="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap"><span lang="ja">四条通</span><a id="perspective-link" href="./perspective.html" style="font-size:10px;letter-spacing:normal;line-height:1.4;text-decoration:underline;text-underline-offset:3px"></a></div><p class="intro" data-i18n="intro"></p></div>
    <div class="divider"></div>
    <section class="objective-section" aria-labelledby="objective-label"><div class="section-label" id="objective-label" data-i18n="objectiveLabel"></div><h2 class="objective" id="objective"></h2><p class="objective-support" id="objective-support"></p></section>
    <ol class="journey-list" id="journey-list"></ol>
    <div class="journal-footer"><div class="journal-progress"><span data-i18n="journalTitle"></span><span id="progress-count"></span></div><div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="3" id="progress"><div class="progress-fill" id="progress-fill"></div></div><button type="button" class="export-button" id="export-notes"><span data-i18n="exportJournal"></span><span aria-hidden="true">↗</span></button></div>
  </aside>
  <section class="stage-wrap">
    <div class="scene-toolbar"><div class="scene-location" data-i18n="eyebrow"></div><div class="scene-actions"><div class="appearance-controls" id="appearance-controls" role="group"><button type="button" data-appearance="day" data-i18n="timeOfDayDaylight"></button><button type="button" data-appearance="night" data-i18n="timeOfDayNight"></button></div><a id="comparison-link" href="./comparison.html" target="_blank" rel="noopener" data-i18n="comparisonEntryLabel"></a></div></div>
    <div class="appearance-feedback"><span id="appearance-status" role="status" aria-live="polite"></span><button type="button" id="appearance-retry" hidden data-i18n="lightingRetry"></button></div>
    <div class="scene-window"><div id="game-stage" tabindex="0" role="application"></div><div class="scene-corner"><span data-i18n="chapterLabel"></span><strong lang="ja">四条烏丸</strong></div><div class="camera-toolbar" role="group" id="camera-toolbar"><button type="button" id="camera-reset" data-i18n="cameraReset"></button><span data-i18n="cameraHelp"></span></div><div class="walk-hint" id="walk-hint" data-i18n="mapHint"></div><button type="button" class="context-prompt" id="interact-button" hidden><kbd>E</kbd><span class="prompt-copy"><small id="prompt-name"></small><span data-i18n="viewDetails"></span></span><span aria-hidden="true">↗</span></button><div class="loading-screen" id="loading"><div class="loading-mark"></div><span data-i18n="loading"></span></div></div>
    <div class="controls-bar"><div class="control-hints" id="controls"><span><kbd>W A S D</kbd><span data-i18n="controlsMove"></span></span><span><kbd>E</kbd><span data-i18n="controlsInteract"></span></span><span><kbd>Esc</kbd><span data-i18n="controlsClose"></span></span></div><button class="hint-toggle" id="hint-toggle" type="button"></button></div>
  </section>
</main>
<footer class="bottom-bar"><span>© OpenStreetMap contributors · ODbL · <a href="./credits.html" target="_blank" rel="noopener" data-i18n="photoCredits"></a></span><span class="save-status" id="save-status"></span></footer>
<dialog id="place-dialog" aria-labelledby="card-title"></dialog>
<dialog id="reset-dialog" aria-labelledby="reset-title"><div class="card-top"><h2 id="reset-title" class="card-title" data-i18n="reset"></h2></div><div class="card-body"><p class="card-description" data-i18n="resetConfirm"></p><div class="choices"><button class="choice-button" type="button" id="confirm-reset" data-i18n="reset"></button><button class="choice-button secondary" type="button" id="cancel-reset" data-i18n="resetCancel"></button></div></div></dialog>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<div class="sr-only" id="announcement" role="status" aria-live="polite"></div>`;

const $ = selector => document.querySelector(selector);
const dialog = $('#place-dialog');
const resetDialog = $('#reset-dialog');
const shareEmpty = document.createElement('p');
shareEmpty.id='share-empty';shareEmpty.className='share-empty';
$('#export-notes').after(shareEmpty);
$('#export-notes').setAttribute('aria-describedby','share-empty');
const sharing = installShareDialog({getSnapshot:()=>({locale,state,notes}),setPaused:value=>game?.setPaused(value),onLocale:applyLocale,onClose:()=>save(true)});

function renderAppearance() {
  const ready = sceneStatus === 'ready';
  const loading = lightingState.phase === 'loading';
  const failed = lightingState.phase === 'fallback' || lightingState.phase === 'unavailable';
  $('#appearance-controls').setAttribute('aria-label', text('timeOfDayLabel'));
  $('#appearance-controls').setAttribute('aria-busy', String(loading && (ready || sceneStatus === 'loading')));
  document.querySelectorAll('[data-appearance]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.appearance === appearanceMode));
    button.disabled = !ready;
  });
  let message = '';
  if (sceneStatus === 'loading' || ready) {
    if (loading) message = text(game ? 'timeOfDaySwitching' : 'timeOfDayLoading');
    else if (failed) message = text(lightingState.fallbackReason === 'rig-unavailable'
      ? 'lightingModeUnavailable' : lightingState.phase === 'fallback' ? 'lightingFallback' : 'lightingRetryFailed');
    else if (appearanceTouched) message = text('timeOfDayChanged', { mode: text(appearanceMode === 'night' ? 'timeOfDayNight' : 'timeOfDayDaylight') });
  }
  if (!appearanceRemembered) message += `${message ? ' ' : ''}${text('lightingPreferenceUnavailable')}`;
  $('#appearance-status').textContent = message;
  $('#appearance-retry').hidden = !ready || !failed;
  document.documentElement.dataset.lighting = lightingState.mode ?? 'day';
  $('#comparison-link').href = `./comparison.html?lang=${locale}&lighting=${appearanceMode}`;
}

async function selectAppearance(mode) {
  if (!game || sceneStatus !== 'ready' || !['day', 'night'].includes(mode)) return;
  const request = ++appearanceRequest;
  appearanceMode = mode; appearanceTouched = true;
  appearanceRemembered = writeAppearance(appearanceStorage, mode);
  lightingState = { ...lightingState, requestedMode: mode, phase: 'loading' };
  renderAppearance();
  try { await game.setLightingMode(mode); }
  catch {
    if (request === appearanceRequest) {
      lightingState = { ...lightingState, phase: 'unavailable' };
      renderAppearance();
    }
  }
}

function save(force = false) {
  if (!game) return;
  const record = {version:2,locale,hints,notes,game:game.getState()};
  // Pausing is presentation state, never a saved lock on the next session.
  record.game.paused = false;
  record.game.destination = null;
  const signature = JSON.stringify({locale,hints,notes,x:record.game.x,y:record.game.y,visited:record.game.visitedIds,choices:record.game.choiceIds,read:record.game.readSourceIds,target:record.game.selectedTargetId});
  if (!force && (signature === lastSaved || performance.now()-lastSaveAt < 600)) return;
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(record)); saveAvailable=true; lastSaved=signature; lastSaveAt=performance.now(); }
  catch { saveAvailable=false; }
  $('#save-status').textContent=text(saveAvailable?'saved':'saveUnavailable');
}

function applyLocale(next) {
  locale=next==='zh'?'zh':'en';
  clearTimeout(toastTimer);$('#toast').classList.remove('show');
  document.documentElement.lang=locale;
  document.title=`TourGuideAI · ${text('title')}`;
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=text(el.dataset.i18n);});
  document.querySelectorAll('[data-locale]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.locale===locale)));
  $('#language-switch').setAttribute('aria-label',text('languageLabel'));
  $('#reset-button').setAttribute('aria-label',text('reset'));
  $('#city-title').textContent=locale==='zh'?'京都。':'Kyoto.';
  $('#perspective-link').textContent=locale==='zh'?'借一双眼睛 ↗':'Borrow a view ↗';
  $('#perspective-link').href=`./perspective.html?lang=${locale}`;
  $('#game-stage').setAttribute('aria-label',text('mapLabel'));
  $('#camera-toolbar').setAttribute('aria-label',text('cameraOrbit'));
  updateSceneStatus();
  $('#progress').setAttribute('aria-label',text('progressLabel'));
  $('#save-status').textContent=text(saveAvailable?'saved':'saveUnavailable');
  game?.setLocale(locale);
  lastUI='';lastPrompt='';updateUI();
  if(activeTarget) renderCard();
  sharing.setLocale(locale);
  renderAppearance();
  $('#export-notes').querySelector('[data-i18n]').textContent=text('shareOpen');
  updateHints();save(true);
}

function currentTarget() {
  const selected=byId.get(state.selectedTargetId);
  if(selected && PRIMARY_TARGET_IDS.includes(selected.id) && !state.visitedIds.includes(selected.id)) return selected;
  return primary.find(target=>!state.visitedIds.includes(target.id)) ?? null;
}
function updateUI() {
  const count=primary.filter(target=>state.visitedIds.includes(target.id)).length;
  const target=currentTarget();
  const signature=JSON.stringify([locale,state.selectedTargetId,state.visitedIds,state.choiceIds]);
  if(signature!==lastUI) {
    lastUI=signature;
    $('#objective').textContent=target?text(count?'objectiveNext':'objectiveInitial',{name:label(target)}):text('completedTitle');
    $('#objective-support').textContent=target?text(count?'journeyContinue':'journalEmpty'):text('journeyCompleteDetail');
    $('#journey-list').innerHTML=primary.map((item,index)=>{
      const visited=state.visitedIds.includes(item.id);
      return `<li class="journey-item ${visited?'complete':''} ${target?.id===item.id?'active':''}"><button class="journey-button" type="button" data-target="${escape(item.id)}" ${target?.id===item.id?'aria-current="step"':''}><span class="step-dot" aria-hidden="true">${visited?'✓':String(index+1).padStart(2,'0')}</span><span class="journey-name">${escape(label(item))}<small>${escape(visited?text('statusVisited'):local(item.interaction.eyebrow).replace(/^\d+\s*[·.]\s*/,''))}</small></span></button></li>`;
    }).join('');
    $('#progress-count').textContent=`${count} / ${primary.length}`;
    $('#progress').setAttribute('aria-valuenow',String(count));
    $('#progress-fill').style.width=`${count/primary.length*100}%`;
    $('#export-notes').disabled=count===0;
    $('#export-notes').title=count===0?text('shareEmpty'):text('shareOpen');
    shareEmpty.hidden=count>0;shareEmpty.textContent=text('shareEmpty');
  }
  const near=byId.get(state.nearbyTargetId);
  const promptSignature=JSON.stringify([locale,near?.id,state.paused]);
  if(promptSignature!==lastPrompt) {
    lastPrompt=promptSignature;
    $('#interact-button').hidden=!near||state.paused;
    $('#walk-hint').hidden=Boolean(near)||!hints||state.paused;
    if(near) {
      $('#prompt-name').textContent=label(near);
      $('#interact-button').setAttribute('aria-label',text('interactionAvailable',{name:label(near)}));
    }
  }
  save();
}

function showToast(message) {
  clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');
  toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);
}
function updateHints() {
  $('#controls').hidden=!hints;
  $('#hint-toggle').textContent=text(hints?'hideHints':'showHints');
  $('#hint-toggle').setAttribute('aria-pressed',String(hints));
  $('#walk-hint').hidden=!hints||Boolean(state.nearbyTargetId)||state.paused;
}
function openPlace(id) {
  const target=byId.get(id);if(!target||dialog.open||resetDialog.open||sharing.open)return;
  activeTarget=target;sourceExpanded=false;chosenOutcome=null;noteDraft=noteDrafts.get(id)??notes[id]??'';
  game.setPaused(true);renderCard();dialog.showModal();
  $('#card-close').focus();
}
function renderCard() {
  const target=activeTarget;if(!target)return;
  const focused=dialog.contains(document.activeElement)?document.activeElement:null;
  const focusSelector=focused?.id?`#${CSS.escape(focused.id)}`:focused?.dataset?.choice?`[data-choice="${CSS.escape(focused.dataset.choice)}"]`:focused?.dataset?.locale?`[data-locale="${CSS.escape(focused.dataset.locale)}"]`:focused?.tagName==='SUMMARY'?'summary':null;
  const oldScroll=dialog.scrollTop;
  const facts=target.interaction.facts??[];
  const chosen=state.choiceIds[target.id];
  dialog.innerHTML=`<div class="card-top"><button class="card-close" type="button" id="card-close" aria-label="${escape(text('close'))}">×</button><div class="card-number">${escape(local(target.interaction.eyebrow))}</div><div class="language-switch card-language" role="group" aria-label="${escape(text('languageLabel'))}" style="display:inline-flex;margin-top:15px"><button type="button" data-locale="en" aria-pressed="${locale==='en'}">EN</button><button type="button" data-locale="zh" aria-pressed="${locale==='zh'}">中文</button></div><p class="card-japanese" lang="ja">${escape(target.originalJapaneseName)}</p><h2 class="card-title" id="card-title">${escape(local(target.interaction.title))}</h2>${state.visitedIds.includes(target.id)?`<div class="visited-badge">✓ ${escape(text('statusVisited'))}</div>`:''}</div><div class="card-body"><p class="card-description">${escape(local(target.interaction.body))}</p>${facts.length?`<dl class="fact-grid">${facts.map(f=>`<div class="fact-item ${local(f.value).length>125?'wide':''}"><dt>${escape(local(f.label))}</dt><dd>${escape(local(f.value))}</dd></div>`).join('')}</dl>`:''}${chosenOutcome?`<div class="outcome-note" role="status">${escape(local(chosenOutcome))}</div><div class="choices"><button class="choice-button" type="button" id="card-continue">${escape(text('continueWalk'))}<span aria-hidden="true">→</span></button></div>`:`<div class="choices">${target.choices.map((choice,index)=>`<button class="choice-button ${index>0?'secondary':''}" data-choice="${escape(choice.id)}" type="button"><span><span class="choice-label">${chosen===choice.id?'✓ ':''}${escape(local(choice.label))}</span><span class="choice-description" style="display:block">${escape(local(choice.description))}</span></span><span class="choice-arrow" aria-hidden="true">↗</span></button>`).join('')}</div>`}${state.visitedIds.includes(target.id)?`<section class="memory-note"><label for="memory-note">${escape(text('memoryNoteLabel'))}</label><textarea id="memory-note" maxlength="500" rows="3" placeholder="${escape(text('memoryNotePlaceholder'))}" aria-describedby="memory-limit">${escape(noteDraft)}</textarea><div class="memory-actions"><small id="memory-limit">${escape(text('memoryLimit',{count:noteDraft.length,max:500}))}</small><button class="choice-button secondary" type="button" id="save-memory" data-i18n="saveMemoryNote">${escape(text('saveMemoryNote'))}</button></div></section>`:''}<details class="source-details" id="source-details" ${sourceExpanded?'open':''}><summary>${escape(text('sourceExpand'))}</summary><p>${escape(text('visitFactSeparation'))}</p>${(target.sources??[]).map(source=>`<p class="source-row"><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)} ↗</a><br>${escape(text('sourceDate',{date:source.verifiedAt}))}${source.attribution?`<br>${escape(source.attribution)}`:''}</p>`).join('')}<p class="source-note"><strong>${escape(text('sourceCaution'))}</strong><br>${escape(local(target.provenance?.note))}<br>${escape(text('sourceCautionBody'))}</p></details></div>`;
  dialog.scrollTop=oldScroll;
  $('#source-details').addEventListener('toggle',()=>{sourceExpanded=$('#source-details').open;if(sourceExpanded)game.markSourceRead(target.id);});
  if(focusSelector)dialog.querySelector(focusSelector)?.focus({preventScroll:true});
}
function closePlace() {
  if(!dialog.open)return;
  dialog.close();activeTarget=null;sourceExpanded=false;chosenOutcome=null;
  game.setPaused(false);save(true);$('#game-stage').focus({preventScroll:true});
}
function choose(id) {
  const target=activeTarget, choice=target?.choices.find(item=>item.id===id);if(!choice)return;
  if(target.kind==='placeholder'){closePlace();return;}
  game.markVisited(target.id,choice.id);
  const next=byId.get(choice.nextTargetId)??primary.find(item=>!state.visitedIds.includes(item.id));
  if(next && !state.visitedIds.includes(next.id))game.setSelectedTarget(next.id);
  chosenOutcome=choice.outcome;
  renderCard();$('#card-continue').focus({preventScroll:true});
  showToast(text(choice.addsToRoute?'addedToRoute':'noteSaved'));save(true);
}
function exportNotes() {
  sharing.show();
}

document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.locale){if(!button.closest('#share-dialog'))applyLocale(button.dataset.locale);return;}
  if(button.dataset.appearance){void selectAppearance(button.dataset.appearance);return;}
  if(button.id==='appearance-retry'){void selectAppearance(appearanceMode);return;}
  if(!game && (button.dataset.target || button.dataset.choice || ['reset-button','confirm-reset','interact-button'].includes(button.id)))return;
  if(button.dataset.target){const target=byId.get(button.dataset.target);game.setSelectedTarget(target.id);game.moveTo(target.approachX??target.x,target.approachY??target.y);$('#game-stage').focus({preventScroll:true});return;}
  if(button.dataset.choice){choose(button.dataset.choice);return;}
  if(button.id==='card-close'||button.id==='card-continue')closePlace();
  if(button.id==='interact-button')openPlace(state.nearbyTargetId);
  if(button.id==='hint-toggle'){hints=!hints;updateHints();save(true);}
  if(button.id==='export-notes')exportNotes();
  if(button.id==='camera-reset'){game?.resetCamera();$('#game-stage').focus({preventScroll:true});}
  if(button.id==='retry-scene')location.reload();
  if(button.id==='save-memory' && activeTarget){notes[activeTarget.id]=noteDraft.slice(0,500);noteDrafts.delete(activeTarget.id);save(true);showToast(text(saveAvailable?'memorySaved':'memorySaveUnavailable'));}
  if(button.id==='reset-button'){game?.setPaused(true);resetDialog.showModal();$('#cancel-reset').focus();}
  if(button.id==='cancel-reset'){resetDialog.close();game?.setPaused(false);$('#game-stage').focus();}
  if(button.id==='confirm-reset'){resetDialog.close();notes={};noteDraft='';noteDrafts.clear();game.reset();lastUI='';updateUI();save(true);$('#game-stage').focus();}
});
dialog.addEventListener('cancel',event=>{event.preventDefault();closePlace();});
resetDialog.addEventListener('cancel',()=>{game?.setPaused(false);$('#game-stage').focus();});
window.addEventListener('pagehide',()=>save(true));
document.addEventListener('visibilitychange',()=>{if(document.hidden)save(true);});
applyLocale(locale);
function updateSceneStatus() {
  const ready=sceneStatus==='ready';
  $('#loading').hidden=ready;
  $('#camera-reset').disabled=!ready;
  renderAppearance();
  if(ready)return;
  $('#loading').innerHTML=sceneStatus==='loading'
    ? `<div class="loading-mark"></div><span>${escape(text('loading'))}</span>`
    : `<div class="scene-error"><h2>${escape(text(sceneStatus==='context-lost'?'webglContextLostTitle':'webglErrorTitle'))}</h2><p>${escape(text(sceneStatus==='context-lost'?'webglContextLostBody':'webglErrorBody'))}</p><button class="choice-button" type="button" id="retry-scene">${escape(text('retryScene'))}</button></div>`;
}

document.addEventListener('input',event=>{
  if(event.target.id==='memory-note'){
    noteDraft=event.target.value.slice(0,500);
    if(activeTarget)noteDrafts.set(activeTarget.id,noteDraft);
    $('#memory-limit').textContent=text('memoryLimit',{count:noteDraft.length,max:500});
  }
});

try {
  await document.fonts.load('16px "Kyoto Sans"');
  game=await createGame($('#game-stage'),{
    locale,saved:saved.game,lightingMode:appearanceMode,
    onLightingStatus(next){lightingState=next;renderAppearance();},
    onState(next){state=next;updateUI();},onInteract:openPlace,
    onStatus(next){sceneStatus=next.status;updateSceneStatus();},
    onReady(next){sceneStatus=next.status;updateSceneStatus();},
  });
  if(sharing.open)game.setPaused(true);
  applyLocale(locale);save(true);if(!sharing.open)$('#game-stage').focus({preventScroll:true});
  if(returning)showToast(text('returningBody'));
}catch(error){
  console.error('Game initialization failed',error);
  sceneStatus='unavailable';updateSceneStatus();
}
