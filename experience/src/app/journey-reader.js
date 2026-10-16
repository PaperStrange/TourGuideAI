import './recap.css';
import { decodeRecap, renderRecap, escapeHtml } from './share.js';
import { t } from '../ui/i18n.js';

const root = document.querySelector('#journey-reader');
const requestedLocale = new URLSearchParams(location.search).get('lang');
let recap, locale = 'en', errorKey;
try { recap = decodeRecap(location.hash); locale = recap.lang; }
catch (error) { errorKey = error.code || 'shareInvalid'; }
if (['en', 'zh'].includes(requestedLocale)) locale = requestedLocale;

function render() {
  const text = key => escapeHtml(t(locale,key));
  document.documentElement.lang = locale;
  document.title = `${t(locale,'postcardTitle')} · TourGuideAI`;
  root.innerHTML = `<nav class="reader-actions"><a id="journey-home-link" href="./index.html?lang=${locale}">${text('homeLink')}</a><a id="journey-walk-link" href="./walk.html?lang=${locale}">${text('shareBack')}</a><div role="group" aria-label="${text('languageLabel')}"><button type="button" data-recap-locale="en" aria-pressed="${locale==='en'}">EN</button><button type="button" data-recap-locale="zh" aria-pressed="${locale==='zh'}">中文</button></div>${recap ? `<button id="recap-print" type="button">${text('sharePrintAction')}</button>` : ''}</nav>${recap ? `<p class="reader-notice">${text('shareReadOnly')}</p><div id="recap-content">${renderRecap(recap,locale)}</div>` : `<p id="recap-error" role="alert">${text(errorKey)}</p>`}`;
}
root.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button?.dataset.recapLocale) {
    locale=button.dataset.recapLocale;
    const url=new URL(location.href);
    url.searchParams.set('lang',locale);
    history.replaceState(null,'',url);
    render();root.querySelector(`[data-recap-locale="${locale}"]`).focus();
  }
  if (button?.id === 'recap-print') window.print();
});
window.addEventListener('hashchange', () => {
  try { recap=decodeRecap(location.hash); locale=recap.lang; errorKey=null; }
  catch (error) { recap=null; errorKey=error.code || 'shareInvalid'; }
  const nextLocale=new URLSearchParams(location.search).get('lang');
  if (['en','zh'].includes(nextLocale)) locale=nextLocale;
  render();
});
let closedDetails=[];
window.addEventListener('beforeprint',()=>{
  closedDetails=[...root.querySelectorAll('details:not([open])')];
  closedDetails.forEach(details=>{details.open=true;});
});
window.addEventListener('afterprint',()=>{closedDetails.forEach(details=>{details.open=false;});closedDetails=[];});
render();
