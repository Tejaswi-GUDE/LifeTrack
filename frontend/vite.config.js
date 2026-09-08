import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend talks to the existing Express backend (default :4000).
// In dev we proxy /api so the app can use same-origin relative URLs.
const API_TARGET = process.env.VITE_API_PROXY_TARGET || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
