import { createTaskQueue } from './section-queue.js';
import { cellsAtPoint, selectSections, STREAM_LIMITS } from './section-residency.js';

export function planSectionLoads(cells, selected, { nearLimit, reservedNear = 0, residentBytes = STREAM_LIMITS.residentBytes }) {
  const assetBytes = asset => asset.bytes + (asset.dependencies ?? []).reduce((sum, entry) => sum + entry.bytes, 0);
  let nearSlots = reservedNear, committedBytes = 0;
  for (const cell of cells.values()) {
    if (cell.residentLevel) committedBytes += assetBytes(cell.definition[cell.residentLevel]);
    if (cell.residentLevel === 'near') nearSlots++;
    if (cell.loading) committedBytes += assetBytes(cell.definition[cell.loading.level]);
  }
  const loads = [];
  for (const item of selected) {
    const cell = cells.get(item.id), level = cell.residentLevel ? item.level : 'base';
    if (cell.loading || cell.residentLevel === level || cell.error?.level === level) continue;
    if (level === 'near' && nearSlots >= nearLimit) continue;
    const bytes = assetBytes(cell.definition[level]);
    if (committedBytes + bytes > residentBytes) continue;
    committedBytes += bytes;
    if (level === 'near') nearSlots++;
    loads.push({ id: item.id, level });
  }
  return loads;
}

