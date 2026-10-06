const vector = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const path = value => typeof value === 'string' && value.trim().length > 0;
const hash = value => typeof value === 'string' && /^[a-f\d]{64}$/i.test(value);
const modes = ['day', 'night'];
const exactModes = value => value && !Array.isArray(value) && Object.keys(value).length === 2 && modes.every(mode => Object.hasOwn(value, mode));

function validateLightingStudy(value) {
  if (value.status !== 'complete' || value.views.length !== 3 || !hash(value.modelSha256) ||
      !path(value.lightingRig) || !hash(value.lightingRigSha256) || !modes.includes(value.defaultMode) ||
      !exactModes(value.modes) || !Array.isArray(value.imageSize) || value.imageSize.length !== 2 ||
      !value.imageSize.every(size => Number.isInteger(size) && size > 0)) throw new Error('Incomplete lighting study');
  for (const mode of modes) {
    const config = value.modes[mode], offline = config?.offline;
    if (!hash(config?.environmentSha256) || typeof config.label?.en !== 'string' || typeof config.label?.zh !== 'string' ||
        !offline || !['environmentStrength', 'sunEnergy', 'sunAngularDiameterDegrees', 'exposureStops'].every(key => Number.isFinite(offline[key])) ||
        offline.environmentStrength < 0 || offline.sunEnergy < 0 || offline.sunAngularDiameterDegrees < 0) {
      throw new Error('Invalid offline lighting calibration');
    }
  }
  const denoising = value.denoising;
  if (!denoising || Array.isArray(denoising) || typeof denoising.enabled !== 'boolean' ||
      (denoising.enabled && (!hash(denoising.binarySha256) ||
        !['tool', 'version', 'filter', 'quality', 'input', 'outputTransform'].every(key => path(denoising[key]))))) {
    throw new Error('Invalid study denoising metadata');
  }
}

// This describes a rendering study, never a saved journey or walkable geometry.
export function validateManifest(value) {
  if (!value || ![1, 2].includes(value.version) || !path(value.model) ||
      !Array.isArray(value.views) || !value.views.length || value.views.length > 8) {
    throw new Error('Unsupported rendering study');
  }
  if (value.version === 2) validateLightingStudy(value);
  const ids = new Set(), imageFiles = new Set();
  for (const view of value.views) {
    const camera = view.camera;
    if (typeof view.id !== 'string' || ids.has(view.id) ||
        (value.version === 1 && (!path(view.file) || view.renders !== undefined)) ||
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
    if (value.version === 2) {
      if (!exactModes(view.renders) || Math.abs(camera.aspect - value.imageSize[0] / value.imageSize[1]) > 0.005) {
        throw new Error('Incomplete matched lighting views');
      }
      for (const mode of modes) {
        const render = view.renders[mode];
        if (!render || !path(render.file) || imageFiles.has(render.file) || !hash(render.renderSha256) ||
            !Number.isFinite(render.renderSeconds) || render.renderSeconds < 0) throw new Error('Invalid lighting render');
        imageFiles.add(render.file);
      }
    }
    ids.add(view.id);
  }
  if (value.actor && (!path(value.actor.model) || (value.version === 2 && !hash(value.actor.modelSha256)) || !vector(value.actor.position) ||
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
