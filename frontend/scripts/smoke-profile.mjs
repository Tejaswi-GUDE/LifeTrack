/**
 * Headless validation for the Trainee Profile + Career Timeline.
 * Renders the real <App/> at /provider/trainee/:id inside jsdom against the
 * running backend and checks: identity, snapshot cards, the timeline
 * (nodes + stages + badges from real data), the chip filter, the expand
 * interaction, directory navigation, loading and error states.
 *
 *   1. cd backend && npm run dev
 *   2. node scripts/smoke-profile.mjs
 */
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';
import React from 'react';

const BACKEND = process.env.SMOKE_BACKEND || 'http://localhost:4000';
const FRONT_ORIGIN = 'http://localhost:5173';

// find Amit's id from the live list
const listRes = await fetch(`${BACKEND}/api/trainees`);
const list = await listRes.json();
const amit = list.trainees.find((t) => t.name.includes('Amit'));
if (!amit) throw new Error('Amit not found in /api/trainees');

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
  url: `${FRONT_ORIGIN}/provider/trainee/${amit.id}`,
  pretendToBeVisual: true,
});
const { window } = dom;
const define = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'getComputedStyle', 'Event', 'MouseEvent', 'localStorage', 'MessageChannel', 'Blob', 'URL']) {
  define(k, window[k] || globalThis[k]);
}
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
window.scrollTo = () => {};
window.URL.createObjectURL = () => 'blob:mock';
window.URL.revokeObjectURL = () => {};

window.localStorage.setItem('lifetrack.session', JSON.stringify({ role: 'provider', name: 'Patna Livelihood Institute' }));

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
const html = () => document.getElementById('root').innerHTML;
async function waitFor(pred, label, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (pred()) return;
    await sleep(50);
  }
  throw new Error(`timeout: ${label}\n--- DOM ---\n${text().slice(0, 1400)}`);
}

