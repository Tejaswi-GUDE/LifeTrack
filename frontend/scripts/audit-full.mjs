/**
 * FULL route + interaction audit in real Chromium.
 *  - loads every route (params filled from live data) as the right role
 *  - records console errors, page exceptions, failed requests, 4xx/5xx API calls
 *  - flags blank pages, "Screen not built yet", undefined/NaN in the DOM
 *  - exercises key interactions (filters, tabs, row → detail navigation)
 *
 *   backend + frontend dev servers running, then:
 *   node scripts/audit-full.mjs
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const API = 'http://localhost:4000';

const j = async (p) => (await fetch(`${API}${p}`)).json();
const trainees = (await j('/api/trainees')).trainees;
const ravi = trainees.find((t) => t.name.includes('Ravi')).id;
const amit = trainees.find((t) => t.name.includes('Amit')).id;
const providers = (await j('/api/providers')).providers;
const provId = providers.find((p) => /Ranchi Skill Mission/.test(p.name)).id;
const courses = (await j('/api/courses')).courses;
const courseId = courses[0].id;
const vers = (await j('/api/verifications')).verifications;
const pendingVer = (vers.find((v) => v.status === 'pending') || vers[0]).id;
const fups = (await j('/api/followups')).followups;
const schedId = (fups.find((f) => f.status === 'scheduled') || fups[0]).id;

// [role, path, needleRegex-or-null]
const ROUTES = [
  ['government', '/', null],
  ['government', '/login', 'Choose a role'],
  ['government', '/ui', 'primitives'],
  ['government', '/government/dashboard', 'Skilling Outcomes|Placement Rate'],
  ['government', '/government/analytics', 'Total trained|Provider comparison'],
  ['government', `/government/district/Ranchi`, 'Provider comparison|Total trained'],
  ['government', '/government/providers', 'performance'],
  ['government', '/government/provider-comparison', 'performance'],
  ['government', `/government/provider/${provId}`, 'Completion rate|Cohort'],
  ['government', '/government/skill-intelligence', 'demand|missing'],
  ['government', '/government/settings', 'Session|Privacy'],
  ['government', '/admin/seed', 'Reset demo data'],
  ['provider', '/provider/dashboard', 'Completion rate|Cohort'],
  ['provider', '/provider/trainees', 'Trainees'],
  ['provider', `/provider/trainee/${ravi}`, 'Career Timeline'],
  ['provider', '/provider/followups', 'follow-up'],
  ['provider', '/provider/risk', 'Outcome Risk|Recommended'],
  ['provider', '/provider/interventions', 'intervention'],
  ['provider', '/provider/skill-gaps', 'skill'],
  ['provider', `/provider/course/${courseId}/skill-gap`, 'skill'],
  ['provider', '/provider/analytics', 'Total trained|comparison'],
  ['provider', '/provider/settings', 'Session'],
  ['counsellor', '/counsellor/worklist', 'Outcome Risk|Recommended'],
  ['counsellor', '/counsellor/trainees', 'Trainees'],
  ['counsellor', `/counsellor/trainee/${amit}`, 'Career Timeline'],
  ['counsellor', '/counsellor/followups', 'follow-up'],
  ['counsellor', '/counsellor/settings', 'Session'],
  ['trainee', '/trainee/home', 'My Career|Recommended next steps'],
  ['trainee', '/trainee/timeline', 'timeline|Career'],
  ['trainee', '/trainee/followups', 'follow-up'],
  ['trainee', `/trainee/followup/${schedId}`, 'check-in'],
  ['trainee', '/trainee/consent', 'Consent'],
  ['employer', '/employer/dashboard', 'Verification requests|Employees'],
  ['employer', '/employer/verifications', 'Verification'],
  ['employer', '/employer/settings', 'Session'],
  ['employer', `/employer/verify/${pendingVer}`, 'confirm this employment|verification'],
  ['government', '/nonexistent-route-xyz', 'not found|no screen'],
];

const browser = await chromium.launch();
const rows = [];

for (const [role, path, needle] of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((r) => { try { localStorage.setItem('lifetrack.session', JSON.stringify({ role: r, name: r })); } catch {} }, role);
  const page = await ctx.newPage();
  const cerr = [];
  const perr = [];
  const netfail = [];
  const apibad = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource: the server responded with a status of 4\d\d.*fonts\.g/.test(m.text())) cerr.push(m.text()); });
  page.on('pageerror', (e) => perr.push(e.message));
  page.on('requestfailed', (r) => { if (!/fonts\.g(oogle|static)apis?\.com/.test(r.url())) netfail.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`); });
  page.on('response', (r) => { if (r.url().includes('/api/') && !r.url().includes('/src/') && r.status() >= 400) apibad.push(`${r.status()} ${r.url().replace(BASE, '')}`); });

  let err = null;
  let text = '';
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2600);
    text = (await page.locator('#root').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  } catch (e) { err = e.message; }

  const blank = text.length < 25;
  const placeholder = /Screen not built yet|Application shell step/i.test(text);
  const undef = /\bundefined\b|\bNaN\b|\[object Object\]/.test(text);
  const preamble = /can't detect preamble/i.test(text) || perr.some((e) => /preamble/i.test(e));
  const needleOk = !needle || new RegExp(needle, 'i').test(text);
  const ok = !err && !blank && !placeholder && !undef && !preamble && needleOk && perr.length === 0 && cerr.length === 0 && netfail.length === 0 && apibad.length === 0;

  rows.push({ role, path, ok, err, blank, placeholder, undef, preamble, needleOk, cerr, perr, netfail, apibad, sample: text.slice(0, 80) });
  const flags = ok ? '' : [
    err && `NAV:${err.slice(0, 40)}`, blank && 'BLANK', placeholder && 'PLACEHOLDER', undef && 'UNDEFINED/NaN', preamble && 'PREAMBLE',
    !needleOk && `no /${needle}/`,
    perr.length && `pageerr(${perr.length})`, cerr.length && `consoleerr(${cerr.length})`,
    netfail.length && `netfail(${netfail.length})`, apibad.length && `api${apibad[0]}`,
  ].filter(Boolean).join(' ');
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${role.padEnd(10)} ${path.padEnd(46)} ${flags}`);
  await ctx.close();
}

await browser.close();
const failed = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - failed.length}/${rows.length} routes clean`);
if (failed.length) {
  console.log('\n===== FAILURE DETAIL =====');
  for (const f of failed) {
    console.log(`\n${f.role} ${f.path}`);
    if (f.err) console.log('  nav:', f.err);
    if (f.perr.length) console.log('  pageerrors:', f.perr);
    if (f.cerr.length) console.log('  console errors:', f.cerr.slice(0, 4));
    if (f.netfail.length) console.log('  network fails:', f.netfail.slice(0, 4));
    if (f.apibad.length) console.log('  bad API:', f.apibad.slice(0, 4));
    if (f.undef) console.log('  DOM has undefined/NaN — sample:', JSON.stringify(f.sample));
    if (!f.needleOk) console.log('  missing needle — sample:', JSON.stringify(f.sample));
  }
}
process.exit(failed.length ? 1 : 0);
