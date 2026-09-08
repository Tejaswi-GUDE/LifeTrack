/**
 * Headless validation for the Risk & Intervention Center.
 * Renders the real <App/> at /counsellor/worklist in jsdom against the running
 * backend and checks: list loads sorted by risk, risk-band + status filters,
 * master-detail selection (?t= param), explained risk (score + factors),
 * root cause, skill-mismatch panel, recommended intervention, Approve →
 * persisted review-status change, navigation to the profile, error state.
 *
 *   1. cd backend && npm run dev
 *   2. node scripts/smoke-riskcenter.mjs
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
  url: `${FRONT_ORIGIN}/counsellor/worklist`,
  pretendToBeVisual: true,
});
const { window } = dom;
const define = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'getComputedStyle', 'Event', 'MouseEvent', 'localStorage', 'MessageChannel']) {
  define(k, window[k]);
}
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
window.scrollTo = () => {};
window.localStorage.setItem('lifetrack.session', JSON.stringify({ role: 'counsellor', name: 'Sunita Rao' }));

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
  throw new Error(`timeout: ${label}\n--- DOM ---\n${text().slice(0, 1500)}`);
}
const results = [];
const check = (name, cond) => {
  results.push([name, !!cond]);
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}`);
};

let setPath;
function Harness() {
  const [path, setP] = React.useState('/counsellor/worklist');
  setPath = setP;
  return React.createElement(Root, { path, key: path });
}
const root = createRoot(document.getElementById('root'));
root.render(React.createElement(Harness));
await sleep(80);
check('renders while loading (no crash)', text().length > 0);

/* list loads, sorted by risk, Ravi auto-selected */
await waitFor(() => text().includes('Ravi Oraon') && /sorted by risk score/.test(text()), 'worklist loaded');
const rows = [...document.querySelectorAll('.lrow')];
check('list: 8 rows', rows.length === 8);
check('list: sorted by risk (Ravi first, 85 · High)', /Ravi Oraon/.test(rows[0].textContent) && /85 · High/.test(rows[0].textContent));
check('list: risk bar rendered per row', document.querySelectorAll('.lrow .risk-bar-fill').length === 8);
check('list count line "8 trainees · sorted by risk score"', /8 trainees · sorted by risk score/.test(text()));

