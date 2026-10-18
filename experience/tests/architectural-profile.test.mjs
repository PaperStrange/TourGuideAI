import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { applyLightingProfile, KYOTO_ARCHITECTURAL_PROFILE } from '../src/runtime/architectural-profile.js';
import { prepareArchitecturalMaterials, validateArchitecturalFinishManifest } from '../src/runtime/architectural-materials.js';

const authored = JSON.parse(readFileSync(new URL('../public/lighting/rig.json', import.meta.url)));

test('runtime profile preserves study bytes and calibrates only named canopy fixtures', () => {
  const original = structuredClone(authored);
  const runtime = applyLightingProfile(authored, KYOTO_ARCHITECTURAL_PROFILE);
  assert.deepEqual(authored, original);
  assert.equal(applyLightingProfile(authored), authored);
  for (const mode of ['day', 'night']) {
    const expectedPatches = KYOTO_ARCHITECTURAL_PROFILE.modes[mode].fixtures ?? {};
    for (const fixture of runtime.modes[mode].fixtures) {
      const originalFixture = authored.modes[mode].fixtures.find(item => item.id === fixture.id);
      assert.deepEqual(fixture, { ...originalFixture, ...expectedPatches[fixture.id] });
      assert.deepEqual(fixture.shadow, originalFixture.shadow);
    }
    assert.deepEqual(runtime.modes[mode].materials, authored.modes[mode].materials);
    assert.equal(runtime.modes[mode].environment.sha256, authored.modes[mode].environment.sha256);
  }
  assert.throws(() => applyLightingProfile(authored, { shadowBounds: { minX: 5, maxX: 2, minY: 0, maxY: 4 } }));
  assert.throws(() => applyLightingProfile(authored, { modes: { day: { sun: { intensity: NaN } } } }));
  assert.throws(() => applyLightingProfile(authored, { modes: { night: { fixtures: { absent: { intensity: 1 } } } } }));
  assert.throws(() => applyLightingProfile(authored, { modes: { night: { fixtures: { 'north-crossing': { angle: NaN } } } } }));
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

test('runtime finish replacement preserves UVs and releases only unused source maps', () => {
  const originalMap = new THREE.Texture(), roughnessMap = new THREE.Texture();
  originalMap.flipY = false; originalMap.repeat.set(2, 3); originalMap.offset.set(0.2, 0.1);
  const source = new THREE.MeshStandardMaterial({ name: 'pale-stone', map: originalMap, roughnessMap });
  const template = new THREE.Texture(), root = new THREE.Group(), geometry = new THREE.PlaneGeometry();
  const first = new THREE.Mesh(geometry, source), second = new THREE.Mesh(geometry, source);
  root.add(first, second);
  let oldDisposals = 0, templateDisposals = 0, roughnessDisposals = 0;
  originalMap.addEventListener('dispose', () => oldDisposals++);
  template.addEventListener('dispose', () => templateDisposals++);
  roughnessMap.addEventListener('dispose', () => roughnessDisposals++);
  const result = prepareArchitecturalMaterials(root, 4, { textures: new Map([['pale-stone', template]]),
    manifestHash: 'a'.repeat(64), downloadBytes: 120 });
  assert.equal(first.material, second.material);
  assert.notEqual(first.material.map, originalMap);
  assert.notEqual(first.material.map, template);
  assert.deepEqual(first.material.map.repeat.toArray(), [2, 3]);
  assert.deepEqual(first.material.map.offset.toArray(), [0.2, 0.1]);
  assert.equal(first.material.map.flipY, false);
  assert.equal(first.material.roughnessMap, roughnessMap);
  assert.equal(oldDisposals, 1);
  assert.equal(templateDisposals, 1);
  assert.equal(roughnessDisposals, 0);
  assert.equal(result.finishTextureCount, 1);
  assert.equal(result.disposedReplacedMaps, 1);
  first.material.map.dispose(); first.material.dispose(); roughnessMap.dispose(); geometry.dispose();
});

test('generated finish manifest requires complete local named albedo images', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/materials/architectural/manifest.json', import.meta.url)));
  assert.equal(validateArchitecturalFinishManifest(manifest), manifest);
  const missing = structuredClone(manifest); missing.maps.pop();
  assert.throws(() => validateArchitecturalFinishManifest(missing));
  const remote = structuredClone(manifest); remote.maps[0].file = 'https://example.org/stone.png';
  assert.throws(() => validateArchitecturalFinishManifest(remote));
  const duplicate = structuredClone(manifest); duplicate.maps[1] = duplicate.maps[0];
  assert.throws(() => validateArchitecturalFinishManifest(duplicate));
});
