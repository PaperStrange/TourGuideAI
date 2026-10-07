import './styles.css';
import { MOMENTS, PERSPECTIVE_CHAPTER } from '../content/perspectives.js';
import { text } from './copy.js';
import { createRecord, readRecord, writeRecord, saveMoment, removeMoment, feedbackReport, MAX_NOTE_LENGTH } from './state.js';
import { createShareURL, readSharedMoment } from './share.js';
import fontLicense from '../ui/assets/NOTO-LICENSE.txt?raw';
import runtimeNotices from '../ui/assets/THIRD-PARTY-NOTICES.txt?raw';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const params = new URLSearchParams(location.search);
let storage;
try { storage = localStorage; } catch { /* Local-only mode still works. */ }
const requested = ['walk', 'story'].includes(params.get('mode')) ? params.get('mode') : null;
const previous = readRecord(storage);
let record = previous ?? createRecord({ mode: requested ?? (crypto.getRandomValues(new Uint8Array(1))[0] < 128 ? 'walk' : 'story') });
if (!previous) record.trial.source = requested ? 'link' : 'random';
if (requested && record.mode !== requested) { record.mode = requested; record.trial.crossover = true; }
if (['en', 'zh'].includes(params.get('lang'))) record.locale = params.get('lang');
let locale = record.locale, begun = false, live = null, liveSequence = 0, sceneStatus = 'idle';
let position = null, approaching = false, focusOnArrival = false, feedbackOpen = false;
let storageOK = true, shared = null, shareError = null, activeShare = null;
let selectedFrame = null, storyFrame = { kind: 'story', scale: 1, x: 0.5, y: 0.5 };
const drafts = new Map();
const ct = (key, vars) => text(locale, key, vars);
const local = value => value?.[locale] ?? value?.en ?? '';
const moment = () => MOMENTS[record.index];
const asset = path => new URL(path, new URL(import.meta.env.BASE_URL, document.baseURI)).href;
const currentSaved = () => record.moments.find(value => value.momentId === moment().id);
const hasSharedHash = Boolean(location.hash);
if (hasSharedHash) {
  try { shared = readSharedMoment(location.hash); locale = shared.locale; } catch (error) { shareError = error; }
}
const notices = document.createElement('script');
notices.type = 'text/plain'; notices.id = 'third-party-notices';
notices.textContent = `${fontLicense}\n\n${runtimeNotices}`; document.head.appendChild(notices);

let toastTimer;
function toast(message) {
  clearTimeout(toastTimer); $('#status').textContent = message;
  toastTimer = setTimeout(() => { $('#status').textContent = ''; }, 5000);
}
function persist() {
  if (hasSharedHash) return;
  record.locale = locale; storageOK = writeRecord(storage, record);
  $('#storage-status').textContent = storageOK ? '' : ct('storageUnavailable');
}
function preserveDraft() { if ($('#note')) drafts.set(moment().id, $('#note').value); }
function sourcesHTML(item) {
  return item.sources.map(source => `<a href="${escape(source.url)}" target="_blank" rel="noopener">${escape(source.label)} ↗</a>`).join('');
}
function mapHTML() {
  return `<svg class="route-map" viewBox="0 0 300 156" role="img" aria-label="${escape(locale === 'zh' ? '示意路线：横道、南侧视点、回到北侧' : 'Schematic route: crossing, south viewpoint, return north')}">
    <rect x="65" y="10" width="211" height="38" rx="4" class="map-building"/><rect x="65" y="114" width="175" height="30" rx="4" class="map-building"/>
    <path d="M10 82H290" class="map-road"/><path d="M70 56V110" class="map-crossing"/>
    <path d="M70 56V109H119M119 109H70V56H109" class="map-route"/>
    <text x="182" y="35" text-anchor="middle">MITSUI</text><text x="176" y="136" text-anchor="middle">DAIYA</text><text x="200" y="86">SHIJŌ</text>
    ${[[70,56],[119,109],[109,56]].map(([x,y], index) => `<g class="map-pin ${record.index === index ? 'active' : ''}"><circle cx="${x}" cy="${y}" r="10"/><text x="${x}" y="${y+3.5}" text-anchor="middle">${index+1}</text></g>`).join('')}
  </svg>`;
}

