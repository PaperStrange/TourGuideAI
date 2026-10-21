import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { estimateTextureStorage, estimateRenderTargetStorage, estimateMaterialTextures } from '../src/runtime/texture-memory.js';

test('actual Three texture descriptors account for rectangular mip chains and shared material references', () => {
  const texture = new THREE.DataTexture(new Uint8Array(8 * 4 * 4), 8, 4);
  texture.generateMipmaps = true;
  assert.equal(estimateTextureStorage(texture).estimatedBytes, (32 + 8 + 2 + 1) * 4);
  const root = new THREE.Group(), material = new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture });
  const geometry = new THREE.BoxGeometry(); root.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
  const estimate = estimateMaterialTextures([root]);
  assert.equal(estimate.textures.length, 1); assert.equal(estimate.estimatedBytes, 172); assert.equal(estimate.complete, true);
  texture.dispose(); geometry.dispose(); material.dispose();
});

test('PMREM and PCF target descriptors include actual color and depth storage once allocated', () => {
  const pmrem = new THREE.WebGLRenderTarget(336, 256, { type: THREE.HalfFloatType, format: THREE.RGBAFormat,
    generateMipmaps: false, depthBuffer: false });
  assert.equal(estimateRenderTargetStorage(pmrem, true).estimatedBytes, 336 * 256 * 8);
  assert.equal(estimateRenderTargetStorage(pmrem, false).estimatedBytes, 0);
  const shadow = new THREE.WebGLRenderTarget(1024, 1024);
  shadow.depthTexture = new THREE.DepthTexture(1024, 1024, THREE.UnsignedIntType);
  const estimate = estimateRenderTargetStorage(shadow, true);
  assert.equal(estimate.estimatedBytes, 1024 * 1024 * 8);
  assert.equal(estimate.depthRenderbufferBytes, 0); assert.equal(estimate.depthTexture.mipLevels, 1);
  pmrem.dispose(); shadow.depthTexture.dispose(); shadow.dispose();
});

test('unsupported and multisampled storage stays explicit instead of passing a byte budget', () => {
  const target = new THREE.WebGLRenderTarget(32, 32, { samples: 4 });
  assert.equal(estimateRenderTargetStorage(target, true).estimatedBytes, null);
  const texture = new THREE.Data3DTexture(new Uint8Array(8), 2, 2, 2);
  assert.equal(estimateTextureStorage(texture).estimatedBytes, null);
  target.dispose(); texture.dispose();
});
