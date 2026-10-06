import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateLightingRig, localLightingURL } from '../src/runtime/lighting-contract.js';

const authored = JSON.parse(readFileSync(new URL('../public/lighting/rig.json', import.meta.url)));

test('the authored rig is valid, but malformed HDR identities and invalid intensities are rejected', () => {
  assert.equal(validateLightingRig(authored), authored);
  for (const change of [
    mode => { mode.environment.sha256 = 'not-a-file-hash'; },
    mode => { mode.environment.intensity = -1; },
    mode => { mode.exposure = Infinity; },
    mode => { mode.fixtures[0].intensity = NaN; },
    mode => { mode.materials[0].emissiveIntensity = -1; },
  ]) {
    const rig = structuredClone(authored); change(rig.modes.night);
    assert.throws(() => validateLightingRig(rig), /Invalid local lighting rig/);
  }
});

test('authored local shadow limits reject an extra shadow caster or a shadowed point light', () => {
  const extra = structuredClone(authored);
  const template = extra.modes.night.fixtures.find(light => light.enabled && light.shadow?.enabled);
  const shadowed = extra.modes.night.fixtures.filter(light => light.enabled && light.shadow?.enabled).length;
  for (let i = shadowed; i <= 4; i++) extra.modes.night.fixtures.push({ ...structuredClone(template), id: `extra-shadow-${i}` });
  assert.throws(() => validateLightingRig(extra), /Invalid local lighting rig/);
  const point = structuredClone(authored);
  point.modes.night.fixtures.find(light => light.shadow?.enabled).type = 'point';
  assert.throws(() => validateLightingRig(point), /Invalid local lighting rig/);
});

test('environment URLs stay inside the packaged application even on a Pages subdirectory', () => {
  const app = new URL('https://example.test/TourGuideAI/');
  const base = new URL('lighting/rig.json', app);
  assert.equal(localLightingURL('environments/night-1k.hdr', base, app).href,
    'https://example.test/TourGuideAI/lighting/environments/night-1k.hdr');
  for (const value of ['https://elsewhere.test/night.hdr', '//elsewhere.test/night.hdr',
    '/other-project/night.hdr', '../../night.hdr', 'data:application/octet-stream;base64,AAAA']) {
    assert.throws(() => localLightingURL(value, base, app), /Lighting assets must be local/, value);
  }
});
