# LifeTrack Upgrade Plan (for Claude Code)

## How to use this doc

LifeTrack already works end to end. This doc upgrades it in place, in small changes, keeping the name, stack, database and design system.

**For you (the developer):** save this file as `docs/LifeTrack_Upgrade_Plan.md` in the LifeTrack repo, open Claude Code at the repo root and send:

> Read docs/LifeTrack\_Upgrade\_Plan.md and follow it. Start with Step 0.

After each change, click through its **Check** list, then type **next**. If something breaks, type **fix: \<what you see>**.

**For Claude Code (follow exactly):**

1. Do Step 0 first, then the changes in this order: **1, 2, 3, 4, 9**, then 5, 6, 7, 8.
2. Do **one change at a time**. The code block under each change is the full task spec for it.
3. Adapt every change to this app. The file names, routes and fields in the specs are guides, not orders: use the app's real files, models, routes and naming. Before coding a change, go through the relevant files and check each feature in the spec: mark it \*\*Already there\*\*, \*\*Partly there\*\* or \*\*Missing\*\*. Show that checklist with a short plan (files you will touch), then build only what is missing and complete what is partial. Never rebuild something that already works.
4. When a change is finished: restart the backend (it re-seeds), build the frontend, open every page you changed as each relevant role, and confirm **zero console errors and zero failed requests**. Then commit (`git commit -m "Change N: <name>"`), list the files changed and what I should click, and **stop and wait for "next"**.
5. Keep the product name **LifeTrack**. Don't change the stack or database, don't re-scaffold, don't delete working features. Reuse existing components, page layouts, `tokens.css` and API patterns; the existing `Timeline.jsx` is the reference for every timeline. No hard-coded colours.
6. If a spec below conflicts with how the code already works, prefer the existing pattern and tell me.
7. When I write "fix: …", follow the Fix-it section.

## What LifeTrack already has vs what to add

LifeTrack covers the core loop; the additions below close the remaining gaps against the problem statement.

| Area | LifeTrack today | Add | Change | Priority |
| --- | --- | --- | --- | --- |
| Theme and login | Existing logo, `tokens.css`, light only | Dark theme toggle, polished split-screen login | 1 | Demo-critical |
| Outcome model | Employed, self-employed, apprentice, unemployed, job lost; confidence High/Med/Low with decay | Further education and Not responding states, verification levels L0–L5 beside confidence, Conflicted state, unknown % and honest denominators, "Verified only" toggle | 2 | Demo-critical |
| Follow-ups | 30/90/180/365 schedule; trainee logs in to answer | WhatsApp → SMS → IVR → alternate contact → assisted agent ladder, mock phone, field agent queue, free-text replies, channel preference | 3 | Demo-critical |
| Verification | Zero-login employer link (Confirm / Dispute / No record), assisted field verification | Evidence upload + review, simulated EPFO/Udyam match (L5), conflict alerts, dispute workflow queue, bulk confirm | 4 | Demo-critical |
| Intelligence | Risk score (points), skill match, attrition risk, root cause, counsellor approval | Stated vs inferred reason side by side, intervention effectiveness, curriculum feedback, risk re-calculation shown on timeline | 5 | Strong extra |
| Government | District aggregates, retention, wage curves, skill gaps | Equity analytics with small-cell suppression, provider scorecard with sample size, early-warning alerts, cost per outcome, data quality view, reasons analytics | 6 | Strong extra |
| Provider data | Trainee list and profile inspection | CSV import, privacy-preserving (hashed) identity matching, duplicate review and merge | 7 | Strong extra |
| Employer | Verification portal + hiring dashboard | Job posts with skill extraction, feedback on hires, exit reporting | 8 | Extra |
| Privacy | DPDP consent toggles + immutable audit logs | Per-category × per-recipient consent matrix, access history for trainee | 2 / 9 | Nice |
| Demo | 8 seeded personas | + Lakshmi (full journey) and Meena (further education), guided demo, smoke test | 9 | Demo-critical |

