# LifeTrack — Rules for Claude Code

## Product & Mission

**LifeTrack** tracks trainees after skilling (jobs, self-employment, apprenticeship, further education, wage, retention), verifies outcomes, flags risk and drives interventions. Built during SIH hackathon as a MERN prototype; we are now upgrading it in place.

**Upgrade plan:** `docs/LifeTrack_Upgrade_Plan.md` — follow it one change at a time (order: 0, 1, 2, 3, 4, 9, then 5, 6, 7, 8). Stop and wait for "next" after each change is complete.

---

## How to Work on LifeTrack

### Codebase Structure

**Backend** (`backend/src/`):
- `app.js`: Express app definition with all routes
- `models/`: Mongoose schemas (Trainee, Outcome, Verification, etc.)
- `routes/`: Express route handlers, structured by feature
- `lib/`: Business logic (intelligence scoring, dashboards, analytics)
- `middleware/`: Auth, RBAC, error handling
- `seed/`: Demo data and reset logic

**Frontend** (`frontend/src/`):
- `App.jsx`: React Router configuration (no protected routes here, auth is enforced at AppShell level)
- `components/`: Reusable UI building blocks (use these; don't reinvent)
- `pages/`: Role-scoped page views
- `context/SessionContext.jsx`: Auth state
- `styles/tokens.css`: All design tokens (colors, spacing, shadows, etc.)
- `config/nav.js`: Role-scoped navigation

### Editing Rules

1. **EDIT EXISTING CODE.** Never re-scaffold, never switch stack or database, never delete working features. Reuse existing components, page layouts and API patterns.

2. **Visual consistency:** All new UI must use `tokens.css` variables and existing component patterns. No hard-coded colors. **Timeline.jsx is the reference for all timelines.** New cards use the `.card` class with semantic left-accent borders (`.card.accent-brick`, `.card.accent-teal`, etc.).

3. **Every page:** loading, empty and error states; works at 375px and desktop; no console errors.

4. **Backend:** follow the existing route/model/lib structure; business logic lives in `lib/`, not routes. Every model has an index; new collections need indexes on query fields.

5. **Every score and badge explains itself** (tooltip or "Why?" text). Risk scores always show their factors inline, never hidden.

6. **Placement rate denominator** = all certified trainees; always show unknown %. Every KPI card includes n and unknown %.

7. **Government views show aggregates only.** Hide any group smaller than 10 (return `suppressed: true`; UI shows "Suppressed (<10)").

8. **Before saying done:** restart backend (re-seeds), run frontend build, click through changed pages as each relevant role, report zero console errors, commit (`git commit -m "Change N: <name>"`), list files changed and what to click.

9. **Product name: LifeTrack.** Don't change the stack (MERN), database (MongoDB), or UI framework. Don't delete working features.

10. **If a spec conflicts with how the code already works, prefer the existing pattern** and explain why.

---

## Architecture Patterns

### Auth & Session

- Mock JWT login: `x-demo-user-id` header → `POST /api/auth/login` → token stored in localStorage
- Frontend attaches JWT to every request via axios wrapper (`api/client.js`)
- Backend validates via `verifyToken` middleware, enforces role via `requireRole(role)`
- Session context holds `{ userId, role, scopeId, token }`

### Database & Models

- **Mongoose schemas** in `backend/src/models/`; each model is the source of truth for a domain
- **Trainee** is the central record: embeds fast-changing state (status, confidence, risk) for cheap reads, refs child collections (OutcomeEvent, Verification, etc.) for append-only history
- **Child collections:** every entry is immutable; history is never lost
- **Indexes:** every route query must have an index; add to schema before deploying

### Routes & Controllers

- **REST endpoints** in `backend/src/routes/*.routes.js`
- **Business logic** in `backend/src/lib/*.js` (not in route handlers)
- **Pattern:** routes handle validation & auth; lib functions compute results; routes format & send responses
- **Errors:** use the `errorHandler` middleware (catches thrown errors, formats as JSON)

### Frontend Components

**UI Building Blocks** (reuse these; do not reinvent):
- `Badge`: status + confidence (solid/outline/dashed fills, semantic colors)
- `Card`: flat `--paper-raised`, 1px border, `--radius-md`
- `Button`: four variants (primary/secondary/ghost/destructive)
- `Timeline`: career timeline with spine and event nodes
- `InsightPanel`: AI-generated insights with `--plum` background
- `RiskBadge`: score + band + factors
- And others in `components/ui/`

**Pages:** structured by role (`pages/{government,provider,counsellor,trainee,employer}/`). Each page uses AppShell wrapper for auth & layout.

### Design Tokens

Everything visible must come from `frontend/src/styles/tokens.css`:
- Colors: `--ink`, `--paper`, `--slate`, `--teal`, `--ochre`, `--brick`, `--plum`
- Spacing: 4, 8, 12, 16, 24, 32, 48, 64, 96
- Radius: `--radius-xs` (4px), `--radius-sm` (6px), `--radius-md` (10px), `--radius-lg` (14px), `--radius-pill`
- Typography: IBM Plex Sans (chrome/body), Serif (titles/names), Mono (IDs only)
- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-focus`

No hard-coded hex colors anywhere in component code.

---

## Key Files to Know

- `docs/02_Architecture.md` — stack choices, folder structure, deployment
- `docs/03_Build_Spec.md` — PRD, problem statement, feature list
- `docs/04_Design_System.md` — visual design language (colors, typography, spacing, components)
- `backend/src/lib/intelligence.js` — risk scoring, mismatch, attrition logic
- `backend/src/lib/traineeProfile.js` — build trainee profile data
- `backend/src/lib/governmentDashboard.js` — aggregate KPIs
- `frontend/src/components/Timeline.jsx` — hero component (reference for all timelines)
- `frontend/src/styles/tokens.css` — all design tokens
- `frontend/src/config/nav.js` — role-scoped navigation

---

## Testing & Verification

**Before committing:**
1. Backend: `npm run dev` in `backend/`, verify no errors
2. Frontend: `npm run dev` in `frontend/`, verify no build errors
3. Open pages as each role (via session switcher), verify zero console errors
4. Verify the feature works as spec'd
5. List files changed and what to click

**Seed data:** `/api/admin/seed/reset` re-runs the seed and clears all data. Dev users: Priya, Ravi, Sana, Amit, Fatima, Karan, Deepak, Neha, Meena, Lakshmi (when Change 9 is complete).

---

## Common Gotchas

- **Don't add hard-coded colors.** If you're tempted to write `color: #A33B2B`, use `var(--brick)` instead.
- **Badges are not just colors.** The fill style (solid/outline/dashed) conveys confidence, not just the hue. Don't change this.
- **Timeline is the hero.** It's on every trainee profile page; Timeline.jsx is the only way to render it. Study it before building timeline-like features.
- **Government views must aggregate.** No individual trainee names or IDs; threshold at n=10.
- **Restore is state-dependent.** Risk scores are computed when outcomes change, not on every load. If something looks stale, check `computedAt` timestamps.
- **Consent is per-category × per-recipient.** Old simple toggles won't work; plan the matrix.
- **Verification levels are not just strings.** L0–L5 + history is the model; badges show "High · L4" not just "High".

