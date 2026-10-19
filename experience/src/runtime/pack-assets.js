export async function verifiedBytes(url, expected, signal) {
  const response = await fetch(url, { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error('Pack asset unavailable: ' + response.status);
  const bytes = await response.arrayBuffer();
  const sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map(value => value.toString(16).padStart(2, '0')).join('');
  signal?.throwIfAborted();
  if (expected && (sha256 !== expected.sha256 || bytes.byteLength !== expected.bytes)) throw new Error('Pack asset version mismatch');
  return { bytes, sha256 };
}

export async function loadPackManifest(pack, appURL, signal) {
  if (!pack.assets.manifest) return null;
  const url = new URL(pack.assets.manifest, appURL);
  const response = await fetch(url, { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error('Pack manifest unavailable');
  const manifest = await response.json();
  if (manifest.version !== 1 || manifest.id !== pack.id || manifest.revision !== pack.revision) throw new Error('Pack manifest identity mismatch');
  for (const key of ['model', 'lighting', 'materials']) {
    const asset = manifest[key];
    if (!asset || typeof asset.file !== 'string' || !/^[a-f0-9]{64}$/.test(asset.sha256) ||
        !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0) throw new Error('Invalid pack manifest asset');
    const resolved = new URL(asset.file, url);
    if (resolved.origin !== appURL.origin || !resolved.pathname.startsWith(new URL('.', url).pathname) ||
        resolved.search || resolved.hash) throw new Error('Pack asset must remain in its local directory');
  }
  if (new URL(manifest.model.file, url).href !== new URL(pack.assets.scene, appURL).href ||
      new URL(manifest.lighting.file, url).href !== new URL(pack.lighting.rig, appURL).href) throw new Error('Pack manifest paths mismatch');
  const policyAsset = await verifiedBytes(new URL(manifest.materials.file, url), manifest.materials, signal);
  const policy = JSON.parse(new TextDecoder().decode(policyAsset.bytes));
  if (policy.version !== 1 || policy.id !== pack.assets.materialPolicyId || policy.policy !== 'embedded-pbr' ||
      !policy.overrides || Object.keys(policy.overrides).length !== 0) throw new Error('Unsupported pack material policy');
  return manifest;
}
