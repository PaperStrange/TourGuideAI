import { TARGETS, CONTENT_PROVENANCE } from '../content/kyoto.js';
import { t } from '../ui/i18n.js';
const byId = new Map(TARGETS.map(target => [target.id, target]));
const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

// User-initiated, local HTML export. Personal notes remain escaped plain text.
export function renderFieldNotes({locale, state, notes = {}}) {
  const text = (key, vars) => t(locale, key, vars);
  const local = value => typeof value === 'string' ? value : value?.[locale] ?? value?.en ?? '';
  const label = target => local(target.title);

  const visits=state.visitedIds.map(id=>byId.get(id)).filter(target=>target&&target.kind!=='placeholder');
  const choiceFor=target=>target.choices.find(item=>item.id===state.choiceIds[target.id]);
  const date=new Date().toISOString().slice(0,10);
  const sections=visits.map(target=>{
    const choice=choiceFor(target);
    return `<section><small>${escape(choice?.addsToRoute?text('routeTitle'):text('journalTitle'))}</small><h2>${escape(label(target))}</h2><p lang="ja">${escape(target.originalJapaneseName)}</p><p>${escape(local(choice?.outcome))}</p><dl>${target.interaction.facts.map(f=>`<dt>${escape(local(f.label))}</dt><dd>${escape(local(f.value))}</dd>`).join('')}</dl><p>${escape(local(target.provenance?.note))}</p>${notes[target.id]?`<aside class="personal-note"><h3>${escape(text('personalNoteTitle'))}</h3><p style="white-space:pre-wrap">${escape(notes[target.id])}</p></aside>`:''}<details><summary>${escape(text('sourceExpand'))}</summary>${target.sources.map(source=>`<p><a href="${escape(source.url)}">${escape(source.title)}</a> · ${escape(source.verifiedAt)}</p>`).join('')}</details></section>`;
  }).join('');
  const html=`<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(text('journalTitle'))} · ${escape(text('eyebrow'))}</title><style>body{max-width:700px;margin:50px auto;padding:0 25px;color:#304734;background:#faf8f0;font:15px/1.8 system-ui,sans-serif}h1,h2{font-family:Georgia,serif;font-weight:400}h1{font-size:40px}section{padding:25px 0;border-top:1px solid #ccd2c1}dt{font-weight:600;margin-top:15px}dd{margin:0}small{color:#718269}a{color:#446642}summary{cursor:pointer}footer{font-size:11px;margin:30px 0}@media print{body{background:white;margin:0}details{display:block}section{break-inside:avoid}}</style><h1>${escape(text('postcardTitle'))}</h1><p>${escape(text('eyebrow'))} · ${date}</p><p>${escape(text('demoScope'))}</p>${sections}<footer>${escape(CONTENT_PROVENANCE.attribution)}<br>${escape(text('sourceCautionBody'))}</footer></html>`;
  return html;
}
