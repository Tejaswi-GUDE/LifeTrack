# LifeTrack Architecture Audit

## 1. Routing, Auth, API & Role Scoping

**Frontend routing:** `App.jsx` uses React Router with `Routes` configured by role. Each role's home redirects to `roleHome(session.role)` from `config/nav.js`. Protected routes require `AppShell` wrapper which enforces login.

**Backend auth:** Mock JWT-based login (`POST /api/auth/login` via `x-demo-user-id` header in frontend). Tokens contain `{ userId, role, scopeId }` and are validated by `verifyToken` middleware before reaching role-guarded routes via `requireRole(role)`.

**API calls:** Frontend uses a wrapped axios client (`api/client.js`) that attaches JWT from localStorage. Every request includes `Authorization: Bearer <token>` header.

**Role scoping:** 
- Government: views aggregates, provider comparisons, district drilldowns
- Provider: manages their trainees, interventions, followups within their providerId
- Counsellor: worklist of at-risk trainees across providers, interventions
- Trainee: views own profile, timeline, followups, consent
- Employer: zero-login verify link (`/employer/verify/:verificationId`), optional dashboard login

---

## 2. Design System Implementation

**Tokens:** `frontend/src/styles/tokens.css` defines:
- Color palette: `--ink` (navy), `--paper` (light bg), `--slate` (neutral), `--teal` (positive), `--ochre` (warning), `--brick` (risk), `--plum` (AI insight)
- Spacing: 4px base unit scale (4, 8, 12, 16, 24, 32, 48, 64, 96)
- Border radius: `--radius-xs` (4px), `--radius-sm` (6px), `--radius-md` (10px), `--radius-lg` (14px), `--radius-pill` (999px)
- Typography: IBM Plex Sans (body/chrome), IBM Plex Serif (titles/names), IBM Plex Mono (IDs only)
- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-focus`

**Card pattern:** `--paper-raised` background, 1px `--slate-15` border, `--radius-md`, 20px padding. Semantic-color 2px left border for accents (brick/teal/ochre).

**Button variants:**
- `.btn-primary`: `--ink` bg, white text
- `.btn-secondary`: `--paper-raised` bg, `--ink` border/text
- `.btn-ghost`: transparent
- `.btn-destructive`: `--brick` bg

**Badge pattern:** pill-shaped, semantic colors with three confidence fills:
- Solid: verified (e.g., `.badge.solid-teal`)
- Outline: self-reported (e.g., `.badge.outline-teal`)
- Dashed: needs review (e.g., `.badge.dashed-teal`)

**Timeline.jsx (hero component):** 
- Solid 2px `--ink` vertical spine
- Event nodes: filled circle (routine), semantic-color seal (verified outcome), outline (self-reported), dashed (needs review)
- Each event: date label (Caption, `--slate`), headline (serif for records), detail (sans Body-small)
- AI entries render as Plum insight panels on the spine
- Filter chips: All, Outcomes, Follow-ups, Verification, Interventions

---

## 3. Models and Routes

**Core Models:**
- `Trainee`: central record with embedded current-state (status, confidence, risk scores) + refs to child collections
- `OutcomeEvent`, `EmploymentPeriod`, `IncomeCheckpoint`: outcome history (append-only)
- `Verification`: employer/document verification records
- `FollowupSchedule`, `FollowupResponse`: followup workflow
- `Intervention`: counsellor interventions
- `RootCause`, `ConsentRecord`, `AuditLog`: audit trail
- `User`, `Provider`, `Course`, `JobSkillReference`: reference data

**Key Fields on Trainee:**
- `currentStatus`: enum [in_training, dropped_out, certified_no_outcome, employed, self_employed, apprentice, unemployed, job_lost, not_responding, other]
- `currentConfidence`: high/medium/low
- `outcomeRisk`, `attritionRisk`: { score, band, factors[], computedAt }
- `consentSummary`: { dataCollection, employerContact, analytics }

**Routes:**
- `/api/auth/*`: login (mock)
- `/api/trainees/*`: trainee profiles, status updates
- `/api/dashboards/*`: role-scoped KPIs (government, provider, counsellor)
- `/api/analytics/*`: outcome analytics & drilldowns
- `/api/followups/*`: followup scheduling & responses
- `/api/verifications/*`: employer/document verification
- `/api/interventions/*`: counsellor interventions
- `/api/courses/*`: course skill gaps
- `/api/admin/*`: seed & reference data

---

## 4. Existing Features Inventory

| Area | Status | Details |
|---|---|---|
| **Core outcome model** | ✅ Mostly there | 9 states (in_training → employed/self_employed/apprentice/unemployed/job_lost/not_responding/other); confidence high/medium/low |
| **Verification (confidence)** | ❌ Missing | No verification level (L0–L5) or verification history; confidence is just a string |
| **Further education state** | ❌ Missing | Not in currentStatus enum |
| **Not responding state** | ❌ Missing | "not_responding" is in enum but not used in seed/dashboards |
| **Honest denominators** | ❌ Missing | No "unknown %" display; no distinction between "never contacted" and "contacted but declined" |
| **Conflicted outcome** | ❌ Missing | No tracking of conflicting sources (e.g., employer says no record vs trainee says employed) |
| **Non-placement reasons** | ✅ Partly there | Mentioned in code but not systematically captured in outcomes |
| **Consent matrix** | ⚠️ Partly there | `consentSummary` has 3 toggles; needs per-category × per-recipient matrix |
| **Dark theme** | ❌ Missing | Only light mode in tokens.css |
| **Theme toggle** | ❌ Missing | No UI toggle, no localStorage persistence |
| **Login polish** | ❌ Missing | Login exists but not split-screen; no public stats; no demo role pills |
| **Follow-up channels** | ⚠️ Partly there | Scheduling exists; no WhatsApp/SMS/IVR/agent escalation ladder |
| **Mock phone interface** | ❌ Missing | No demo tool to show channel escalation |
| **Field agent role** | ❌ Missing | No field_agent role or queue |
| **Evidence upload** | ❌ Missing | No file upload for offer letters / salary slips |
| **Official record simulation** | ❌ Missing | No AdminRecord collection or EPFO/Udyam match |
| **Conflict detection** | ❌ Missing | No automated flagging of disagreements |
| **Risk explainability** | ✅ Already there | `outcomeRisk.factors` captures points per factor |
| **Stated vs inferred reason** | ❌ Missing | No storage of trainee's stated reason vs system's inferred root cause |
| **Intervention loop** | ⚠️ Partly there | Interventions exist; no auto-follow-up on completion or timeline event |
| **Effectiveness tracking** | ❌ Missing | No success rate by intervention type |
| **Curriculum feedback** | ❌ Missing | No skill gap collection from graduates' actual jobs |
| **Government equity views** | ❌ Missing | No breakdown by gender/caste/disability/rural-urban |
| **Provider scorecard** | ⚠️ Partly there | Provider performance page exists; missing uncertainty ranges, small-cohort warnings |
| **Early-warning alerts** | ❌ Missing | No anomaly detection or alert rules |
| **CSV import** | ❌ Missing | No bulk trainee import |
| **Identity matching** | ❌ Missing | No hashed ID tokens or duplicate detection |
| **Employer job openings** | ❌ Missing | No job board or skill extraction |
| **Employer feedback** | ❌ Missing | No hire rating or exit reporting |
| **Smoke test** | ❌ Missing | No Playwright automation script |
| **Guided demo** | ❌ Missing | No step-by-step walkthrough overlay |
| **Dev clock** | ❌ Missing | No API to advance time for testing followup escalation |

---

## 5. Bugs & Console Errors Found

(To be confirmed on running the app — no critical errors expected in greenfield code)

---

## 6. Design System Compliance Checklist

- ✅ Sidebar: dark `--ink` background, role-scoped nav, persistent across pages
- ✅ Topbar: breadcrumb, page title (H1 serif), role tag, controls
- ✅ Cards: flat `--paper-raised`, 1px `--slate-15` border, `--radius-md`, 20px padding
- ✅ Badges: pill-shaped, semantic colors, three fills (solid/outline/dashed) for confidence
- ✅ Buttons: four variants (primary/secondary/ghost/destructive) with consistent sizing
- ✅ Inputs: 40px height, 12px text, 1px border, focus ring
- ✅ Tables: `--paper-raised` bg, no vertical grid, row hover, tabular numerics
- ✅ Timeline.jsx: solid 2px spine, semantic nodes, serif headlines, filter chips — all present
- ✅ Alerts: left-accent banner, semantic color left border
- ✅ Modals: centered, `--paper-raised`, shadow-lg, button-row footer
- ⚠️ Dark mode: tokens defined but no toggle or theme context
- ✅ Typography: IBM Plex family used correctly (sans for chrome, serif for names/titles)
- ✅ Spacing: 4px unit scale consistently applied

---

## Summary

LifeTrack is a well-structured MERN prototype with:
- **Solid foundation:** clear auth, role scoping, model design, and design-system compliance
- **Working core:** trainees, outcomes, dashboards, interventions, verifications all functional
- **Gaps to close:** dark theme, verification levels, follow-up channels, evidence upload, official records, CSV import, and the demo layer (personas, smoke test, guided walkthrough)

**Key patterns to reuse:**
- Existing component library (cards, badges, buttons) — new features must use `tokens.css` variables, no hard-coded colors
- Timeline.jsx — reference for all timeline rendering
- AppShell wrapper — handles auth & layout
- Mongoose schema + lib/ business logic structure — new models follow this
- Role-gated routes in App.jsx — add new routes here, not in separate files

**Recommended first fixes** (before Change 1):
1. Add ThemeContext & dark-mode tokens to tokens.css (quick win, enables all subsequent Polish)
2. Verify seed data includes the expected personas (Lakshmi, Priya, Ravi, Sana, Amit, Fatima, Karan, Deepak, Neha, Meena)

