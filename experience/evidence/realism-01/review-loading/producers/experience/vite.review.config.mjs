import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    target: 'es2022',
    sourcemap: true,
    outDir: '../artifacts/realism-01/review-page/build',
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL('./realism-review.html', import.meta.url)),
    },
  },
});
