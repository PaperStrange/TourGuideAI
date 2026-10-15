import { validateLightingRig } from './lighting-contract.js';

export const KYOTO_ARCHITECTURAL_PROFILE = Object.freeze({
  id: 'kyoto-street-materials-20261015',
  shadowBounds: { minX: -12, maxX: 76, minY: -38, maxY: 30 },
  modes: {
    day: {
      environment: { intensity: 0.78 },
      hemisphere: { intensity: 0.24 },
      sun: {
        position: [-24, 68, 45], target: [30, 0, 5],
        color: '#fff4e5', intensity: 2.55,
        shadow: { bias: -0.00018, normalBias: 0.025, radius: 2.8 },
      },
    },
    night: {
      sun: { shadow: { bias: -0.00018, normalBias: 0.025, radius: 2.8 } },
    },
  },
});

export function applyLightingProfile(rig, profile) {
  if (!profile) return rig;
  const result = structuredClone(rig);
  const bounds = profile.shadowBounds;
  if (bounds) {
    if (!['minX', 'maxX', 'minY', 'maxY'].every(key => Number.isFinite(bounds[key])) ||
        bounds.minX >= bounds.maxX || bounds.minY >= bounds.maxY) throw new Error('Invalid lighting shadow bounds');
    result.renderBounds = { ...bounds };
  }
  for (const [mode, changes] of Object.entries(profile.modes ?? {})) {
    const target = result.modes[mode];
    if (!target) throw new Error('Unknown lighting profile mode');
    for (const key of ['environment', 'hemisphere']) {
      if (changes[key]) target[key] = { ...target[key], ...changes[key] };
    }
    if (changes.sun) target.sun = { ...target.sun, ...changes.sun,
      shadow: { ...target.sun.shadow, ...changes.sun.shadow } };
  }
  return validateLightingRig(result);
}
