export class DiscoveryError extends Error {
  constructor(code, message, { status, retryAfterMs } = {}) {
    super(message);
    this.name = 'DiscoveryError';
    this.code = code;
    if (status !== undefined) this.status = status;
    if (retryAfterMs !== undefined) this.retryAfterMs = retryAfterMs;
  }
}

export function retryAfterMilliseconds(value, now = Date.now()) {
  if (!value) return 60_000;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.max(1000, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(1000, date - now) : 60_000;
}

function until(promise, signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

function delay(milliseconds, signal) {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    signal.addEventListener('abort', abort, { once: true });
  });
}

// 同一服务串行读取；限流等待期间只接受用户稍后重新提交。
export function createJSONReader({ intervalMs = 1100, timeoutMs = 20_000, cacheTtlMs = 3_600_000 } = {}) {
  const cache = new Map();
  let queue = Promise.resolve();
  let nextRequestAt = 0;
  let retryAt = 0;

  return async function readJSON(url, { signal: callerSignal, headers = {} } = {}) {
    callerSignal?.throwIfAborted();
    const cached = cache.get(url);
    if (cached && cached.expiresAt > Date.now()) return structuredClone(cached.data);
    const controller = new AbortController();
    const signal = callerSignal ? AbortSignal.any([callerSignal, controller.signal]) : controller.signal;
    const timer = setTimeout(() => controller.abort(new DiscoveryError('TIMEOUT', 'The place provider did not respond in time.')), timeoutMs);
    const task = queue.then(async () => {
      signal.throwIfAborted();
      const queuedCache = cache.get(url);
      if (queuedCache && queuedCache.expiresAt > Date.now()) return structuredClone(queuedCache.data);
      if (retryAt > Date.now()) throw new DiscoveryError('RATE_LIMITED', 'The provider asked us to wait before another request.', { retryAfterMs: retryAt - Date.now() });
      await delay(nextRequestAt - Date.now(), signal);
      signal.throwIfAborted();
      const response = await fetch(url, { signal, headers, credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin' });
      nextRequestAt = Date.now() + intervalMs;
      if (!response.ok) {
        if (response.status === 429 || (response.status === 503 && response.headers.has('Retry-After'))) {
          const retryAfterMs = retryAfterMilliseconds(response.headers.get('Retry-After'));
          retryAt = Date.now() + retryAfterMs;
          throw new DiscoveryError('RATE_LIMITED', 'The provider asked us to wait before another request.', { status: response.status, retryAfterMs });
        }
        throw new DiscoveryError('HTTP_ERROR', `The place provider returned HTTP ${response.status}.`, { status: response.status });
      }
      const data = await response.json();
      signal.throwIfAborted();
      if (data.error) {
        if (['ratelimited', 'maxlag'].includes(data.error.code)) {
          const retryAfterMs = retryAfterMilliseconds(response.headers.get('Retry-After'));
          retryAt = Date.now() + retryAfterMs;
          throw new DiscoveryError('RATE_LIMITED', 'The provider asked us to wait before another request.', { retryAfterMs });
        }
        throw new DiscoveryError('API_ERROR', 'The place provider rejected this query.');
      }
      cache.delete(url);
      cache.set(url, { data, expiresAt: Date.now() + cacheTtlMs });
      if (cache.size > 50) cache.delete(cache.keys().next().value);
      return structuredClone(data);
    });
    // 调用方收到原始错误；队列继续处理后续独立请求。
    queue = task.then(() => undefined, () => undefined);
    try { return await until(task, signal); }
    finally { clearTimeout(timer); }
  };
}
