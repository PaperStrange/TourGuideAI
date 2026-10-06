import { TARGETS, PRIMARY_TARGET_IDS, CONTENT_PROVENANCE } from '../content/kyoto.js';
import { t } from '../ui/i18n.js';

export const MAX_SHARE_URL_LENGTH = 8192;
const targets = new Map(TARGETS.filter(target => PRIMARY_TARGET_IDS.includes(target.id)).map(target => [target.id, target]));
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fail = code => { throw Object.assign(new Error(code), {code}); };
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const keys = (value, allowed) => Object.keys(value).every(key => allowed.includes(key));

// A recap is an explicit, bounded presentation snapshot, never a game save.
export function validateRecap(value) {
  if (!record(value)) fail('shareInvalid');
  if (value.v !== 1) fail('shareUnsupported');
  if (!keys(value, ['v','pack','lang','created','stops']) || value.pack !== 'kyoto-shijo'
      || !['en','zh'].includes(value.lang) || typeof value.created !== 'string'
      || !/^\d{4}-\d{2}-\d{2}$/.test(value.created)
      || !Number.isFinite(Date.parse(value.created))
      || new Date(value.created).toISOString().slice(0,10) !== value.created
      || !Array.isArray(value.stops) || value.stops.length < 1 || value.stops.length > targets.size) fail('shareInvalid');
  const seen = new Set();
  const stops = value.stops.map(stop => {
    if (!record(stop) || !keys(stop, ['id','choice','note']) || seen.has(stop.id)) fail('shareInvalid');
    const target = targets.get(stop.id);
    if (!target || !target.choices.some(choice => choice.id === stop.choice)) fail('shareInvalid');
    seen.add(stop.id);
    if ('note' in stop && (typeof stop.note !== 'string' || stop.note.length > 500 || !stop.note.isWellFormed())) fail('shareInvalid');
    return {id:stop.id, choice:stop.choice, ...(stop.note ? {note:stop.note} : {})};
  });
  return {v:1, pack:'kyoto-shijo', lang:value.lang, created:value.created, stops};
}

export function createRecap({locale, state, notes = {}, includedNoteIds = [], created = new Date().toISOString().slice(0,10)}) {
  const included = new Set(includedNoteIds);
  const stops = [...new Set(state.visitedIds)].filter(id => targets.has(id)).map(id => ({
    id, choice:state.choiceIds[id],
    ...(included.has(id) && typeof notes[id] === 'string' && notes[id] ? {note:notes[id].slice(0,500).toWellFormed()} : {}),
  }));
  return validateRecap({v:1,pack:'kyoto-shijo',lang:locale === 'zh' ? 'zh' : 'en',created,stops});
}

export function encodeRecap(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(validateRecap(value)));
  const encoded = btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  if (encoded.length > MAX_SHARE_URL_LENGTH) fail('shareTooLong');
  return encoded;
}

export function decodeRecap(fragment) {
  if (typeof fragment !== 'string') fail('shareInvalid');
  if (fragment.length > MAX_SHARE_URL_LENGTH) fail('shareTooLong');
  const encoded = fragment.startsWith('#recap=') ? fragment.slice(7) : fragment;
  if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded)) fail('shareInvalid');
  let value;
  try {
    const bytes = Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
    value = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes));
  } catch { fail('shareInvalid'); }
  return validateRecap(value);
}

export function buildRecapUrl(value, baseUrl) {
  const url = new URL('./journey.html', baseUrl);
  url.hash = `recap=${encodeRecap(value)}`;
  url.search = '';
  if (url.href.length > MAX_SHARE_URL_LENGTH) fail('shareTooLong');
  return url.href;
}

export function recapView(value, locale = value.lang) {
  const recap = validateRecap(value);
  const lang = locale === 'zh' ? 'zh' : 'en';
  const local = item => typeof item === 'string' ? item : item?.[lang] ?? item?.en ?? '';
  return {
    title:t(lang,'postcardTitle'), subtitle:t(lang,'shareSimulatedWalk'), created:t(lang,'shareCreated',{date:recap.created}),
    scope:t(lang,'demoScope'), attribution:CONTENT_PROVENANCE.attribution, caution:t(lang,'sourceCautionBody'),
    stops:recap.stops.map(stop => {
      const target = targets.get(stop.id), choice = target.choices.find(item => item.id === stop.choice);
      return {id:stop.id, title:local(target.title), japanese:target.originalJapaneseName,
        kind:t(lang,choice.addsToRoute ? 'shareRouteChoice' : 'shareRememberedChoice'),
        outcome:local(choice.outcome), note:stop.note, noteTitle:t(lang,'personalNoteTitle'),
        facts:target.interaction.facts.map(fact => ({label:local(fact.label),value:local(fact.value)})),
        provenance:local(target.provenance?.note), sources:target.sources,
      };
    }),
  };
}

