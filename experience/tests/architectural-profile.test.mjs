import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { applyLightingProfile, KYOTO_ARCHITECTURAL_PROFILE } from '../src/runtime/architectural-profile.js';
import { prepareArchitecturalMaterials } from '../src/runtime/architectural-materials.js';

const authored = JSON.parse(readFileSync(new URL('../public/lighting/rig.json', import.meta.url)));

test('runtime profile preserves packaged study lighting and all night fixtures', () => {
  const original = structuredClone(authored);
  const runtime = applyLightingProfile(authored, KYOTO_ARCHITECTURAL_PROFILE);
  assert.deepEqual(authored, original);
  assert.equal(applyLightingProfile(authored), authored);
  for (const mode of ['day', 'night']) {
    assert.deepEqual(runtime.modes[mode].fixtures, authored.modes[mode].fixtures);
    assert.deepEqual(runtime.modes[mode].materials, authored.modes[mode].materials);
    assert.equal(runtime.modes[mode].environment.sha256, authored.modes[mode].environment.sha256);
  }
  assert.throws(() => applyLightingProfile(authored, { shadowBounds: { minX: 5, maxX: 2, minY: 0, maxY: 4 } }));
  assert.throws(() => applyLightingProfile(authored, { modes: { day: { sun: { intensity: NaN } } } }));
});

test('facade materials preserve maps, metadata, opacity and shared-material identity', () => {
  const map = new THREE.Texture();
  const source = new THREE.MeshStandardMaterial({ name: 'glazing', map, roughness: 0.17,
    transparent: false, opacity: 1 });
  source.userData = { authored: true };
  const root = new THREE.Group(), geometry = new THREE.PlaneGeometry();
  const first = new THREE.Mesh(geometry, source), second = new THREE.Mesh(geometry, source);
  first.userData.semanticGroup = 'NorthGround'; root.add(first, second);
  prepareArchitecturalMaterials(root, 4);
  assert.equal(first.material, second.material);
  assert.notEqual(first.material, source);
  assert.equal(first.material.map, map);
  assert.equal(map.anisotropy, 4);
  assert.deepEqual(first.material.userData, { authored: true });
  assert.equal(first.userData.semanticGroup, 'NorthGround');
  assert.equal(first.material.transparent, false);
  assert.equal(first.material.opacity, 1);
  assert.equal(source.roughness, 0.17);
  assert.equal(first.material.metalness, 0);
  first.material.dispose(); map.dispose(); geometry.dispose();
});