export function createSectionStream(manifest, assets, { signal, tier = 'desktop', attach, detach, onChange,
  limits = STREAM_LIMITS } = {}) {
  const cells = new Map(manifest.cells.map(cell => [cell.id, { definition: cell, resident: null,
    residentLevel: null, loading: null, desired: null, error: null, state: 'unloaded' }]));
  const attachments = createTaskQueue(limits.attachments), waiters = new Set();
  const nearReservations = new Set(), nearLimit = tier === 'compact' ? 1 : limits.nearCells;
  let disposed = false, suspended = false, player, pins = [], blocked = null, revision = 0, cancellations = 0;
  function publish() {
    if (blocked?.cellIds.length && blocked.cellIds.every(id => cells.get(id)?.resident)) blocked = null;
    revision++;
    for (const callback of waiters) callback();
    onChange?.();
  }
  function releaseCell(cell) {
    if (!cell.resident) return;
    detach(cell.resident.root, cell.definition); cell.resident.release(); cell.resident = null; cell.residentLevel = null;
  }
  function cancel(cell) {
    if (!cell.loading) return;
    cancellations++; cell.loading.controller.abort(); cell.loading = null;
    cell.state = cell.resident ? 'ready' : 'unloaded';
  }
  function launch(cell, level) {
    const controller = new AbortController(), work = { controller, level };
    // 取消中的解析与附件在完成清理前继续占用 near 名额。
    if (level === 'near') nearReservations.add(work);
    cell.loading = work; cell.state = 'downloading'; cell.error = null;
    const descriptor = cell.definition[level];
    let bundle;
    assets.download(descriptor, controller.signal).then(async value => {
      bundle = value;
      if (disposed || controller.signal.aborted) throw new DOMException('Section cancelled', 'AbortError');
      cell.state = 'queued'; publish();
      return attachments.run(async () => {
        cell.state = 'attaching'; publish();
        let model;
        try {
          model = await assets.parse(bundle, controller.signal);
          bundle = null;
          await attach(model.root, cell.definition, level, controller.signal);
          if (disposed || controller.signal.aborted) throw new DOMException('Section cancelled', 'AbortError');
          releaseCell(cell); cell.resident = model; cell.residentLevel = level;
          nearReservations.delete(work);
        } catch (error) {
          if (model) { detach(model.root, cell.definition); model.release(); }
          throw error;
        }
      }, controller.signal);
    }).then(() => {
      if (cell.loading !== work) return;
      cell.loading = null; cell.state = 'ready'; cell.error = null;
      publish();
    }).catch(error => {
      bundle?.release();
      if (cell.loading !== work) return;
      cell.loading = null;
      if (error?.name === 'AbortError' || disposed) cell.state = cell.resident ? 'ready' : 'unloaded';
      else { cell.state = 'failed'; cell.error = { level, message: error.message }; }
      publish();
    }).finally(() => {
      nearReservations.delete(work);
      reconcile();
    });
  }
  function reconcile() {
    if (disposed || suspended || !player) return;
    let desiredNear = 0;
    const selected = selectSections(manifest.cells, player, { tier, pinnedIds: pins,
      residentIds: [...cells.values()].filter(cell => cell.resident).map(cell => cell.definition.id), limits })
      .map(item => item.level === 'near' && ++desiredNear > nearLimit ? { ...item, level: 'base' } : item);
    const desired = new Map(selected.map(item => [item.id, item]));
    for (const [id, cell] of cells) {
      cell.desired = desired.get(id)?.level ?? null;
      if (!cell.desired) { cancel(cell); releaseCell(cell); cell.state = 'unloaded'; cell.error = null; }
      else if (cell.loading && cell.loading.level !== (cell.residentLevel ? cell.desired : 'base')) cancel(cell);
    }
    for (const load of planSectionLoads(cells, selected, { nearLimit, reservedNear: nearReservations.size,
      residentBytes: limits.residentBytes })) launch(cells.get(load.id), load.level);
  }
  const api = {
    update(value, pinnedIds = []) {
      if (disposed) return;
      player = { ...value }; pins = [...pinnedIds]; reconcile();
    },
    admit(from, next) {
      const required = cellsAtPoint(manifest.cells, next);
      const missing = required.filter(cell => !cells.get(cell.id).resident);
      const nextBlocked = !required.length ? { reason: 'outside-reviewed-sections', cellIds: [] }
        : missing.length ? { reason: missing.some(cell => cells.get(cell.id).error) ? 'section-failed' : 'section-loading',
          cellIds: missing.map(cell => cell.id) } : null;
      if (JSON.stringify(blocked) !== JSON.stringify(nextBlocked)) { blocked = nextBlocked; publish(); }
      return !blocked;
    },
    ensure(value, pinnedIds = [], requestSignal) {
      api.update(value, pinnedIds);
      return new Promise((resolve, reject) => {
        const finish = () => { waiters.delete(check); requestSignal?.removeEventListener('abort', check); };
        const check = () => {
          const required = cellsAtPoint(manifest.cells, value);
          const failure = required.map(cell => cells.get(cell.id)).find(cell => cell.error && !cell.resident);
          if (disposed || signal?.aborted || requestSignal?.aborted || failure || !required.length) {
            finish();
            reject(requestSignal?.reason ?? signal?.reason ?? new Error(failure?.error.message ?? 'Required route section is unavailable'));
          } else if (required.every(cell => cells.get(cell.id).resident)) { finish(); resolve(); }
        };
        requestSignal?.addEventListener('abort', check, { once: true });
        waiters.add(check); check();
      });
    },
    retry() { for (const cell of cells.values()) { cell.error = null; } blocked = null; reconcile(); publish(); },
    setSuspended(value) {
      suspended = Boolean(value);
      if (suspended) for (const cell of cells.values()) cancel(cell);
      else reconcile();
      publish();
    },
    snapshot() {
      return { revision, tier, suspended, disposed, blocked: blocked ? structuredClone(blocked) : null,
        attachments: attachments.snapshot(), ...assets.snapshot(), cancellations,
        nearLimit, nearReservations: nearReservations.size,
        residentCells: [...cells.values()].filter(cell => cell.resident).length,
        cells: [...cells.values()].map(cell => ({ id: cell.definition.id, state: cell.state, level: cell.residentLevel,
          desired: cell.desired, sha256: cell.resident?.sha256 ?? null, error: cell.error ? { ...cell.error } : null })) };
    },
    dispose() {
      if (disposed) return; disposed = true;
      for (const cell of cells.values()) { cancel(cell); releaseCell(cell); }
      attachments.dispose(); publish(); signal?.removeEventListener('abort', api.dispose);
    },
  };
  signal?.addEventListener('abort', api.dispose, { once: true });
  return api;
}
