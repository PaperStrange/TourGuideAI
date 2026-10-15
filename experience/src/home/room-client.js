import { createParser } from 'eventsource-parser';

export class RoomClientError extends Error {
  constructor(message, { status = 0, code = 'room_service_error', room = null } = {}) {
    super(message);
    this.name = 'RoomClientError';
    this.status = status;
    this.code = code;
    this.room = room;
  }
}

function roomPath(session) {
  if (!session || typeof session.roomId !== 'string' || !session.roomId
    || typeof session.inviteToken !== 'string' || !session.inviteToken) {
    throw new TypeError('A room ID and invitation token are required.');
  }
  return `/api/rooms/${encodeURIComponent(session.roomId)}`;
}

function headersFor(session, participant = false) {
  const headers = { Accept: 'application/json' };
  if (session) {
    roomPath(session);
    headers.Authorization = `Bearer ${session.inviteToken}`;
  }
  if (participant) {
    if (typeof session.participantId !== 'string' || !session.participantId
      || typeof session.participantToken !== 'string' || !session.participantToken) {
      throw new TypeError('Participant credentials are required for this action.');
    }
    headers['X-Participant-Token'] = session.participantToken;
  }
  return headers;
}

async function responseJSON(response) {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new RoomClientError('The journey service did not return a valid response.', {
      status: response.status,
      code: response.ok ? 'invalid_response' : 'service_unavailable',
    });
  }
  const result = await response.json();
  if (!response.ok) {
    throw new RoomClientError(result.error?.message || 'The journey request failed.', {
      status: response.status,
      code: result.error?.code || 'room_service_error',
      room: result.room || null,
    });
  }
  return result;
}

