import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { loadNeighborhoodGeometry } from './helpers/neighborhood-geometry.mjs';
import { installThinSheetMaterials } from '../src/runtime/thin-sheet-material.js';

const base = new URL('../public/assets/neighborhoods/shijo-east/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', base)));
const spec = { version: 1, role: 'nishiki-colored-roof', sourceId: 'osm:way:772134672', sourceIndex: 139,
  pairedVerticalOffsetMetres: .045, diffuseTransmission: .55, transmissionColor: [1, 1, 1] };
const fingerprint = geometry => {
  const hash = createHash('sha256');
  for (const value of [geometry.index, ...Object.values(geometry.attributes)].filter(Boolean)) {
    const array = value.array;
    hash.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
  }
  return hash.digest('hex');
};

async function actualRoof() {
  const descriptor = manifest.cells.find(cell => cell.id === 'cell-e002-n001').near;
  const root = await loadNeighborhoodGeometry(new URL(descriptor.file, base));
  let roof, trim;
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    mesh.userData.featureTable ??= manifest.featureTable;
    if (mesh.userData.occlusionGroup?.startsWith('Canopy_') && ['arcade-red', 'nishiki-ridge-red'].includes(mesh.material.name)) roof = mesh;
    if (!mesh.userData.occlusionGroup && mesh.material.name === 'arcade-red') trim = mesh;
  });
  assert.ok(roof, 'Read the actual Nishiki colored upper and underside faces.');
  // 既有真实屋顶几何用于验证新角色输入；不会写回资源或修改几何数组。
  roof.material = roof.material.clone();
  roof.material.name = 'nishiki-ridge-red';
  roof.material.metalness = 0;
  roof.userData.thinSheet = structuredClone(spec);
  const dispose = () => root.traverse(mesh => { mesh.geometry?.dispose(); mesh.material?.dispose(); });
  return { root, roof, trim, dispose };
}

function shaderFor(material, physical = false) {
  const source = physical ? THREE.ShaderLib.physical : THREE.ShaderLib.standard;
  const shader = { vertexShader: source.vertexShader, fragmentShader: source.fragmentShader,
    uniforms: THREE.UniformsUtils.clone(source.uniforms) };
  material.onBeforeCompile(shader);
  return shader;
}

test('actual roof geometry retains vertical pairing, source identities and ordinary entrance trim', async () => {
  const { root, roof, trim, dispose } = await actualRoof();
  try {
    const before = fingerprint(roof.geometry), trimHook = trim?.material.onBeforeCompile;
    const scene = new THREE.Scene(), sunlight = new THREE.DirectionalLight(0xffffff, 2.8);
    scene.add(root, sunlight);
    const children = [...scene.children], material = roof.material;
    const report = installThinSheetMaterials(root);
    assert.ok(report.some(item => item.sourceIndex === 139 && item.pairedVerticalOffsetMetres === .045));
    assert.equal(fingerprint(roof.geometry), before);
    assert.equal(roof.material, material);
    assert.deepEqual(scene.children, children);
    assert.equal(trim?.material.onBeforeCompile, trimHook);
    assert.equal(material.transparent, false);
    assert.equal(material.transmission ?? 0, 0);
    assert.equal(material.emissive.getHex(), 0);
    assert.equal(report[0].framebufferTransmission, false);
    // 既有屋顶淡出只修改透明度；重复安装保留该状态与已经创建的 uniform。
    const hook = material.onBeforeCompile;
    material.opacity = .35; material.transparent = true;
    installThinSheetMaterials(root);
    assert.equal(material.onBeforeCompile, hook);
    assert.equal(material.opacity, .35);
    let disposals = 0; material.addEventListener('dispose', () => disposals++);
    material.dispose(); assert.equal(disposals, 1);
  } finally { dispose(); }
});

test('actual paired geometry rejects foreign sources, shifted underside and invalid energy inputs', async () => {
  const { root, roof, dispose } = await actualRoof();
  try {
    const source = roof.geometry.getAttribute('_source_index'), oldSource = source.getX(0);
    source.setX(0, 140);
    assert.throws(() => installThinSheetMaterials(root), /another source/);
    source.setX(0, oldSource);
    for (const fraction of [-.01, 1.01, Infinity, NaN]) {
      roof.userData.thinSheet.diffuseTransmission = fraction;
      assert.throws(() => installThinSheetMaterials(root), /energy parameters/);
    }
    roof.userData.thinSheet = { ...structuredClone(spec), transmissionColor: [1, 1.01, 1] };
    assert.throws(() => installThinSheetMaterials(root), /energy parameters/);
    roof.userData.thinSheet = structuredClone(spec);
    roof.material.emissive.r = .000001;
    assert.throws(() => installThinSheetMaterials(root), /opaque nonemissive roof material/);
    roof.material.emissive.r = 0;
    const position = roof.geometry.getAttribute('position'), before = position.getY(0);
    position.setY(0, before + .02);
    assert.throws(() => installThinSheetMaterials(root), /vertical pairing/);
    position.setY(0, before);
    roof.userData.thinSheet.role = 'entrance-trim';
    assert.throws(() => installThinSheetMaterials(root), /source, role/);
    roof.userData.thinSheet = structuredClone(spec); roof.material.side = THREE.BackSide;
    assert.throws(() => installThinSheetMaterials(root), /opaque nonemissive roof material/);
  } finally { dispose(); }
});

