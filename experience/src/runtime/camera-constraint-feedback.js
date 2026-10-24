const MIN_REQUEST = .01, MAX_STALLED_TURN = .005, MAX_PROGRESS_RATIO = .1;
const turn = value => Math.atan2(Math.sin(value), Math.cos(value));

export function createOrbitGestureMeasurement({ startAzimuth, requestedAzimuth }) {
  let previous = requestedAzimuth, requestedDelta = 0, stableMs = 0, movedSinceFrame = false;
  return {
    observe(azimuth, deltaMs = 0) {
      const change = turn(azimuth - previous);
      previous = azimuth; requestedDelta += change;
      if (Math.abs(change) > 1e-7) { stableMs = 0; movedSinceFrame = true; }
      // 事件同步的零时间观察不能抹去本帧运动；只有完整安静帧才累计稳定时间。
      if (deltaMs > 0) {
        stableMs = movedSinceFrame ? 0 : stableMs + deltaMs;
        movedSinceFrame = false;
      }
      return { startAzimuth, requestedDelta, settled: stableMs >= 100 };
    },
  };
}

export function createCameraConstraintFeedback(onChange = () => {}) {
  let blocked = false, direction = 0, attempts = 0, pending = null, anchor = null;
  const publish = value => { if (blocked !== value) { blocked = value; onChange(value); } };
  function clear() { direction = 0; attempts = 0; pending = null; anchor = null; publish(false); }
  return {
    clear,
    cancelPendingOrbit() { pending = null; },
    isBlocked: () => blocked,
    recordOrbit({ startAzimuth, requestedDelta }) {
      if (!Number.isFinite(startAzimuth) || !Number.isFinite(requestedDelta) || Math.abs(requestedDelta) < MIN_REQUEST) return;
      const nextDirection = Math.sign(requestedDelta);
      if (direction && direction !== nextDirection) clear();
      direction = nextDirection;
      pending = { startAzimuth, requestedDelta };
    },
    observe({ azimuth, active, settling }) {
      if (!Number.isFinite(azimuth)) { clear(); return; }
      if (!pending) {
        if (attempts && (!active || Math.abs(turn(azimuth - anchor)) > MAX_STALLED_TURN)) clear();
        return;
      }
      const actualTurn = Math.abs(turn(azimuth - pending.startAzimuth));
      const allowance = Math.min(MAX_STALLED_TURN, Math.abs(pending.requestedDelta) * MAX_PROGRESS_RATIO);
      // 实际进展会立即撤销提示；受约束且完成收敛的同向尝试才累计。
      if (!active || actualTurn > allowance) { clear(); return; }
      if (settling) return;
      pending = null; anchor = azimuth; attempts++;
      if (attempts >= 3) publish(true);
    },
  };
}
