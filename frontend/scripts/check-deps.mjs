/**
 * Fails fast (before `npm run dev` / `npm run build`) if an incompatible
 * dependency set is installed.
 *
 * Why this exists: an external process (the Antigravity / IDE auto-updater)
 * repeatedly rewrites frontend/package.json to `vite@^8` + `react-router-dom@^7`
 * and reinstalls. `vite@8` (rolldown) does NOT inject
 * `window.__vite_plugin_react_preamble_installed__`, so `@vitejs/plugin-react@4`
 * throws "can't detect preamble" at the top of every .jsx module and EVERY
 * PAGE RENDERS BLANK. This check turns that silent failure into a loud one
 * with the exact recovery command.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const problems = [];

function major(range) {
  const m = String(range).match(/(\d+)\./);
  return m ? Number(m[1]) : NaN;
}

try {
  const vite = require('vite/package.json').version;
  if (major(vite) !== 5) {
    problems.push(`vite ${vite} is installed — this app needs vite 5.x. ` +
      `vite 8 (rolldown) breaks @vitejs/plugin-react@4 (missing preamble) → every page blank.`);
  }
} catch {
  problems.push('vite is not installed.');
}

try {
  const rr = require('react-router-dom/package.json').version;
  if (major(rr) !== 6) {
    problems.push(`react-router-dom ${rr} is installed — this app is written for react-router-dom 6.x.`);
  }
} catch {
  problems.push('react-router-dom is not installed.');
}

if (problems.length) {
  console.error('\n\x1b[41m\x1b[97m  DEPENDENCY MISMATCH — the app will not render correctly  \x1b[0m\n');
  for (const p of problems) console.error('  • ' + p);
  console.error('\n  Fix (run inside frontend/):\n');
  console.error('    git checkout -- package.json    # if package.json itself was rewritten');
  console.error('    rm -rf node_modules package-lock.json');
  console.error('    npm install\n');
  console.error('  package.json pins the correct versions and an "overrides" block');
  console.error('  forces them even if a transitive bump sneaks in.\n');
  process.exit(1);
}

console.log('[check-deps] vite 5.x + react-router-dom 6.x OK');