test('actual double-sided roof distinguishes outer paired faces from a visible original backface', async () => {
  const { roof, dispose } = await actualRoof();
  try {
    assert.equal(roof.material.side, THREE.DoubleSide);
    const positions = roof.geometry.getAttribute('position'), indices = roof.geometry.index;
    const triangle = new THREE.Triangle(), point = new THREE.Vector3(), normal = new THREE.Vector3();
    let center;
    for (let index = 0; index < indices.count; index += 3) {
      triangle.a.fromBufferAttribute(positions, indices.getX(index)).applyMatrix4(roof.matrixWorld);
      triangle.b.fromBufferAttribute(positions, indices.getX(index + 1)).applyMatrix4(roof.matrixWorld);
      triangle.c.fromBufferAttribute(positions, indices.getX(index + 2)).applyMatrix4(roof.matrixWorld);
      if (triangle.getNormal(normal).y > .1) { center = triangle.getMidpoint(point).clone(); break; }
    }
    assert.ok(center);
    const sample = (height, direction) => {
      const origin = center.clone(); origin.y += height;
      const ray = new THREE.Raycaster(origin, new THREE.Vector3(0, direction, 0), 0, .5);
      const hit = ray.intersectObject(roof, false)[0]; assert.ok(hit);
      const worldNormal = hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(roof.matrixWorld));
      return { point: hit.point, distance: hit.distance, front: worldNormal.dot(ray.ray.direction) < 0 };
    };
    const upper = sample(.1, -1), lower = sample(-.145, 1), backface = sample(-.0225, 1);
    assert.equal(upper.front, true); assert.equal(lower.front, true); assert.equal(backface.front, false);
    assert.ok(Math.abs(upper.point.y - lower.point.y - .045) < .0001);
    assert.ok(backface.point.distanceTo(upper.point) < .0001,
      'A rendered backface receives incoming light at its original outer surface, not at the paired lower surface.');
    assert.ok(Math.abs(backface.distance - .0225) < .0001);
  } finally { dispose(); }
});

test('pinned Three programs keep native lighting and use independent incident-side shadow coordinates', async () => {
  const { root, roof, dispose } = await actualRoof();
  try {
    const nativeChunks = { ...THREE.ShaderChunk };
    installThinSheetMaterials(root);
    for (const physical of [false, true]) {
      const shader = shaderFor(roof.material, physical);
      assert.equal(shader.uniforms.thinSheetSeparation.value, .045);
      assert.equal(shader.uniforms.thinSheetFraction.value, .55);
      assert.deepEqual(shader.uniforms.thinSheetColor.value.toArray(), [1, 1, 1]);
      assert.ok(shader.vertexShader.includes('vec3( 0.0, -sign( thinSheetWorldNormal.y ) * thinSheetSeparation, 0.0 )'));
      assert.ok(shader.fragmentShader.indexOf('thinSheetDirect +=') < shader.fragmentShader.indexOf('getShadow( directionalShadowMap[ i ], directionalLightShadow'));
      assert.ok(shader.fragmentShader.includes('gl_FrontFacing ? vThinSheetIncidentShadow[ i ] : vDirectionalShadowCoord[ i ]'));
      const pointAndSpot = THREE.ShaderChunk.lights_fragment_begin.slice(
        THREE.ShaderChunk.lights_fragment_begin.indexOf('#if ( NUM_POINT_LIGHTS'),
        THREE.ShaderChunk.lights_fragment_begin.indexOf('#if ( NUM_SUN_LIGHTS'));
      assert.ok(shader.fragmentShader.includes(pointAndSpot), 'Native point/spot attenuation, visibility and reflection stay intact.');
      assert.ok(shader.fragmentShader.includes('#include <tonemapping_fragment>'));
      assert.ok(shader.fragmentShader.includes('#include <opaque_fragment>'));
      assert.equal(shader.fragmentShader.includes('#define USE_TRANSMISSION'), false);
      assert.ok(shader.fragmentShader.includes('getIBLIrradiance( -nonPerturbedNormal )'));
      assert.ok(shader.fragmentShader.includes('getHemisphereLightIrradiance( hemisphereLights[ i ], -nonPerturbedNormal )'));
    }
    assert.deepEqual(THREE.ShaderChunk, nativeChunks);
    const invalid = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: '', uniforms: {} };
    assert.throws(() => roof.material.onBeforeCompile(invalid), /pinned Three shader chunks/);
    const clone = roof.material.clone();
    assert.equal(clone.onBeforeCompile, THREE.Material.prototype.onBeforeCompile,
      'Three cloning drops the hook; production installation must follow lighting cloning.');
    clone.dispose();
  } finally { dispose(); }
});
