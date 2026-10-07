import { MOMENTS, PERSPECTIVE_CHAPTER } from '../content/perspectives.js';
import { normalizePerspectiveView } from '../runtime/view-state.js';

export const STORAGE_KEY = 'tourguideai:perspective:v1';
export const MAX_NOTE_LENGTH = 500;
const ids = new Set(MOMENTS.map(moment => moment.id));
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export const validMomentId = id => ids.has(id);

export function normalizeView(value) {
  if (!object(value)) return null;
  if (value.kind === 'walk') {
    const pose = normalizePerspectiveView(value.pose);
    return pose ? { kind: 'walk', pose } : null;
  }
  if (value.kind === 'story' && ['scale', 'x', 'y'].every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))) {
    return { kind: 'story', scale: Math.max(1, Math.min(2, value.scale)),
      x: Math.max(0, Math.min(1, value.x)), y: Math.max(0, Math.min(1, value.y)) };
  }
  return null;
}

export function normalizeMoment(value) {
  if (!object(value) || !ids.has(value.momentId) || typeof value.note !== 'string' || value.note.length > MAX_NOTE_LENGTH) return null;
  const view = normalizeView(value.view);
  return view ? { momentId: value.momentId, note: value.note, view } : null;
}

export function createRecord({ mode = 'walk', locale = 'en' } = {}) {
  return { version: 1, chapter: PERSPECTIVE_CHAPTER.id, mode: mode === 'story' ? 'story' : 'walk',
    locale: locale === 'zh' ? 'zh' : 'en', index: 0, revealedIds: [], moments: [],
    trial: { assignment: mode === 'story' ? 'story' : 'walk', source: 'random', crossover: false }, feedback: null };
}

export function normalizeRecord(raw) {
  if (!object(raw) || raw.version !== 1 || raw.chapter !== PERSPECTIVE_CHAPTER.id) return null;
  const record = createRecord(raw);
  record.index = Number.isInteger(raw.index) ? Math.max(0, Math.min(MOMENTS.length - 1, raw.index)) : 0;
  record.revealedIds = Array.isArray(raw.revealedIds) ? [...new Set(raw.revealedIds.filter(id => ids.has(id)))] : [];
  const moments = new Map();
  for (const input of Array.isArray(raw.moments) ? raw.moments.slice(0, 20) : []) {
    const moment = normalizeMoment(input);
    if (moment) moments.set(moment.momentId, moment);
  }
  record.moments = [...moments.values()].slice(0, MOMENTS.length);
  if (object(raw.trial)) record.trial = {
    assignment: raw.trial.assignment === 'story' ? 'story' : 'walk',
    source: ['random', 'link', 'choice'].includes(raw.trial.source) ? raw.trial.source : 'choice',
    crossover: raw.trial.crossover === true,
  };
  if (object(raw.feedback) && Number.isInteger(raw.feedback.score) && raw.feedback.score >= 1 && raw.feedback.score <= 5) {
    record.feedback = { score: raw.feedback.score,
      note: typeof raw.feedback.note === 'string' ? raw.feedback.note.slice(0, MAX_NOTE_LENGTH) : '',
      mode: raw.feedback.mode === 'story' ? 'story' : 'walk' };
  }
  return record;
}

export function readRecord(storage) {
  try { return normalizeRecord(JSON.parse(storage.getItem(STORAGE_KEY))); } catch { return null; }
}
export function writeRecord(storage, record) {
  const normalized = normalizeRecord(record);
  if (!normalized) return false;
  try { storage.setItem(STORAGE_KEY, JSON.stringify(normalized)); return true; } catch { return false; }
}
export function saveMoment(record, input) {
  const normalized = normalizeRecord(record), moment = normalizeMoment(input);
  if (!normalized || !moment) throw new Error('Invalid personal moment');
  normalized.moments = normalized.moments.filter(item => item.momentId !== moment.momentId);
  normalized.moments.push(moment);
  return normalized;
}
export function removeMoment(record, id) {
  const normalized = normalizeRecord(record);
  if (!normalized) throw new Error('Invalid perspective record');
  normalized.moments = normalized.moments.filter(item => item.momentId !== id);
  return normalized;
}

export function feedbackReport(record) {
  const value = normalizeRecord(record);
  if (!value || !value.feedback) return null;
  return { version: 1, experiment: 'borrow-eyes-formative-1', chapter: value.chapter,
    locale: value.locale, trial: value.trial, viewedMoments: value.revealedIds,
    savedMomentCount: value.moments.length, feedback: value.feedback,
    notice: 'One local self-report. Not a controlled study result. Personal saved notes and camera positions are excluded.' };
}
