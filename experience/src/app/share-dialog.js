import './recap.css';
import { TARGETS } from '../content/kyoto.js';
import { t } from '../ui/i18n.js';
import { createRecap, buildRecapUrl, renderRecap, renderRecapImage, escapeHtml as e } from './share.js';

export function installShareDialog({getSnapshot, setPaused, onLocale, onClose}) {
  const dialog = document.createElement('dialog');
  dialog.id='share-dialog'; dialog.setAttribute('aria-labelledby','share-title');
  document.body.appendChild(dialog);
  const byId = new Map(TARGETS.map(target => [target.id,target]));
  let snapshot, locale='en', selected=new Set(), recap, url, imageBlob, generation=0, opener;
  const text=(key,vars)=>t(locale,key,vars);
  const message=(key)=>{const status=dialog.querySelector('#share-status');if(status)status.textContent=text(key);};

  function refresh() {
    const activeId = dialog.contains(document.activeElement) ? document.activeElement.id : null;
    const activeNote = document.activeElement?.dataset?.shareNote;
    const activeLocale = dialog.contains(document.activeElement) ? document.activeElement?.dataset?.locale : null;
    recap=createRecap({...snapshot,locale,includedNoteIds:selected});
    let urlError;
    try { url=buildRecapUrl(recap,location.href); } catch(error) { url=null;urlError=error.code||'shareLinkUnavailable'; }
    const savedNotes=recap.stops.filter(stop=>snapshot.notes[stop.id]);
    imageBlob=null; const current=++generation;
    dialog.innerHTML=`<div class="share-heading"><div><small>TOURGUIDEAI / KYOTO</small><h2 id="share-title">${e(text('shareTitle'))}</h2><p>${e(text('shareIntro'))}</p></div><button id="share-close" type="button" aria-label="${e(text('shareClose'))}">×</button></div><div class="share-layout"><div class="share-options"><div class="language-switch" role="group" aria-label="${e(text('languageLabel'))}"><button type="button" data-locale="en" aria-pressed="${locale==='en'}">EN</button><button type="button" data-locale="zh" aria-pressed="${locale==='zh'}">中文</button></div><fieldset><legend>${e(text('shareIncludeNotes'))}</legend><p>${e(text('shareNotesPrivacy'))}</p>${savedNotes.length ? savedNotes.map(stop=>`<label class="share-note-option"><input type="checkbox" data-share-note="${e(stop.id)}" ${selected.has(stop.id)?'checked':''}><span>${e(byId.get(stop.id).title[locale])}<small>${e(text('shareIncludeNote'))}</small></span></label>`).join('') : `<p>${e(text('shareNoSavedNotes'))}</p>`}</fieldset><h3>${e(text('shareFormatLabel'))}</h3><section class="share-format"><p>${e(text('shareLinkDescription'))}</p><div class="share-buttons"><button type="button" id="share-native" ${!url||!navigator.share?'disabled':''}>${e(text('shareLink'))}</button><button type="button" id="share-copy" ${!url?'disabled':''}>${e(text('shareCopyLink'))}</button></div><input class="share-link-value" id="share-url" type="text" readonly aria-label="${e(text('shareCopyLink'))}" value="${e(url??'')}" ${url?'':'hidden'}></section><section class="share-format"><p>${e(text('shareImageDescription'))}</p><div class="share-buttons"><button type="button" id="share-image" disabled>${e(text('shareImage'))}</button><button type="button" id="share-native-image" hidden>${e(text('shareNativeImage'))}</button></div></section><section class="share-format"><p>${e(text('sharePrintDescription'))}</p>${url?`<a class="share-print" id="share-print" href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(text('sharePrint'))} ↗</a>`:`<button type="button" disabled>${e(text('sharePrint'))}</button>`}</section><p id="share-status" role="status" aria-live="polite">${urlError?e(text(urlError)):''}</p></div><section class="share-preview-wrap" aria-label="${e(text('sharePreviewLabel'))}"><div class="share-preview-label">${e(text('sharePreviewLabel'))}</div><div id="share-preview">${renderRecap(recap,locale)}</div></section></div>`;
    if (activeNote) dialog.querySelector(`[data-share-note="${CSS.escape(activeNote)}"]`)?.focus({preventScroll:true});
    else if (activeLocale) dialog.querySelector(`[data-locale="${activeLocale}"]`)?.focus({preventScroll:true});
    else if (activeId) dialog.querySelector(`#${CSS.escape(activeId)}`)?.focus({preventScroll:true});
    const imageLocale=locale;
    renderRecapImage(recap,locale).then(blob=>{
      if(current!==generation)return;
      imageBlob=blob;dialog.querySelector('#share-image').disabled=false;
      const file=new File([blob],`kyoto-walk-${imageLocale}.png`,{type:'image/png'});
      try { dialog.querySelector('#share-native-image').hidden=!(navigator.share&&navigator.canShare?.({files:[file]})); } catch { /* PNG download remains available. */ }
    }).catch(()=>{if(current===generation)message('shareImageFailed');});
  }
  function close() {
    if(!dialog.open)return;
    ++generation;dialog.close();setPaused(false);onClose?.();opener?.focus({preventScroll:true});
  }
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('change',event=>{
    const id=event.target.dataset.shareNote;if(!id)return;
    if(event.target.checked)selected.add(id);else selected.delete(id);
    refresh();message('shareSelectionChanged');
  });
  dialog.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.locale){event.stopPropagation();onLocale(button.dataset.locale);return;}
    if(button.id==='share-close'){close();return;}
    if(button.id==='share-copy'&&url){
      try { await navigator.clipboard.writeText(url);message('shareLinkCopied'); }
      catch { message('shareLinkUnavailable');const input=dialog.querySelector('#share-url');input.focus();input.select(); }
    }
    if(button.id==='share-native'&&url&&navigator.share){
      try { await navigator.share({title:text('postcardTitle'),text:text('shareSimulatedWalk'),url});message('shareHandedOff'); }
      catch(error) { message(error.name==='AbortError'?'shareCancelled':'shareLinkUnavailable'); }
    }
    if(button.id==='share-image'&&imageBlob){
      try {
        const imageUrl=URL.createObjectURL(imageBlob), a=document.createElement('a');
        a.href=imageUrl;a.download=`kyoto-walk-${locale}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(imageUrl),30000);
      } catch { message('shareImageFailed'); }
    }
    if(button.id==='share-native-image'&&imageBlob&&navigator.share){
      try { await navigator.share({files:[new File([imageBlob],`kyoto-walk-${locale}.png`,{type:'image/png'})],title:text('postcardTitle')});message('shareHandedOff'); }
      catch(error) { message(error.name==='AbortError'?'shareCancelled':'shareImageFailed'); }
    }
  });
  return {
    get open(){return dialog.open;},
    show(){
      if(dialog.open)return;
      snapshot=structuredClone(getSnapshot());snapshot.created=new Date().toISOString().slice(0,10);locale=snapshot.locale;selected=new Set();
      if(!snapshot.state.visitedIds.length)return;
      opener=document.activeElement;setPaused(true);refresh();dialog.showModal();dialog.querySelector('#share-close').focus();
    },
    setLocale(next){locale=next;if(dialog.open)refresh();},
    close,
  };
}