$('#perspective-app').innerHTML = `
  <header class="header"><a class="wordmark" href="./index.html"><span class="brand-icon" aria-hidden="true">↗</span>TourGuideAI</a><span class="header-place">KYOTO <span>京都</span></span><nav class="locale-switch" aria-label="Language"><button id="locale-en" data-locale="en">EN</button><button id="locale-zh" data-locale="zh">中文</button></nav></header>
  <main id="content"></main>
  <footer class="footer"><span data-copy="scope"></span><span>© OpenStreetMap contributors · <a href="./credits.html">Credits / 来源</a></span></footer>
  <div id="storage-status" class="storage-status" role="status"></div><div id="status" class="status" role="status" aria-live="polite"></div>
  <dialog id="share-dialog" aria-labelledby="share-title"><form method="dialog"><button class="close" aria-label="Close">×</button></form><span class="eyebrow" data-copy="sharePreview"></span><h2 id="share-title" data-copy="shareTitle"></h2><div id="share-preview"></div><label class="check-row"><input type="checkbox" id="include-note"><span data-copy="includeNote"></span></label><label class="link-label" for="share-url" data-copy="copyManually"></label><textarea id="share-url" rows="3" readonly></textarea><div class="button-row"><button id="copy-link" class="primary" data-copy="shareCopy"></button><button id="native-share" class="secondary" data-copy="shareNative"></button></div><p id="share-status" role="status"></p></dialog>
  <dialog id="reset-dialog" aria-labelledby="reset-title"><h2 id="reset-title" data-copy="reset"></h2><p data-copy="resetConfirm"></p><div class="button-row"><button id="confirm-reset" class="primary" data-copy="resetConfirmAction"></button><button id="cancel-reset" class="secondary" data-copy="resetCancel"></button></div></dialog>`;