export function createRoomClient({
  baseURL = '', fetchImpl = globalThis.fetch, reconnectDelayMs = 2000,
  transport = 'sse', pollIntervalMs = 3000, pollTimeoutMs = 10000,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
  if (typeof baseURL !== 'string' || /[?#]/.test(baseURL)) {
    throw new TypeError('The service URL must not contain a query or fragment.');
  }
  if (!Number.isFinite(reconnectDelayMs) || reconnectDelayMs < 0) {
    throw new RangeError('The reconnect delay must be a nonnegative number.');
  }
  if (!['sse', 'poll'].includes(transport)) throw new TypeError('Choose the sse or poll transport.');
  for (const value of [pollIntervalMs, pollTimeoutMs]) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError('Polling intervals and deadlines must be positive numbers.');
  }
  const base = baseURL.replace(/\/+$/, '');

  async function request(path, { method = 'GET', body, session, participant = false, signal } = {}) {
    const headers = headersFor(session, participant);
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetchImpl(`${base}${path}`, {
      method, headers, signal, credentials: 'omit', cache: 'no-store', redirect: 'error',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return responseJSON(response);
  }

  function action(session, { expectedRevision, action: value }, { signal } = {}) {
    return request(`${roomPath(session)}/actions`, {
      method: 'POST', session, participant: true, signal,
      body: { expectedRevision, participantId: session.participantId, action: value },
    });
  }

  function poll(session, { onRoom, onStatus, onError, signal }) {
    const path = roomPath(session);
    let stopped = false;
    let generation = 0;
    let currentController = null;
    let timer = null;
    let lastRevision = -1;
    let retryCount = 0;
    let connected = false;

    function close() {
      if (stopped) return;
      stopped = true;
      generation++;
      clearTimeout(timer);
      currentController?.abort();
      signal?.removeEventListener('abort', close);
      onStatus?.('closed');
    }

    function reconnect() {
      if (stopped) return;
      clearTimeout(timer);
      currentController?.abort();
      retryCount = 0;
      connected = false;
      void readSnapshot();
    }

    function schedule(delay) {
      timer = setTimeout(() => { if (!stopped) void readSnapshot(); }, delay);
    }

    async function readSnapshot() {
      const connection = ++generation;
      const controller = new AbortController();
      currentController = controller;
      let timedOut = false;
      const deadline = setTimeout(() => { timedOut = true; controller.abort(); }, pollTimeoutMs);
      if (!connected) onStatus?.(retryCount ? 'reconnecting' : 'connecting');
      try {
        const { room } = await request(path, { session, signal: controller.signal });
        if (stopped || connection !== generation) return;
        if (!room || room.id !== session.roomId || !Number.isSafeInteger(room.revision) || room.revision < 0) {
          throw new RoomClientError('The room snapshot is invalid.', { code: 'invalid_snapshot' });
        }
        retryCount = 0;
        if (!connected) { connected = true; onStatus?.('connected'); }
        // 定时读取完整状态；相同版本无需重复渲染，较早版本不得覆盖当前状态。
        if (room.revision > lastRevision) {
          lastRevision = room.revision;
          onRoom(room);
        }
        if (!stopped && connection === generation) schedule(pollIntervalMs);
      } catch (cause) {
        if (stopped || connection !== generation || (controller.signal.aborted && !timedOut)) return;
        const error = timedOut
          ? new RoomClientError('The room update timed out.', { code: 'poll_timeout' }) : cause;
        const willRetry = timedOut || error instanceof TypeError || error.status === 429 || error.status >= 500;
        connected = false;
        onError?.(error, { willRetry });
        if (willRetry) {
          retryCount++;
          onStatus?.('reconnecting');
          const delay = Math.min(Math.max(pollIntervalMs, reconnectDelayMs) * 2 ** Math.min(retryCount - 1, 4), 30000);
          if (!stopped && connection === generation) schedule(delay);
        } else close();
      } finally {
        clearTimeout(deadline);
        controller.abort();
      }
    }

    if (signal?.aborted) close();
    else {
      signal?.addEventListener('abort', close, { once: true });
      void readSnapshot();
    }
    return { close, reconnect };
  }

  function subscribe(session, { onRoom, onStatus, onError, signal } = {}) {
    if (typeof onRoom !== 'function') throw new TypeError('An onRoom callback is required.');
    if (transport === 'poll') return poll(session, { onRoom, onStatus, onError, signal });
    const path = `${roomPath(session)}/events`;
    const headers = { ...headersFor(session), Accept: 'text/event-stream' };
    let stopped = false;
    let generation = 0;
    let currentController = null;
    let timer = null;
    let lastRevision = -1;
    let retryCount = 0;

    function close() {
      if (stopped) return;
      stopped = true;
      generation++;
      clearTimeout(timer);
      currentController?.abort();
      signal?.removeEventListener('abort', close);
      onStatus?.('closed');
    }

    function reconnect() {
      if (stopped) return;
      clearTimeout(timer);
      currentController?.abort();
      retryCount = 0;
      void connect();
    }

    async function connect() {
      const connection = ++generation;
      const controller = new AbortController();
      currentController = controller;
      let reader;
      onStatus?.(retryCount ? 'reconnecting' : 'connecting');
      try {
        const response = await fetchImpl(`${base}${path}`, {
          headers, signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error',
        });
        if (!response.ok) await responseJSON(response);
        if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) {
          throw new RoomClientError('The room event stream is unavailable.', { code: 'invalid_stream' });
        }
        if (stopped || connection !== generation) return;
        let receivedSnapshot = false;
        const parser = createParser({
          onEvent(event) {
            if (event.event !== 'room' || stopped || connection !== generation) return;
            const room = JSON.parse(event.data);
            if (!room || room.id !== session.roomId || !Number.isSafeInteger(room.revision) || room.revision < 0) {
              throw new RoomClientError('The room snapshot is invalid.', { code: 'invalid_snapshot' });
            }
            // 重连接收完整状态，旧版本不得覆盖已经收到的更新。
            if (room.revision < lastRevision) return;
            lastRevision = room.revision;
            if (!receivedSnapshot) {
              receivedSnapshot = true;
              retryCount = 0;
              onStatus?.('connected');
            }
            onRoom(room);
          },
          onError(error) { throw error; },
        });
        const decoder = new TextDecoder();
        reader = response.body.getReader();
        while (!stopped && connection === generation) {
          const { value, done } = await reader.read();
          if (done) break;
          parser.feed(decoder.decode(value, { stream: true }));
        }
        if (!stopped && connection === generation) {
          throw new RoomClientError('The room connection ended.', { code: 'stream_closed' });
        }
      } catch (error) {
        if (stopped || connection !== generation || controller.signal.aborted) return;
        const willRetry = error instanceof TypeError
          || error.code === 'stream_closed'
          || error.status === 429 || error.status >= 500;
        onError?.(error, { willRetry });
        if (willRetry) {
          retryCount++;
          onStatus?.('reconnecting');
          const delay = Math.min(reconnectDelayMs * 2 ** Math.min(retryCount - 1, 4), 30000);
          timer = setTimeout(() => { if (!stopped) void connect(); }, delay);
        } else close();
      } finally {
        controller.abort();
        reader?.releaseLock();
      }
    }

    if (signal?.aborted) close();
    else {
      signal?.addEventListener('abort', close, { once: true });
      void connect();
    }
    return { close, reconnect };
  }

  return {
    health: ({ signal } = {}) => request('/api/health', { signal }),
    create: (payload, { signal } = {}) => request('/api/rooms', { method: 'POST', body: payload, signal }),
    read: (session, { signal } = {}) => request(roomPath(session), { session, signal }),
    join: (session, { displayName, expectedRevision }, { signal } = {}) => request(`${roomPath(session)}/actions`, {
      method: 'POST', session, signal,
      body: { expectedRevision, action: { type: 'participant.join', displayName } },
    }),
    action,
    update: action,
    plan: (session, { preferences, locale = 'en' } = {}, { signal } = {}) => request('/api/plan', {
      method: 'POST', session, participant: true, signal,
      body: { roomId: session.roomId, participantId: session.participantId, preferences, locale },
    }),
    subscribe,
  };
}
