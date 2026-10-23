// SPDX-License-Identifier: GPL-3.0-or-later
// 成熟 glTF 工具负责编码和验证；坐标、来源索引和有向三角形逐项比较。
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { gzipSync, gunzipSync } from 'node:zlib';

const options = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (index % 2 === 0) pairs.push([value.replace(/^--/, ''), values[index + 1]]);
  return pairs;
}, []));
for (const key of ['input', 'output', 'tools', 'report']) if (!options[key]) throw new Error(`Missing --${key}`);
const sourceDir = path.resolve(options.input), targetDir = path.resolve(options.output);
const retainedTextureSize = Number(options['retained-texture-size'] ?? 0);
if (![0, 256].includes(retainedTextureSize)) throw new Error('Reviewed retained texture sizes are original or256px');
const packageModule = name => import(pathToFileURL(path.resolve(options.tools, 'node_modules', name)).href);
const { NodeIO } = await packageModule('@gltf-transform/core/dist/index.js');
const { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization, EXTTextureWebP } = await packageModule('@gltf-transform/extensions/dist/index.js');
const { quantize, weld, reorder } = await packageModule('@gltf-transform/functions/dist/index.js');
const { MeshoptEncoder, MeshoptDecoder } = await packageModule('meshoptimizer/index.js');
const { default: validator } = await packageModule('gltf-validator/index.js');
const requireTool = createRequire(path.resolve(options.tools, 'package.json'));
const sharp = requireTool('sharp');
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const readJSON = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const writeJSON = async (file, value) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n'); };
const fileRecord = async relative => {
  const bytes = await fs.readFile(path.resolve(targetDir, relative));
  return { file: relative, bytes: bytes.length, sha256: sha(bytes) };
};

async function validate(file) {
  const bytes = await fs.readFile(file);
  const result = await validator.validateBytes(new Uint8Array(bytes), {
    uri: path.basename(file), maxIssues: 100,
    externalResourceFunction: async uri => new Uint8Array(await fs.readFile(path.resolve(path.dirname(file), decodeURIComponent(uri)))),
  });
  if (result.issues.numErrors) throw new Error(`${file}: ${JSON.stringify(result.issues)}`);
  return result.issues;
}

