import * as THREE from 'three';

const channelCounts = new Map([[THREE.RGBAFormat, 4], [THREE.RGBAIntegerFormat, 4],
  [THREE.RGBFormat, 3], [THREE.RGFormat, 2], [THREE.RGIntegerFormat, 2],
  [THREE.RedFormat, 1], [THREE.RedIntegerFormat, 1], [THREE.DepthFormat, 1]]);
const channelBytes = new Map([[THREE.UnsignedByteType, 1], [THREE.ByteType, 1],
  [THREE.UnsignedShortType, 2], [THREE.ShortType, 2], [THREE.HalfFloatType, 2],
  [THREE.UnsignedIntType, 4], [THREE.IntType, 4], [THREE.FloatType, 4]]);

export function estimateTextureStorage(texture) {
  const image = Array.isArray(texture.image) ? texture.image[0] : texture.image;
  const width = image?.width, height = image?.height;
  const faces = texture.isCubeTexture ? 6 : 1;
  const packed = texture.type === THREE.UnsignedInt248Type ? 4 : null;
  const bytesPerPixel = packed ?? (channelCounts.get(texture.format) * channelBytes.get(texture.type));
  const unsupported = !Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0
    || !Number.isFinite(bytesPerPixel) || texture.isCompressedTexture || texture.isData3DTexture || texture.isDataArrayTexture;
  const details = { uuid: texture.uuid, width: width ?? null, height: height ?? null, faces,
    type: texture.type, format: texture.format, internalFormat: texture.internalFormat,
    generateMipmaps: texture.generateMipmaps, estimatedBytes: null, mipLevels: null };
  if (unsupported) return { ...details, limitation: 'Unsupported texture dimensions, format or storage type' };
  let levels;
  if (texture.mipmaps?.length) levels = texture.mipmaps;
  else {
    levels = [{ width, height }];
    if (texture.generateMipmaps) {
      let w = width, h = height;
      while (w > 1 || h > 1) { w = Math.max(1, Math.floor(w / 2)); h = Math.max(1, Math.floor(h / 2)); levels.push({ width: w, height: h }); }
    }
  }
  if (levels.some(level => !Number.isFinite(level.width) || !Number.isFinite(level.height))) {
    return { ...details, limitation: 'Explicit mip dimensions are unavailable' };
  }
  return { ...details, mipLevels: levels.length, bytesPerPixel,
    estimatedBytes: levels.reduce((sum, level) => sum + level.width * level.height * bytesPerPixel * faces, 0) };
}

export function estimateRenderTargetStorage(target, allocated) {
  const color = target.textures.map(estimateTextureStorage);
  const depthTexture = target.depthTexture ? estimateTextureStorage(target.depthTexture) : null;
  const faces = target.isWebGLCubeRenderTarget ? 6 : 1;
  const depthRenderbufferBytes = target.depthBuffer && !target.depthTexture ? target.width * target.height * faces * 4 : 0;
  const supported = color.every(item => item.estimatedBytes !== null) && (!depthTexture || depthTexture.estimatedBytes !== null)
    && target.samples === 0;
  const estimatedBytes = supported ? color.reduce((sum, item) => sum + item.estimatedBytes, 0)
    + (depthTexture?.estimatedBytes ?? 0) + depthRenderbufferBytes : null;
  return { width: target.width, height: target.height, faces, samples: target.samples,
    allocated: Boolean(allocated), color, depthTexture, depthBuffer: target.depthBuffer, stencilBuffer: target.stencilBuffer,
    depthRenderbufferBytes, estimatedBytes: allocated ? estimatedBytes : 0,
    ...(!supported ? { limitation: 'Multisampled or unsupported target storage is not estimated' } : {}),
    depthAssumption: 'Depth24/uint and depth renderbuffers use a conservative 4 bytes per pixel; driver padding is excluded' };
}

export function estimateMaterialTextures(roots) {
  const textures = new Set();
  for (const root of roots) root.traverse(mesh => {
    for (const material of [mesh.material].flat().filter(Boolean)) {
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  const entries = [...textures].map(estimateTextureStorage);
  return { textures: entries, estimatedBytes: entries.reduce((sum, entry) => sum + (entry.estimatedBytes ?? 0), 0),
    complete: entries.every(entry => entry.estimatedBytes !== null) };
}
