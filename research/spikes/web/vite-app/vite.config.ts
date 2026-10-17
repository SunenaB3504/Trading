import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: './',
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  server: { fs: { allow: ['..'] } },
  build: { target: 'es2022' },
});
