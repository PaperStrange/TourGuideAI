import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest } from '../src/comparison/manifest.js';

const hash = 'a'.repeat(64);
const study = () => ({
  version: 2, status: 'complete', model: '../models/street.glb', modelSha256: hash,
  lightingRig: '../lighting/rig.json', lightingRigSha256: hash, defaultMode: 'day', imageSize: [1200, 750],
  denoising: { enabled: false },
  modes: Object.fromEntries(['day', 'night'].map(mode => [mode, {
    label: { en: mode, zh: mode === 'day' ? '日光' : '夜晚' }, environmentSha256: hash,
    offline: { environmentStrength: .4, sunEnergy: 1, sunAngularDiameterDegrees: 3, exposureStops: 0 },
  }])),
  views: ['crossing', 'north', 'south'].map(id => ({
    id, label: { en: id, zh: id }, hiddenGroups: [],
    camera: { position: [20, 8, 9], target: [25, 2, 0], fov: 55, aspect: 1.6 },
    renders: Object.fromEntries(['day', 'night'].map(mode => [mode, {
      file: `${id}-${mode}.png`, renderSha256: hash, renderSeconds: 1,
    }])),
  })),
});

test('a complete six-image v2 lighting study is accepted without rewriting its camera or provenance', () => {
  const value = study(), before = structuredClone(value);
  assert.equal(validateManifest(value), value);
  assert.deepEqual(value, before);
});

test('partial, missing-mode, duplicate-image and mismatched-aspect studies cannot appear complete', () => {
  for (const change of [
    value => { value.status = 'rendering'; },
    value => { value.views.pop(); },
    value => { delete value.views[0].renders.night; },
    value => { value.views[1].renders.night.file = value.views[0].renders.night.file; },
    value => { value.views[0].renders.day.renderSha256 = 'not-a-hash'; },
    value => { value.views[0].renders.day.renderSeconds = -1; },
    value => { value.views[0].camera.aspect = 1.8; },
  ]) {
    const value = study(); change(value); assert.throws(() => validateManifest(value));
  }
});

test('v2 lighting and denoising provenance requires valid identities and finite calibration', () => {
  for (const change of [
    value => { value.lightingRigSha256 = 'missing'; },
    value => { value.modelSha256 = 'missing'; },
    value => { value.modes.night.environmentSha256 = 'missing'; },
    value => { value.modes.night.offline.exposureStops = Infinity; },
    value => { delete value.denoising; },
    value => { value.denoising = { enabled: true }; },
  ]) {
    const value = study(); change(value); assert.throws(() => validateManifest(value));
  }
});

test('legacy v1 remains explicitly day-only and cannot silently masquerade as six paired renders', () => {
  const value = study(), view = { ...value.views[0], file: 'original-day.png' };
  delete view.renders;
  const legacy = { version: 1, model: value.model, views: [view] };
  assert.equal(validateManifest(legacy), legacy);
  assert.throws(() => validateManifest({ ...legacy, views: [{ ...view, renders: value.views[0].renders }] }));
  assert.throws(() => validateManifest({ ...value, version: 99 }));
});