function applyCopy() {
  document.documentElement.lang = locale;
  document.title = `${ct('title')} · TourGuideAI`;
  document.querySelectorAll('[data-copy]').forEach(node => { node.textContent = ct(node.dataset.copy); });
  document.querySelectorAll('[data-locale]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.locale === locale)));
  document.querySelector('.locale-switch').setAttribute('aria-label', ct('languageLabel'));
  document.querySelectorAll('.close').forEach(node => node.setAttribute('aria-label', ct('close')));
}

function landing() {
  $('#content').innerHTML = `<section class="welcome"><div class="welcome-copy"><span class="eyebrow">FIELD NOTES / 01</span><h1 data-copy="title"></h1><p class="welcome-subtitle" data-copy="subtitle"></p><p class="welcome-intro" data-copy="intro"></p><button id="begin" class="primary large"><span data-copy="begin"></span><span aria-hidden="true">↗</span></button><p class="small" data-copy="remaining"></p><a class="text-link" href="./index.html" data-copy="existingWalk"></a></div><div class="welcome-visual"><img src="${asset(MOMENTS[2].image)}" alt="${escape(local(MOMENTS[2].imageAlt))}"><div class="plate-caption"><span>SHIJŌ–KARASUMA</span><span>01—03</span></div><div class="welcome-map">${mapHTML()}</div></div></section><section class="chapter-intro"><span class="chapter-number">01</span><div><h2>${escape(local(PERSPECTIVE_CHAPTER.title))}</h2><p>${escape(local(PERSPECTIVE_CHAPTER.intro))}</p><span class="author-label" data-copy="sampleAuthor"></span></div><div class="format-choice"><span data-copy="modeLabel"></span><div class="mode-switch"><button id="mode-walk" data-mode="walk" data-copy="modeWalk"></button><button id="mode-story" data-mode="story" data-copy="modeStory"></button></div></div></section>`;
  $('#begin').addEventListener('click', begin);
  bindModes(); applyCopy(); markMode();
}

function shell() {
  lastSceneUI='';
  $('#content').innerHTML = `<section class="journey-heading"><div><span class="eyebrow">01 / KYOTO</span><h1>${escape(local(PERSPECTIVE_CHAPTER.title))}</h1></div><div class="mode-switch"><button id="mode-walk" data-mode="walk" data-copy="modeWalk"></button><button id="mode-story" data-mode="story" data-copy="modeStory"></button></div></section>
  <ol class="moment-tabs">${MOMENTS.map((item,index)=>`<li><button data-moment="${index}"><span>0${index+1}</span><span>${escape(local(item.title))}</span></button></li>`).join('')}</ol>
  <div class="experience-grid"><section class="visual-column"><div class="scene-frame"><div id="live-stage" tabindex="0" role="region" aria-label="${escape(ct('modeWalk'))}"></div><div id="story-stage"><img id="story-image" alt="" draggable="false"></div><div class="scene-badge" id="scene-badge"></div><div class="scene-state" id="scene-state" role="status"></div><div class="recovery" id="recovery" hidden><button id="retry-live" class="secondary" data-copy="retry"></button><button id="use-story" class="primary" data-copy="useStory"></button></div></div><div class="view-controls"><span id="view-help"></span><div id="walk-controls"><button id="reset-camera" data-copy="resetView"></button><button id="look-here" data-copy="lookHere"></button></div><div id="story-controls"><label for="story-zoom">${locale === 'zh' ? '缩放' : 'Zoom'}</label><input type="range" id="story-zoom" min="1" max="2" step="0.05" value="1"><label for="story-x">${locale === 'zh' ? '左右' : 'Across'}</label><input type="range" id="story-x" min="0" max="1" step="0.05" value="0.5"><label for="story-y">${locale === 'zh' ? '上下' : 'Up / down'}</label><input type="range" id="story-y" min="0" max="1" step="0.05" value="0.5"></div></div><div class="wayfinding"><div id="route-map">${mapHTML()}</div><div><span class="eyebrow">SHIJŌ–KARASUMA</span><p id="travel-status" role="status"></p><button id="walk-here" class="text-link" data-copy="walkHere"></button></div></div></section>
  <aside class="story-panel"><span class="eyebrow" id="moment-number"></span><h2 id="moment-title"></h2><p id="moment-invitation" class="invitation"></p><button id="reveal" class="primary" data-copy="reveal"></button><section id="remark" hidden><span class="author-label" data-copy="sampleAuthor"></span><blockquote id="moment-remark"></blockquote><details><summary data-copy="sourceLabel"></summary><p id="moment-fact"></p><div id="moment-sources" class="source-links"></div></details></section><div class="next-row"><button id="next" class="text-link"><span></span><span aria-hidden="true">→</span></button></div>
  <section class="personal-moment"><span class="eyebrow" data-copy="endingTitle"></span><label for="note" data-copy="noteLabel"></label><textarea id="note" maxlength="500" rows="3"></textarea><div class="note-meta"><span data-copy="noteHelp"></span><span id="note-count"></span></div><div class="button-row"><button id="frame-view" class="secondary" data-copy="frameView"></button><button id="save-moment" class="primary" data-copy="saveNote"></button></div><p id="frame-status" class="small"></p><button id="share-moment" class="text-link" data-copy="shareOpen"></button></section></aside></div>
  <section class="notebook"><div><span class="eyebrow">PERSONAL FIELD NOTES</span><h2 data-copy="savedMoments"></h2><p data-copy="notePrivate"></p></div><div id="saved-moments"></div></section>
  <section id="reflection" class="reflection" hidden><div><span class="eyebrow" data-copy="reflectionTitle"></span><h2 data-copy="reflectionQuestion"></h2><p data-copy="feedbackLocal"></p></div><div><label for="feedback-score" class="sr-only" data-copy="reflectionQuestion"></label><select id="feedback-score"><option value="" data-copy="chooseScore"></option>${[1,2,3,4,5].map(n=>`<option value="${n}">${n}</option>`).join('')}</select><div class="rating-labels"><span data-copy="reflectionLow"></span><span data-copy="reflectionHigh"></span></div><label for="feedback-note" data-copy="reflectionReasonLabel"></label><textarea id="feedback-note" maxlength="500" rows="2"></textarea><div class="button-row"><button id="save-feedback" class="primary">${locale==='zh'?'保存反馈':'Save reflection'}</button><button id="export-feedback" class="secondary" data-copy="exportFeedback"></button><button id="skip-feedback" class="text-link" data-copy="reflectionSkip"></button></div><p id="feedback-status" role="status"></p></div></section>
  <div class="journey-footer"><button id="finish" class="text-link" data-copy="stop"></button><button id="reset-button" class="text-link" data-copy="reset"></button></div>`;
  bindModes();
  document.querySelectorAll('[data-moment]').forEach(button => button.addEventListener('click',()=>selectMoment(Number(button.dataset.moment))));
  $('#walk-here').addEventListener('click', approach);
  $('#look-here').addEventListener('click',()=>live?.focusMoment(moment()));
  $('#reset-camera').addEventListener('click',()=>live?.resetCamera());
  $('#reveal').addEventListener('click',()=>{
    if (!record.revealedIds.includes(moment().id)) record.revealedIds.push(moment().id);
    live?.focusMoment(moment()); persist(); renderMoment();
  });
  $('#next').addEventListener('click',()=>record.index < MOMENTS.length-1 ? selectMoment(record.index+1) : finish());
  $('#note').addEventListener('input',()=>{ preserveDraft(); countNote(); });
  $('#frame-view').addEventListener('click',()=>{
    selectedFrame = captureFrame();
    $('#frame-status').textContent = selectedFrame ? ct('viewFramed') : ct('loading');
  });
  $('#save-moment').addEventListener('click',()=>{
    const view = selectedFrame ?? captureFrame();
    if (!view) { toast(ct('loading')); return; }
    record = saveMoment(record,{momentId:moment().id,note:$('#note').value,view});
    selectedFrame = view; persist(); renderSaved(); renderMoment(); toast(ct(storageOK?'momentSaved':'storageUnavailable'));
  });
  $('#share-moment').addEventListener('click',()=>openShare(currentSaved()));
  $('#saved-moments').addEventListener('click',event=>{
    const open = event.target.closest('[data-open-moment]'), del = event.target.closest('[data-delete-moment]'), share = event.target.closest('[data-share-moment]');
    if(open) reopen(record.moments.find(item=>item.momentId===open.dataset.openMoment));
    if(del) { drafts.delete(del.dataset.deleteMoment); if(del.dataset.deleteMoment===moment().id)selectedFrame=null; record=removeMoment(record,del.dataset.deleteMoment); persist(); renderSaved(); renderMoment(); toast(ct(storageOK?'noteDeleted':'storageUnavailable')); }
    if(share) openShare(record.moments.find(item=>item.momentId===share.dataset.shareMoment));
  });
  for(const key of ['zoom','x','y']) $('#story-'+key).addEventListener('input',()=>{
    storyFrame={kind:'story',scale:Number($('#story-zoom').value),x:Number($('#story-x').value),y:Number($('#story-y').value)}; renderStoryFrame();
  });
  $('#retry-live').addEventListener('click',()=>startLive());
  $('#use-story').addEventListener('click',()=>changeMode('story'));
  $('#finish').addEventListener('click',finish);
  $('#skip-feedback').addEventListener('click',()=>{feedbackOpen=false;$('#reflection').hidden=true;});
  $('#save-feedback').addEventListener('click',()=>{
    const score=Number($('#feedback-score').value);
    if(score<1||score>5) {$('#feedback-score').focus();return;}
    record.feedback={score,note:$('#feedback-note').value,mode:record.mode};persist();
    $('#feedback-status').textContent=ct(storageOK?'reflectionSaved':'storageUnavailable');
    $('#export-feedback').disabled=false;
  });
  $('#export-feedback').addEventListener('click',()=>{
    const report=feedbackReport(record);if(!report)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='kyoto-perspective-feedback.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $('#reset-button').addEventListener('click',()=>{live?.setPaused(true);$('#reset-dialog').showModal();});
  $('#feedback-score').value=record.feedback?.score??'';
  $('#feedback-note').value=record.feedback?.note??'';
  $('#export-feedback').disabled=!record.feedback;
  $('#reflection').hidden=!feedbackOpen;
  applyCopy(); renderMoment(); renderSaved(); markMode(); renderSceneStatus();
}

function bindModes() { document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>changeMode(button.dataset.mode))); }
function markMode() { document.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===record.mode))); }
function countNote() { $('#note-count').textContent=ct('noteLimit',{count:$('#note').value.length,max:MAX_NOTE_LENGTH}); }
function renderStoryFrame() {
  const img=$('#story-image');if(!img)return;
  img.style.transform=`scale(${storyFrame.scale})`; img.style.transformOrigin=`${storyFrame.x*100}% ${storyFrame.y*100}%`;
  for(const[key,val]of Object.entries({zoom:storyFrame.scale,x:storyFrame.x,y:storyFrame.y})) $('#story-'+key).value=val;
}
function renderMoment() {
  if(!begun)return;
  const item=moment(), revealed=record.revealedIds.includes(item.id);
  $('#moment-number').textContent=`0${record.index+1} / 03`;
  $('#moment-title').textContent=local(item.title);$('#moment-invitation').textContent=local(item.invitation);
  $('#remark').hidden=!revealed;$('#reveal').hidden=revealed;
  $('#moment-remark').textContent=local(item.remark);$('#moment-fact').textContent=local(item.fact);
  $('#moment-sources').innerHTML=sourcesHTML(item);
  $('#next span').textContent=ct(record.index===MOMENTS.length-1?'finishWalk':'continueWalk');
  $('#story-image').src=asset(item.image);$('#story-image').alt=local(item.imageAlt);
  $('#story-image').onerror=()=>{ if(record.mode==='story')$('#scene-state').textContent=ct('loadError'); };
  $('#note').placeholder=ct('notePlaceholder');
  $('#note').value=drafts.get(item.id)??currentSaved()?.note??'';
  $('#frame-status').textContent=selectedFrame?ct('viewFramed'):'';
  $('#share-moment').disabled=!currentSaved();
  $('#route-map').innerHTML=mapHTML();countNote();
  document.querySelectorAll('[data-moment]').forEach(button=>button.setAttribute('aria-current',Number(button.dataset.moment)===record.index?'step':'false'));
  renderStoryFrame();renderSceneStatus();
}
function renderSaved() {
  $('#saved-moments').innerHTML=record.moments.length?record.moments.map(saved=>{
    const item=MOMENTS.find(item=>item.id===saved.momentId);
    return `<article class="saved-card"><span class="saved-tag">${escape(ct(saved.view.kind==='walk'?'saved3DView':'savedView'))}</span><h3>${escape(local(item.title))}</h3><p>${escape(saved.note||ct('noteEmpty'))}</p><div class="button-row"><button data-open-moment="${item.id}">${escape(ct('editNote'))}</button><button data-share-moment="${item.id}">${escape(ct('shareOpen'))}</button><button data-delete-moment="${item.id}" aria-label="${escape(ct('deleteMoment')+' · '+local(item.title))}">×</button></div></article>`;
  }).join(''):`<p class="empty-notes">${escape(ct('noteEmpty'))}</p>`;
}
let lastSceneUI = '';
function renderSceneStatus() {
  if(!begun)return;
  const distance=position?Math.hypot(position.x-moment().position.x,position.y-moment().position.y):Infinity;
  const signature=JSON.stringify([locale,record.mode,record.index,sceneStatus,approaching,distance<2.5]);
  if(signature===lastSceneUI)return;
  lastSceneUI=signature;
  const walking=record.mode==='walk';
  $('#live-stage').hidden=!walking;$('#story-stage').hidden=walking;
  $('#walk-controls').hidden=!walking;$('#story-controls').hidden=walking;
  $('#walk-here').hidden=!walking;
  $('#walk-here').disabled=sceneStatus!=='ready';
  $('#look-here').disabled=sceneStatus!=='ready';
  $('#reset-camera').disabled=sceneStatus!=='ready';
  $('#scene-badge').textContent=walking?ct('modeWalk'):ct('illustrated');
  const failed=['unavailable','context-lost'].includes(sceneStatus);
  $('#scene-state').textContent=walking?(failed?ct('loadError'):sceneStatus==='ready'?'':ct('loading')):'';
  $('#recovery').hidden=!walking||!failed;
  $('#view-help').textContent=walking?`${matchMedia('(pointer: coarse)').matches?ct('controlsTap'):ct('keyMove')} · ${ct('controlsLook')}${matchMedia('(pointer: coarse)').matches?'':' · '+ct('controlsZoom')}`:ct('illustrated');
  $('#travel-status').textContent=walking?(approaching?ct('onTheWay'):distance<2.5?ct('arrived'):ct('arrivalBody')):local(moment().title);
  $('#reveal').disabled=walking&&(sceneStatus!=='ready'||distance>=2.5);
  $('#frame-view').disabled=walking&&sceneStatus!=='ready';
  $('#save-moment').disabled=walking&&sceneStatus!=='ready';
}
async function startLive(initialView) {
  const sequence=++liveSequence;live?.destroy();live=null;position=null;sceneStatus='loading';renderSceneStatus();
  try {
    const {createPerspectiveView}=await import('./live-view.js');
    if(sequence!==liveSequence||record.mode!=='walk')return;
    const candidate=await createPerspectiveView($('#live-stage'),{locale,initialView,
      onStatus(value){if(sequence!==liveSequence)return;sceneStatus=typeof value==='string'?value:value.status;renderSceneStatus();},
      onState(value){
        if(sequence!==liveSequence)return;position=value.position;approaching=value.moving;
        if(position&&!value.moving&&focusOnArrival&&Math.hypot(position.x-moment().position.x,position.y-moment().position.y)<0.15){focusOnArrival=false;live?.focusMoment(moment());}
        renderSceneStatus();
      }});
    if(sequence!==liveSequence||record.mode!=='walk'){candidate.destroy();return;}
    live=candidate;live.setLocale(locale);sceneStatus='ready';renderSceneStatus();
    if($('#share-dialog').open||$('#reset-dialog').open)live.setPaused(true);
    else if(!initialView)approach();
  } catch {if(sequence===liveSequence){sceneStatus='unavailable';renderSceneStatus();}}
}
function approach() { if(live&&sceneStatus==='ready'){focusOnArrival=true;live.moveTo(moment().position.x,moment().position.y);} }
function captureFrame() {
  if(record.mode==='story')return structuredClone(storyFrame);
  const pose=live?.captureView();return pose?{kind:'walk',pose}:null;
}
function begin() {begun=true;persist();shell();if(record.mode==='walk')startLive();}
function changeMode(mode) {
  if(!['walk','story'].includes(mode))return;
  preserveDraft();
  if(record.mode!==mode){record.trial.crossover=true;record.mode=mode;selectedFrame=null;}
  if(!begun){record.trial.assignment=mode;record.trial.source='choice';record.trial.crossover=false;markMode();return;}
  persist();markMode();
  if(mode==='walk'&&!live)startLive();
  else if(mode==='story'){++liveSequence;live?.destroy();live=null;sceneStatus='idle';approaching=false;}
  renderSceneStatus();
}
function selectMoment(index) {
  preserveDraft();record.index=index;selectedFrame=null;storyFrame={kind:'story',scale:1,x:.5,y:.5};persist();renderMoment();
  if(record.mode==='walk')approach();
}
async function reopen(saved) {
  if(!saved)return;
  preserveDraft();record.index=MOMENTS.findIndex(item=>item.id===saved.momentId);
  drafts.set(saved.momentId,saved.note);selectedFrame=structuredClone(saved.view);
  if(record.mode!==saved.view.kind){record.mode=saved.view.kind;record.trial.crossover=true;}
  if(saved.view.kind==='story'){++liveSequence;live?.destroy();live=null;sceneStatus='idle';storyFrame=structuredClone(saved.view);}
  renderMoment();markMode();persist();
  if(saved.view.kind==='walk'){focusOnArrival=false;if(live)live.restoreView(saved.view.pose);else await startLive(saved.view.pose);}
  $('#note').focus();
}
function finish(){preserveDraft();feedbackOpen=true;$('#reflection').hidden=false;$('#reflection').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}

