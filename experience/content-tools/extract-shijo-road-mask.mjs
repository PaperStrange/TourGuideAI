import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { Matrix4, Vector3 } from 'three';
import { WORLD } from '../src/content/kyoto.js';

const args = Object.fromEntries(process.argv.slice(2).reduce((items, value, index, values) => {
  if (index % 2 === 0) items.push([value.replace(/^--/, ''), values[index + 1]]);
  return items;
}, []));
for (const key of ['model', 'tools', 'output']) if (!args[key]) throw new Error(`Missing --${key}`);
const { NodeIO } = await import(pathToFileURL(resolve(args.tools, 'node_modules/@gltf-transform/core/dist/index.js')).href);
const document = await new NodeIO().read(resolve(args.model));
const names = ['WalkableRoad', 'WalkableWesternIntersection'];
const meshes = [];
const nodes = document.getRoot().listNodes().filter(node => node.getMesh());
for (const name of names) if (nodes.filter(node => node.getName().replace(/\.\d+$/, '') === name).length !== 1) throw new Error(`Expected one reviewed roadway mesh: ${name}`);
const selected = nodes.filter(node => names.includes(node.getName().replace(/\.\d+$/, '')) || /^Walkable(Context|North|South)Sidewalk/.test(node.getName()));
for (const node of selected) {
  const name = node.getName(), matrix = new Matrix4().fromArray(node.getWorldMatrix());
  const triangles = [];
  for (const primitive of node.getMesh().listPrimitives()) {
    if (primitive.getMode() !== 4 || !primitive.getIndices()) throw new Error('Reviewed road must use indexed triangles');
    const accessor = primitive.getAttribute('POSITION');
    const positions = Array.from({ length: accessor.getCount() }, (_, index) => new Vector3().fromArray(accessor.getElement(index, [])).applyMatrix4(matrix));
    const top = Math.max(...positions.map(point => point.y));
    const indices = primitive.getIndices().getArray();
    for (let index = 0; index < indices.length; index += 3) {
      const corners = [indices[index], indices[index + 1], indices[index + 2]].map(vertex => positions[vertex]);
      // glTF 的垂直轴为 Y；输出使用既有 east/north 平面。
      if (corners.every(point => Math.abs(point.y - top) <= 1e-6)) triangles.push(corners.map(point => [point.x, -point.z]));
    }
  }
  if (!triangles.length) throw new Error(`No top triangles in ${name}`);
  meshes.push({ name, kind: names.includes(name.replace(/\.\d+$/, '')) ? 'road' : 'sidewalk', triangles });
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const worldFile = new URL('../src/content/kyoto.js', import.meta.url);
const output = { schemaVersion: 1, id: 'authored:retained-shijo-roadway',
  model: { file: args.model, sha256: sha(await readFile(args.model)) },
  world: { file: 'experience/src/content/kyoto.js', sha256: sha(await readFile(worldFile)), bounds: WORLD.bounds, roadSurface: WORLD.roadSurface },
  extractorSha256: sha(await readFile(new URL(import.meta.url))),
  meaning: 'Original reviewed authored road display mask; bounded to its original 64 m scene. Does not establish measured curb width or new navigation.',
  meshes };
await mkdir(dirname(resolve(args.output)), { recursive: true });
await writeFile(args.output, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ file: args.output, meshes: meshes.map(mesh => ({ name: mesh.name, triangles: mesh.triangles.length })) }));