## Step 0: Audit the repo and write CLAUDE.md

Run once. It makes Claude Code learn LifeTrack's patterns before changing anything, and records the rules every later session follows.

```text
This repo is LifeTrack, my own working MERN app for SIH (skilling outcome tracking). We will upgrade
it by EDITING this codebase — not rebuilding it. In Step 0, do not change any app code. Only create a
branch, read, run, and write two files.

0. git checkout -b lifetrack-upgrade

1. Read docs/ (02_Architecture.md, 03_Build_Spec.md, 04_Design_System.md), backend/src (app.js,
   models/, routes/, lib/intelligence.js, lib/traineeProfile.js, lib/governmentDashboard.js, seed/),
   and frontend/src (App.jsx, config/nav.js, context/SessionContext.jsx, styles/tokens.css,
   components/shell/AppShell.jsx, components/Timeline.jsx, components/charts/, pages/).

2. Start the app (backend: npm run dev; frontend: npm run dev) and confirm it works. Log in as each
   role via the session switcher and note any console errors or failing requests.

3. Write docs/LIFETRACK_AUDIT.md:
   - how routing, auth (x-demo-user-id / JWT), API calls and role scoping work
   - the design system: tokens, typography, spacing, card/table/badge/button patterns, chart
     components, and how Timeline.jsx is built (the reference timeline style)
   - every model and its fields; every route and which page uses it
   - existing bugs or console errors you found
   - a feature inventory: go through every change in docs/LifeTrack_Upgrade_Plan.md and mark each
     feature Already there / Partly there / Missing, with the file where it lives

4. Create CLAUDE.md at the repo root with these rules (plus anything you learned that matters):

   # LifeTrack — rules
   - Product: LifeTrack tracks trainees after skilling (jobs, self-employment, apprenticeship,
     further education, wage, retention), verifies outcomes, flags risk and drives interventions.
   - Upgrade plan: docs/LifeTrack_Upgrade_Plan.md — one change at a time, stop after each.
   - EDIT EXISTING CODE. Never re-scaffold, never switch stack or database, never delete working
     features. Reuse existing components, page layouts and API patterns.
   - Visual consistency: new UI must use tokens.css variables and the existing component patterns
     so it looks native. Timeline.jsx is the reference for all timelines. No hard-coded colours.
   - Every page: loading, empty and error states; works at 375px and desktop; no console errors.
   - Backend: follow the existing route/model/lib structure; business logic in lib/, not routes.
   - Every score and badge explains itself (tooltip or "Why?").
   - Placement rate denominator = all certified trainees; always show unknown %.
   - Government views show aggregates only; hide groups smaller than 10.
   - Before saying done: restart backend (re-seeds), run frontend build, click through the changed
     pages as each relevant role, report console errors (must be zero), commit, list files changed.

Finish with a 10-line summary of the audit and anything I should fix first, then wait for "next".
```

**Check:** `CLAUDE.md` and `docs/LIFETRACK_AUDIT.md` exist; the app still runs. Commit: `Kickoff: audit`.

## Change 1: Dark theme and login polish

LifeTrack gets a light/dark toggle driven by `tokens.css` and a polished split-screen login; the name and logo stay LifeTrack.

