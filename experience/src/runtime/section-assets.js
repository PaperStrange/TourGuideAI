import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { verifiedBytes } from './pack-assets.js';
import { createTaskQueue } from './section-queue.js';
import { sectionTransport, decodeSectionBytes } from './section-transport.js';

export function createSectionAssets(baseURL, { signal, downloads = 2 } = {}) {
  const queue = createTaskQueue(downloads), resources = new Map(), textures = new Map();
  const bitmapKeys = new WeakMap();
  let disposed = false, loadedBytes = 0, decodedBytes = 0, releasedModels = 0;
  const rootURL = new URL('.', baseURL);
  const resolve = file => {
    const url = new URL(file, rootURL);
    if (url.origin !== rootURL.origin || !url.pathname.startsWith(rootURL.pathname) || url.search || url.hash) {
      throw new Error('Neighborhood dependency is outside its asset directory');
    }
    return url;
  };
  function release(entry) {
    if (--entry.references > 0) return;
    resources.delete(entry.key); entry.controller.abort();
    if (entry.blobURL) URL.revokeObjectURL(entry.blobURL);
    entry.bitmap?.close(); entry.bytes = null;
  }
  function acquire(asset, ownerSignal) {
    const url = resolve(asset.file), key = url.href + ':' + asset.sha256;
    const transport = sectionTransport(asset), transportURL = resolve(transport.file);
    let entry = resources.get(key);
    if (!entry) {
      const controller = new AbortController();
      entry = { key, url, controller, references: 0, bytes: null, bitmap: null, blobURL: null };
      resources.set(key, entry);
      entry.promise = queue.run(async () => {
        const result = await verifiedBytes(transportURL, transport, controller.signal);
        const bytes = await decodeSectionBytes(result.bytes, asset, controller.signal);
        if (disposed || controller.signal.aborted) throw new DOMException('Asset cancelled', 'AbortError');
        entry.bytes = bytes; loadedBytes += result.bytes.byteLength; decodedBytes += bytes.byteLength; return entry;
      }, controller.signal);
    }
    entry.references++;
    let retained = true;
    const drop = () => { if (!retained) return; retained = false; ownerSignal?.removeEventListener('abort', drop); release(entry); };
    ownerSignal?.addEventListener('abort', drop, { once: true });
    if (ownerSignal?.aborted) drop();
    return { entry, release: drop };
  }
  function adoptTextures(root) {
    const owned = new Set();
    root.traverse(mesh => {
      for (const material of [mesh.material].flat().filter(Boolean)) for (const [slot, texture] of Object.entries(material)) {
        if (!texture?.isTexture) continue;
        const imageKey = bitmapKeys.get(texture.image);
        const key = imageKey ? [imageKey, texture.colorSpace, texture.channel, texture.wrapS, texture.wrapT,
          texture.magFilter, texture.minFilter, texture.anisotropy, ...texture.offset, ...texture.repeat,
          texture.rotation, ...texture.center].join(':') : texture.uuid;
        let item = textures.get(key);
        if (!item) { item = { texture, references: 0 }; textures.set(key, item); }
        else if (item.texture !== texture) { material[slot] = item.texture; texture.dispose(); }
        if (!owned.has(key)) { owned.add(key); item.references++; }
      }
    });
    return owned;
  }
  async function download(asset, ownerSignal) {
    signal?.throwIfAborted(); ownerSignal?.throwIfAborted();
    const descriptors = [asset, ...(asset.dependencies ?? [])];
    for (const item of descriptors) { resolve(item.file); resolve(sectionTransport(item).file); }
    const leases = descriptors.map(item => acquire(item, ownerSignal));
    try {
      const entries = await Promise.all(leases.map(lease => lease.entry.promise));
      ownerSignal?.throwIfAborted(); signal?.throwIfAborted();
      return { asset, entries, release() { for (const lease of leases) lease.release(); } };
    } catch (error) { for (const lease of leases) lease.release(); throw error; }
  }
  async function parse(bundle, ownerSignal) {
    ownerSignal?.throwIfAborted(); signal?.throwIfAborted();
    const entries = new Map(bundle.entries.map(entry => [entry.url.href, entry]));
    const main = bundle.entries[0], manager = new THREE.LoadingManager();
    let json;
    if (main.url.pathname.endsWith('.gltf')) {
      json = JSON.parse(new TextDecoder().decode(main.bytes));
      for (const item of [...(json.buffers ?? []), ...(json.images ?? [])]) {
        if (item.uri && !entries.has(new URL(item.uri, main.url).href)) throw new Error('Unverified glTF dependency');
      }
      // 共享图片只解码一次，纹理采样参数仍由 GLTFLoader 处理。
      for (const image of json.images ?? []) {
        if (!image.uri) continue;
        const entry = entries.get(new URL(image.uri, main.url).href);
        if (!entry.bitmap) {
          const bitmap = await createImageBitmap(new Blob([entry.bytes]), {
            imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
          if (disposed || ownerSignal?.aborted || signal?.aborted || !entry.references || resources.get(entry.key) !== entry) {
            bitmap.close(); throw new DOMException('Image decoding cancelled', 'AbortError');
          }
          if (entry.bitmap) bitmap.close();
          else { entry.bitmap = bitmap; bitmapKeys.set(bitmap, entry.key); }
        }
      }
    }
    ownerSignal?.throwIfAborted(); signal?.throwIfAborted();
    manager.setURLModifier(url => {
      if (url.startsWith('blob:')) return url;
      const entry = entries.get(new URL(url, main.url).href);
      if (!entry) throw new Error('Unverified glTF resource');
      entry.blobURL ??= URL.createObjectURL(new Blob([entry.bytes]));
      return entry.blobURL;
    });
    manager.addHandler(/\.(?:png|jpg|jpeg|webp)$/i, {
      isImageBitmapLoader: true,
      load(url, done, progress, failed) {
        const bitmap = entries.get(new URL(url, main.url).href)?.bitmap;
        if (!bitmap) { failed(new Error('Verified image was not decoded')); return; }
        done(bitmap);
      },
    });
    const gltf = await new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder)
      .parseAsync(json ? JSON.stringify(json) : main.bytes, new URL('.', main.url).href);
    const ownedTextures = adoptTextures(gltf.scene);
    let released = false;
    const result = { root: gltf.scene, bytes: bundle.entries.reduce((sum, entry) => sum + (entry.bytes?.byteLength ?? 0), 0),
      sha256: bundle.asset.sha256, release() {
        if (released) return; released = true; releasedModels++;
        const geometries = new Set(), materials = new Set();
        gltf.scene.traverse(object => {
          if (object.geometry) geometries.add(object.geometry);
          for (const material of [object.material].flat().filter(Boolean)) materials.add(material);
        });
        for (const geometry of geometries) geometry.dispose();
        for (const material of materials) material.dispose();
        for (const key of ownedTextures) {
          const entry = textures.get(key);
          if (entry && --entry.references === 0) { entry.texture.dispose(); textures.delete(key); }
        }
        gltf.scene.removeFromParent(); bundle.release();
      } };
    if (ownerSignal?.aborted || signal?.aborted || disposed) {
      result.release(); throw new DOMException('Model cancelled', 'AbortError');
    }
    return result;
  }
  const api = {
    download, parse,
    snapshot() {
      let bytes = 0, textureBytes = 0;
      for (const entry of resources.values()) bytes += entry.bytes?.byteLength ?? 0;
      for (const { texture } of textures.values()) textureBytes += (texture.image?.width ?? 0) * (texture.image?.height ?? 0) * 4 * 4 / 3;
      return { downloads: queue.snapshot(), resourceCount: resources.size, textureCount: textures.size,
        retainedBytes: bytes, estimatedTextureBytes: Math.ceil(textureBytes), loadedBytes, decodedBytes, releasedModels };
    },
    dispose() {
      if (disposed) return; disposed = true; queue.dispose();
      for (const entry of resources.values()) { entry.references = 1; release(entry); }
      for (const item of textures.values()) item.texture.dispose(); textures.clear();
      signal?.removeEventListener('abort', api.dispose);
    },
  };
  signal?.addEventListener('abort', api.dispose, { once: true });
  return api;
}
