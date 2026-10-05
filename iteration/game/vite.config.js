import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  resolve: { dedupe: ['melonjs'] },
  build: { target: 'es2022', assetsInlineLimit: 10000000, cssCodeSplit: false },
  server: { host: '0.0.0.0', port: 4173 },
});