```text
Read CLAUDE.md and docs/LIFETRACK_AUDIT.md. Change 1 = dark theme + login polish. Plan first.

1. Logo: keep the existing LifeTrack logo. Wrap it in components/brand/Logo.jsx with variant "auto"
   (adapts to theme) or "onDark" (readable on the dark sidebar/login panel — use a light version of
   the mark/wordmark via CSS or an existing asset). Use <Logo /> everywhere the logo appears.

2. Dark theme in tokens.css:
   - Keep all existing token names. Add a [data-theme="dark"] block redefining every colour token
     (background, surfaces, borders, text, muted text, primary, status colours, chart colours) with
     readable dark values (WCAG AA). The sidebar stays dark in both themes.
   - If palette colours are hard-coded anywhere in components, move them into tokens first.
   - ThemeContext: light/dark, saved in localStorage "lifetrack-theme", default = system
     preference; a small inline script in index.html sets data-theme before React loads (no flash).
   - components/brand/ThemeToggle.jsx: 36px icon button, Moon in light / Sun in dark, tooltip,
     aria-label. Put it in the AppShell top bar (left of notifications) and on the login page.
   - Check EVERY page and SVG chart in dark mode; fix unreadable text, borders and chart colours.

3. Login page (split screen, same design language as the app):
   - LEFT panel (~55%, always the dark sidebar colour): <Logo variant="onDark" /> top-left; headline
     in two lines "Every trainee's journey," / "tracked beyond day one." (44-48px, semibold,
     off-white); supporting line "LifeTrack follows skilling outcomes from certification to
     lasting livelihoods — verified, private, and actionable."; three outlined stat cards at the
     bottom with live numbers from a new GET /api/public/stats (Trainees tracked, Outcomes known %,
     Employer-verified %).
   - RIGHT panel: theme toggle top-right; form centred (max 390px): "Welcome back", subtitle,
     Email and Password inputs (44px, token borders, focus ring, eye toggle INSIDE the password
     field), "Forgot password?" link on the password label row, full-width primary "Sign in".
   - Under the form, a styled "Try a demo account" section with role cards/pills (Trainee,
     Training provider, Counsellor, Employer, Government) that log in instantly using the existing
     demo session mechanism.
   - Mobile: left panel becomes a compact dark header with logo + headline.

4. Keep the role switcher available inside the app (user menu → "Switch demo role") for judges.

Done when: frontend builds, every role's pages render in light and dark with zero console errors,
login works for every role. Commit, list files changed, wait for "next".
```

**Check:** toggle works on login and in the app · every page readable in dark mode · every role logs in from the login page.

## Change 2: Outcome model upgrades

Outcomes get the PRD's full set of states, a visible verification level next to confidence, honest denominators, and a finer consent matrix.

```text
Read CLAUDE.md. Change 2 = outcome model upgrades. Plan first; list model/field changes before coding.

1. Outcome states: add "further_education" (a POSITIVE outcome, not counted as unplaced) and
   "not_responding" (all follow-up attempts failed; shown separately from "unknown" = never
   contacted). Update enums, follow-up answers, intelligence.js, dashboards, filters, badges, seed.

2. Verification level beside the existing confidence tier:
   L0 Unknown · L1 Self-reported · L2 Assisted (agent/field) · L3 Document verified ·
   L4 Employer confirmed · L5 Official record (simulated EPFO/Udyam/NAPS).
   Store level + source + actor + date on each outcome, keep a verification history array.
   Map to confidence: L4-L5 High, L1-L3 Medium, decay rules stay as they are; add "Conflicted"
   (purple token) when sources disagree.
   Update the confidence badge component to show "High · L4" and a tooltip with the history
   ("Self-reported 12 Jun via follow-up → Employer confirmed 15 Jun").

3. Honest numbers (governmentDashboard.js + provider dashboards):
   - Placement rate = placed ÷ ALL certified trainees (unknown and not responding stay in the
     denominator). Show "Outcomes known %" and "Unknown %" as KPI cards.
   - Add an "All outcomes / Verified only" segmented control on provider and government
     dashboards; Verified only = L3+ and not conflicted. KPIs and charts recompute.
   - Every KPI card shows a small footnote "n = … · …% unknown".

4. Non-placement and exit reasons: structured lists (no suitable jobs, skill mismatch, salary too
   low, location, failed interviews, family reasons, further education, other / low pay, working
   conditions, role mismatch, migration, better offer, contract ended). Add to follow-up questions
   and store on the outcome.

5. Consent: extend the consent page into a matrix — categories (personal, contact, skills,
   employment, wage, demographic, documents) × recipients (training provider, employers,
   government-aggregate) with toggles, a plain-language purpose under each row, and an "Who
   accessed my data" table from audit logs. Enforce: employer-facing endpoints drop fields the
   trainee hasn't shared with employers.

6. Seed: add Meena (further education) and give existing personas proper verification levels and
   histories (Priya L4, Fatima L2 field visit, Deepak not_responding after decay, Neha Conflicted).

Done when: backend restarts and seeds cleanly, every dashboard shows unknown % and the toggle works,
badges show levels with history tooltips, zero console errors. List files changed.
```

