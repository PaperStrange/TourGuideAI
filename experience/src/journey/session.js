export const JOURNEY_STORAGE_KEY = 'tourguideai.journey.session.v1';
export const MAX_JOURNEY_SIGHTS = 8;

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 160 && /^[a-zA-Z0-9:_.-]+$/.test(value);

function required(condition, message) {
  if (!condition) throw new TypeError(message);
}

function identifiers(value, maximum, label, allowEmpty = true) {
  required(Array.isArray(value) && value.length <= maximum && (allowEmpty || value.length > 0), `Invalid ${label}`);
  required(value.every(identifier) && new Set(value).size === value.length, `Invalid ${label}`);
  return [...value];
}

function timestamp(value = Date.now()) {
  const date = new Date(value);
  required(Number.isFinite(date.getTime()), 'Invalid journey timestamp');
  return date.toISOString();
}

function storedTimestamp(value) {
  required(typeof value === 'string' && value.length <= 40 && timestamp(value) === value, 'Invalid stored journey timestamp');
  return value;
}

function normalizeView(value) {
  if (value === null) return null;
  required(object(value) && value.version === 3 && identifier(value.packId)
    && Number.isSafeInteger(value.revision) && value.revision >= 1, 'Invalid journey view identity');
  required(object(value.player) && ['x', 'y'].every(key => finite(value.player[key]) && Math.abs(value.player[key]) <= 1e7), 'Invalid journey position');
  const camera = value.camera;
  required(object(camera) && ['azimuth', 'polar', 'distance'].every(key => finite(camera[key]) && Math.abs(camera[key]) <= 1e7)
    && camera.distance > 0 && object(camera.targetOffset)
    && ['x', 'y', 'height'].every(key => finite(camera.targetOffset[key]) && Math.abs(camera.targetOffset[key]) <= 1e7), 'Invalid journey camera');
  const player = { x: value.player.x, y: value.player.y };
  if (value.player.height !== undefined) {
    required(finite(value.player.height) && Math.abs(value.player.height) <= 1e7, 'Invalid journey ground height');
    player.height = value.player.height;
  }
  if (value.player.edgeId !== undefined) {
    required(identifier(value.player.edgeId), 'Invalid journey edge identity');
    player.edgeId = value.player.edgeId;
  }
  if (value.player.edgeDistance !== undefined) {
    required(identifier(value.player.edgeId) && finite(value.player.edgeDistance)
      && value.player.edgeDistance >= 0 && value.player.edgeDistance <= 1e7, 'Invalid journey edge distance');
    player.edgeDistance = value.player.edgeDistance;
  }
  return { version: 3, packId: value.packId, revision: value.revision, player,
    camera: { azimuth: camera.azimuth, polar: camera.polar, distance: camera.distance,
      targetOffset: { x: camera.targetOffset.x, y: camera.targetOffset.y, height: camera.targetOffset.height } } };
}

export function normalizeJourneySession(value) {
  required(object(value) && value.version === 1, 'Unsupported journey session version');
  required(identifier(value.routeId) && Number.isSafeInteger(value.revision) && value.revision >= 1
    && identifier(value.startNodeId) && identifier(value.variantId), 'Invalid selected journey identity');
  const stopIds = identifiers(value.stopIds, MAX_JOURNEY_SIGHTS, 'journey sights', false);
  const interests = identifiers(value.interests, 12, 'journey interests');
  const mustSeeIds = identifiers(value.mustSeeIds, MAX_JOURNEY_SIGHTS, 'must-see sights');
  required(mustSeeIds.every(id => stopIds.includes(id)), 'The selected journey omits a must-see sight');
  required(object(value.progress) && ['day', 'night'].includes(value.progress.lighting), 'Invalid journey progress');
  const focusedSightId = value.progress.focusedSightId;
  required(focusedSightId === null || stopIds.includes(focusedSightId), 'Invalid focused journey sight');
  const createdAt = storedTimestamp(value.createdAt), updatedAt = storedTimestamp(value.updatedAt);
  required(Date.parse(updatedAt) >= Date.parse(createdAt), 'Journey update precedes its creation');
  // 仅保存选定行程与私人视角；房间凭证、来源正文和其他笔记不进入本记录。
  return { version: 1, routeId: value.routeId, revision: value.revision, startNodeId: value.startNodeId,
    variantId: value.variantId, stopIds, interests, mustSeeIds,
    progress: { view: normalizeView(value.progress.view), lighting: value.progress.lighting, focusedSightId },
    createdAt, updatedAt };
}

function selection(plan) {
  required(object(plan), 'A selected journey is required');
  return { routeId: plan.routeId, revision: plan.revision, startNodeId: plan.startNodeId,
    variantId: plan.variantId, stopIds: plan.stopIds, interests: plan.interests ?? [], mustSeeIds: plan.mustSeeIds ?? [] };
}

export function createJourneySession(plan, { now = Date.now(), view = null, lighting = 'day' } = {}) {
  const date = timestamp(now);
  return normalizeJourneySession({ version: 1, ...selection(plan),
    progress: { view, lighting, focusedSightId: null }, createdAt: date, updatedAt: date });
}

export function selectJourneyRoute(session, plan, { now = Date.now() } = {}) {
  const current = normalizeJourneySession(session), selected = selection(plan);
  if (current.routeId !== selected.routeId || current.revision !== selected.revision) return createJourneySession(plan, { now });
  const focusedSightId = selected.stopIds?.includes(current.progress.focusedSightId) ? current.progress.focusedSightId : null;
  return normalizeJourneySession({ ...current, ...selected,
    progress: { ...current.progress, focusedSightId }, updatedAt: timestamp(now) });
}

export function updateJourneyProgress(session, patch, { now = Date.now() } = {}) {
  const current = normalizeJourneySession(session);
  required(object(patch), 'Journey progress must be an object');
  const progress = { ...current.progress };
  for (const key of ['view', 'lighting', 'focusedSightId']) {
    if (Object.hasOwn(patch, key)) progress[key] = patch[key];
  }
  return normalizeJourneySession({ ...current, progress, updatedAt: timestamp(now) });
}

export function isJourneySessionAvailable(session, definition) {
  const value = normalizeJourneySession(session);
  return value.routeId === definition?.routeId && value.revision === definition?.revision;
}

export function readJourneySession(storage) {
  const raw = storage.getItem(JOURNEY_STORAGE_KEY);
  if (raw === null) return null;
  required(typeof raw === 'string' && raw.length <= 65536, 'Invalid journey storage');
  return normalizeJourneySession(JSON.parse(raw));
}

export function writeJourneySession(storage, session) {
  const value = normalizeJourneySession(session);
  storage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(value));
  return value;
}

export function clearJourneySession(storage) {
  storage.removeItem(JOURNEY_STORAGE_KEY);
}
