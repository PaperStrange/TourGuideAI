import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

// 使用记录的相机矩阵对实际解码网格进行离线射线查询，不启动浏览器或 GPU。
let root = path.dirname(fileURLToPath(import.meta.url));
while (!(await fs.stat(path.join(root, 'experience')).catch(() => null))?.isDirectory()) {
  const parent = path.dirname(root); assert.notEqual(parent, root); root = parent;
}
const assetDirectory = path.join(root, 'artifacts/neighborhood-20261023/art/candidate-9-transport');
const evidence = 'experience/evidence/neighborhood-20261023/ci/candidate-9/neighborhood-coverage.json';
const coverage = JSON.parse(await fs.readFile(path.join(root, evidence)));
const manifest = JSON.parse(await fs.readFile(path.join(assetDirectory, 'manifest.json')));
const tools = path.join(root, 'artifacts/neighborhood-20261021/art/tools/node_modules');
const { NodeIO } = await import(pathToFileURL(path.join(tools, '@gltf-transform/core/dist/index.js')));
const { ALL_EXTENSIONS } = await import(pathToFileURL(path.join(tools, '@gltf-transform/extensions/dist/index.js')));
const { MeshoptDecoder } = await import(pathToFileURL(path.join(tools, 'meshoptimizer/index.js')));
const THREE = await import(pathToFileURL(path.join(root, 'experience/node_modules/three/build/three.module.js')));
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const descriptors = ['ground.gltf', 'cells/cell-e006-n001/near.gltf', 'cells/cell-e010-n000/near.gltf'];
const meshes = [];
for (const file of descriptors) {
  const document = await io.read(path.join(assetDirectory, file));
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    for (const primitive of mesh.listPrimitives()) {
      const geometry = new THREE.BufferGeometry();
      const position = primitive.getAttribute('POSITION');
      const sourceName = primitive.listSemantics().find(name => name.toUpperCase() === '_SOURCE_INDEX');
      assert(sourceName);
      geometry.setAttribute('position', new THREE.BufferAttribute(position.getArray(), 3));
      geometry.setIndex(new THREE.BufferAttribute(primitive.getIndices().getArray(), 1));
      const material = primitive.getMaterial();
      const object = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: material.getDoubleSided() ? THREE.DoubleSide : THREE.FrontSide }));
      object.matrixAutoUpdate = false;
      object.matrix.copy(new THREE.Matrix4().fromArray(node.getWorldMatrix())); object.matrixWorld.copy(object.matrix);
      object.userData = { file, node: node.getName(), material: material.getName(), source: primitive.getAttribute(sourceName) };
      meshes.push(object);
    }
  }
}
const requests = [
  { capture: 'tenmangu-purposeful-pan-no-preference-canvas.png',
    samples: [{ id: 'central-corner-wall', x: .05, y: -.3 }, { id: 'left-base-above', x: -.30, y: -.50 },
      { id: 'left-base-below', x: -.30, y: -.57 }, { id: 'right-base-above', x: .45, y: -.30 },
      { id: 'right-base-below', x: .45, y: -.40 }, { id: 'recess-base-above', x: -.7, y: -.25 },
      { id: 'recess-base-below', x: -.7, y: -.32 }] },
  { capture: 'outbound-pontocho-entrance-day.png',
    samples: [{ id: 'angular-road-interior', x: -.2, y: -.4 }, { id: 'paving-above-angular-corner', x: -.48, y: -.06 },
      { id: 'road-below-angular-corner', x: -.48, y: -.12 }, { id: 'paving-near-board', x: -.02, y: .03 },
      { id: 'western-boundary-above', x: -.85, y: -.18 }, { id: 'western-boundary-below', x: -.85, y: -.27 },
      { id: 'east-road-cap-outside', x: .5, y: -.35 }, { id: 'east-road-cap-inside', x: .35, y: -.35 }] },
];
const results = [];
for (const request of requests) {
  const capture = coverage.captures.find(item => item.file.endsWith('/' + request.capture)); assert(capture);
  const camera = new THREE.PerspectiveCamera();
  camera.matrixAutoUpdate = false;
  camera.matrixWorld.fromArray(capture.camera.matrixWorld); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  camera.projectionMatrix.fromArray(capture.camera.projectionMatrix); camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  const samples = request.samples.map(sample => {
    const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(sample.x, sample.y), camera);
    const hits = ray.intersectObjects(meshes, false).slice(0, 5).map(hit => {
      const rawSource = hit.object.userData.source.getScalar(hit.face.a), sourceIndex = Math.round(rawSource);
      assert(Math.abs(sourceIndex - rawSource) <= .001);
      return { distance: hit.distance, point: { x: hit.point.x, y: -hit.point.z, height: hit.point.y },
        file: hit.object.userData.file, node: hit.object.userData.node, material: hit.object.userData.material,
        sourceIndex, source: manifest.featureTable[sourceIndex], triangle: hit.faceIndex };
    });
    return { ...sample, hits };
  });
  results.push({ image: capture.file, imageSha256: capture.sha256, camera: capture.camera, player: capture.player, samples });
}
const output = { scope: 'Offline raycasts using actual captured matrices and decoded candidate9 meshes; sample positions refer to normalized depicted canvas coordinates. No native UI selection is claimed.',
  manifestSha256: sha(await fs.readFile(path.join(assetDirectory, 'manifest.json'))),
  coverage: { file: evidence, sha256: sha(await fs.readFile(path.join(root, evidence))) },
  producerSha256: sha(await fs.readFile(fileURLToPath(import.meta.url))), decodedFiles: descriptors, results };
await fs.writeFile(path.join(root, 'artifacts/neighborhood-20261024/world/boundary-raycasts.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(results.map(item => ({ image: item.image,
  samples: item.samples.map(sample => ({ id: sample.id, firstHit: sample.hits[0] })) })), null, 2));