**Check:** Priya shows "High · L4" with a history tooltip · Neha shows Conflicted · Meena counts as a positive outcome · the Verified-only toggle changes numbers · turning off "Wage → Employers" hides wage on the employer side. Commit: `Change 2: outcome model`.

## Change 3: Multi-channel follow-ups, mock phone, agent queue

This is the biggest differentiator: trainees no longer need to log in; follow-ups escalate across channels, and a mock phone lets you show it live.

```text
Read CLAUDE.md. Change 3 = low-burden follow-up engine. Keep the existing 30/90/180/365 scheduling in
routes/followups.routes.js and extend it. Plan first.

BACKEND
1. Channels and ladder: each follow-up task gets currentStep and attempts[]. Order: trainee's
   preferred channel first, then WhatsApp → SMS → IVR → alternate contact → assisted (agent queue)
   → not_responding. Configurable wait days between steps (default 3).
2. Trainee contacts: primary phone, alternate phone, alternate person (name + relation), preferred
   channel and time window. Seed these. Add persona Lakshmi Kumar (Data Entry Operator
   graduate, Telugu speaker, demo trainee login) if she doesn't exist; her primary number is
   "changed" so WhatsApp fails and the alternate contact (brother) gives the new number.
3. Mock channel adapter: outbound messages are stored in a MockMessage collection (trainee,
   channel, direction, body, time). One interface so real WhatsApp/SMS/IVR can plug in later.
4. Demo clock: GET/POST /api/dev/clock (simulated date) and POST /api/dev/run-followups that runs
   the scheduler immediately and advances ladders.
5. Inbound: POST /api/followups/inbound {traineeId|phone, channel, text|digits}. SMS/IVR codes:
   1 working, 2 looking, 3 own business, 4 studying. Free text → lib/extraction.js: if
   ANTHROPIC_API_KEY is set, call the Anthropic Messages API (model from ANTHROPIC_MODEL env) with a
   JSON-only prompt returning {status, employer, role, monthlyWage, reason, newPhone, confidence};
   otherwise a keyword/regex fallback that handles English, Hindi and Telugu-English mixes
   ("job vachindi", "naukri mil gayi", "16000 salary"). confidence < 0.7 → agent review queue.
   The bot asks the next short question (max 4). Answers create outcomes at L1, reportedVia channel.
6. Field agent: add role "field_agent" (demo user) with GET /api/agent/queue (high risk + oldest
   first), attempt logging (answered, no answer, wrong number, refused, call back), and the same
   answer form; saved outcomes are L2 Assisted with agent id.

FRONTEND (match existing page styles)
1. /dev/phone (demo tool, reachable from the user menu "Demo phone"): left = trainee picker,
   current ladder step, "Advance 3 days" and "Run follow-ups" buttons; centre = a realistic phone
   frame (≈380x780, rounded corners, notch) with tabs WhatsApp | SMS | Call. WhatsApp: chat header
   with LifeTrack avatar, outgoing/incoming bubbles with times, quick-reply chips, input box.
   SMS: plain bubbles. Call: IVR keypad + prompt transcript + "Say it" box for a voice reply.
   Live refresh every 2 s.
2. Provider "Follow-ups" page: KPIs (due this week, response rate, resolved automatically, with
   agents, not responding) + an escalation funnel of step cards (WhatsApp → SMS → IVR → Alternate
   → Agent → Not responding) with sent / answered / % + task table.
3. Agent portal (/agent): mobile-first queue cards (name, risk badge, reason, language, preferred
   time, big Call button); task screen with call script, big attempt-result buttons, then the
   question form. Review queue for low-confidence free-text: raw message left, extracted fields
   right, Confirm.
4. Trainee profile: preferred channel + time + alternate contacts editable.
5. Timeline: follow-up attempts and channel answers appear as events using the existing
   Timeline.jsx style.

Done when: in /dev/phone, advancing the clock shows WhatsApp → SMS → IVR for Lakshmi, a reply creates
an outcome, the agent can complete an unreachable case, zero console errors. List files changed.
```

