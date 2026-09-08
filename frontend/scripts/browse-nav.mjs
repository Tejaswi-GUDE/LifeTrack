/**
 * Browser check of navigation flows + error handling (Chromium/Playwright).
 *   1. backend + frontend dev servers running
 *   2. node scripts/browse-nav.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BROWSE_BASE || 'http://localhost:5173';
const results = [];
const check = (name, ok, extra) => {
  results.push([name, ok]);
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${ok ? '' : extra ? `  (${extra})` : ''}`);
};

const browser = await chromium.launch();

async function ctxFor(role) {
  const ctx = await browser.newContext();
  await ctx.addInitScript((r) => {
    try { localStorage.setItem('lifetrack.session', JSON.stringify({ role: r, name: r })); } catch {}
  }, role);
  return ctx;
}

/* ---- 1. sidebar navigation (government) ---- */
{
  const ctx = await ctxFor('government');
  const page = await ctx.newPage();
  await page.goto(`${BASE}/government/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  for (const [label, expectPath, expectText] of [
    ['Analytics', '/government/analytics', /Provider comparison|Total trained/i],
    ['Providers', '/government/providers', /performance/i],
    ['Skill Intelligence', '/government/skill-intelligence', /demand|missing/i],
    ['Settings / Consent', '/government/settings', /Session/i],
    ['Overview', '/government/dashboard', /Skilling Outcomes|Placement Rate/i],
  ]) {
    await page.locator(`.sidebar nav a`, { hasText: new RegExp(`^${label}$`) }).first().click();
    await page.waitForTimeout(1400);
    const url = new URL(page.url()).pathname;
    const txt = (await page.locator('#root').innerText()).replace(/\s+/g, ' ');
    check(`sidebar "${label}" → ${expectPath}`, url === expectPath && expectText.test(txt), `at ${url}`);
  }
  await ctx.close();
}

/* ---- 2. internal navigation: provider dashboard → trainee profile ---- */
{
  const ctx = await ctxFor('provider');
  const page = await ctx.newPage();
  await page.goto(`${BASE}/provider/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const row = page.locator('table.tbl tbody tr', { hasText: /Ravi|Deepak|Sana|Amit/ }).first();
  const has = (await row.count()) > 0;
  check('provider dashboard shows an at-risk trainee row', has);
  if (has) {
    await row.click();
    await page.waitForTimeout(2000);
    const url = new URL(page.url()).pathname;
    const txt = (await page.locator('#root').innerText()).replace(/\s+/g, ' ');
    check('at-risk row → /provider/trainee/:id (Career Timeline)', /^\/provider\/trainee\/[a-f0-9]{24}$/.test(url) && /Career Timeline/i.test(txt), `at ${url}`);
  }
  await ctx.close();
}

/* ---- 3. internal navigation: risk center → full profile ---- */
{
  const ctx = await ctxFor('counsellor');
  const page = await ctx.newPage();
  await page.goto(`${BASE}/counsellor/worklist`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const link = page.locator('a', { hasText: /View full profile/i }).first();
  const has = (await link.count()) > 0;
  check('risk center detail shows "View full profile" link', has);
  if (has) {
    await link.click();
    await page.waitForTimeout(2000);
    const txt = (await page.locator('#root').innerText()).replace(/\s+/g, ' ');
    check('risk center → full trainee profile', /Career Timeline/i.test(txt));
  }
  await ctx.close();
}

// only intercept real backend endpoints, never Vite dev modules under /src/
const isBackend = (u) => /\/api\/(dashboards|trainees|analytics|followups|interventions|verifications|courses|providers|employers|health|admin)\b/.test(u) && !u.includes('/src/');

/* ---- 4. error handling: API 500 must NOT blank the page ---- */
{
  const ctx = await ctxFor('government');
  const page = await ctx.newPage();
  await page.route((u) => isBackend(u.toString()), (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }));
  await page.goto(`${BASE}/government/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const txt = (await page.locator('#root').innerText()).replace(/\s+/g, ' ');
  const shellVisible = /Overview|Providers|Analytics/.test(txt); // sidebar still there
  const errVisible = /Couldn't load|Retry/i.test(txt);
  check('API 500 → visible error state, shell still usable (not blank)', txt.length > 60 && errVisible && shellVisible, txt.slice(0, 90));
  await ctx.close();
}

/* ---- 5. error handling: network down (backend aborted) ---- */
{
  const ctx = await ctxFor('trainee');
  const page = await ctx.newPage();
  await page.route((u) => isBackend(u.toString()), (r) => r.abort());
  await page.goto(`${BASE}/trainee/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const txt = (await page.locator('#root').innerText()).replace(/\s+/g, ' ');
  check('network failure → error state, not blank', txt.length > 40 && /Couldn't load|Retry|error/i.test(txt), txt.slice(0, 90));
  await ctx.close();
}

/* ---- 6. bad :id → 404-safe, not blank ---- */
{
  const ctx = await ctxFor('provider');
  const page = await ctx.newPage();
  await page.goto(`${BASE}/provider/trainee/000000000000000000000000`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const txt = (await page.locator('#root').innerText()).replace(/\s+/g, ' ');
  check('unknown trainee id → error state, not blank', txt.length > 40 && /Couldn't load|Retry|not found/i.test(txt), txt.slice(0, 80));
  await ctx.close();
}

await browser.close();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} navigation / error-handling checks passed`);
process.exit(failed.length ? 1 : 0);
