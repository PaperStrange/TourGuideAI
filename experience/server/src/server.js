import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { readConfig } from './config.js';
import { RoomStore } from './store.js';
import { Planner } from './planner.js';
import { ServiceError } from './errors.js';
import { createRoomSchema, actionEnvelopeSchema, planningRequestSchema } from './schemas.js';

const parse = (schema, value) => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ServiceError(400, 'invalid_request', 'Request fields are invalid.', {
    fields: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
  });
  return parsed.data;
};
const invitation = req => {
  const header = req.get('authorization');
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
};

export async function startServer(options = {}) {
  const defaults = readConfig();
  const config = { ...defaults, ...options.config, provider: { ...defaults.provider, ...options.config?.provider } };
  const store = new RoomStore(options.databasePath ?? config.databasePath);
  const planner = new Planner(config.provider);
  const app = express(), streams = new Map();
  let closingStarted = false;
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(helmet());
  app.use((req, res, next) => {
    if (closingStarted) {
      res.set('Connection', 'close').status(503).json({ error: { code: 'service_closing', message: 'The room service is restarting.' } });
      return;
    }
    next();
  });
  app.use(cors((req, callback) => {
    const origin = req.get('origin');
    const sameOrigin = origin === `${req.protocol}://${req.get('host')}`;
    if (origin && !sameOrigin && !config.allowedOrigins.includes(origin)) {
      callback(new ServiceError(403, 'origin_denied', 'This site is not an allowed API client.'));
      return;
    }
    callback(null, { origin: origin || false, methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'X-Participant-Token', 'Content-Type', 'Last-Event-ID'], maxAge: 600 });
  }));
  app.use(express.json({ limit: '256kb', strict: true }));
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const limit = (max, windowMs) => rateLimit({ windowMs, limit: max, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: { code: 'rate_limited', message: 'Too many requests. Please wait before retrying.' } } });
  app.use('/api', limit(600, 60_000));

  app.get('/api/health', (req, res) => res.json({ ok: true, capabilities: { rooms: true, events: true, planning: planner.configured },
    provider: { configured: planner.configured } }));
  app.post('/api/rooms', limit(30, 3_600_000), (req, res) => res.status(201).json(store.create(parse(createRoomSchema, req.body))));
  app.get('/api/rooms/:id', (req, res) => res.json({ room: store.authorize(req.params.id, invitation(req)) }));

  const sendRoom = (res, room) => {
    res.write(`id: ${room.revision}\nevent: room\ndata: ${JSON.stringify(room)}\n\n`);
    if (res.writableLength > 4 * 1024 * 1024) res.destroy();
  };
  const broadcast = room => {
    for (const response of streams.get(room.id) ?? []) sendRoom(response, room);
  };
  app.post('/api/rooms/:id/actions', (req, res) => {
    const envelope = parse(actionEnvelopeSchema, req.body);
    const result = store.apply(req.params.id, invitation(req), req.get('x-participant-token'), envelope);
    broadcast(result.room);
    res.json(result);
  });
  app.get('/api/rooms/:id/events', (req, res) => {
    const room = store.authorize(req.params.id, invitation(req));
    const clients = streams.get(room.id) ?? new Set();
    if (clients.size >= 64) throw new ServiceError(429, 'stream_limit', 'This room has reached its connection limit.');
    res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    clients.add(res); streams.set(room.id, clients);
    sendRoom(res, room);
    const heartbeat = setInterval(() => { if (!res.write(': heartbeat\n\n')) res.destroy(); }, 15_000);
    heartbeat.unref();
    res.on('close', () => {
      clearInterval(heartbeat); clients.delete(res);
      if (!clients.size) streams.delete(room.id);
    });
  });
  app.post('/api/plan', limit(6, 60_000), async (req, res) => {
    const request = parse(planningRequestSchema, req.body);
    const room = store.authorize(request.roomId, invitation(req));
    store.authorizeMember(room.id, request.participantId, req.get('x-participant-token'));
    const plan = await planner.generate(room, request);
    res.json({ plan, basedOnRevision: room.revision });
  });
  app.use('/api', (req, res) => res.status(404).json({ error: { code: 'not_found', message: 'This API endpoint does not exist.' } }));
  app.use((error, req, res, next) => {
    if (res.headersSent) { next(error); return; }
    if (error instanceof ServiceError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message }, ...error.details });
      return;
    }
    if (error.type === 'entity.parse.failed' || error.type === 'entity.too.large') {
      res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: { code: 'invalid_json', message: 'Send a JSON object within the request size limit.' } });
      return;
    }
    console.error('Room request failed:', error.name);
    res.status(500).json({ error: { code: 'internal_error', message: 'The room service could not complete the request.' } });
  });

  const server = createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? config.port, options.host ?? config.host, resolve);
  });
  const address = server.address();
  let closing;
  const close = () => {
    if (closing) return closing;
    closingStarted = true;
    for (const clients of streams.values()) for (const response of clients) response.end();
    streams.clear();
    let deadline;
    closing = new Promise((resolve, reject) => server.close(error => {
      clearTimeout(deadline);
      store.close();
      if (error) reject(error); else resolve();
    }));
    server.closeIdleConnections();
    // 浏览器取消订阅后可能保留尚未完成 HTTP 请求的连接；关闭期限限制其存活时间。
    deadline = setTimeout(() => server.closeAllConnections(), options.shutdownGraceMs ?? 5000);
    deadline.unref();
    return closing;
  };
  return { app, store, close, url: `http://${address.address.includes(':') ? `[${address.address}]` : address.address}:${address.port}` };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const service = await startServer();
  console.log(`Room service listening at ${service.url}`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await service.close(); process.exit(0); });
}