function sharePreview() {
  if(!activeShare)return;
  const item=MOMENTS.find(value=>value.id===activeShare.momentId), include=$('#include-note').checked;
  const imageStyle=activeShare.view.kind==='story'?`transform:scale(${activeShare.view.scale});transform-origin:${activeShare.view.x*100}% ${activeShare.view.y*100}%`:'';
  $('#share-preview').innerHTML=`<div class="preview-image"><img src="${asset(item.image)}" style="${imageStyle}" alt="${escape(local(item.imageAlt))}"></div><p class="small">${escape(ct(activeShare.view.kind==='walk'?'referencePreview':'illustrated'))}</p><h3>${escape(local(item.title))}</h3><blockquote>${escape(local(item.remark))}</blockquote>${include&&activeShare.note?`<p class="personal-quote">${escape(activeShare.note)}</p>`:''}<p class="small">${escape(ct('recipientReadOnly'))}</p>`;
  try{$('#share-url').value=createShareURL(activeShare,location.href,{locale,includeNote:include});$('#copy-link').disabled=false;$('#native-share').disabled=false;}
  catch(error){$('#share-url').value='';$('#share-status').textContent=ct(error.code==='too-long'?'shareTooLong':'shareUnavailable');$('#copy-link').disabled=true;$('#native-share').disabled=true;}
}
function openShare(saved) {
  if(!saved){toast(ct('shareEmpty'));return;}
  activeShare=structuredClone(saved);$('#include-note').checked=false;$('#include-note').disabled=!saved.note;
  $('#share-status').textContent='';sharePreview();live?.setPaused(true);$('#share-dialog').showModal();
}
$('#include-note').addEventListener('change',sharePreview);
$('#share-dialog').addEventListener('close',()=>{activeShare=null;live?.setPaused(false);});
$('#copy-link').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText($('#share-url').value);$('#share-status').textContent=ct('shareLinkCopied');}
  catch{$('#share-url').focus();$('#share-url').select();$('#share-status').textContent=ct('copyManually');}
});
$('#native-share').addEventListener('click',async()=>{
  if(!navigator.share){$('#share-url').focus();$('#share-url').select();$('#share-status').textContent=ct('copyManually');return;}
  try{await navigator.share({title:ct('title'),url:$('#share-url').value});$('#share-status').textContent=ct('shareHandedOff');}
  catch(error){$('#share-status').textContent=ct(error.name==='AbortError'?'shareCancelled':'shareUnavailable');}
});
$('#cancel-reset').addEventListener('click',()=>$('#reset-dialog').close());
$('#reset-dialog').addEventListener('close',()=>live?.setPaused(false));
$('#confirm-reset').addEventListener('click',()=>{
  const mode=record.mode;record=createRecord({mode,locale});record.trial.source='choice';drafts.clear();selectedFrame=null;feedbackOpen=false;
  ++liveSequence;live?.destroy();live=null;sceneStatus='idle';$('#reset-dialog').close();persist();shell();if(mode==='walk')startLive();
});

