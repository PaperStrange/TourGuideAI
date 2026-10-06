const vector = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);

// This describes a rendering study, never a saved journey or walkable geometry.
export function validateManifest(value) {
  if (!value || value.version !== 1 || typeof value.model !== 'string' || !value.model ||
      !Array.isArray(value.views) || !value.views.length || value.views.length > 8) {
    throw new Error('Unsupported rendering study');
  }
  const ids = new Set();
  for (const view of value.views) {
    const camera = view.camera;
    if (typeof view.id !== 'string' || ids.has(view.id) || typeof view.file !== 'string' ||
        typeof view.label?.en !== 'string' || typeof view.label?.zh !== 'string' ||
        !camera || !vector(camera.position) || !vector(camera.target) ||
        !Number.isFinite(camera.fov) || camera.fov <= 5 || camera.fov >= 130 ||
        !Number.isFinite(camera.aspect) || camera.aspect < 0.5 || camera.aspect > 3 ||
        (camera.up !== undefined && (!vector(camera.up) || camera.up.every(n => n === 0))) ||
        camera.position.every((n, index) => n === camera.target[index]) ||
        !Number.isFinite(camera.near ?? 0.15) || (camera.near ?? 0.15) <= 0 ||
        !Number.isFinite(camera.far ?? 260) || (camera.far ?? 260) <= (camera.near ?? 0.15) ||
        !Array.isArray(view.hiddenGroups) || view.hiddenGroups.some(name => typeof name !== 'string')) {
      throw new Error('Invalid rendering viewpoint');
    }
    ids.add(view.id);
  }
  if (value.actor && (typeof value.actor.model !== 'string' || !vector(value.actor.position) ||
      !Number.isFinite(value.actor.rotationY ?? 0))) throw new Error('Invalid study scale figure');
  if (value.fog && (typeof value.fog.color !== 'string' || !Number.isFinite(value.fog.near) ||
      !Number.isFinite(value.fog.far) || value.fog.near < 0 || value.fog.far <= value.fog.near)) {
    throw new Error('Invalid study haze range');
  }
  if (value.renderBounds && (!['minX', 'maxX', 'minY', 'maxY'].every(key => Number.isFinite(value.renderBounds[key])) ||
      value.renderBounds.minX >= value.renderBounds.maxX || value.renderBounds.minY >= value.renderBounds.maxY)) {
    throw new Error('Invalid study source bounds');
  }
  return value;
}

export function localAsset(path, manifestURL, appURL) {
  const url = new URL(path, manifestURL);
  if (url.origin !== appURL.origin || !url.pathname.startsWith(appURL.pathname)) {
    throw new Error('Study assets must belong to this application');
  }
  return url;
}
