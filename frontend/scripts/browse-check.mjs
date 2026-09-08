/**
 * REAL browser check (Chromium via Playwright). Loads every sidebar route for
 * every role against the running dev server, records console errors, page
 * exceptions and failed API calls, and asserts each page rendered real
 * content (not blank, not the Vite preamble error).
 *
 *   1. cd backend && npm run dev        (:4000)
 *   2. cd frontend && npm run dev       (:5173)
 *   3. node scripts/browse-check.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BROWSE_BASE || 'http://localhost:5173';
const API = process.env.BROWSE_API || 'http://localhost:4000';

const ROUTES = [
  // previously-completed flagship screens
  ['government', '/government/dashboard', 'Skilling Outcomes|Placement Rate'],
  ['provider', '/provider/trainee/:trainee', 'Career Timeline'],
  ['counsellor', '/counsellor/worklist', 'Outcome Risk|Recommended Intervention'],
  // four main screens
  ['provider', '/provider/dashboard', 'Completion rate|Cohort'],
  ['trainee', '/trainee/home', 'My Career|Recommended next steps'],
  ['employer', '/employer/dashboard', 'Verification requests|Employees'],
  ['government', '/government/analytics', 'Provider comparison|Total trained'],
  // every other sidebar route
  ['government', '/government/providers', 'performance'],
  ['government', '/government/skill-intelligence', 'demand|missing'],
  ['government', '/government/settings', 'Session|Privacy'],
  ['government', '/admin/seed', 'Reset demo data'],
  ['provider', '/provider/trainees', 'Trainees'],
  ['provider', '/provider/followups', 'follow-up'],
  ['provider', '/provider/risk', 'Outcome Risk|Recommended'],
  ['provider', '/provider/interventions', 'intervention'],
  ['provider', '/provider/skill-gaps', 'skill'],
  ['provider', '/provider/analytics', 'comparison|Total trained'],
  ['provider', '/provider/settings', 'Session'],
  ['counsellor', '/counsellor/trainees', 'Trainees'],
  ['counsellor', '/counsellor/followups', 'follow-up'],
  ['counsellor', '/counsellor/settings', 'Session'],
  ['trainee', '/trainee/timeline', 'timeline|Career'],
  ['trainee', '/trainee/followups', 'follow-up'],
  ['trainee', '/trainee/consent', 'Consent'],
  ['employer', '/employer/verifications', 'Verification'],
  ['employer', '/employer/settings', 'Session'],
];

const browser = await chromium.launch();
const results = [];
let trainee, verification, schedule;
{
  const r = await (await fetch(`${API}/api/trainees`)).json();
  trainee = r.trainees.find((t) => t.name.includes('Ravi')).id;
  const v = await (await fetch(`${API}/api/verifications`)).json();
  verification = (v.verifications.find((x) => x.status === 'pending') || v.verifications[0]).id;
  const f = await (await fetch(`${API}/api/followups`)).json();
  schedule = (f.followups.find((x) => x.status === 'scheduled') || f.followups[0]).id;
}

for (const [role, rawPath, needleRe] of ROUTES) {
  const path = rawPath.replace(':trainee', trainee);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedReq = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('requestfailed', (r) => failedReq.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 500) failedReq.push(`${r.status()} ${r.url()}`); });

  await page.addInitScript((r) => {
    try { localStorage.setItem('lifetrack.session', JSON.stringify({ role: r, name: r })); } catch {}
  }, role);

  let text = '';
  let err = null;
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2200);
    text = (await page.locator('#root').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  } catch (e) {
    err = e.message;
  }

  const blank = text.length < 30;
  const preamble = /can't detect preamble|Something is wrong/.test(text) || pageErrors.some((e) => /preamble/.test(e));
  const needleOk = !needleRe || new RegExp(needleRe, 'i').test(text);
  const ok = !err && !blank && !preamble && needleOk && pageErrors.length === 0;

  results.push({ role, path, ok, blank, preamble, needleOk, pageErrors, consoleErrors, failedReq, err, sample: text.slice(0, 70) });
  console.log(
    `${ok ? '  ok  ' : ' FAIL '} ${role.padEnd(10)} ${path.padEnd(42)} ` +
      (ok ? '' : [
        err && `nav:${err}`,
        blank && 'BLANK',
        preamble && 'PREAMBLE-ERROR',
        !needleOk && `missing /${needleRe}/`,
        pageErrors.length && `pageerr:${pageErrors[0].slice(0, 80)}`,
      ].filter(Boolean).join(' | ')),
  );
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} routes rendered OK in Chromium`);
if (failed.length) {
  console.log('\n--- failure detail ---');
  for (const f of failed) {
    console.log(`\n${f.role} ${f.path}`);
    if (f.err) console.log('  nav error:', f.err);
    if (f.pageErrors.length) console.log('  page errors:', f.pageErrors);
    if (f.consoleErrors.length) console.log('  console errors:', f.consoleErrors.slice(0, 3));
    if (f.failedReq.length) console.log('  failed requests:', f.failedReq.slice(0, 3));
    console.log('  #root text:', JSON.stringify(f.sample));
  }
}
process.exit(failed.length ? 1 : 0);
