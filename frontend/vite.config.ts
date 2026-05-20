// File: frontend/vite.config.ts
// Purpose: Vite configuration for the React frontend.
// Functionality: Enables the React plugin, sets up the `@/*` alias for the
// `src/` directory, and proxies `/api` to the Fastify backend during
// development.
// Role: Drives both `npm run dev` (Vite dev server on :5173) and the
// production build (`npm run build` → `dist/`).

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Forwards `/api/*` to the backend so that cookies and CORS behave the
    // same way in dev as they will under the production reverse proxy.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