**Check:** Lakshmi's ladder escalates in the mock phone · SMS reply "1" records employment · a free-text reply like "naaku job vachindi ABC lo, 16000 salary" is understood or sent to review · agent completes a case as Assisted (L2) · funnel numbers change. Commit: `Change 3: follow-up engine`.

## Change 4: Verification upgrades

The existing zero-login employer link stays; around it we add evidence review, simulated official records, conflict detection and a dispute workspace.

```text
Read CLAUDE.md. Change 4 = verification upgrades on top of the existing /employer/verify/:verificationId
flow. Plan first.

1. Employer verify page polish: use the same split layout as login (dark left panel with Logo and
   "Help us confirm a skilling outcome. It takes about 10 seconds. No login needed."); right panel
   shows a details card (trainee name, role, joining date, wage band — only fields the trainee
   consented to share) and three big buttons: "Yes, confirm" (primary), "Details differ" (opens a
   small correction form), "No record found" (danger outline). States: success, already used,
   expired (14-day expiry, single use). Confirm → L4 High everywhere in real time.

2. Evidence upload: trainees attach offer letter / salary slip / business photo (multer, pdf/jpg/png,
   5 MB, stored locally) from the follow-up form; provider reviews it (preview left, fields right,
   Approve/Reject) → Approve sets L3.

3. Simulated official records: seed an AdminRecord collection (source EPFO/Udyam/NAPS, hashed trainee
   id, employer, since). A job (and a "Run official match" dev button) upgrades matching outcomes to
   L5 with label "EPFO (simulated)". Karan's apprenticeship matches NAPS, Priya matches EPFO.

4. Conflict detection: trainee says employed but employer says no record; "Details differ" with a
   different wage/role; two follow-ups with wages >30% apart → outcome becomes Conflicted, excluded
   from verified counts, notification to provider.

5. Provider "Verification" page with tabs and count badges: Awaiting employer · Evidence to review ·
   Conflicts · Disputes · Field visits. Conflicts show both versions side by side (source, date,
   values, differences highlighted) with resolve buttons. Disputes: assign, add notes, resolve as
   confirmed / corrected / rejected; all audit-logged.

6. Bulk confirmation on the employer dashboard: select pending confirmations and confirm together.

Done when: Neha's "No record found" appears as a dispute, evidence approval sets L3, official match sets
L5, verify link states all work in a private window, zero console errors. List files changed.
```

**Check:** open a verify link logged out and confirm → badge turns High · L4 · Neha shows in Disputes · approving an offer letter gives L3 · "Run official match" gives Priya L5. Commit: `Change 4: verification`.

## Change 5: Intelligence upgrades

LifeTrack's risk engine already explains itself; we add stated-vs-inferred reasons, proof of which interventions work, and course-level feedback.

