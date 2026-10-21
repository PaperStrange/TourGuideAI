export function clearMovementState(state, { preserveDestination = false } = {}) {
  state.moving = false;
  if (!preserveDestination) { state.destination = null; state.waypoints = []; }
}

export function getRouteProgress(state) {
  const points = state.destination ? [state.destination, ...state.waypoints] : [];
  let previous = state, remainingDistanceMeters = 0;
  for (const point of points) {
    remainingDistanceMeters += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return { goal: points.length ? { ...points.at(-1) } : null,
    remainingDistanceMeters, paused: Boolean(state.paused) };
}
