export function sectionTransport(asset) {
  if (!asset.transport) return asset;
  const transport = asset.transport;
  if (transport.encoding !== 'gzip' || typeof transport.file !== 'string'
    || !Number.isSafeInteger(transport.bytes) || transport.bytes <= 0
    || !/^[a-f0-9]{64}$/.test(transport.sha256)) throw new Error('Invalid section transport');
  return transport;
}

export async function decodeSectionBytes(bytes, asset, signal) {
  if (!asset.transport) return bytes;
  sectionTransport(asset);
  if (!Number.isSafeInteger(asset.bytes) || asset.bytes <= 0
    || !/^[a-f0-9]{64}$/.test(asset.sha256)) throw new Error('Invalid decoded section identity');
  signal?.throwIfAborted();
  // 解压容量按已声明的资源长度限制，下载校验与解压后校验分别执行。
  const decoded = new Uint8Array(asset.bytes);
  let offset = 0;
  await new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).pipeTo(new WritableStream({
    write(chunk) {
      if (offset + chunk.byteLength > decoded.byteLength) throw new Error('Decoded section exceeds its declared size');
      decoded.set(chunk, offset); offset += chunk.byteLength;
    },
  }), { signal });
  signal?.throwIfAborted();
  if (offset !== asset.bytes) throw new Error('Decoded section size mismatch');
  const sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', decoded))]
    .map(value => value.toString(16).padStart(2, '0')).join('');
  signal?.throwIfAborted();
  if (sha256 !== asset.sha256) throw new Error('Decoded section version mismatch');
  return decoded.buffer;
}