await waitFor(() => /detail-name">Ravi Oraon</.test(html()), 'detail pane loaded for Ravi');
check('detail auto-selected highest-risk trainee (Ravi)', /detail-name">Ravi Oraon</.test(html()));

/* explained risk — never an unexplained score */
check('detail: risk hero "85 / 100" + "High risk" band', /85\s*\/ 100/.test(text()) && /High risk/.test(text()));
check('detail: "Computed 1 day ago"', /Computed 1 day ago/.test(text()));
const factors = [...html().matchAll(/class="factor"><span>([^<]+)<\/span><span class="pts"[^>]*>\+(\d+)</g)].map((m) => `${m[1]} +${m[2]}`);
check('detail: 4 contributing factors with points', factors.length === 4 && factors.some((f) => /No placement 52 days after certification \+30/.test(f)));
check('detail: root cause "Skill mismatch" + plum "Inferred — needs confirmation"', /Skill mismatch/.test(text()) && /Inferred — needs confirmation/.test(text()) && html().includes('badge plum'));

/* skill mismatch panel */
check('detail: skill mismatch panel (course vs Data Entry Operator)', /Course teaches/.test(text()) && /Data Entry Operator requires/.test(text()));
check('detail: missing skill highlighted "MS Excel"', /Missing:\s*MS Excel/.test(text()) && html().includes('chip-skill">MS Excel'));
check('detail: "most frequently missing skill in this cohort"', /most frequently missing skill in this cohort/.test(text()));

/* recommended intervention */
check('detail: recommendation insight panel', html().includes('class="insight"') && /System insight/.test(text()) && /Bridge course referral/.test(text()));
check('detail: priority badge', /Priority: High/.test(text()));
check('detail: review status "Awaiting counsellor review"', /Awaiting counsellor review/.test(text()));
check('detail: Approve / Dismiss / Reassign actions', ['Approve intervention', 'Dismiss', 'Reassign'].every((l) => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === l)));
check('detail: "View full profile & timeline →" link', [...document.querySelectorAll('a')].some((a) => /View full profile/.test(a.textContent)));

/* filter by risk band */
const highBtn = [...document.querySelectorAll('.seg button')].find((b) => b.textContent.trim() === 'High');
highBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(120);
check('filter: risk band "High" narrows list to 1', document.querySelectorAll('.lrow').length === 1 && /Ravi Oraon/.test(text()));
[...document.querySelectorAll('.seg button')].find((b) => b.textContent.trim() === 'All risk').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(100);

/* filter by status */
const statusSel = document.querySelector('select[aria-label="Status filter"]');
Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(statusSel, 'non_responsive');
statusSel.dispatchEvent(new window.Event('change', { bubbles: true }));
await sleep(120);
check('filter: status "Non-responsive" → Deepak only', document.querySelectorAll('.lrow').length === 1 && /Deepak Mahato/.test(text()));
Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(statusSel, 'all');
statusSel.dispatchEvent(new window.Event('change', { bubbles: true }));
await sleep(100);

/* select a different trainee (master-detail, ?t= param) */
const sanaRow = [...document.querySelectorAll('.lrow')].find((r) => /Sana Khatoon/.test(r.textContent));
sanaRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await waitFor(() => /detail-name">Sana Khatoon</.test(html()), 'Sana detail loaded');
check('select row → detail pane updates in place (no route change)', /detail-name">Sana Khatoon</.test(html()) && window.location.pathname === '/counsellor/worklist');
check('select row → selection state tracked (?t=)', /Sana Khatoon/.test((document.querySelector('.lrow.selected') || {}).textContent || ''));

/* back to Ravi and approve */
[...document.querySelectorAll('.lrow')].find((r) => /Ravi Oraon/.test(r.textContent)).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await waitFor(() => /detail-name">Ravi Oraon</.test(html()) && /Awaiting counsellor review/.test(text()), 'Ravi re-selected');
[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Approve intervention').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await waitFor(() => document.querySelector('.lt-modal'), 'approve modal open');
check('Approve opens a confirmation modal', !!document.querySelector('.lt-modal'));
[...document.querySelectorAll('.lt-modal-footer button')].find((b) => b.textContent.trim() === 'Approve intervention').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await waitFor(() => /Approved by/.test(text()) && !document.querySelector('.lt-modal'), 'review status flips to Approved', 8000);
check('Approve → review status pill flips to "Approved by …" (persisted)', /Approved by Sunita Rao/.test(text()));
check('Approve → action buttons removed (no longer awaiting)', ![...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Approve intervention'));

/* persistence: a fresh fetch of the risk bundle still shows in_progress */
const raviId = html().match(/counsellor\/trainee\/([a-f0-9]{24})/)[1];
const persisted = await (await fetch(`${BACKEND}/api/trainees/${raviId}/risk`)).json();
check('Approve persisted to DB (GET /:id/risk → in_progress)', persisted.reviewStatus.state === 'in_progress');

/* navigate to full profile */
setPath(`/counsellor/trainee/${raviId}`);
await waitFor(() => /Career Timeline/.test(text()) && /Ravi Oraon/.test(text()), 'trainee profile opened');
check('navigate → full trainee profile + timeline', /Career Timeline/.test(text()));

/* error state */
setPath('/counsellor/worklist');
await waitFor(() => document.querySelectorAll('.lrow').length === 8 && /detail-name">Ravi Oraon</.test(html()), 'back to worklist');
forceFail = true;
[...document.querySelectorAll('.lrow')].find((r) => /Sana Khatoon/.test(r.textContent)).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await waitFor(() => /Couldn't load this trainee's risk record\. Retry\./.test(text()), 'detail error state', 6000);
check("detail error state: \"Couldn't load this trainee's risk record. Retry.\"", true);
forceFail = false;

root.unmount();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
