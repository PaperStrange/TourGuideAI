import { fileURLToPath, pathToFileURL } from 'node:url';
import { readConfig } from './config.js';
import { startServer } from './server.js';

export const PAGES_ORIGIN = 'https://paperstrange.github.io';

export function localPagesConfig(env = process.env) {
  const config = readConfig({
    ...env,
    DATABASE_PATH: env.DATABASE_PATH ?? fileURLToPath(new URL('../.data/rooms.sqlite', import.meta.url)),
  });
  return { ...config, allowedOrigins: [...new Set([PAGES_ORIGIN, ...config.allowedOrigins])] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const service = await startServer({ config: localPagesConfig() });
  console.log(`Local room service listening at ${service.url}`);
  console.log(`Allowed Pages origin: ${PAGES_ORIGIN}`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => {
    await service.close();
    process.exit(0);
  });
}
