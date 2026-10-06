const vector = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const positive = value => Number.isFinite(value) && value >= 0;
const color = value => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
const hash = value => typeof value === 'string' && /^[\da-f]{64}$/i.test(value);
const invalid = () => { throw new Error('Invalid local lighting rig'); };

export function lightingMode(value) { return value === 'night' ? 'night' : 'day'; }

export function validateLightingRig(rig) {
  if (!rig || rig.version !== 1 || !rig.modes?.day || !rig.modes?.night) invalid();
  for (const mode of Object.values(rig.modes)) {
    const e = mode.environment, h = mode.hemisphere, sun = mode.sun;
    if (!e || typeof e.file !== 'string' || !hash(e.sha256) || !positive(e.intensity) || !Number.isFinite(e.rotationY) ||
        !color(mode.backgroundColor) || !positive(mode.exposure) || !h || !color(h.skyColor) || !color(h.groundColor) ||
        !positive(h.intensity) || !sun || !vector(sun.position) || !vector(sun.target) || !color(sun.color) || !positive(sun.intensity) ||
        !Array.isArray(mode.fixtures) || mode.fixtures.length > 16 || !Array.isArray(mode.materials)) invalid();
    if (mode.fog && (!color(mode.fog.color) || !positive(mode.fog.near) || !positive(mode.fog.far) || mode.fog.far <= mode.fog.near)) invalid();
    let shadows = 0;
    const ids = new Set();
    for (const light of [sun, ...mode.fixtures]) {
      if (!vector(light.position) || !color(light.color) || !positive(light.intensity)) invalid();
      if (light !== sun) {
        if (!['spot', 'point'].includes(light.type) || typeof light.id !== 'string' || ids.has(light.id) ||
            !positive(light.distance) || !positive(light.decay)) invalid();
        ids.add(light.id);
        if (light.type === 'spot' && (!vector(light.target) || !Number.isFinite(light.angle) || light.angle <= 0 ||
            light.angle >= Math.PI / 2 || !positive(light.penumbra) || light.penumbra > 1)) invalid();
        if (light.shadow?.enabled && light.type === 'point') invalid();
        if (light.enabled && light.shadow?.enabled) shadows++;
      }
      if (light.shadow?.enabled) {
        const s = light.shadow;
        if (!Number.isInteger(s.mapSize) || s.mapSize < 128 || s.mapSize > 4096 ||
            !Number.isFinite(s.bias) || !positive(s.normalBias) || !positive(s.radius) ||
            !positive(s.near) || s.near === 0 || !positive(s.far) || s.far <= s.near) invalid();
      }
    }
    if (shadows > 4) invalid();
    for (const rule of mode.materials) {
      if (!Array.isArray(rule.match) || rule.match.some(name => typeof name !== 'string') ||
          !color(rule.emissiveColor) || !positive(rule.emissiveIntensity) ||
          (rule.semanticGroups && (!Array.isArray(rule.semanticGroups) || rule.semanticGroups.some(name => typeof name !== 'string')))) invalid();
    }
  }
  return rig;
}

export function localLightingURL(path, base, appURL) {
  const url = new URL(path, base);
  if (url.origin !== appURL.origin || !url.pathname.startsWith(appURL.pathname)) throw new Error('Lighting assets must be local');
  return url;
}
