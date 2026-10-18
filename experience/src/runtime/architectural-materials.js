import { SRGBColorSpace, TextureLoader } from 'three';

const finishes = {
  'pale-stone': { roughness: 0.94, metalness: 0, normalStrength: 0.38, environment: 1 },
  'granite-fascia': { roughness: 0.78, metalness: 0, normalStrength: 0.32, environment: 1.1 },
  'glazing': { roughness: 0.12, metalness: 0, environment: 1.8 },
  'glazing-blinds': { roughness: 0.18, metalness: 0, environment: 1.55 },
  'glass-dark': { roughness: 0.14, metalness: 0, environment: 1.9 },
  'bronze-frame': { roughness: 0.3, metalness: 0.8, environment: 1.2 },
  'metal': { roughness: 0.27, metalness: 0.85, environment: 1.15 },
  'dark-metal': { roughness: 0.34, metalness: 0.75, environment: 1.1 },
  'canopy': { roughness: 0.72, metalness: 0, environment: 0.9 },
};

const mappedFinishes = ['pale-stone', 'granite-fascia', 'glazing', 'glazing-blinds'];

export function validateArchitecturalFinishManifest(value) {
  if (value?.version !== 1 || !Array.isArray(value.maps) || value.maps.length !== mappedFinishes.length) {
    throw new Error('Invalid architectural finish manifest');
  }
  const names = new Set();
  for (const entry of value.maps) {
    if (!mappedFinishes.includes(entry.material) || names.has(entry.material) ||
        !/^[a-z0-9-]+\.png$/.test(entry.file ?? '') || !/^[a-f0-9]{64}$/.test(entry.sha256 ?? '') ||
        !Number.isInteger(entry.bytes) || entry.bytes <= 0 || entry.width !== 512 || entry.height !== 512) {
      throw new Error('Invalid architectural finish entry');
    }
    names.add(entry.material);
  }
  return value;
}

const digest = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
  .map(value => value.toString(16).padStart(2, '0')).join('');

export function disposeArchitecturalFinishTextures(assets) {
  for (const texture of assets?.textures?.values() ?? []) texture.dispose();
}

export async function loadArchitecturalFinishTextures(baseUrl, { signal } = {}) {
  const response = await fetch(new URL('manifest.json', baseUrl), { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error('Could not load architectural finish manifest (' + response.status + ')');
  const manifestBytes = await response.arrayBuffer();
  const manifest = validateArchitecturalFinishManifest(JSON.parse(new TextDecoder().decode(manifestBytes)));
  const loader = new TextureLoader();
  const results = await Promise.allSettled(manifest.maps.map(async entry => {
    const imageResponse = await fetch(new URL(entry.file, baseUrl), { signal, cache: 'no-cache' });
    if (!imageResponse.ok) throw new Error('Could not load architectural finish ' + entry.file + ' (' + imageResponse.status + ')');
    const bytes = await imageResponse.arrayBuffer();
    if (bytes.byteLength !== entry.bytes || await digest(bytes) !== entry.sha256) {
      throw new Error('Architectural finish integrity check failed: ' + entry.file);
    }
    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
    let texture;
    try { texture = await loader.loadAsync(objectUrl); }
    finally { URL.revokeObjectURL(objectUrl); }
    if (texture.image.width !== entry.width || texture.image.height !== entry.height) {
      texture.dispose();
      throw new Error('Architectural finish dimensions changed: ' + entry.file);
    }
    texture.name = entry.material + '-runtime-albedo';
    texture.colorSpace = SRGBColorSpace;
    return [entry.material, texture];
  }));
  const assets = { textures: new Map(results.filter(result => result.status === 'fulfilled').map(result => result.value)),
    manifestHash: await digest(manifestBytes), downloadBytes: manifest.maps.reduce((sum, entry) => sum + entry.bytes, 0) };
  const failure = results.find(result => result.status === 'rejected');
  if (failure || signal?.aborted) {
    disposeArchitecturalFinishTextures(assets);
    throw failure?.reason ?? new DOMException('Architectural finish loading cancelled', 'AbortError');
  }
  return assets;
}

export function prepareArchitecturalMaterials(root, maxAnisotropy, finishAssets) {
  const replacements = new Map(), textures = new Set(), replacedMaps = new Set(), finishMaps = new Map();
  let appliedFinishes = 0;
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const materials = [mesh.material].flat().map(source => {
      if (!replacements.has(source)) {
        const material = source.clone(), finish = finishes[source.name];
        if (finish && material.isMeshStandardMaterial) {
          material.roughness = finish.roughness;
          material.metalness = finish.metalness;
          material.envMapIntensity = finish.environment;
          if (finish.normalStrength !== undefined) material.normalScale.setScalar(finish.normalStrength);
        }
        const template = finishAssets?.textures.get(source.name);
        if (template && source.map) {
          const mapKey = source.map.uuid + ':' + source.name;
          if (!finishMaps.has(mapKey)) {
            const map = template.clone();
            // 保留 glTF 的 UV、采样和方向，颜色图片仅替换表面色彩。
            for (const key of ['wrapS', 'wrapT', 'magFilter', 'minFilter', 'flipY', 'channel', 'rotation', 'matrixAutoUpdate']) {
              map[key] = source.map[key];
            }
            for (const key of ['offset', 'repeat', 'center', 'matrix']) map[key].copy(source.map[key]);
            map.needsUpdate = true;
            finishMaps.set(mapKey, map);
          }
          replacedMaps.add(source.map);
          material.map = finishMaps.get(mapKey);
          appliedFinishes++;
        }
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) {
          const texture = material[key];
          if (texture && !textures.has(texture)) {
            texture.anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
            texture.needsUpdate = true;
            textures.add(texture);
          }
        }
        replacements.set(source, material);
      }
      return replacements.get(source);
    });
    mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
  });
  const retainedTextures = new Set();
  for (const material of replacements.values()) {
    for (const value of Object.values(material)) if (value?.isTexture) retainedTextures.add(value);
  }
  let disposedReplacedMaps = 0;
  for (const map of replacedMaps) if (!retainedTextures.has(map)) { map.dispose(); disposedReplacedMaps++; }
  disposeArchitecturalFinishTextures(finishAssets);
  for (const material of replacements.keys()) material.dispose();
  return { materials: replacements.size, filteredTextures: textures.size, appliedFinishes, disposedReplacedMaps,
    finishTextureCount: finishMaps.size, finishManifestHash: finishAssets?.manifestHash ?? null,
    finishDownloadBytes: finishAssets?.downloadBytes ?? 0 };
}
