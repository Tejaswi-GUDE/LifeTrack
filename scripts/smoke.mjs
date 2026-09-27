#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = './docs/screenshots';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const ROLES = [
  { role: 'government', name: 'Dept. of Skill Development (State)', home: '/government/dashboard' },
  { role: 'provider', name: 'Ranchi Skill Mission Center - Admin', home: '/provider/dashboard' },
  { role: 'trainee', name: 'Priya Kumari', home: '/trainee/home' },
  { role: 'counsellor', name: 'Sunita Rao', home: '/counsellor/worklist' },
  { role: 'employer', name: 'CityMart Stores', home: '/employer/dashboard' },
];

const ROUTES_BY_ROLE = {
  government: [
    '/government/dashboard',
    '/government/providers',
    '/government/skill-intelligence',
    '/government/analytics',
  ],
  provider: [
    '/provider/dashboard',
    '/provider/trainees',
    '/provider/followups',
    '/provider/risk',
    '/provider/interventions',
  ],
  trainee: [
    '/trainee/home',
    '/trainee/timeline',
    '/trainee/followups',
    '/trainee/consent',
  ],
  counsellor: [
    '/counsellor/worklist',
    '/counsellor/trainees',
    '/counsellor/followups',
  ],
  employer: [
    '/employer/dashboard',
  ],
};

async function captureScreenshot(page, filename) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filePath });
  console.log(`  ✓ Screenshot: ${filename}`);
}

async function runSmokeTest() {
  const browser = await chromium.launch();
  const results = {
    passed: 0,
    failed: 0,
    errors: [],
  };

  for (const roleInfo of ROLES) {
    console.log(`\n📱 Testing ${roleInfo.role}...`);

    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const errors = [];
    const failedRequests = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`${msg.text()}`);
      }
    });

    // Capture failed requests
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.url()} (${response.status()})`);
      }
    });

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.selectOption('select:first-of-type', roleInfo.role);
    if (roleInfo.role !== 'government' && roleInfo.role !== 'counsellor') {
      await page.click('select:nth-of-type(2)');
      await page.click('select:nth-of-type(2) option');
    }
    await page.click('button:has-text("Enter")');
    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 5000 });

    // Test routes
    const routes = ROUTES_BY_ROLE[roleInfo.role] || [];
    for (const route of routes) {
      try {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 10000 });

        // Capture screenshots at different viewports
        for (const viewport of [1280, 390]) {
          await page.setViewportSize({ width: viewport, height: 800 });
          for (const theme of ['light', 'dark']) {
            const themeName = theme === 'dark' ? '-dark' : '';
            const filename = `${roleInfo.role}_${route.slice(1).replace(/\//g, '_')}_${viewport}w${themeName}.png`;
            await captureScreenshot(page, filename);

            // Toggle theme
            const themeBtn = await page.$('[aria-label*="theme"], [title*="mode"]');
            if (themeBtn) await themeBtn.click();
          }
        }

        console.log(`  ✓ ${route}`);
        results.passed += 1;
      } catch (err) {
        console.log(`  ✗ ${route}: ${err.message}`);
        results.failed += 1;
        results.errors.push(`${roleInfo.role} ${route}: ${err.message}`);
      }
    }

    // Close context
    if (errors.length > 0) {
      console.log(`  ⚠️ Console errors: ${errors.length}`);
      results.errors.push(...errors.map(e => `${roleInfo.role}: ${e}`));
    }
    if (failedRequests.length > 0) {
      console.log(`  ⚠️ Failed requests: ${failedRequests.length}`);
      results.errors.push(...failedRequests);
    }

    await context.close();
  }

  await browser.close();

  // Print summary
  console.log(`\n📊 Smoke Test Results`);
  console.log(`✓ Passed: ${results.passed}`);
  console.log(`✗ Failed: ${results.failed}`);
  if (results.errors.length > 0) {
    console.log(`\n⚠️ Errors:`);
    results.errors.forEach(e => console.log(`  - ${e}`));
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

runSmokeTest().catch(err => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