export function renderRecap(value, locale = value.lang) {
  const view = recapView(value, locale), e = escapeHtml;
  return `<article class="recap"><header class="recap-heading"><small>${e(view.subtitle)}</small><h1>${e(view.title)}</h1><p>${e(view.created)}</p><p>${e(view.scope)}</p></header>${view.stops.map(stop => `<section class="recap-stop" data-recap-stop="${e(stop.id)}"><small>${e(stop.kind)}</small><h2>${e(stop.title)}</h2><p lang="ja">${e(stop.japanese)}</p><p>${e(stop.outcome)}</p>${stop.note ? `<aside class="recap-note"><h3>${e(stop.noteTitle)}</h3><p>${e(stop.note)}</p></aside>` : ''}<dl>${stop.facts.map(fact => `<dt>${e(fact.label)}</dt><dd>${e(fact.value)}</dd>`).join('')}</dl><p class="recap-provenance">${e(stop.provenance)}</p><details><summary>${e(t(locale,'sourceExpand'))}</summary>${stop.sources.map(source => `<p><a href="${e(source.url)}" target="_blank" rel="noopener noreferrer">${e(source.title)}</a><br>${e(t(locale,'sourceDate',{date:source.verifiedAt}))}</p>`).join('')}</details></section>`).join('')}<footer>${e(view.attribution)}<p>${e(view.caution)}</p></footer></article>`;
}

// Designed text card, not a screenshot of a WebGL drawing buffer. Every selected
// note is included; line wrapping never truncates user text.
export async function renderRecapImage(value, locale = value.lang) {
  await document.fonts.ready;
  const view = recapView(value,locale), width = 1080, margin = 76, textWidth = width - margin*2;
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
  if (!ctx) fail('shareImageFailed');
  const lines = [];
  let y = 80;
  const add = (text, size = 26, color = '#304734', gap = 16) => {
    ctx.font = `${size}px "Kyoto Sans", sans-serif`;
    for (const paragraph of String(text).split('\n')) {
      let line = '';
      for (const char of paragraph) {
        if (line && ctx.measureText(line + char).width > textWidth) {
          lines.push({text:line,size,color,y}); y += size*1.5; line = '';
        }
        line += char;
      }
      lines.push({text:line,size,color,y}); y += size*1.5;
    }
    y += gap;
  };
  add('TOURGUIDEAI  /  KYOTO',20,'#617a6e',24);
  add(view.title,48); add(view.subtitle,26); add(view.created,22,'#617a6e'); add(view.scope,23,'#617a6e',32);
  view.stops.forEach((stop,index) => {
    add(`${String(index+1).padStart(2,'0')}  /  ${stop.kind}`,22,'#8b6045',8);
    add(stop.title,35); add(stop.japanese,22,'#617a6e'); add(stop.outcome);
    if (stop.note) { add(stop.noteTitle,22,'#8b6045',4); add(stop.note); }
    for (const fact of stop.facts) { add(fact.label,22,'#617a6e',2); add(fact.value,24); }
    add(stop.provenance,21,'#617a6e');
    for (const source of stop.sources) add(`${source.title} · ${source.verifiedAt}\n${source.url}`,18,'#617a6e',8);
    y += 34;
  });
  add(view.attribution,20,'#617a6e'); add(view.caution,20,'#617a6e');
  canvas.width = width; canvas.height = Math.ceil(y + 60);
  ctx.fillStyle='#faf8f0'; ctx.fillRect(0,0,width,canvas.height);
  ctx.fillStyle='#416b61'; ctx.fillRect(0,0,16,canvas.height);
  ctx.textBaseline='top';
  for (const line of lines) { ctx.font=`${line.size}px "Kyoto Sans", sans-serif`; ctx.fillStyle=line.color; ctx.fillText(line.text,margin,line.y); }
  return new Promise((resolve,reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Object.assign(new Error('shareImageFailed'),{code:'shareImageFailed'})), 'image/png'));
}