function exactAttributes(before, after) {
  const first = before.getRoot().listMeshes(), second = after.getRoot().listMeshes();
  if (first.length !== second.length) throw new Error('Mesh count changed');
  let vertices = 0, primitives = 0, attributes = 0, cyclicallyRotatedTriangles = 0, maximumNormalComponentError = 0, maximumPositionErrorMetres = 0;
  first.forEach((mesh, meshIndex) => {
    const a = mesh.listPrimitives(), b = second[meshIndex].listPrimitives();
    if (a.length !== b.length) throw new Error('Primitive count changed');
    a.forEach((primitive, primitiveIndex) => {
      const next = b[primitiveIndex];
      const semantics = primitive.listSemantics();
      if (JSON.stringify([...semantics].sort()) !== JSON.stringify(next.listSemantics().sort())) throw new Error('Attribute semantics changed');
      for (const semantic of [...semantics, 'indices']) {
        const av = semantic === 'indices' ? primitive.getIndices()?.getArray() : primitive.getAttribute(semantic).getArray();
        const bv = semantic === 'indices' ? next.getIndices()?.getArray() : next.getAttribute(semantic).getArray();
        if (!av || !bv || av.length !== bv.length) throw new Error('Accessor layout changed: ' + semantic);
        if (semantic === 'indices') {
          if (av.length % 3) throw new Error('Expected triangle indices');
          for (let index = 0; index < av.length; index += 3) {
            const offset = [0, 1, 2].find(shift => [0, 1, 2].every(corner => av[index + corner] === bv[index + (corner + shift) % 3]));
            if (offset === undefined) throw new Error('Decoded oriented triangle changed');
            if (offset) cyclicallyRotatedTriangles++;
          }
        } else if (semantic === 'POSITION') {
          const aAccessor = primitive.getAttribute(semantic), bAccessor = next.getAttribute(semantic);
          const aNodes = before.getRoot().listNodes().filter(node => node.getMesh() === mesh);
          const bNodes = after.getRoot().listNodes().filter(node => node.getMesh() === second[meshIndex]);
          if (aNodes.length !== bNodes.length) throw new Error('Mesh instance count changed');
          const aElement = [], bElement = [];
          const transform = (point, matrix) => [0, 1, 2].map(axis => matrix[axis] * point[0] + matrix[axis + 4] * point[1] + matrix[axis + 8] * point[2] + matrix[axis + 12]);
          aNodes.forEach((node, instanceIndex) => {
            const aMatrix = node.getWorldMatrix(), bMatrix = bNodes[instanceIndex].getWorldMatrix();
            for (let index = 0; index < aAccessor.getCount(); index++) {
              const aPoint = transform(aAccessor.getElement(index, aElement), aMatrix);
              const bPoint = transform(bAccessor.getElement(index, bElement), bMatrix);
              maximumPositionErrorMetres = Math.max(maximumPositionErrorMetres, Math.hypot(...aPoint.map((value, axis) => value - bPoint[axis])));
            }
          });
          if (maximumPositionErrorMetres > .005) throw new Error('Position quantization exceeds5mm world-space error');
        } else if (semantic === 'NORMAL' || semantic === 'TANGENT') {
          const aAccessor = primitive.getAttribute(semantic), bAccessor = next.getAttribute(semantic);
          const aElement = [], bElement = [];
          for (let index = 0; index < aAccessor.getCount(); index++) {
            aAccessor.getElement(index, aElement); bAccessor.getElement(index, bElement);
            for (let component = 0; component < aAccessor.getElementSize(); component++) {
              maximumNormalComponentError = Math.max(maximumNormalComponentError, Math.abs(aElement[component] - bElement[component]));
            }
          }
          if (maximumNormalComponentError > .00008) throw new Error('Normal quantization exceeds the measured precision limit');
        } else {
          for (let index = 0; index < av.length; index++) if (av[index] !== bv[index]) throw new Error('Decoded accessor changed: ' + semantic);
        }
        attributes++;
      }
      vertices += primitive.getAttribute('POSITION').getCount();
      primitives++;
    });
  });
  const aNodes = before.getRoot().listNodes(), bNodes = after.getRoot().listNodes();
  if (aNodes.length !== bNodes.length) throw new Error('Node count changed');
  aNodes.forEach((node, index) => {
    if (JSON.stringify(node.getExtras()) !== JSON.stringify(bNodes[index].getExtras())) throw new Error('Node metadata changed');
  });
  return { vertices, primitives, attributes, cyclicallyRotatedTriangles, orientedTrianglesExact: true, maximumPositionErrorMetres, maximumUVError: 0,
    maximumNormalComponentError, sourceIndicesExact: true, nodeExtrasExact: true, worldTransformsIncludedInErrorMeasurement: true };
}

function orientedAttributeProof(document) {
  // 顶点复用与排序后，逐三角形比较完整属性和绕序；节点变换与来源信息同时保留。
  return {
    meshes: document.getRoot().listMeshes().map(mesh => mesh.listPrimitives().map(primitive => {
      const semantics = primitive.listSemantics().sort();
      const vertices = Array.from({ length: primitive.getAttribute('POSITION').getCount() }, (_, index) =>
        JSON.stringify(semantics.map(semantic => [semantic, primitive.getAttribute(semantic).getElement(index, [])])));
      const indices = primitive.getIndices().getArray(), triangles = [];
      for (let index = 0; index < indices.length; index += 3) {
        const points = [vertices[indices[index]], vertices[indices[index + 1]], vertices[indices[index + 2]]];
        triangles.push([0, 1, 2].map(start => [0, 1, 2].map(offset => points[(start + offset) % 3]).join('|')).sort()[0]);
      }
      return { triangles: indices.length / 3, sha256: sha(triangles.sort().join('\n')) };
    })),
    nodes: document.getRoot().listNodes().map(node => ({ extras: node.getExtras(), matrix: node.getWorldMatrix() })),
  };
}

async function gzipTransport(record) {
  const decoded = await fs.readFile(path.join(targetDir, record.file));
  const encoded = gzipSync(decoded, { level: 9 });
  if (!gunzipSync(encoded).equals(decoded)) throw new Error('Gzip transport changed decoded bytes');
  const file = record.file + '.gz';
  await fs.writeFile(path.join(targetDir, file), encoded);
  record.transport = { ...(await fileRecord(file)), encoding: 'gzip' };
}

