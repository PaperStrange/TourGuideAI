export function createFrameMeasurement({ install = false } = {}) {
  const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  const drained = queue => queue?.active === 0 && queue?.queued === 0;
  function requiredQuality(stream, lighting, observedMs, frameBefore) {
    if (!stream || stream.disposed || stream.suspended || stream.blocked || !Array.isArray(stream.cells)
      || stream.cells.some(cell => cell.error) || !drained(stream.downloads) || !drained(stream.attachments)
      || lighting?.phase !== 'ready' || lighting.mode !== lighting.requestedMode
      || lighting.pendingRequests !== 0 || lighting.rig?.status !== 'ready' || !hash(lighting.rig.sha256)
      || lighting.environment?.status !== 'ready' || !hash(lighting.environment.sha256)) return null;
    const desired = stream.cells.filter(cell => cell.desired);
    if (!desired.length || desired.some(cell => cell.state !== 'ready' || cell.level !== cell.desired || !hash(cell.sha256))) return null;
    return { observedMs, frameBefore, streamRevision: stream.revision,
      cells: desired.map(cell => ({ id: cell.id, level: cell.level, sha256: cell.sha256 })),
      lighting: { mode: lighting.mode, rigSha256: lighting.rig.sha256, environmentSha256: lighting.environment.sha256 } };
  }
  function capture({ camera, position, frame, drawStartedMs, submittedMs, quality }) {
    if (!Number.isInteger(frame) || frame < 1 || !Number.isFinite(drawStartedMs)
      || !Number.isFinite(submittedMs) || submittedMs < drawStartedMs) throw new Error('Invalid submitted draw boundary');
    return { frame, drawStartedMs, submittedMs,
      camera: { matrixWorld: camera.matrixWorld.toArray(), projectionMatrix: camera.projectionMatrix.toArray() },
      position: { x: position.x, y: position.y, height: position.height ?? 0 }, quality };
  }
  const matrix = value => Array.isArray(value) && value.length === 16 && value.every(Number.isFinite);
  function changed(before, after, kind) {
    if (!before || !after || after.frame <= before.frame
      || !matrix(before.camera?.matrixWorld) || !matrix(after.camera?.matrixWorld)
      || !matrix(before.camera?.projectionMatrix) || !matrix(after.camera?.projectionMatrix)) return false;
    const cameraChanged = ['matrixWorld', 'projectionMatrix'].some(name =>
      after.camera[name].some((value, index) => Math.abs(value - before.camera[name][index]) > .0000001));
    if (kind === 'orbit') return cameraChanged;
    if (kind !== 'walk') throw new Error('Unknown measured input kind');
    return cameraChanged || Math.hypot(after.position.x - before.position.x,
      after.position.y - before.position.y, after.position.height - before.position.height) > .001;
  }
  function fullQuality(frame) {
    const quality = frame?.quality;
    return Boolean(quality && Array.isArray(quality.cells) && quality.cells.length && frame.frame > quality.frameBefore
      && quality.observedMs <= frame.drawStartedMs && frame.drawStartedMs <= frame.submittedMs);
  }
  const api = { requiredQuality, capture, changed, fullQuality };
  if (install) window.__FRAME_MEASUREMENT__ = Object.freeze(api);
  return api;
}