async function recipient() {
  const sequence=++liveSequence;live?.destroy();live=null;
  if(shareError){$('#content').innerHTML=`<section class="invalid-share"><span class="eyebrow">TOURGUIDEAI</span><h1>${escape(ct('invalidShare'))}</h1><a href="./perspective.html" class="primary">${escape(ct('recipientStartOwn'))}</a></section>`;applyCopy();return;}
  const item=MOMENTS.find(value=>value.id===shared.momentId);
  $('#content').innerHTML=`<section class="recipient-heading"><span class="eyebrow" data-copy="recipientReadOnly"></span><h1>${escape(local(item.title))}</h1></section><div class="recipient-grid"><section><div class="scene-frame" id="recipient-view"><img id="recipient-image" src="${asset(item.image)}" alt="${escape(local(item.imageAlt))}"><div id="recipient-live"></div></div><p id="recipient-status" class="small" role="status"></p></section><aside><span class="author-label" data-copy="sampleAuthor"></span><blockquote>${escape(local(item.remark))}</blockquote>${shared.note?`<span class="eyebrow">${escape(ct('sharedNoteLabel'))}</span><p class="recipient-note">${escape(shared.note)}</p>`:''}<details><summary data-copy="sourceLabel"></summary><p>${escape(local(item.fact))}</p><div class="source-links">${sourcesHTML(item)}</div></details><a href="./perspective.html?lang=${locale}" class="primary recipient-start" data-copy="recipientStartOwn"></a></aside></div>`;
  applyCopy();
  if(shared.view.kind==='story'){
    const v=shared.view;$('#recipient-image').style.transform=`scale(${v.scale})`;$('#recipient-image').style.transformOrigin=`${v.x*100}% ${v.y*100}%`;
    $('#recipient-status').textContent=ct('illustrated');return;
  }
  $('#recipient-status').textContent=ct('loading');
  try{
    const{createPerspectiveView}=await import('./live-view.js');
    if(sequence!==liveSequence)return;
    const candidate=await createPerspectiveView($('#recipient-live'),{locale,initialView:shared.view.pose,
      onStatus(value){if(sequence!==liveSequence)return;const status=typeof value==='string'?value:value.status;if(['unavailable','context-lost'].includes(status)){$('#recipient-image').hidden=false;$('#recipient-live').hidden=true;$('#recipient-status').textContent=ct('storyFallback');}}});
    if(sequence!==liveSequence){candidate.destroy();return;}
    live=candidate;live.setPaused(true);$('#recipient-image').hidden=true;$('#recipient-status').textContent=ct('saved3DView');
  }catch{if(sequence===liveSequence){$('#recipient-live').hidden=true;$('#recipient-status').textContent=ct('storyFallback');}}
}

document.querySelectorAll('[data-locale]').forEach(button=>button.addEventListener('click',()=>{
  preserveDraft();locale=button.dataset.locale;
  if(hasSharedHash){recipient();return;}
  persist();
  if(!begun){landing();return;}
  // Rebuild text panels while preserving the WebGL host and all drafts.
  const host=$('#live-stage'), oldLive=live, feedbackDraft=$('#feedback-note').value, scoreDraft=$('#feedback-score').value;
  host.remove();shell();$('#live-stage').replaceWith(host);host.setAttribute('aria-label',ct('modeWalk'));live=oldLive;live?.setLocale(locale);
  $('#feedback-note').value=feedbackDraft;$('#feedback-score').value=scoreDraft;renderSceneStatus();
  if(activeShare)sharePreview();
}));

if(hasSharedHash)recipient();else landing();
applyCopy();
window.addEventListener('pagehide',()=>{++liveSequence;live?.destroy();});
if(params.get('qa')==='1')Object.defineProperty(window,'__PERSPECTIVE__',{value:Object.freeze({snapshot:()=>structuredClone({record,locale,begun,sceneStatus,position,selectedFrame,storyFrame,recipient:Boolean(shared),shareError:shareError?.code??null})})});