await fs.mkdir(targetDir, { recursive: true });
await fs.cp(path.join(sourceDir, 'shared'), path.join(targetDir, 'shared'), { recursive: true });
const manifest = await readJSON(path.join(sourceDir, 'manifest.json'));
const descriptors = [manifest.ground, manifest.context, ...manifest.cells.flatMap(cell => [cell.base, cell.near])].filter(Boolean);
const report = { producerSha256: sha(await fs.readFile(new URL(import.meta.url))),
  inputManifestSha256: sha(await fs.readFile(path.join(sourceDir, 'manifest.json'))),
  toolVersions: { gltfTransform: '4.5.1', meshoptimizer: '1.3.0', validator: '2.0.0-dev.3.10', sharp: (await readJSON(path.resolve(options.tools, 'node_modules/sharp/package.json'))).version },
  method: 'EXT_meshopt_compression; over-budget source sections use16-bit normal/tangent quantization; position/UV/source indices exact; deferred bridge uses bitwise vertex welding, size reorder and verified gzip transport; decoded geometry/memory accounting retained', assets: [], textures: [] };
const textureCache = new Map();
for (const descriptor of descriptors) {
  const input = path.join(sourceDir, descriptor.file), output = path.join(targetDir, descriptor.file);
  const inputIssues = await validate(input);
  const before = await io.read(input);
  const document = await io.read(input);
  for (const texture of document.getRoot().listTextures()) {
    const sourceImage = Buffer.from(texture.getImage()), imageHash = sha(sourceImage);
    if (!textureCache.has(imageHash)) {
      const resize = retainedTextureSize && texture.getURI().includes('retained-');
      const sampledImage = resize ? await sharp(sourceImage).resize({ width: retainedTextureSize, height: retainedTextureSize, fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' }).png().toBuffer() : sourceImage;
      const outputImage = await sharp(sampledImage).webp({ lossless: true, effort: 6 }).toBuffer();
      const sourcePixels = await sharp(sampledImage).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const outputPixels = await sharp(outputImage).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      if (!sourcePixels.data.equals(outputPixels.data) || JSON.stringify(sourcePixels.info) !== JSON.stringify(outputPixels.info)) throw new Error('Lossless texture conversion changed decoded pixels');
      textureCache.set(imageHash, outputImage);
      report.textures.push({ sourceSha256: imageHash, outputSha256: sha(outputImage), sourceBytes: sourceImage.length,
        outputBytes: outputImage.length, ...outputPixels.info, decodedRGBA8PixelsExactToSampledInput: true,
        sampling: resize ? 'Lanczos3 maximum256px, route-only derivative of original authored texture' : 'Original dimensions and pixels' });
    }
    texture.setImage(textureCache.get(imageHash)).setMimeType('image/webp').setURI(texture.getURI().replace(/\.[^.\/]+$/, '.webp'));
  }
  if (document.getRoot().listTextures().length) document.createExtension(EXTTextureWebP).setRequired(true);
  if (descriptor.uncompressedBudgetExceeded) {
    await document.transform(quantize({ pattern: /^(NORMAL|TANGENT)$/, quantizeNormal: 16, cleanup: true }));
    document.createExtension(KHRMeshQuantization).setRequired(true);
  }
  const deferredRiver = Boolean(manifest.cells.find(cell => cell.id === 'cell-e010-n000'
    && [cell.base.file, cell.near.file].includes(descriptor.file))
    && document.getRoot().listNodes().some(node => node.getExtras().riverContext));
  let preparedProof = null, preparedComparison = null;
  if (deferredRiver) {
    preparedComparison = exactAttributes(before, document);
    preparedProof = orientedAttributeProof(document);
    await document.transform(weld(), reorder({ encoder: MeshoptEncoder, target: 'size' }));
  }
  document.createExtension(EXTMeshoptCompression).setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  await fs.mkdir(path.dirname(output), { recursive: true });
  await io.write(output, document);
  await fs.writeFile(output, JSON.stringify(await readJSON(output)) + '\n');
  const decoded = await io.read(output);
  let comparison;
  if (deferredRiver) {
    const decodedProof = orientedAttributeProof(decoded);
    if (JSON.stringify(preparedProof) !== JSON.stringify(decodedProof)) throw new Error('Deferred river oriented attributes or metadata changed');
    comparison = { ...preparedComparison, exactOrientedAttributeProof: true,
      orientedAttributeProofSha256: sha(JSON.stringify(decodedProof)),
      encodedVertices: decoded.getRoot().listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives()
        .reduce((count, primitive) => count + primitive.getAttribute('POSITION').getCount(), 0), 0),
      vertexReuse: 'Bitwise identical attributes only; source indices and oriented triangles retained' };
  } else comparison = exactAttributes(before, decoded);
  const outputIssues = await validate(output);
  const jsonDocument = await io.readAsJSON(output);
  const resources = Object.keys(jsonDocument.resources).filter(uri => !uri.startsWith('@'));
  descriptor.dependencies = await Promise.all(resources.map(uri => fileRecord(path.relative(targetDir, path.resolve(path.dirname(output), uri)).split(path.sep).join('/'))));
  Object.assign(descriptor, await fileRecord(descriptor.file));
  descriptor.geometryBytes = descriptor.bytes + descriptor.dependencies.filter(item => item.file.endsWith('.bin')).reduce((sum, item) => sum + item.bytes, 0);
  if (deferredRiver) {
    await gzipTransport(descriptor);
    for (const dependency of descriptor.dependencies.filter(item => item.file.endsWith('.bin'))) await gzipTransport(dependency);
    descriptor.transferGeometryBytes = descriptor.transport.bytes + descriptor.dependencies.filter(item => item.file.endsWith('.bin'))
      .reduce((sum, item) => sum + item.transport.bytes, 0);
  }
  descriptor.uncompressedBudgetExceeded = false;
  descriptor.compression = 'EXT_meshopt_compression';
  const transferGeometryBytes = descriptor.transferGeometryBytes ?? descriptor.geometryBytes;
  if (transferGeometryBytes > descriptor.transferBudgetBytes) {
    if (descriptor.file !== 'cells/cell-e000-n000/near.gltf' || transferGeometryBytes > 3.5 * 1024 * 1024) {
      throw new Error(`Compressed section remains over budget: ${descriptor.file} ${descriptor.geometryBytes}`);
    }
    descriptor.budgetException = 'Retained previously reviewed landmark NEAR geometry, permitted up to3.5MiB; base and ordinary sections retain2MiB limit; startup transfer and visual review remain separate gates';
  }
  report.assets.push({ file: descriptor.file, inputIssues, outputIssues, ...comparison, compressedGeometryBytes: descriptor.geometryBytes,
    transferGeometryBytes, gzipTransportDecodedBytesExact: deferredRiver });
  console.log(`${descriptor.file}: ${descriptor.geometryBytes}B decoded container, ${transferGeometryBytes}B transfer, geometry/source identity validated`);
}
for (const item of [manifest.lighting, manifest.provenance]) {
  await fs.copyFile(path.join(sourceDir, item.file), path.join(targetDir, item.file));
  Object.assign(item, await fileRecord(item.file));
}
for (const name of ['source-ledger.json', 'source-review.json', 'references.json']) await fs.copyFile(path.join(sourceDir, name), path.join(targetDir, name));
const provenance = await readJSON(path.join(sourceDir, manifest.provenance.file));
if (provenance.riverContext) {
  const record = provenance.riverContext.input;
  const bytes = await fs.readFile(path.join(sourceDir, record.file));
  if (sha(bytes) !== record.sha256 || bytes.length !== record.bytes) throw new Error('River context provenance input changed');
  await fs.writeFile(path.join(targetDir, record.file), bytes);
}
const sharedFiles = [...new Set(descriptors.flatMap(item => item.dependencies.map(resource => resource.file)).filter(file => file.includes('shared/')))];
manifest.sharedResources = await Promise.all(sharedFiles.map(fileRecord));
const featureMetadata = manifest.featureTable;
manifest.featureTable = Object.fromEntries(Object.entries(featureMetadata).map(([index, entry]) => {
  const featureIds = (entry.featureIds ?? []).filter(id => id !== entry.sourceId);
  return [index, { sourceId: entry.sourceId, ...(featureIds.length ? { featureIds } : {}), surfaceId: entry.surfaceId }];
}));
for (const cell of manifest.cells) delete cell.featureTable;
await writeJSON(path.join(targetDir, 'feature-provenance.json'), featureMetadata);
for (const file of await fs.readdir(path.join(targetDir, 'shared/materials'))) {
  const relative = 'shared/materials/' + file;
  if (!sharedFiles.includes(relative)) await fs.unlink(path.join(targetDir, relative));
}
manifest.encoding = { extension: 'EXT_meshopt_compression', quantization: '16-bit normal/tangent only for over-budget source sections',
  decodedPositionErrorMetres: Math.max(...report.assets.map(asset => asset.maximumPositionErrorMetres)),
  decodedSourceIndicesExact: true, report: path.relative(targetDir, path.resolve(options.report)).split(path.sep).join('/') };
await fs.writeFile(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest) + '\n');
report.outputManifestSha256 = sha(await fs.readFile(path.join(targetDir, 'manifest.json')));
await writeJSON(options.report, report);
