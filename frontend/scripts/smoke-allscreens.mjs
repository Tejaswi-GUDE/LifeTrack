/**
 * Walks every sidebar route for every role in jsdom against the running
 * backend, and checks: no crash, no "Screen not built yet" placeholder, and
 * that the four new main screens render real data.
 *   1. cd backend && npm run dev
 *   2. node scripts/smoke-allscreens.mjs
 */
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';
import React from 'react';

const BACKEND = process.env.SMOKE_BACKEND || 'http://localhost:4000';
const FRONT_ORIGIN = 'http://localhost:5173';

execFileSync(
  process.execPath,
  [
    'node_modules/esbuild/bin/esbuild', 'scripts/_smoke-entry.jsx',
    '--bundle', '--format=esm', '--platform=browser', '--main-fields=module,main', '--jsx=automatic',
    '--define:import.meta.env={"VITE_API_BASE_URL":"/api"}',
    '--external:react', '--external:react-dom', '--external:react-dom/client',
    '--loader:.css=empty', '--outfile=scripts/_smoke-bundle.mjs',
  ],
  { stdio: 'inherit' },
);

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: `${FRONT_ORIGIN}/`, pretendToBeVisual: true });
const { window } = dom;
const define = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'getComputedStyle', 'Event', 'MouseEvent', 'localStorage', 'MessageChannel']) define(k, window[k]);
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
window.scrollTo = () => {};
window.URL.createObjectURL = () => 'blob:mock';
window.URL.revokeObjectURL = () => {};

const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  let url = typeof input === 'string' ? input : input.href || input.url || String(input);
  return realFetch(url.replace(FRONT_ORIGIN, BACKEND), init);
};

const { createRoot } = await import('react-dom/client');
const Root = (await import('./_smoke-bundle.mjs')).default;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = () => document.getElementById('root').textContent.replace(/\s+/g, ' ').trim();

let setPath;
function Harness() {
  const [path, setP] = React.useState('/login');
  setPath = setP;
  return React.createElement(Root, { path, key: path });
}
const root = createRoot(document.getElementById('root'));
root.render(React.createElement(Harness));
await sleep(60);

const results = [];
const check = (name, cond, extra) => {
  results.push([name, !!cond]);
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${cond ? '' : extra ? `  (${extra})` : ''}`);
};

async function visit(role, path, { needle, minLen = 40, settle = 1400 } = {}) {
  try { window.localStorage.setItem('lifetrack.session', JSON.stringify({ role, name: role })); } catch {}
  setPath(path);
  await sleep(settle);
  const t = text();
  const ok =
    t.length >= minLen &&
    !/Screen not built yet/.test(t) &&
    !/Application shell step/.test(t) &&
    (needle ? new RegExp(needle, 'i').test(t) : true);
  check(`${role.padEnd(10)} ${path}`, ok, needle && !new RegExp(needle, 'i').test(t) ? `missing "${needle}"` : t.slice(0, 90));
  return t;
}

/* ---- warm-up (first jsdom render + dep parse) ---- */
await visit('government', '/government/dashboard', { settle: 3500 });

/* ---- the four new MAIN screens (with data) ---- */
await visit('provider', '/provider/dashboard', { needle: 'Completion rate', settle: 3500 });
await visit('trainee', '/trainee/home', { needle: 'Recommended next steps', settle: 3000 });
await visit('employer', '/employer/dashboard', { needle: 'Verification requests', settle: 3000 });
await visit('government', '/government/analytics', { needle: 'Provider comparison', settle: 3000 });

/* ---- every sidebar route for every role ---- */
const ROUTES = {
  government: ['/government/dashboard', '/government/providers', '/government/skill-intelligence', '/government/analytics', '/government/settings', '/admin/seed'],
  provider: ['/provider/dashboard', '/provider/trainees', '/provider/followups', '/provider/risk', '/provider/interventions', '/provider/skill-gaps', '/provider/analytics', '/provider/settings'],
  counsellor: ['/counsellor/worklist', '/counsellor/trainees', '/counsellor/followups', '/counsellor/settings'],
  trainee: ['/trainee/home', '/trainee/timeline', '/trainee/followups', '/trainee/consent'],
  employer: ['/employer/dashboard', '/employer/verifications', '/employer/settings'],
};
for (const [role, paths] of Object.entries(ROUTES)) {
  for (const p of paths) await visit(role, p, { settle: 1800 });
}

/* ---- deep links used by cross-page navigation ---- */
const raviId = (await (await fetch(`${BACKEND}/api/trainees`)).json()).trainees.find((t) => t.name.includes('Ravi')).id;
const provId = (await (await fetch(`${BACKEND}/api/providers`)).json()).providers[0].id;
const schedId = (await (await fetch(`${BACKEND}/api/followups`)).json()).followups.find((f) => f.status === 'scheduled' || f.status === 'non_responsive').id;
await visit('provider', `/provider/trainee/${raviId}`, { needle: 'Career Timeline', settle: 2200 });
await visit('government', `/government/provider/${provId}`, { needle: 'Completion rate', settle: 2200 });
await visit('government', `/government/district/Ranchi`, { needle: 'Provider comparison', settle: 2200 });
await visit('provider', `/provider/course/${provId}/skill-gap`, { settle: 1800 }); // any id → 404-safe course gap
await visit('trainee', `/trainee/followup/${schedId}`, { needle: 'check-in', settle: 2000 });

root.unmount();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} route checks passed`);
process.exit(failed.length ? 1 : 0);
