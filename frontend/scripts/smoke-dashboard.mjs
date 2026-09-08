/**
 * Headless validation for the Government Impact Dashboard.
 * Renders the real <App/> at /government/dashboard inside jsdom, with fetch
 * pointed at the running backend (:4000), and checks: data loading, the
 * scope filter re-fetching, drill-down links, and the error state.
 *
 *   1. cd backend && npm run dev      (in another terminal)
 *   2. node scripts/smoke-dashboard.mjs
 */
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';
import React from 'react';

const BACKEND = process.env.SMOKE_BACKEND || 'http://localhost:4000';
const FRONT_ORIGIN = 'http://localhost:5173';

execFileSync(
  process.execPath,
  [
    'node_modules/esbuild/bin/esbuild',
    'scripts/_smoke-entry.jsx',
    '--bundle',
    '--format=esm',
    '--platform=browser',
    '--main-fields=module,main',
    '--jsx=automatic',
    '--define:import.meta.env={"VITE_API_BASE_URL":"/api"}',
    '--external:react',
    '--external:react-dom',
    '--external:react-dom/client',
    '--loader:.css=empty',
    '--outfile=scripts/_smoke-bundle.mjs',
  ],
  { stdio: 'inherit' },
);

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: `${FRONT_ORIGIN}/government/dashboard`,
  pretendToBeVisual: true,
});
const { window } = dom;
const define = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
define('window', window);
define('document', window.document);
define('navigator', window.navigator);
define('HTMLElement', window.HTMLElement);
define('Node', window.Node);
define('getComputedStyle', window.getComputedStyle);
define('Event', window.Event);
define('MouseEvent', window.MouseEvent);
define('localStorage', window.localStorage);
define('MessageChannel', window.MessageChannel);
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
window.scrollTo = () => {};

window.localStorage.setItem(
  'lifetrack.session',
  JSON.stringify({ role: 'government', name: 'Dept. of Skill Development' }),
);

const realFetch = globalThis.fetch;
let forceFail = false;
globalThis.fetch = (input, init) => {
  if (forceFail) return Promise.reject(new Error('forced network failure'));
  let url = typeof input === 'string' ? input : input.href || input.url || String(input);
  url = url.replace(FRONT_ORIGIN, BACKEND);
  return realFetch(url, init);
};

const { createRoot } = await import('react-dom/client');
const Root = (await import('./_smoke-bundle.mjs')).default;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = () => document.getElementById('root').textContent.replace(/\s+/g, ' ').trim();
async function waitFor(pred, label, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (pred()) return;
    await sleep(50);
  }
  throw new Error(`timeout: ${label}\n--- DOM ---\n${text().slice(0, 1200)}`);
}

const results = [];
const check = (name, cond) => {
  results.push([name, !!cond]);
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}`);
};

let setPath;
function Harness() {
  const [path, setP] = React.useState('/government/dashboard');
  setPath = setP;
  return React.createElement(Root, { path });
}

const root = createRoot(document.getElementById('root'));
root.render(React.createElement(Harness));
await sleep(100);

check('renders while loading (no crash)', text().length > 0);

await waitFor(() => text().includes('62.5%'), 'KPI placement 62.5%');
const loaded = text();
check('KPI: Placement Rate 62.5% (live from backend)', loaded.includes('62.5%'));
check('KPI: Avg Wage Growth 45.6%', loaded.includes('45.6%'));
check('KPI: Avg Skill Match 88.3%', loaded.includes('88.3%'));
check('KPI: Retention Rate 100%', loaded.includes('100%'));
check('KPI confidence caption: "5 of 8 employed — … verified … self-reported"', /5 of 8 employed — \d+ verified/.test(loaded));
check('perf table row: Ranchi Skill Mission Center', loaded.includes('Ranchi Skill Mission Center'));
check('alert: lowest placement rate', /lowest placement rate/i.test(loaded));
check('alert: pending verifications', /awaiting confirmation/i.test(loaded));
check('skill gap: MS Excel', loaded.includes('MS Excel'));
check('non-placement reason: Skill mismatch', loaded.includes('Skill mismatch'));
check('footer: 8 trainees tracked across 3 providers, 2 districts', /8 trainees tracked across 3 providers, 2 districts/.test(loaded));

const firstRow = document.querySelector('table.tbl tbody tr');
check('perf rows clickable (role=button)', firstRow && firstRow.getAttribute('role') === 'button');

/* scope filter → re-fetch */
await waitFor(
  () => (document.querySelector('select[aria-label="District"]') || {}).length > 1,
  'district options populated',
);
const districtSelect = document.querySelector('select[aria-label="District"]');
check('scope filter present in topbar', !!districtSelect);
check('district options populated from backend (Patna, Ranchi)', districtSelect && districtSelect.length === 3);
if (districtSelect) {
  Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(districtSelect, 'Ranchi');
  districtSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  await waitFor(() => text().includes('5 trainees tracked across 2 providers, 1 district'), 'scoped footer');
  check('filter → footer "5 trainees tracked across 2 providers, 1 district"', true);
  check('filter → KPI recomputed (60%)', text().includes('60%'));
}

/* verified-only toggle */
const verifiedBtn = [...document.querySelectorAll('.seg button')].find((b) => /verified only/i.test(b.textContent));
check('verified-only toggle present', !!verifiedBtn);
if (verifiedBtn) {
  verifiedBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(500);
  check('verified-only recomputes without crash', text().length > 0 && !/Couldn't load/.test(text()));
}

/* By District tab */
const byDistrictTab = [...document.querySelectorAll('.seg button')].find((b) => b.textContent.trim() === 'By District');
check('performance "By District" tab present', !!byDistrictTab);
if (byDistrictTab) {
  byDistrictTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(150);
  check('By District shows a Providers column', /Providers/.test(text()));
}

/* error state */
forceFail = true;
const stateSelect = document.querySelector('select[aria-label="State"]');
Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(stateSelect, 'Bihar');
stateSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
await waitFor(() => /Couldn't load outcome data for this scope\. Retry\./.test(text()), 'error state', 6000);
check("error state: \"Couldn't load outcome data for this scope. Retry.\"", true);

/* recover on retry */
forceFail = false;
const retryBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Retry');
check('error state has a Retry action', !!retryBtn);
if (retryBtn) {
  retryBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await waitFor(() => !/Couldn't load/.test(text()) && /trainees tracked/.test(text()), 'recovered after retry', 6000);
  check('Retry recovers the dashboard', true);
}

root.unmount();

const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
