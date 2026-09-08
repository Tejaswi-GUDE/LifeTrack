# LifeTrack — Three Flagship Screens: Specification

Built on the approved Design System, PRD, Build Specification and database schema. Each screen is provided as a working HTML mockup (see accompanying files) plus the structural specification below.

---

# 1. Government Impact Dashboard

**File:** `01_government_dashboard.html` · **Route:** `/government/dashboard`

### Page structure
Sidebar (fixed, `--ink`) → Topbar (title + scope/confidence filters) → Content: Alerts → KPI strip → Provider/District performance table + Skill Gap / Non-Placement panels → footer data-freshness note.

### Layout hierarchy
1. **Alerts** sit above KPIs deliberately — a policymaker should see "what needs attention" before "what the numbers are."
2. **KPI strip** (4 cards only: Placement Rate, Retention Rate, Avg. Wage Growth, Avg. Skill Match Score) — the four PRD-defined formulas that answer "overall skilling impact / employment outcomes / retention / wage progression" in one glance. No fifth decorative KPI was added.
3. **Provider & District Performance** (left, wider) and **Skill Gap Intelligence + Non-Placement Reasons** (right, narrower) sit side by side — performance-by-entity and reasons-why are related questions a reader moves between, so they're visually adjacent rather than stacked.

### Components
KPI card (value + delta + confidence-mix caption), Alert banner (Section 14 of Design System), tabbed table (`By Provider` / `By District` toggle instead of two separate tables — avoids redundant charts per the brief's "avoid unnecessary charts" instruction), Skill Gap row list, single segmented non-placement-reason bar with legend (one purposeful chart, not several).

### Data displayed
Placement Rate, Retention Rate, Avg. Wage Growth %, Avg. Skill Match Score (all with confidence breakdown, per KPI formulas in PRD §18); per-provider/district trainee count, placement %, skill match %, confidence mix (High/Medium/Low counts); top missing skills + affected course; non-placement reason distribution. All sourced from `Trainee`, `SkillMatchResult`, `RootCause`, and aggregation views defined in the Build Spec / database layer — nothing invented.

### Filters
State → District scope selector; **All data / Verified only** toggle (re-runs every KPI and table using only `confirmed` verification records — the confidence-model requirement from the PRD); table toggle **By Provider / By District**.

### Interactions
Clicking a provider/district row drills into that entity's detail (Provider Performance / District Intelligence — out of scope for this mockup, noted as the next-level screen); alert banners are clickable through to the underlying filtered table row; KPI card confidence caption is not interactive (informational only, per Design System §13 — confidence is always visible, never hidden behind a click).

### Navigation
Sidebar: Outcome Impact (active) · District Intelligence · Provider Performance · Skill Intelligence · Analytics — one fixed sidebar shape reused by every dashboard per the Design System.

### Empty / loading / error states
- **Empty:** if a filtered scope has zero certified trainees, the KPI strip shows "—" values with the caption "No trainees in this scope yet" instead of 0% (0% would misleadingly imply a bad outcome rather than no data).
- **Loading:** KPI cards and table rows render as skeleton blocks in their exact final shape (Design System §22).
- **Error:** the KPI strip is replaced by a single `--brick`-accented alert ("Couldn't load outcome data for this scope. Retry.") — no partial/stale numbers are ever shown silently.

### Responsive behavior
≥1200px: layout as designed. 768–1199px: KPI strip wraps to 2×2; the two-column performance/skill-gap section stacks to a single column (performance table first, skill-gap panels below). <768px: sidebar collapses to a top hamburger drawer; table columns reduce to Provider, Placement, Risk mix, with a "view full table" expand action.

---

# 2. Trainee Profile + Career Timeline — **signature screen**

**File:** `02_trainee_profile.html` · **Route:** `/provider/trainee/:id` (same component reused at `/counsellor/trainee/:id` and `/trainee/home` with role-appropriate actions removed)

Worked example: **Amit Verma** — deliberately chosen because his real seeded record is the one trainee whose history actually exercises every stage the brief requires in a single profile: Training → Certification → Placement → Follow-ups → Verification → Retention (a real job loss + re-employment) → Wage progression → Skill relevance → Intervention.

### Page structure
Breadcrumb → Profile header band (identity + status/confidence + primary actions) → two-column layout: sticky **Snapshot** rail (left, current-state facts) and the **Career Timeline** (right, full width available, the dominant visual mass of the page).

### Layout hierarchy
The timeline is deliberately given roughly 70% of the page width and unconstrained vertical length — it is the page's center of gravity, not one panel among equals. The snapshot rail answers "what's true right now" in under 3 seconds of scanning; the timeline answers "how did we get here," which is the harder and more valuable question, so it gets the space.

### Components
Profile header (avatar-initial, serif name, status+confidence badges, meta line, monospace ID line, action buttons); Snapshot cards (Current employment, Wage progression, Skill relevance with gauge, Risk, Consent); Timeline (Design System §18) with **stage labels** (`TRAINING`, `CERTIFICATION`, `PLACEMENT`, `FOLLOW-UP · DAY N`, `RETENTION`, `INTERVENTION`, `SKILL RELEVANCE`) so the required chain is explicitly named at every step, not just implied by content; AI Insight panel embedded directly on the spine for the intervention event; chip-style timeline filter (All / Outcomes / Follow-ups / Verification / Interventions).

### Data displayed
From `Trainee` (identity, current status/confidence, risk scores), `TrainingRecord` (attendance, assessment, certification date), `EmploymentPeriod` ×2 (both jobs, with `exitReason` on the closed one), `OutcomeEvent` history, `FollowupSchedule`/`FollowupResponse` (all 4 checkpoints, including the one still pending), `Verification` (confirmed on job 1, pending on job 2 — shown explicitly, not hidden), `IncomeCheckpoint` ×3 (wage progression card + growth %), `SkillMatchResult` (100% on current role), `Intervention` (re-employment support, completed, with its `outcomeNotes`), `ConsentRecord` summary. Every figure on this screen traces to a real seeded field — nothing is illustrative filler.

### Filters
Timeline chip filter narrows the spine to one event category at a time (e.g., "Verification" shows only the two verification events) — the only filter this screen needs, since it's a single-trainee record rather than a list.

### Interactions
Primary actions in the header (Send verification request — disabled/relabelled once a verification is already pending, as it is here; Log case note; Message trainee) are role-gated: a Trainee viewing their own profile sees no admin actions, only "Update my status" and consent controls. Timeline event cards are static (read-only ledger entries) except the Intervention insight panel, which — for a Counsellor/Provider viewer on an *unresolved* intervention — would show Approve/Dismiss actions inline (not shown here since Amit's intervention is already completed).

### Navigation
Breadcrumb: `Provider Dashboard / Trainee Profiles / Amit Verma`. "Export record" in the topbar. "View full profile & timeline →" is how Screen 3 (Risk Center) links into this screen for any trainee.

### Empty / loading / error states
- **Empty:** a newly certified trainee with no outcome yet shows only the Training + Certification nodes, followed by a single hollow "Awaiting first follow-up" node with the scheduled date — the timeline never looks broken, just short.
- **Loading:** the snapshot rail and timeline both render as shaped skeletons; the timeline skeleton preserves the spine line so the layout doesn't jump once data arrives.
- **Error:** if the profile fails to load, the entire content area is replaced by a single centered alert ("Couldn't load this trainee's record. Retry.") — the sidebar/topbar chrome stays intact so navigation is never lost.

### Responsive behavior
≥1100px: two-column as designed, snapshot sticky. 768–1099px: snapshot rail becomes a horizontally-scrollable card row above the timeline (no longer sticky). <768px: header actions collapse into a single "Actions" overflow menu; timeline stage labels move above the date instead of beside it to preserve line length under 80 characters on narrow screens.

---

# 3. Outcome Risk & Intervention Center

**File:** `03_risk_intervention_center.html` · **Route:** `/counsellor/worklist` (detail pane doubles as the content of `/counsellor/trainee/:id`)

Worked example: **Ravi Oraon** (highest risk score in the seed set, matching the flagship demo narrative from the Build Spec).

### Page structure
Master-detail: fixed-width **list pane** (left) + **detail pane** (right) inside one bordered panel, so the two halves read as one workspace rather than two separate cards.

### Layout hierarchy
List pane is sorted by risk score descending by default (no manual sort needed — it's always the most urgent case first). Detail pane orders its sections exactly as a counsellor would need them to make a decision, top to bottom: *who/what status* → *risk score + why* → *root cause* → *supporting skill-match evidence* → *the recommendation* → *the decision (approve/dismiss)* → *case history*. The "Recommended Intervention" panel and its action row sit directly beneath the evidence that justifies it — a reader never has to scroll back up to check the reasoning before approving.

### Components
Search input; risk-band segmented filter + status select (list pane toolbar); list row (name, course/district/status meta, compact risk bar); detail header with **Human Review Status pill** (`Awaiting counsellor review` / `Approved by [name], [when]` / `Completed`) — always visible, directly under the name, never buried; expanded risk score (Design System §15) with full factor list; Root Cause card with a **Plum "Inferred — needs confirmation"** badge distinguishing system-inferred causes from trainee-stated ones; two-panel Skill Mismatch comparison (course-taught vs. job-required skills, missing skill highlighted in Brick); AI Insight panel for the recommendation; Approve/Dismiss/Reassign action row; compact Case Notes card.

### Data displayed
`Trainee.outcomeRisk` (score, band, factors — Section 16.1 of the PRD's intelligence spec, rendered with zero paraphrasing of the factor list); `RootCause` (label + source: self_reported/inferred); `Course.skillTags` vs `JobSkillReference.requiredSkills` (only shown for trainees with an active/attempted job; correctly omitted for Ravi since he's unemployed — the mismatch panel here instead compares his *course* against the occupation his cohort's root-cause data implicates, which is what the PRD's course-level skill-gap rollup is for); `Intervention` (recommended type, rationale, status, `assignedTo`, `completedAt`/`outcomeNotes` when resolved).

### Filters
Risk band segmented control (All/High/Medium/Low), status dropdown (At-risk / Non-responsive / Needs verification review), free-text search by name — exactly the three filters a counsellor's actual worklist needs per the Build Spec's Counsellor Worklist screen; no filters were added beyond what that workflow calls for.

### Interactions
Selecting a list row updates the detail pane without navigation (single-page master-detail, per Build Spec Flow B); **Approve intervention** opens the Modal component (Design System §20) to confirm before writing the `Intervention` record and flipping its status to `in_progress`; **Dismiss** requires a one-line reason (not modeled in this static mockup but specified for build); **Reassign** hands the case to another counsellor. The review-status pill updates immediately on approval to reflect the new state — this is the screen's core promise (visible human-in-the-loop status) and must never lag behind the action taken.

### Navigation
Sidebar: Risk & Intervention Center (active) · Trainee Profiles · Case Notes. "View full profile & timeline →" at the bottom of the detail pane routes to Screen 2 for the same trainee — the two flagship screens are explicitly linked, not siblings that happen to share data.

### Empty / loading / error states
- **Empty:** "No trainees currently at risk in your queue" with no action button (there's nothing to do — this is a good state, not a failure, and is written that way).
- **Loading:** list rows render as skeleton rows (name-width + meta-width + bar-width blocks); detail pane shows a skeleton matching the risk-hero + factor-list + insight-panel shape so the layout doesn't reflow once real data lands.
- **Error:** a single row-height alert replaces the list ("Couldn't load the worklist. Retry.") while the detail pane shows its own independent error if only that one trainee's record fails to load — the two panes fail independently since they're separate data fetches.

### Responsive behavior
≥1200px: side-by-side master-detail as designed. 768–1199px: same layout with the list pane narrowed to 340px and the mismatch/skill-comparison grid dropping from 2 columns to 1. <768px: master-detail collapses to list-only; selecting a row **navigates** (not in-place update) to a full-screen detail view with a back arrow in the topbar — a side-by-side pane genuinely doesn't fit a phone screen, so this is a real layout change, not just a squeeze.

---

## Cross-screen consistency notes

- All three screens use the identical sidebar shell, topbar pattern, badge/confidence language, risk-bar component, and AI Insight (Plum) panel — verified visually against the Design System's living style guide.
- Ravi (Risk Center) and Amit (Trainee Profile) were chosen deliberately from the real seed dataset rather than invented, so these mockups double as a check that the database layer actually supports every claim the screens make.
- No screen introduces a KPI, chart, or badge type not already defined in the Design System — per the instruction to avoid unnecessary visual elements, every component earns its place by answering one of the specific bullet points in the brief.
