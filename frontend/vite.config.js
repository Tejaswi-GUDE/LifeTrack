import { defineConfig } from 'vite';

/**
 * The frontend talks to the existing Express backend (default :4000).
 * In dev we proxy /api so the app can use same-origin relative URLs.
 *
 * @vitejs/plugin-react is loaded defensively: if the installed vite/plugin
 * combination is incompatible (an external process has bumped this project to
 * vite@8 more than once, which breaks plugin-react@4's Fast Refresh preamble
 * and blanks every page), we drop the plugin. Vite's built-in esbuild still
 * transforms JSX with the automatic runtime — the app renders fine, only
 * component-level Hot Reload is lost (a full reload happens instead).
 */
const API_TARGET = process.env.VITE_API_PROXY_TARGET || 'http://localhost:4000';

let plugins = [];
try {
  const react = (await import('@vitejs/plugin-react')).default;
  plugins = [react()];
} catch (err) {
  console.warn('[vite.config] @vitejs/plugin-react unavailable — using built-in JSX transform.', err?.message);
}

export default defineConfig({
  plugins,
  esbuild: { jsx: 'automatic' },
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