```text
Read CLAUDE.md. Change 5 = extend backend/src/lib/intelligence.js and the counsellor/provider pages.
Plan first.

1. Stated vs inferred: keep the existing root-cause tags as the INFERRED reason; store the trainee's
   STATED reason from follow-ups. On the trainee profile and counsellor case, show two cards side by
   side "Trainee says" / "Data suggests" with evidence; when they differ show a warning banner and
   flag the case "Needs review".

2. Risk explainability polish: RiskBadge popover lists each factor as "+30  Unplaced · 52 days since
   certification" with points right-aligned and a total. Add in-training factors if missing
   (attendance < 70% +15, assessment < 50% +15). Make weights configurable in one config object.

3. Close the loop: when an intervention is completed, auto-schedule a follow-up in 30 days and
   recompute risk; show the risk change as a timeline event (existing Timeline.jsx style) and a
   small before → after chip on the case.

4. Intervention effectiveness (provider page "Interventions"): success rate (placed or retained
   within 90 days of completion) by intervention type, course and district, as horizontal bars
   sorted by rate with n shown; bars with n < 20 faded + "small sample" tooltip.

5. Curriculum feedback (course detail): skills most often missing in graduates' actual jobs and in
   employer feedback, with % and n, turned into plain suggestions ("38% of Data Entry graduates lack
   Advanced Excel in their jobs — consider adding a module").

6. Counsellor worklist: if it's a list today, add a kanban view (Recommended, Approved, In progress,
   Completed) with count badges and drag to change status, keeping the existing list as a toggle.

Done when: Ravi's case shows stated vs inferred, approving and completing his intervention drops his
risk with a timeline event, effectiveness chart renders, zero console errors. List files changed.
```

**Check:** Ravi: approve → complete → risk drops and the timeline shows it · Sana shows a disagreement banner or attrition risk with reasons · Data Entry course shows a curriculum suggestion. Commit: `Change 5: intelligence`.

## Change 6: Government upgrades

The government dashboard gains equity, fair provider comparison, early warnings, cost per outcome and data quality, all aggregate-only.

```text
Read CLAUDE.md. Change 6 = extend lib/governmentDashboard.js and pages/government/. Every government
endpoint returns aggregates only and suppresses any group with fewer than 10 people (return
suppressed: true; UI shows "Suppressed (<10)"). All views respect the "Verified only" toggle and show
n and unknown %. Reuse the existing SVG chart components. Plan first.

1. Equity page: placement, retention and wage by gender, social category, disability, rural/urban,
   age band; a callout above each chart naming the biggest gap ("Placement gap: 17 points between
   men and women"). Seed must include these demographic fields.
2. Provider scorecard: separate columns (placement, 90-day retention, wage growth, skill relevance,
   verified %, unknown %, cohort size) with a thin uncertainty range per rate (Wilson interval);
   cohorts under 30 marked "Small cohort" and not ranked. No single blended score.
3. Early-warning alerts: flag providers whose placement, retention or response rate dropped >10 points
   vs their previous 2 quarters or the peer median; anomaly flags (one employer contact confirming
   many, wage outliers, many unverified provider-entered outcomes, repeated disputes).
4. Reasons view: top non-placement, dropout and exit reasons (stated vs inferred) by district/course.
5. Impact and cost: baseline vs after employment and income, retention curve 90/180/365, cost per
   certified trainee / placement / 90-day retained job / verified outcome (seed a cost per
   programme), with a note "Descriptive comparison, not causal proof".
6. Data quality: coverage (outcomes known %), response rate, verification rate, freshness by provider
   and district as a colour-coded table; warn on any KPI based on < 60% coverage.
7. Drill-down with breadcrumb: district → provider → course → cohort, with a Period A vs B compare.

Done when: all views render with seed data in light and dark, a tiny filter shows "Suppressed
(<10)", zero console errors. List files changed.
```

**Check:** equity page shows a gap callout · a small provider is unranked · an alert appears for a declining provider · cost per outcome shows ₹ values · drill-down and breadcrumb work. Commit: `Change 6: government`.

## Change 7: Provider import and identity matching

Providers can bring in spreadsheets from other programmes, and the same person is linked into one record without storing raw IDs.