const results = [];
const check = (name, cond) => {
  results.push([name, !!cond]);
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}`);
};

let setPath;
function Harness() {
  const [path, setP] = React.useState(`/provider/trainee/${amit.id}`);
  setPath = setP;
  return React.createElement(Root, { path, key: path });
}
const root = createRoot(document.getElementById('root'));
root.render(React.createElement(Harness));
await sleep(80);
check('renders while loading (no crash)', text().length > 0);

await waitFor(() => text().includes('Amit Verma'), 'trainee name');
const t = text();

/* identity */
check('identity: name + display id', /Amit Verma/.test(t) && /TRN-2026-/.test(t));
check('identity: initials avatar "AV"', html().includes('>AV<'));
check('identity: status + confidence badge', /Employed/.test(t) && /Confidence: Medium/.test(t));
check('identity: meta line (role · employer · course · provider)', /Site Electrician/.test(t) && /BuildRight Contractors/.test(t) && /Electrician/.test(t));

/* snapshot cards */
check('snapshot: Current employment card', /Current employment/.test(t) && /BuildRight Contractors/.test(t));
check('snapshot: verification "Pending"', /Verification\s*Pending/.test(t));
check('snapshot: Wage progression ₹12,000 · from ₹11,000 baseline · 3 checkpoints', /₹12,000/.test(t) && /from ₹11,000 baseline · 3 checkpoints recorded/.test(t));
check('snapshot: wage sparkline rendered', html().includes('class="spark"') && html().includes('polyline'));
check('snapshot: Skill relevance 100% · Good match, gauge', /Skill relevance/.test(t) && /100%\s*Good match/.test(t) && html().includes('gauge-track'));
check('snapshot: Risk card (outcome + attrition)', /Outcome risk\s*10 \/ 100 · Low/.test(t) && /Attrition risk\s*25 \/ 100 · Low/.test(t));
check('snapshot: Consent card (3 purposes)', /Data collection/.test(t) && /Employer contact/.test(t) && /Analytics use/.test(t));

/* timeline — real data */
check('timeline: spine rendered', html().includes('class="timeline"'));
const stages = [...html().matchAll(/stage-label">([^<]+)</g)].map((m) => m[1]);
check('timeline: TRAINING + CERTIFICATION', stages.includes('TRAINING') && stages.includes('CERTIFICATION'));
check('timeline: PLACEMENT + RETENTION + re-employment', stages.includes('PLACEMENT') && stages.includes('RETENTION') && stages.some((s) => /RE-EMPLOYMENT/.test(s)));
check('timeline: FOLLOW-UP · DAY 30 / 180 / 365', stages.includes('FOLLOW-UP · DAY 30') && stages.includes('FOLLOW-UP · DAY 180') && stages.includes('FOLLOW-UP · DAY 365'));
check('timeline: INTERVENTION insight panel (plum)', stages.includes('INTERVENTION') && html().includes('class="insight"') && /System insight — Re-employment support/.test(t));
check('timeline: SKILL RELEVANCE node', stages.includes('SKILL RELEVANCE') && /Site Electrician requires: Basic Wiring, Safety Protocols, Tool Handling, Circuit Reading/.test(t));
check('timeline: sealed-teal node on verified placement', html().includes('t-node sealed-teal'));
check('timeline: outline-brick node on job loss', html().includes('t-node outline-brick'));
check('timeline: "● Employer-verified" badge', /● Employer-verified/.test(t));
check('timeline: "Self-reported — awaiting verification" badge', /Self-reported — awaiting verification/.test(t));
check('timeline: upcoming follow-up is dimmed', html().includes('· upcoming') && /opacity:\s*0\.5/.test(html()));

/* chip filter */
const chips = [...document.querySelectorAll('.chip-filter .chip')];
check('timeline chip filter has 5 tabs', chips.length === 5);
const followBtn = chips.find((c) => c.textContent.trim() === 'Follow-ups');
followBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(120);
const afterFilter = [...html().matchAll(/stage-label">([^<]+)</g)].map((m) => m[1]);
check('chip "Follow-ups" narrows to follow-up events only', afterFilter.length > 0 && afterFilter.every((s) => /FOLLOW-UP/.test(s)));
const verifChip = chips.find((c) => c.textContent.trim() === 'Verification');
verifChip.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(120);
const afterVerif = [...html().matchAll(/stage-label">([^<]+)</g)].map((m) => m[1]);
check('chip "Verification" shows outcome/verification events', afterVerif.length > 0 && afterVerif.some((s) => /PLACEMENT|RETENTION/.test(s)));
chips.find((c) => c.textContent.trim() === 'All').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(120);

/* expand interaction */
const viewBtn = [...document.querySelectorAll('.t-expand-btn')].find((b) => /View details/.test(b.textContent));
check('timeline: expandable event has "View details"', !!viewBtn);
if (viewBtn) {
  viewBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(100);
  check('timeline: "View details" expands a detail block', html().includes('t-expand-title'));
}

/* Export record in topbar */
check('topbar: "Export record" button', [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Export record'));

/* directory navigation */
setPath('/provider/trainees');
await waitFor(() => /Trainees/.test(text()) && /tracked/.test(text()), 'directory list');
const rows = [...document.querySelectorAll('table.tbl tbody tr')];
check('directory: lists trainees with clickable rows', rows.length === 8 && rows[0].getAttribute('role') === 'button');
rows.find((r) => /Amit Verma/.test(r.textContent)).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await waitFor(() => /Amit Verma/.test(text()) && /Career Timeline/.test(text()), 'profile after directory click');
check('directory → row click opens the trainee profile', /Career Timeline/.test(text()));

/* error state */
forceFail = true;
setPath('/provider/trainee/000000000000000000000000');
await waitFor(() => /Couldn't load this trainee's record\. Retry\./.test(text()), 'error state', 6000);
check("error state: \"Couldn't load this trainee's record. Retry.\"", true);
forceFail = false;

root.unmount();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
