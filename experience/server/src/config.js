import { resolve } from 'node:path';
import { z } from 'zod';

export function readConfig(env = process.env) {
  const port = z.coerce.number().int().min(0).max(65535).parse(env.PORT ?? 8787);
  const origins = (env.ALLOWED_ORIGINS ?? 'http://localhost:4185,http://127.0.0.1:4185,http://localhost:4186,http://127.0.0.1:4186')
    .split(',').map(value => value.trim()).filter(Boolean).map(value => {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value) throw new Error('ALLOWED_ORIGINS requires exact HTTP(S) origins.');
      return value;
    });
  const baseUrl = env.LLM_BASE_URL ?? 'https://api.openai.com/v1';
  const providerURL = new URL(baseUrl);
  if (providerURL.username || providerURL.password || providerURL.search || providerURL.hash
    || (providerURL.protocol !== 'https:' && !(providerURL.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(providerURL.hostname)))) {
    throw new Error('LLM_BASE_URL requires HTTPS or a loopback HTTP endpoint, without embedded credentials or query parameters.');
  }
  return {
    port, host: env.HOST ?? '127.0.0.1', databasePath: resolve(env.DATABASE_PATH ?? '.data/rooms.sqlite'),
    allowedOrigins: origins,
    trustProxy: env.TRUST_PROXY_HOPS ? z.coerce.number().int().min(1).max(5).parse(env.TRUST_PROXY_HOPS) : false,
    provider: { baseUrl: baseUrl.replace(/\/$/, ''), apiKey: env.LLM_API_KEY ?? '', model: env.LLM_MODEL ?? '' },
  };
}