```text
Read CLAUDE.md. Change 7 = CSV import + privacy-preserving identity matching + duplicate review for
the provider role. Plan first.

BACKEND
- lib/identity.js: idToken = HMAC-SHA256(ID_HASH_SALT env, normalised government-style ID). Never
  store raw IDs (migrate any existing raw ID fields to tokens in the seed).
- Match order: exact idToken or any known phone → link. Otherwise score 0-100 from name similarity
  (normalise case, spaces, initials; tolerant of Laxmi/Lakshmi-type spellings; Jaro-Winkler),
  date of birth, gender, district, phone history, with a reasons list. ≥85 auto-link, 60-84 →
  DuplicateCandidate for review, <60 new trainee. DOB or gender conflict always goes to review.
- Import endpoints: upload CSV/XLSX → detected columns + sample rows; save column mapping → row-level
  validation errors; commit → run matching and insert; return counts (new, linked, needs review,
  errors).
- Duplicates: list, merge (reversible, audit-logged), "not the same person", undo merge.
- Create samples/programme_a.csv and samples/programme_b.csv (~200 rows each, ~30 people in both with
  small name/phone differences, including Lakshmi).

FRONTEND (provider)
- "Data import" page: 4-step stepper (Upload → Map columns → Validate → Match & import) with a large
  dashed drop zone, "Download template" link, mapping table with suggested fields, error table, and a
  final report of 4 KPI cards + "Review duplicates".
- "Duplicates" page: side-by-side record cards with differing fields highlighted, match score and
  reasons, Merge (primary) / Not the same person (outline), Undo toast.

Done when: importing both sample files links Lakshmi into one record and sends grey-zone pairs to
review, merge and undo work, zero console errors. List files changed.
```

**Check:** import A then B → Lakshmi is one person · Duplicates shows reasons · merge then undo. Commit: `Change 7: import and matching`.

## Change 8: Employer upgrades

Employers state real skill demand and feed back on hires, which powers skill intelligence and curriculum feedback.

```text
Read CLAUDE.md. Change 8 = extend the employer dashboard. Plan first.

1. Job openings: list + create/edit (title, NCO job role, district, salary range ₹, openings).
   "Paste job description" box with an "Extract skills" button: Anthropic API (JSON-only, model from
   ANTHROPIC_MODEL) if a key is set, otherwise keyword match against the skills list. Results appear
   as removable chips grouped Required / Preferred for the employer to confirm.
2. Hires: list of LifeTrack trainees hired, with actions "Give feedback" (1-5 ratings: technical,
   communication, problem solving, work readiness + missing-skill chips) and "Report exit" (date +
   reason). Exit creates an exit outcome at L4 and triggers attrition logic.
3. Feed these into the existing skill intelligence: openings = demand; feedback missing skills →
   curriculum feedback (Change 5) and government skill views.
4. Keep the existing verification queue on the employer dashboard; add the bulk confirm from
   Change 4 if not already there.

Done when: a pasted job description yields skill chips, feedback appears in course curriculum
suggestions, reporting Amit's exit updates his timeline, zero console errors. List files changed.
```

**Check:** skills extracted from a pasted description · feedback with "Advanced Excel" shows up in curriculum feedback · Amit's exit appears on his timeline. Commit: `Change 8: employer`.

## Change 9: Demo mode, personas and smoke test

Makes the demo reliable: a guided walkthrough, persona shortcuts, a reset button, and an automated check that every page is clean.

