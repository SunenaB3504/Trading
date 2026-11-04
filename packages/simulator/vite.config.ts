import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/Trading/' : './',
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api/yfinance': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yfinance/, ''),
      },
    },
  },
});
