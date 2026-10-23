import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// CPU 几何验证读取原始 buffer、变换与材质朝向；不解码图片或证明外观质量。
export async function loadNeighborhoodGeometry(assetURL) {
  const json = JSON.parse(await readFile(assetURL, 'utf8'));
  const previousCache = THREE.Cache.enabled, cached = [];
  THREE.Cache.enabled = true;
  try {
    for (const buffer of json.buffers ?? []) {
      if (!buffer.uri) continue;
      const url = new URL(buffer.uri, assetURL), bytes = await readFile(url);
      const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const key = 'file:' + url.href;
      THREE.Cache.add(key, data); cached.push(key);
    }
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    loader.register(parser => ({
      name: 'GeometryAuditMaterials',
      loadMaterial(index) {
        const value = parser.json.materials[index], base = value.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1];
        return Promise.resolve(new THREE.MeshStandardMaterial({ name: value.name ?? '',
          color: new THREE.Color().setRGB(...base.slice(0, 3)), opacity: base[3],
          transparent: value.alphaMode === 'BLEND', side: value.doubleSided ? THREE.DoubleSide : THREE.FrontSide }));
      },
    }));
    const result = await loader.parseAsync(JSON.stringify(json), new URL('.', assetURL).href);
    result.scene.updateMatrixWorld(true);
    return result.scene;
  } finally {
    for (const key of cached) THREE.Cache.remove(key);
    THREE.Cache.enabled = previousCache;
  }
}
