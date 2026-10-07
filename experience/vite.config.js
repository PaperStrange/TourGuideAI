import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022', sourcemap: true,
    rollupOptions: {
      input: Object.fromEntries(['index', 'comparison', 'journey', 'perspective'].map(name =>
        [name, fileURLToPath(new URL(`./${name}.html`, import.meta.url))])),
    },
  },
  server: { strictPort: true },
});
