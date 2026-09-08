# LifeTrack — Prototype Build Specification (SIH, <24-hour build)

This document converts the LifeTrack PRD into a single, concrete build spec for one team building one working prototype in under a day. Every decision below is made specifically for this demo — not as general best practice.

**Stack decision (fixed, do not deviate mid-build):**
- Frontend: React + Vite + Tailwind CSS, React Router, Recharts.
- Backend: Node.js + Express, single service, no microservices.
- Database: SQLite (file-based, via `better-sqlite3`) — zero setup, inspectable, resettable with one script. Swappable to Postgres later but not for this build.
- Auth: Mock role-login (pick a seeded user from a dropdown → session stored in `localStorage`). No passwords, no JWT, no OAuth.
- "AI": Plain JS scoring functions run inside the Express API — no model training, no external ML calls.

---

# 1. Final MVP Scope

Only the features below will be implemented. Everything else from the PRD is explicitly deferred (see each module's SHOULD/FUTURE tag).

| # | Feature (MUST BUILD) | Why it is necessary |
|---|---|---|
| 1 | Trainee Profile + Timeline | The one object every other screen and workflow depends on; without it nothing else is demonstrable. |
| 2 | Consent toggle (3 purposes) + audit stamp | Directly named in the SIH problem statement; cheap to build; signals privacy-by-design to judges. |
| 3 | Training → Certification record (seeded, minimally editable) | Establishes the "before" state every outcome is measured against. |
| 4 | Outcome Classification + Confidence badge | The core differentiator: replaces a single placed/not-placed flag with a real state + trust level. |
| 5 | Follow-up Engine (30/90/180/365-day schedule, conversational Q&A UI) | Proves continuous tracking, not a one-time survey — the single best demo moment. |
| 6 | Employer Verification (confirm/dispute) | Proves self-reported vs. verified distinction; required by the problem statement. |
| 7 | Wage & Retention tracking (checkpoints + chart) | Required KPI; shows economic progression, not just a job title. |
| 8 | Skill Match Engine (overlap %, missing skills, bridge suggestion) | Required by the problem statement; feeds directly into root-cause and interventions. |
| 9 | Outcome Risk Score (explainable) | Enables the "intervene before failure" story — the centerpiece of the demo. |
| 10 | Non-Placement Root-Cause tagging | Turns a percentage into an explanation judges can follow. |
| 11 | Intervention Recommendation + counsellor approval | Closes TRACK→INTERVENE; shows human-in-the-loop, not blind automation. |
| 12 | Counsellor Worklist (at-risk queue) | Shows the human workflow side, not just admin dashboards. |
| 13 | Government Outcome Dashboard | The single most important dashboard for judges (executive proof). |
| 14 | Provider Dashboard (cohort + at-risk list) | Second-most-important; shows the "before intervention → after" delta. |
| 15 | Trainee self-view (status, timeline, recommendations) | Shows the system helps the trainee, not just the bureaucracy. |
| 16 | Employer verification screen (link-based, no login) | Minimal but required to close the verification loop. |
| 17 | Core KPI computation (live, not hard-coded) | Judges will ask "is this real data?" — the answer must be yes. |

**SHOULD BUILD (only if the above is done and demo-stable with time remaining):**
- Attrition Risk as a separate score from Outcome Risk (can otherwise be folded into one "risk" score).
- District Skill Intelligence table (supply vs. demand, no map — a sortable table is enough).
- Provider Performance comparison (2–3 providers ranked).
- Root-cause drill-down filter (district → provider → course).
- Multichannel icons on follow-up log (SMS/WhatsApp/IVR/Web tags — cosmetic only, no real delivery).

**FUTURE (explicitly out of scope, state this to judges if asked):**
- Real SMS/WhatsApp/IVR delivery, real employer login/portal, cross-programme identity resolution, trained ML models, policy what-if simulator, production auth/security, multi-tenant scaling.

---

# 2. User Roles

| Role | Access model in the prototype |
|---|---|
| **Government / Policymaker** | Read-only, aggregated views across all districts/providers/courses. No trainee-level identified view by default. |
| **Training Provider** | Read/write scoped to their own courses and cohorts only. Can create interventions, update course skill tags. |
| **Trainee** | Read/write scoped to their own profile only. Can submit follow-up answers, manage own consent. |
| **Employer** | No account — accesses one verification request via a unique link/ID, can only confirm/dispute that one claim. |
| **Counsellor** | Read/write scoped to trainees assigned to them (or all at-risk trainees for a small demo dataset). Can log case notes, mark interventions complete. |

All five roles are pre-seeded as fixed demo users. Login = pick a name from a role-filtered dropdown. This is intentional: real auth wastes build time that should go into the core loop.

---

# 3. Application Modules

1. **Auth/Session module** — mock login, role context provider.
2. **Trainee module** — profile, timeline, consent, self-view.
3. **Training/Course module** — course + training record CRUD (seed-heavy, minimal UI editing).
4. **Follow-up module** — schedule generation, conversational Q&A, response storage, escalation.
5. **Verification module** — employer verification request + confirm/dispute screen.
6. **Outcome Engine module** (backend service, no UI of its own) — classification + confidence computation, runs after every relevant write.
7. **Skill Match module** — score computation, missing-skill + bridge-skill lookup.
8. **Intelligence module** (backend service) — outcome risk, attrition risk (should-build), root-cause, intervention recommendation.
9. **Intervention module** — create/approve/track intervention records.
10. **Counsellor Worklist module** — at-risk queue, case notes.
11. **Analytics/KPI module** (backend service + shared queries) — Section 18 formulas, reused by every dashboard.
12. **Dashboard module** — Government, Provider, Trainee, Counsellor, Employer views.
13. **Seed/Reset module** — one script + one admin-only route to reload demo data before/after a run-through.

---

# 4. Application Routes

Frontend (React Router), one shell app, role-gated:

```
/login                                → Role/user picker (mock login)

/trainee/home                         → Trainee self-view (status, next steps)
/trainee/timeline                     → Trainee's own full timeline
/trainee/followup/:scheduleId         → Conversational follow-up Q&A
/trainee/consent                      → Consent controls

/provider/dashboard                   → Cohort KPIs + at-risk list
/provider/trainee/:id                 → Trainee profile (provider view)
/provider/course/:id/skill-gap        → Course-level missing-skill report
/provider/interventions               → Intervention log for this provider

/counsellor/worklist                  → Assigned/at-risk queue, sorted by risk
/counsellor/trainee/:id               → Trainee profile + case notes + approve intervention

/employer/verify/:verificationId      → Confirm/Dispute screen (no login, link-based)

/government/dashboard                 → Outcome Impact Dashboard (national/state)
/government/district/:districtId      → District drill-down
/government/provider-comparison       → Provider performance comparison (should-build)

/admin/seed                           → Reset/reseed demo data (dev-only button)
```

Every `/trainee/:id`-style route is the same underlying `TraineeProfile` component, rendered with role-appropriate permissions (see Section 7).

---

# 5. Database Design

SQLite, one file, snake_case tables. Kept intentionally flat — no over-normalization for a one-day build.

### `users`
- `id` (PK, TEXT)
- `name` (TEXT)
- `role` (TEXT: government | provider | trainee | counsellor)
- `scope_id` (TEXT, nullable — provider_id for provider role, trainee_id for trainee role, null for government/counsellor)

### `providers`
- `id` (PK, TEXT)
- `name` (TEXT)
- `district` (TEXT)

### `courses`
- `id` (PK, TEXT)
- `provider_id` (FK → providers.id)
- `name` (TEXT)
- `skill_tags` (TEXT, JSON array)

### `trainees`
- `id` (PK, TEXT)
- `name` (TEXT)
- `contact` (TEXT)
- `district` (TEXT)
- `demographic_tags` (TEXT, JSON: gender, age_band)
- `course_id` (FK → courses.id)
- `provider_id` (FK → providers.id)
- `batch_id` (TEXT)
- `certification_date` (TEXT, ISO date)
- `current_status` (TEXT — computed, cached)
- `current_confidence` (TEXT: high | medium | low — computed, cached)
- `outcome_risk_score` (INTEGER — computed, cached)
- `attrition_risk_score` (INTEGER — computed, cached)
- Index: `idx_trainees_provider`, `idx_trainees_course`, `idx_trainees_status`

### `training_records`
- `id` (PK, TEXT)
- `trainee_id` (FK → trainees.id)
- `attendance_pct` (INTEGER)
- `assessment_score` (INTEGER)
- `certified` (INTEGER, 0/1)

### `outcome_events`
- `id` (PK, TEXT)
- `trainee_id` (FK → trainees.id)
- `type` (TEXT: employed | self_employed | apprentice | unemployed | job_lost | other)
- `source` (TEXT: self | provider | employer)
- `timestamp` (TEXT, ISO datetime)
- Index: `idx_outcome_trainee`

### `employment_periods`
- `id` (PK, TEXT)
- `trainee_id` (FK → trainees.id)
- `employer_name` (TEXT)
- `occupation` (TEXT)
- `start_date` (TEXT)
- `end_date` (TEXT, nullable)
- `exit_reason` (TEXT, nullable)

### `income_checkpoints`
- `id` (PK, TEXT)
- `trainee_id` (FK → trainees.id)
- `checkpoint_day` (INTEGER: 30 | 90 | 180 | 365)
- `amount` (INTEGER)
- `recorded_date` (TEXT)
- Index: `idx_income_trainee`

### `verifications`
- `id` (PK, TEXT)
- `trainee_id` (FK → trainees.id)
- `employer_name` (TEXT)
- `claim_json` (TEXT, JSON: role, join_date)
- `status` (TEXT: pending | confirmed | disputed | no_record)
- `timestamp` (TEXT, nullable)

### `job_skill_reference`
- `occupation_title` (PK, TEXT)
- `required_skills` (TEXT, JSON array)

### `skill_match_results`
- `id` (PK, TEXT)
- `trainee_id` (FK → trainees.id)
- `employment_period_id` (FK → employment_periods.id, nullable)
- `score` (INTEGER)
- `missing_skills` (TEXT, JSON array)
- `computed_date` (TEXT)

### `followup_schedules`
- `id` (PK, TEXT)
- `trainee_id` (FK → trainees.id)
- `checkpoint_day` (INTEGER)
- `scheduled_date` (TEXT)
- `status` (TEXT: pending | completed | non_responsive)
- Index: `idx_followup_trainee`, `idx_followup_status`

### `followup_responses`
- `id` (PK, TEXT)
- `schedule_id` (FK → followup_schedules.id)
- `trainee_id` (FK → trainees.id)
- `answers_json` (TEXT, JSON)
- `channel` (TEXT: web | sms | whatsapp | ivr | assisted)
- `submitted_date` (TEXT)

### `root_causes`
- `id` (PK, TEXT)
- `trainee_id` (FK → trainees.id)
- `label` (TEXT)
- `source` (TEXT: self_reported | inferred)
- `timestamp` (TEXT)

### `interventions`
- `id` (PK, TEXT)
- `trainee_id` (FK → trainees.id)
- `type` (TEXT)
- `recommended_by` (TEXT: system | counsellor)
- `assigned_to` (FK → users.id, nullable)
- `status` (TEXT: recommended | in_progress | completed)
- `created_date` (TEXT)
- `outcome_notes` (TEXT, nullable)

### `consent_records`
- `id` (PK, TEXT)
- `trainee_id` (FK → trainees.id)
- `purpose` (TEXT: data_collection | employer_contact | analytics)
- `granted` (INTEGER, 0/1)
- `timestamp` (TEXT)

### `audit_log`
- `id` (PK, TEXT)
- `entity` (TEXT)
- `entity_id` (TEXT)
- `action` (TEXT)
- `actor_role` (TEXT)
- `timestamp` (TEXT)

**Relationships:** `providers` 1→N `courses` 1→N `trainees` (via `course_id`); `trainees` 1→N everything else (`training_records`, `outcome_events`, `employment_periods`, `income_checkpoints`, `verifications`, `skill_match_results`, `followup_schedules`→1→N `followup_responses`, `root_causes`, `interventions`, `consent_records`). `skill_match_results.employment_period_id` optionally links to `employment_periods`. All FKs are simple TEXT ids (UUID or short slug) — no cascading delete logic needed for a demo dataset that's only ever seeded, never deleted mid-demo.

---

# 6. API Design

Express REST, JSON only. Only what the MVP screens actually call.

```
POST   /api/auth/login                        { userId } → { user, token }

GET    /api/trainees?provider_id&status&risk  → list (filters optional)
GET    /api/trainees/:id                      → full profile + timeline (joins all child tables)
PATCH  /api/trainees/:id/consent              { purpose, granted } → consent_record

GET    /api/followups/pending?assignedTo      → schedules due/overdue
GET    /api/followups/:scheduleId/questions   → question set for that checkpoint
POST   /api/followups/:scheduleId/response    { answers } → triggers Outcome Engine + Intelligence recompute

POST   /api/verifications/:id/respond         { status } → confirmed/disputed/no_record, triggers confidence recompute
GET    /api/verifications/:id                 → claim details (for employer link screen, no auth)

GET    /api/trainees/:id/skill-match          → score, missing skills, bridge suggestions
GET    /api/trainees/:id/risk                 → outcome_risk, attrition_risk, contributing_factors, root_cause

POST   /api/interventions                     { trainee_id, type } → create (system-recommended or counsellor-created)
PATCH  /api/interventions/:id                 { status, outcome_notes } → update

GET    /api/dashboards/government             → national + district aggregates, confidence breakdown
GET    /api/dashboards/government/district/:id → district drill-down
GET    /api/dashboards/provider/:providerId   → cohort KPIs + at-risk list
GET    /api/dashboards/counsellor/:userId     → assigned worklist

GET    /api/courses/:id/skill-gap             → course-level missing-skill rollup
GET    /api/kpis?scope=...&scopeId=...        → Section 18 formulas for any scope

POST   /api/admin/seed/reset                  → dev-only, reloads demo data
```

No endpoint returns raw SQL rows — every response is shaped exactly for the screen that calls it, to avoid extra frontend joining logic during the build.
# 7. Authentication + RBAC

There is no real authentication in this prototype — building it would spend hours the demo doesn't need.

- **Login screen** shows a role selector (Government / Provider / Trainee / Employer / Counsellor). Choosing a role shows a dropdown of seeded users for that role (e.g., 3 providers, 5 trainees, 2 counsellors). Selecting a user stores `{ userId, role, scopeId }` in `localStorage` and sets it as a bearer-less header (`x-demo-user-id`) on every API call.
- **Employer** never logs in — they reach `/employer/verify/:verificationId` directly via a link generated when a verification request is created (shown on-screen in the demo as "Employer link generated — click to simulate opening it").
- **Backend RBAC enforcement** (kept simple, not cryptographic):
  - Every request carries `x-demo-user-id`; middleware loads that user's role + scope.
  - `government` → read-only, all `GET` allowed, all `POST`/`PATCH` rejected except `/admin/seed/reset`.
  - `provider` → `GET`/`PATCH` restricted by `WHERE provider_id = scope_id`.
  - `trainee` → `GET`/`PATCH` restricted by `WHERE trainee.id = scope_id`, and only on their own consent/followup-response endpoints.
  - `counsellor` → `GET`/`PATCH` on trainees currently in the at-risk/worklist view, and full access to `interventions`.
  - `employer` requests (no `x-demo-user-id`) are allowed only on `GET /api/verifications/:id` and `POST /api/verifications/:id/respond`, and only for that one `:id`.
- Every `PATCH`/`POST` writes one `audit_log` row (`actor_role`, `entity`, `action`, `timestamp`) — enough to visibly demonstrate the audit trail requirement without building a real audit UI beyond a simple list on the trainee profile.

---

# 8. Core User Flows

Each PRD workflow converted into literal clicks/screens.

### Flow A — Successful employment (demo trainee: "Priya")
1. Provider opens `/provider/dashboard`, sees Priya certified 32 days ago, no outcome yet.
2. System has already auto-created a `followup_schedule` (day 30) — Priya (as trainee) opens `/trainee/followup/:id`, answers: employed, employer "BrightRetail", role "Sales Associate", ₹14,000/month, skills relevant = Yes.
3. `POST /api/followups/:id/response` fires → Outcome Engine sets `current_status = employed`, `current_confidence = medium (self-reported)`; a `verifications` row is auto-created.
4. Provider clicks "Send verification" (already auto-generated) → link shown on screen → open `/employer/verify/:id` as BrightRetail → click **Confirm**.
5. `current_confidence` flips to `high (verified)`; Priya's badge turns green on every dashboard that shows her.
6. At day 90/180, repeat follow-up → new `income_checkpoints` rows → wage chart on her profile updates automatically; Retention Rate KPI recalculates.

### Flow B — Non-placement intervention (demo trainee: "Ravi")
1. Ravi certified 52 days ago, no `outcome_event`. Backend nightly-equivalent (or on-demand recompute button for demo) sets `outcome_risk_score` high.
2. Counsellor opens `/counsellor/worklist`, sees Ravi at the top (sorted by risk score), clicks in.
3. `/counsellor/trainee/:id` shows the risk breakdown (factor list) and `root_cause` (inferred: "skill mismatch — needs confirmation").
4. Counsellor clicks "View recommended intervention" → sees "Refer to Bridge Course – Advanced Excel" with rationale → clicks **Approve** → `POST /api/interventions`.
5. Intervention status = `in_progress`; appears on Provider's Intervention Log.
6. Next follow-up cycle: Ravi reports new job → skill match recomputed at 82% → counsellor marks intervention `completed` with outcome notes.

### Flow C — Skill mismatch (demo trainee: "Sana")
1. Sana is employed; her `employment_period.occupation` = "Data Entry Operator".
2. Skill Match Engine compares her course's `skill_tags` to `job_skill_reference["Data Entry Operator"].required_skills` → score 30%.
3. `/provider/trainee/:id` and `/trainee/home` both show "Low relevance — missing: MS Excel, Typing Speed" with a bridge-course chip.
4. Provider views `/provider/course/:id/skill-gap` → sees "MS Excel" as the top missing skill across 3 trainees this cohort.

### Flow D — Job loss and re-employment (demo trainee: "Amit")
1. Amit has an active `employment_period`. At the 180-day follow-up he reports "no longer working there."
2. `employment_periods.end_date` set, `exit_reason` captured from the follow-up answer; `current_status = job_lost`.
3. Intelligence recomputes attrition/risk; counsellor worklist picks him up.
4. Later, Amit reports a new employer → new `employment_period` row created; timeline shows both periods; job-change count increments on the profile header.

### Flow E — Self-employment (demo trainee: "Fatima")
1. Fatima reports "self-employed — own tailoring business" in her follow-up.
2. `outcome_events` row (`type=self_employed`, `source=self`) created; since there's no employer to verify, an "assisted verification" task appears on the Counsellor Worklist instead of an employer link.
3. Counsellor marks it verified (simulating a field visit) → confidence set to high.
4. Income checkpoints for Fatima are entered the same way as employment — same chart, same KPI treatment.

### Flow F — Apprenticeship → job conversion (demo trainee: "Karan")
1. Karan's outcome = `apprentice`; a "conversion follow-up" is scheduled near the apprenticeship's expected end date.
2. At that follow-up, Karan reports "converted — same employer, permanent role."
3. A new `employment_period` is created linked to the same employer; `outcome_events` logs `apprenticeship_converted`; Apprenticeship Conversion Rate KPI updates.

---

# 9. AI Features

All five are deterministic, explainable scoring functions inside the Express API (a plain `/lib/intelligence.js` module) — not calls to any external model. Each returns its own reasoning so the UI can show "why," not just a number.

### 9.1 Employment Outcome Risk
- **Input:** `days_since_certification` (no outcome_event yet), `attendance_pct`, `assessment_score`, `last_followup_responded` (bool), `has_skill_match_data` (bool).
- **Processing:** `score = 30×(days_since_cert>45 && no_outcome) + 20×(attendance<70) + 20×(assessment_score<50) + 15×(!last_followup_responded) + 15×(!has_skill_match_data)`, capped at 100. Band: 0–39 Low, 40–69 Medium, 70–100 High.
- **Output:** `{ score, band, factors: [{ label, points }] }`.
- **UI location:** Risk badge on trainee profile header; factor list expandable panel; drives sort order on Counsellor Worklist.
- **Example result:** "Risk: High (85/100) — No placement 52 days after certification (+30), Missed last follow-up (+15), Assessment score 42% (+20), No skill-match data yet (+15), Attendance 65% (+20 not applied, 65≥... )" — actual line items shown only for triggered conditions.

### 9.2 Skill Mismatch Detection
- **Input:** trainee's course `skill_tags`, current `employment_period.occupation` looked up in `job_skill_reference.required_skills`.
- **Processing:** `matched = intersection(course_skills, required_skills)`; `score = matched.length / required_skills.length × 100`; `missing = required_skills − matched`.
- **Output:** `{ score, band: good|partial|mismatch, missing_skills[], bridge_suggestions[] }` (bridge suggestions from a fixed lookup table, e.g. `{"MS Excel": "Bridge Course: Advanced Excel"}`).
- **UI location:** Skill-match gauge on trainee profile; missing-skill chips; course skill-gap report (aggregated).
- **Example result:** "Skill Match: 30% (Mismatch) — Missing: MS Excel, Typing Speed → Recommended: Bridge Course – Advanced Excel."

### 9.3 Attrition Risk (SHOULD BUILD)
- **Input:** wage flat across 2+ `income_checkpoints`, tenure at current employer <90 days, ≥2 `employment_periods` in the last 12 months, latest skill match band = mismatch.
- **Processing:** `score = 25×stagnant_wage + 25×short_tenure + 25×repeated_change + 25×mismatch`.
- **Output:** `{ score, band, factors[] }`.
- **UI location:** Second badge on trainee profile (only shown once employed), Provider Dashboard "at-risk of leaving" filter.
- **Example result:** "Attrition Risk: Medium (50/100) — Wage unchanged for 2 checkpoints (+25), Job outside trained skillset (+25)."

### 9.4 Non-Placement Root-Cause Analysis
- **Input:** follow-up "reason for unemployment" answer if present; else `assessment_score`, `attendance_pct`, presence of skill-match data.
- **Processing:** If a direct reason code exists, use it verbatim (`source=self_reported`). Else apply a small decision rule: low attendance + low assessment → "training engagement issue"; otherwise → "insufficient vacancies (unconfirmed)" (`source=inferred`).
- **Output:** `{ label, source }`.
- **UI location:** Counsellor/Provider trainee view, next to the risk badge; feeds the intervention lookup (9.5) and the Government root-cause distribution chart.
- **Example result:** "Root cause: Skill mismatch (self-reported by trainee at 30-day follow-up)."

### 9.5 Intervention Recommendation
- **Input:** current `root_cause.label`.
- **Processing:** Fixed lookup table: `skill_mismatch → bridge_course_referral`, `insufficient_vacancies → employer_referral_drive`, `salary_mismatch → career_counselling`, `interview_failure → interview_prep_session`, `location_barrier → relocation_or_remote_referral`, default → `general_counselling`.
- **Output:** `{ type, rationale }` — never auto-applied; always requires a counsellor/provider click to approve (creates the `interventions` row).
- **UI location:** "Recommended intervention" card on the trainee profile with an **Approve** button.
- **Example result:** "Recommended: Bridge Course Referral — because root cause is Skill Mismatch. [Approve] [Dismiss]".

---

# 10. Dashboards

### Government Dashboard (`/government/dashboard`)
- KPI cards: Total Trained, Certified, Placement Rate, Self-Employment Rate, Apprenticeship Conversion Rate, Avg. Wage Growth %, Skill Match Score (avg), Follow-up Response Rate — **each card shows a small confidence breakdown line** ("62% — 40 verified / 15 self-reported / 7 needs review").
- Chart: bar chart, Placement Rate by district.
- Chart: stacked bar, Non-placement reasons distribution.
- Table: Providers ranked by a simple composite score (should-build).
- Alert banner: any district/course whose placement rate dropped vs. previous cohort.
- Drill-down: click a district bar → `/government/district/:id`.

### Provider Dashboard (`/provider/dashboard`)
- KPI cards: Cohort Placement Rate, Retention Rate, Avg Skill Match Score, Follow-up Response Rate (scoped to this provider only).
- Table: At-Risk Trainee List — columns: Name, Risk Score/Band, Root Cause, Days Since Certification, Action button ("View / Approve Intervention").
- Chart: Wage progression (avg) over checkpoints for this provider's trainees.
- Table: Course Skill-Gap summary (top 5 missing skills across all courses).
- Alert: trainees with disputed/needs-review verification.

### Trainee Home (`/trainee/home`)
- Status card: current status + confidence badge.
- "Your next follow-up is due on [date]" banner with a button to answer now if due.
- Wage progression line chart (own data only).
- Skill match card + recommended bridge course.
- Recommendation list ("Next steps for you").

### Counsellor Worklist (`/counsellor/worklist`)
- Table sorted by risk score descending: Name, Risk Band, Root Cause, Last Contact, Status (pending/in-progress).
- Filter chips: At-Risk / Non-Responsive / Needs Verification Review.
- Row click → `/counsellor/trainee/:id` (profile + case notes + approve/complete intervention).

### Employer Verification (`/employer/verify/:id`)
- Single card: trainee name, claimed employer, claimed role, claimed join date.
- Three buttons: Confirm / Dispute / No Record.
- Confirmation screen: "Thank you — this has been recorded."

---

# 11. Seed Data

One seed script (`/backend/seed/seed.js`), re-runnable, populates:
- **3 providers**, one district each (e.g., Provider A – Ranchi, Provider B – Patna, Provider C – Ranchi) — two providers share a district so a district drill-down has something to aggregate.
- **4 courses**: "Retail Sales Associate," "Data Entry & Office Assistant," "Electrician – Basic Wiring," "Tailoring & Garment Making" — each with a realistic `skill_tags` array.
- **`job_skill_reference`** for 4–5 occupation titles matching/partially-matching the courses (so mismatch cases are realistic).
- **~26 trainees** distributed exactly per the PRD's demo-data table (Section 24 of the PRD): 6 successful/verified, 4 non-placed/skill-mismatch cause, 3 non-placed/no-vacancy cause, 4 employed-but-mismatched, 3 job-loss→re-employed, 3 self-employed, 2 apprentice-converted, 1 apprentice-exited, 3 non-responsive/low-confidence, 1 conflicting-verification — with names, so the demo can refer to "Priya," "Ravi," "Sana," "Amit," "Fatima," "Karan" as fixed, memorized demo characters (Section 17).
- **Followup schedules** pre-generated for every trainee at the correct checkpoints relative to a fixed "today" seed date, with some already `completed`, some `pending` (due today, for live demo), and a few `non_responsive`.
- **Income checkpoints** for every employed/self-employed trainee showing believable growth (e.g., ₹9,000 → ₹9,000 → ₹11,000 for a stagnant case; ₹9,000 → ₹11,000 → ₹13,500 for a growing one).
- Reset endpoint (`POST /api/admin/seed/reset`) re-runs this exact script so the demo can be replayed identically.

---

# 12. Component Architecture

Reusable React components (Tailwind-styled), used across multiple screens rather than rebuilt per page:

- `<StatusBadge status confidence />` — color-coded pill, used on every trainee reference.
- `<RiskBadge score band factors />` — expandable factor breakdown on click/hover.
- `<KpiCard title value confidenceBreakdown? trend? />`
- `<TraineeTimeline events[] />` — vertical timeline, renders any event type via a small switch/map.
- `<WageChart checkpoints[] />` — Recharts line chart, reused on trainee profile + provider dashboard (aggregated mode).
- `<SkillMatchGauge score missingSkills[] bridgeSuggestions[] />`
- `<AtRiskTable trainees[] onRowClick />` — reused by Provider Dashboard and Counsellor Worklist with different column configs via props.
- `<FollowupChat questions[] onSubmit />` — generic Q&A renderer driven by the question-set response, not hardcoded per checkpoint.
- `<InterventionCard intervention onApprove onDismiss onComplete />`
- `<ConsentToggleList purposes[] />`
- `<RoleGate role allow={[...]} />` — wraps a route/section, renders nothing (or a "not permitted" note) if the current mock user's role isn't allowed.
- `<DrillDownFilterBar levels={['district','provider','course']} onChange />` (should-build).

---

# 13. Folder Structure

```
lifetrack/
├── backend/
│   ├── db/
│   │   ├── schema.sql
│   │   └── lifetrack.db            (generated)
│   ├── seed/
│   │   └── seed.js
│   ├── lib/
│   │   ├── intelligence.js         (risk, mismatch, attrition, root-cause, intervention lookup)
│   │   ├── kpis.js                 (Section 18 formulas)
│   │   └── confidence.js           (outcome classification + confidence rules)
│   ├── routes/
│   │   ├── auth.js
│   │   ├── trainees.js
│   │   ├── followups.js
│   │   ├── verifications.js
│   │   ├── interventions.js
│   │   ├── dashboards.js
│   │   ├── courses.js
│   │   └── admin.js
│   ├── middleware/
│   │   └── rbac.js
│   ├── app.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/             (Section 12 list)
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── trainee/ (Home, Timeline, Followup, Consent)
│   │   │   ├── provider/ (Dashboard, TraineeProfile, CourseSkillGap, Interventions)
│   │   │   ├── counsellor/ (Worklist, TraineeProfile)
│   │   │   ├── government/ (Dashboard, DistrictDrilldown, ProviderComparison)
│   │   │   └── employer/ (Verify.jsx)
│   │   ├── api/
│   │   │   └── client.js           (fetch wrapper, injects x-demo-user-id)
│   │   ├── context/
│   │   │   └── SessionContext.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
└── README.md                        (how to seed, run, and demo)
```

---

# 14. Environment Variables

```
# backend/.env
PORT=4000
DB_PATH=./db/lifetrack.db
SEED_TODAY_DATE=2026-09-08          # fixes "today" for demo-relative follow-up scheduling
NODE_ENV=development

# frontend/.env
VITE_API_BASE_URL=http://localhost:4000/api
```

No API keys, no secrets, no third-party service credentials are required — intentional, per the Non-Goals in the PRD (no real SMS/WhatsApp/IVR/ML integrations).

---

# 15. Deployment

Simplest possible path, optimized for "must work live during judging, and must work if the venue Wi-Fi fails":

1. **Primary plan — run locally on the presenter's laptop.** `npm run dev` for backend and frontend, `localhost`. Zero network dependency, zero deployment risk during judging.
2. **Backup plan — one-command deploy** if organizers require a live link: frontend to Vercel (static Vite build), backend to Render/Railway free tier (Node + SQLite file — acceptable for a demo since data resets on redeploy anyway via the seed script).
3. Do **not** attempt Docker/Kubernetes, multiple services, or a managed cloud database — none of that improves the demo and all of it risks eating build hours.
4. Before judging, run `POST /api/admin/seed/reset` once to guarantee a clean, known state.

---

# 16. Build Order

**Hour 1 — Skeleton**
Create `schema.sql`, stand up Express + SQLite connection, scaffold Vite + Tailwind app with React Router and the route list from Section 4 (empty pages). Build `SessionContext` + mock login.

**Hour 2 — Seed + Core Read Path**
Write `seed.js` fully (Section 11 dataset). Build `GET /api/trainees`, `GET /api/trainees/:id`. Build `TraineeTimeline`, `StatusBadge` and wire the Provider trainee-profile page to real seeded data.

**Hour 3 — Outcome + Confidence + Wage/Retention**
Build `confidence.js` (classification rules), wire it to run whenever a follow-up response or verification is written. Build `income_checkpoints` + `WageChart`. Confirm the profile page shows a believable, computed (not hardcoded) status/confidence/wage picture for at least 3 different seeded trainees.

**Hour 4 — Follow-up Engine + Employer Verification**
Build `followup_schedules`/`responses` endpoints + `FollowupChat` UI. Build the verification request auto-creation + `/employer/verify/:id` screen + confirm/dispute endpoint. Walk Flow A end-to-end (Section 8) manually to confirm it works.

**Hour 5 — Skill Match + Intelligence Layer**
Build `intelligence.js` (risk, root-cause, intervention lookup) and `skill_match` computation. Wire `RiskBadge`, `SkillMatchGauge`, "Recommended intervention" card with Approve button. Walk Flow B and Flow C end-to-end.

**Hour 6 — Counsellor + Provider Dashboards**
Build `/counsellor/worklist` and `/provider/dashboard` fully, using `kpis.js` for real aggregate numbers. Confirm approving an intervention on a trainee updates their position on both worklists live.

**Hour 7 — Government Dashboard + Remaining Flows**
Build `/government/dashboard` with confidence-breakdown KPI cards and the non-placement-reason chart. Walk Flows D, E, F (job loss, self-employment, apprenticeship) end-to-end against seeded data, fixing any gaps.

**Hour 8 — Polish + Rehearsal**
Add empty/error states, fix visual inconsistencies, add the seed-reset button, and rehearse the Section 17 demo script twice, timing it to 3–5 minutes.

---

# 17. Demo Scenario

Fixed demo state, driven entirely by the seed script (Section 11), narrated using six named trainees:

1. **Open on Government Dashboard** — Placement Rate ~65% with a visible confidence breakdown; district bar chart shows one district (Ranchi) trending lower than the other.
2. **Click into Ranchi** → provider comparison shows Provider A behind Provider C on skill match.
3. **Switch to Provider A's dashboard** → At-Risk list shows **Ravi** at the top (Risk: High, 52 days no placement).
4. **Open Ravi's profile** → show risk factor breakdown, root cause ("Skill mismatch — inferred, needs confirmation"), recommended intervention card.
5. **As Counsellor, approve the intervention** ("Bridge Course – Advanced Excel referral").
6. **Switch to Trainee view as Ravi** → answer his (pre-scheduled, due-today) follow-up: new job, skill match recomputes live to ~82%.
7. **Show the employer verification link generated for Ravi's new employer** → open `/employer/verify/:id` → click Confirm → Ravi's badge flips to green/verified in real time.
8. **Back to Provider Dashboard** → Ravi has dropped off the at-risk list; cohort Placement Rate ticked up.
9. **Back to Government Dashboard** → Ranchi's skill-mismatch rate has improved; non-placement-reason chart shifts.
10. **Close** by opening **Fatima's** profile (self-employed, assisted-verified) and **Amit's** profile (job-loss → re-employed) for 15 seconds each, to prove the system treats non-traditional and disrupted outcomes as first-class, not edge cases — then state the closing line: "This isn't a placement tracker. It's a system that keeps working after the training ends."

---

# Prioritized Implementation Checklist

1. [ ] Schema created (Section 5) + SQLite file initialized.
2. [ ] Seed script writes all entities + the exact demo dataset (Section 11), re-runnable via `/api/admin/seed/reset`.
3. [ ] Mock login + `SessionContext` + `x-demo-user-id` header wired end-to-end.
4. [ ] `GET /api/trainees`, `GET /api/trainees/:id` returning full joined profile.
5. [ ] `TraineeTimeline`, `StatusBadge` components rendering real seeded events.
6. [ ] `confidence.js` classification logic wired to follow-up + verification writes.
7. [ ] Follow-up schedule + `FollowupChat` UI + `POST /api/followups/:id/response` working end-to-end.
8. [ ] Employer Verification: request auto-creation + `/employer/verify/:id` + confirm/dispute endpoint.
9. [ ] Wage & retention: `income_checkpoints` + `WageChart` on trainee profile.
10. [ ] Skill Match Engine: score + missing skills + bridge suggestion, shown on profile and course skill-gap page.
11. [ ] Intelligence layer: outcome risk score + factors, root-cause label, intervention lookup — all explainable in the UI.
12. [ ] Intervention create/approve/complete flow wired to Provider + Counsellor views.
13. [ ] Counsellor Worklist sorted by risk, filterable, linking to trainee profile.
14. [ ] Provider Dashboard: KPI cards (real formulas), at-risk table, skill-gap summary, wage chart.
15. [ ] Government Dashboard: KPI cards with confidence breakdown, district chart, non-placement-reason chart, district drill-down.
16. [ ] Trainee self-view: status, timeline, wage chart, skill match, recommendations, consent toggles.
17. [ ] RBAC middleware enforced on all write routes per Section 7.
18. [ ] Full run-through of Flows A–F (Section 8) against seed data with no manual data patching.
19. [ ] Section 17 demo script rehearsed twice, timed to 3–5 minutes, with a clean reset before judging.
20. [ ] SHOULD-BUILD items (attrition score, district table, provider comparison, root-cause drill-down) added only after item 19 is solid.
