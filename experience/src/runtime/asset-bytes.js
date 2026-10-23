const rejectedVersions = new Set();

export async function readAssetBytes(url, expected, signal, messages = {}) {
  signal?.throwIfAborted();
  const requestURL = new URL(url);
  if (expected != null) {
    if (typeof expected.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(expected.sha256) ||
        (expected.bytes !== undefined && (!Number.isSafeInteger(expected.bytes) || expected.bytes < 0))) {
      throw new Error('Invalid expected asset identity');
    }
    // 缓存键包含已审核的版本；可变清单与没有哈希的资源仍须重新验证。
    requestURL.searchParams.set('sha256', expected.sha256);
  }
  const key = requestURL.href, versioned = expected != null;
  const response = await fetch(requestURL, { signal,
    cache: versioned ? (rejectedVersions.has(key) ? 'reload' : 'default') : 'no-cache' });
  if (!response.ok) {
    // HTTP 错误响应也可能被缓存，明确重试时必须重新请求。
    if (versioned) rejectedVersions.add(key);
    throw new Error(messages.unavailable ?? 'Pack asset unavailable: ' + response.status);
  }
  const bytes = await response.arrayBuffer();
  const sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map(value => value.toString(16).padStart(2, '0')).join('');
  signal?.throwIfAborted();
  if (versioned && (sha256 !== expected.sha256 ||
      (expected.bytes !== undefined && bytes.byteLength !== expected.bytes))) {
    // 校验失败立即报错；下一次明确重试重新下载，不能再次采用错误缓存。
    rejectedVersions.add(key);
    throw new Error(messages.mismatch ?? 'Pack asset version mismatch');
  }
  rejectedVersions.delete(key);
  return { bytes, sha256 };
}