```text
Read CLAUDE.md. Change 9 = demo readiness. Plan first.

1. Personas: make sure the seed has all ten with exact scenarios — Lakshmi (changed number →
   escalation → agent → employed → employer confirms → leaves for low pay → bridge course →
   re-placed), Priya (verified, wage growth), Ravi (high risk, bridge course), Sana (skill mismatch,
   attrition risk), Amit (job loss → re-employed), Fatima (self-employed, field verified), Karan
   (apprentice → permanent, NAPS match), Deepak (not responding, decay to Low), Neha (disputed),
   Meena (further education).
2. Persona switcher in the user menu: jump straight to any persona's profile as provider, or log in as
   that trainee.
3. "Reset demo data" in the user menu (dev/demo only): re-runs the seed and resets the demo clock.
4. Guided demo: a floating card (bottom-right, "Step 3 of 9", Back / Next) that switches role and
   route automatically and highlights the relevant element with a soft ring:
   (1) provider imports two CSVs → Lakshmi linked (skip if Change 7 isn't built), (2) demo phone: WhatsApp fails → SMS → IVR →
   alternate contact, (3) agent completes the call (L2), (4) employer confirms via link (L4),
   (5) Lakshmi reports leaving for low pay → attrition flag, (6) counsellor approves bridge course,
   (7) re-placement and risk drop on her timeline, (8) government dashboard: district, equity gap,
   verified-only toggle, (9) Lakshmi's consent centre and access history.
5. Smoke test (scripts/smoke.mjs with Playwright): for every role, log in, visit every route in
   that role's nav, and record console errors, page errors, failed requests (status >= 400 except
   an expected 401 before login) and non-JSON API responses; screenshot each page at 1280 and 390
   wide in light and dark into docs/screenshots/. Print a table: route | console errors | failed
   requests | non-JSON. Fix everything and re-run until the table is completely clean.
6. Review the screenshots as a senior product designer: list the 10 weakest visual issues, fix
   them, re-shoot.

Done when: guided demo runs end to end, smoke table is all zeros, reset works. List files changed.
```

**Check:** run the guided demo twice (with a reset between) · smoke report is clean. Commit and tag: `git tag demo-ready`.

## Fix-it prompt

Use this whenever something breaks or looks off, instead of describing symptoms loosely.

```text
Something is broken. Don't guess and don't patch symptoms.
What I see: <paste the error text / console error / describe the screen + URL>.
1. Reproduce it first (curl the endpoint or a small Playwright script) and show the output.
2. Find the root cause and explain it in 2-3 lines.
3. Fix it following CLAUDE.md (edit existing code, reuse existing components and tokens).
4. Prove the fix with the same reproduction, then run scripts/smoke.mjs (if it exists) and show the
   clean table. List files changed.
```

For UI that looks wrong:

```text
The <page> looks unpolished compared to the rest of the app. Take screenshots at 1280 and 390 wide in
light and dark, compare against an existing well-styled LifeTrack page (e.g. the government dashboard
and Timeline.jsx), list 10 concrete differences (spacing, alignment, typography, colours, component
style), fix them using existing components and tokens, and re-shoot.
```

## 5-minute demo script

One trainee's story shows every hard part of the problem statement; reset the demo data right before you present.

| Time | Screen (role) | What you show | What you say |
| --- | --- | --- | --- |
| 0:00 | Login | Split login, dark mode toggle, demo accounts | "LifeTrack follows every trainee beyond certification." |
| 0:20 | Provider → Data import | Two programme CSVs; Lakshmi linked into one record | "Different programmes, one person, matched without storing raw IDs." |
| 0:50 | Demo phone | WhatsApp fails → SMS → IVR → alternate contact gives the new number | "No app, no login. We meet trainees on the channels they use." |
| 1:30 | Agent (mobile) | Agent completes the call; outcome saved as L2 Assisted | "Humans step in only when automation fails." |
| 2:00 | Employer verify link | One click, no login → badge turns High · L4 | "Verified by the employer in 10 seconds." |
| 2:30 | Trainee timeline | Lakshmi leaves for low pay → attrition flag with reasons | "We capture why people leave, not just that they left." |
| 3:00 | Counsellor | Risk points explained, stated vs inferred, approve bridge course → re-placed, risk drops | "Explainable rules, human approval, measured results." |
| 3:45 | Government | District KPIs with unknown %, Verified-only toggle, equity gap, cost per outcome | "Honest numbers policymakers can fund against." |
| 4:30 | Trainee consent | Consent matrix and "who accessed my data" | "Privacy by design, aligned with the DPDP Act." |
| 4:50 | Close | Back to the government dashboard | "Credible, low-burden, privacy-conscious outcome tracking." |

**Backup plan:** if anything fails live, switch persona from the user menu (Priya for verification, Ravi for risk, Neha for disputes) and keep talking; practise the switch once.
