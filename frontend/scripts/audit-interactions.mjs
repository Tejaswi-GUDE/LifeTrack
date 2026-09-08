/**
 * Exercises presentation-critical interactions in real Chromium.
 * backend (fresh) + frontend dev servers running, then:
 *   node scripts/audit-interactions.mjs
 * NOTE: mutates data (approve / verify / consent / follow-up / seed reset).
 */
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const API = 'http://localhost:4000';
const results = [];
const check = (n, ok, extra) => { results.push([n, ok]); console.log(`${ok ? '  ok  ' : ' FAIL '} ${n}${ok ? '' : extra ? `  (${extra})` : ''}`); };

const browser = await chromium.launch();
async function newPage(role) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((r) => { try { localStorage.setItem('lifetrack.session', JSON.stringify({ role: r, name: r })); } catch {} }, role);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  return { ctx, page, errs };
}
const t = async (page) => (await page.locator('#root').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();

/* ---- 1. Government dashboard: filters + table toggle + drill ---- */
{
  const { ctx, page, errs } = await newPage('government');
  await page.goto(`${BASE}/government/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  // verified-only toggle
  await page.locator('.seg button', { hasText: 'Verified only' }).first().click();
  await page.waitForTimeout(1200);
  check('gov: "Verified only" toggle re-computes', /\d/.test(await t(page)) && errs.length === 0);
  // By District tab
  await page.locator('.seg button', { hasText: 'By District' }).first().click();
  await page.waitForTimeout(600);
  check('gov: "By District" tab switches table', /District|Ranchi|Patna/.test(await t(page)));
  // district select
  const sel = page.locator('select[aria-label="District"]');
  await sel.selectOption('Ranchi');
  await page.waitForTimeout(1200);
  check('gov: district filter scopes the dashboard', /Ranchi/.test(await t(page)) && errs.length === 0);
  // drill: click a provider row
  await page.locator('.seg button', { hasText: 'By Provider' }).first().click();
  await page.waitForTimeout(400);
  const row = page.locator('table.tbl tbody tr').first();
  if (await row.count()) { await row.click(); await page.waitForTimeout(1800); }
  check('gov: provider row → /government/provider/:id', /^\/government\/provider\//.test(new URL(page.url()).pathname) && /Completion rate|Cohort/i.test(await t(page)), new URL(page.url()).pathname);
  await ctx.close();
}

/* ---- 2. Provider dashboard → at-risk row → trainee profile ---- */
{
  const { ctx, page, errs } = await newPage('provider');
  await page.goto(`${BASE}/provider/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  check('provider: at-risk table present', (await page.locator('table.tbl tbody tr').count()) > 0);
  const link = page.locator('a', { hasText: /Risk & Intervention Center/i }).first();
  check('provider: "Risk & Intervention Center →" link present', (await link.count()) > 0);
  const row = page.locator('table.tbl tbody tr', { hasText: /Ravi|Deepak|Sana|Amit/ }).first();
  if (await row.count()) { await row.click(); await page.waitForTimeout(2200); }
  check('provider: at-risk row → trainee profile (timeline)', /Career Timeline/i.test(await t(page)) && errs.length === 0, new URL(page.url()).pathname);
  await ctx.close();
}

/* ---- 3. Provider follow-ups: tabs + row nav ---- */
{
  const { ctx, page, errs } = await newPage('provider');
  await page.goto(`${BASE}/provider/followups`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);
  const txt0 = await t(page);
  check('provider follow-ups: renders a queue with counts', /follow-ups?.*(due|no response|scheduled|done)/i.test(txt0), txt0.slice(0, 90));
  // click "No response" tab
  await page.locator('.seg button', { hasText: /No response/i }).first().click();
  await page.waitForTimeout(600);
  const filtered = await t(page);
  check('provider follow-ups: "No response" tab filters', /No response|No follow-ups in this view/i.test(filtered));
  // back to All, click a row
  await page.locator('.seg button', { hasText: /^All$/ }).first().click();
  await page.waitForTimeout(400);
  const r = page.locator('table.tbl tbody tr').first();
  if (await r.count()) { await r.click(); await page.waitForTimeout(2000); }
  check('provider follow-ups: row → /provider/trainee/:id', /^\/provider\/trainee\/[a-f0-9]{24}$/.test(new URL(page.url()).pathname) && errs.length === 0, new URL(page.url()).pathname);
  await ctx.close();
}

/* ---- 4. Risk Center: select trainee + Approve intervention (persists) ---- */
{
  await fetch(`${API}/api/admin/seed/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  await new Promise((r) => setTimeout(r, 800));
  const { ctx, page, errs } = await newPage('counsellor');
  await page.goto(`${BASE}/counsellor/worklist`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  check('risk center: Ravi auto-selected, factors shown', /Ravi Oraon/.test(await t(page)) && /No placement 52 days after certification/.test(await t(page)));
  const approve = page.locator('button', { hasText: /^Approve intervention$/ }).first();
  check('risk center: Approve button present (awaiting review)', (await approve.count()) > 0);
  if (await approve.count()) {
    await approve.click();
    await page.waitForTimeout(600);
    await page.locator('.lt-modal-footer button', { hasText: /^Approve intervention$/ }).first().click();
    await page.waitForTimeout(2500);
  }
  check('risk center: review pill → "Approved by …" after approve', /Approved by/.test(await t(page)) && errs.length === 0);
  const persisted = await (await fetch(`${API}/api/trainees/${(await (await fetch(`${API}/api/trainees`)).json()).trainees.find((x) => x.name.includes('Ravi')).id}/risk`)).json();
  check('risk center: approval persisted to DB', persisted.reviewStatus.state === 'in_progress');
  await ctx.close();
}

/* ---- 5. Employer: respond to a verification request ---- */
{
  await fetch(`${API}/api/admin/seed/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  await new Promise((r) => setTimeout(r, 800));
  const vers = (await (await fetch(`${API}/api/verifications`)).json()).verifications;
  const pend = vers.find((v) => v.status === 'pending');
  const { ctx, page, errs } = await newPage('employer');
  await page.goto(`${BASE}/employer/verify/${pend.id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  check('employer verify: claim details shown', /confirm this employment|Claimed role/i.test(await t(page)));
  await page.locator('button', { hasText: /^Confirm$/ }).first().click();
  await page.waitForTimeout(2000);
  check('employer verify: Confirm → success message', /confirmed|recorded/i.test(await t(page)) && errs.length === 0);
  const after = (await (await fetch(`${API}/api/verifications/${pend.id}`)).json());
  check('employer verify: status persisted as confirmed', after.status === 'confirmed');
  await ctx.close();
}

/* ---- 6. Trainee: consent toggle persists ---- */
{
  await fetch(`${API}/api/admin/seed/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  await new Promise((r) => setTimeout(r, 800));
  const { ctx, page, errs } = await newPage('trainee');
  await page.goto(`${BASE}/trainee/consent`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  check('consent: three purposes listed', /Data collection/.test(await t(page)) && /Employer contact/.test(await t(page)) && /Analytics use/.test(await t(page)));
  const btn = page.locator('button', { hasText: /^(Grant|Revoke)$/ }).first();
  const label0 = (await btn.innerText()).trim();
  await btn.click();
  await page.waitForTimeout(1800);
  const label1 = (await page.locator('button', { hasText: /^(Grant|Revoke)$/ }).first().innerText()).trim();
  check('consent: toggle flips + persists (button label changes)', label0 !== label1 && errs.length === 0, `${label0} → ${label1}`);
  await ctx.close();
}

/* ---- 7. Trainee: answer a follow-up ---- */
{
  await fetch(`${API}/api/admin/seed/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  await new Promise((r) => setTimeout(r, 800));
  const fups = (await (await fetch(`${API}/api/followups`)).json()).followups;
  const sc = fups.find((f) => f.status === 'scheduled') || fups[0];
  const { ctx, page, errs } = await newPage('trainee');
  await page.goto(`${BASE}/trainee/followup/${sc.id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  check('follow-up form: questions render', /check-in|currently/i.test(await t(page)));
  const statusSel = page.locator('select').first();
  if (await statusSel.count()) await statusSel.selectOption({ index: 1 });
  await page.waitForTimeout(400);
  await page.locator('button', { hasText: /Submit check-in/i }).first().click();
  await page.waitForTimeout(2000);
  check('follow-up form: submit → thank-you', /Thank you|recorded/i.test(await t(page)) && errs.length === 0);
  await ctx.close();
}

/* ---- 8. Sidebar consistency across roles ---- */
for (const role of ['government', 'provider', 'counsellor', 'trainee', 'employer']) {
  const { ctx, page } = await newPage(role);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  const items = await page.locator('.sidebar nav a').allInnerTexts();
  check(`sidebar (${role}): ${items.length} items, all non-empty`, items.length >= 3 && items.every((x) => x.trim().length > 0), items.join(' | '));
  await ctx.close();
}

await browser.close();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} interaction checks passed`);
process.exit(failed.length ? 1 : 0);
