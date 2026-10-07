import { PERSPECTIVE_CHAPTER } from '../content/perspectives.js';
import { normalizeMoment } from './state.js';

export const MAX_SHARE_URL_LENGTH = 8192;
const error = code => Object.assign(new Error(code === 'too-long' ? 'Shared moment is too long' : 'Invalid shared moment'), { code });
const encode = value => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
  .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');

export function createShareURL(moment, baseURL, { locale = 'en', includeNote = false } = {}) {
  const safe = normalizeMoment(moment);
  if (!safe) throw error('invalid');
  const payload = { v: 1, chapter: PERSPECTIVE_CHAPTER.id, locale: locale === 'zh' ? 'zh' : 'en',
    momentId: safe.momentId, note: includeNote ? safe.note : '', view: safe.view };
  const url = new URL('./perspective.html', baseURL);
  url.hash = `moment=${encode(payload)}`;
  if (url.href.length > MAX_SHARE_URL_LENGTH) throw error('too-long');
  return url.href;
}

export function readSharedMoment(hash) {
  if (typeof hash !== 'string' || hash.length > MAX_SHARE_URL_LENGTH) throw error(hash?.length > MAX_SHARE_URL_LENGTH ? 'too-long' : 'invalid');
  const token = hash.replace(/^#/, '');
  if (!/^moment=[A-Za-z0-9_-]+$/.test(token)) throw error('invalid');
  try {
    const base = token.slice(7).replaceAll('-', '+').replaceAll('_', '/');
    const bytes = Uint8Array.from(atob(base + '='.repeat((4 - base.length % 4) % 4)), char => char.charCodeAt(0));
    const raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!raw || raw.v !== 1 || raw.chapter !== PERSPECTIVE_CHAPTER.id || !['en', 'zh'].includes(raw.locale)) throw error('invalid');
    const safe = normalizeMoment(raw);
    if (!safe) throw error('invalid');
    return { v: 1, chapter: PERSPECTIVE_CHAPTER.id, locale: raw.locale, ...safe };
  } catch (cause) { throw ['invalid', 'too-long'].includes(cause?.code) ? cause : error('invalid'); }
}
