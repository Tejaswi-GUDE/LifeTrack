# LifeTrack — Frontend

React 18 + Vite 5 + Tailwind 3 + React Router 6, per `docs/02_Architecture.md`.
Every sidebar route across all five roles leads to an implemented screen that
renders in a real browser — no "screen not built" placeholders, no blank
pages. Verified with Playwright/Chromium (`scripts/browse-check.mjs`).

## Run

```bash
# 1. backend (zero-setup: in-memory MongoDB + seed + API on :4000)
cd ../backend && npm install && npm run dev

# 2. frontend
npm install
cp .env.example .env.local     # optional; defaults work with the dev proxy
npm run dev                    # http://localhost:5173
npm run build                  # production build to dist/
npm run preview                # serve the production build
```

The dev server proxies `/api` → `http://localhost:4000` (the Express backend).
Override with `VITE_API_PROXY_TARGET`.

### Headless validation

With the backend running (`cd backend && npm run dev` — re-seeds each start):

- `node scripts/smoke-dashboard.mjs` — Government Impact Dashboard.
- `node scripts/smoke-profile.mjs` — Trainee Profile + Career Timeline.
- `node scripts/smoke-riskcenter.mjs` — Risk & Intervention Center (list +
  filters, master-detail, explained risk, skill mismatch, **Approve →
  persisted review-status change**, profile navigation, error state).
- `node scripts/smoke-allscreens.mjs` — walks every sidebar route for every
  role: no crash, no placeholder, and the four main dashboards render data.

Each renders the real `<App/>` in jsdom against `http://localhost:4000`.
`smoke-riskcenter` / `smoke-allscreens` mutate data, so restart the backend
before re-running them.

## Structure

```
src/
  styles/
    tokens.css        copied VERBATIM from docs/Flagship_Screens/tokens.css
    primitives.css     additive styles for components tokens.css didn't ship
                       (inputs, modal, drawer, tooltip, dropdown) — each rule
                       follows a section of docs/04_Design_System.md
    base.css           Tailwind layers (preflight OFF) + minimal resets
  lib/cn.js            classname joiner (no clsx dependency)
  context/SessionContext.jsx   mock role/session container (localStorage)
  config/nav.js        role-aware nav items + per-route topbar crumb/title
  components/
    RoleGate.jsx
    shell/            AppShell (layout route), Sidebar, Topbar, NotificationsMenu
    ui/               reusable primitives — see below
  pages/
    Login.jsx          foundation role picker (no backend call yet)
    Placeholder.jsx    every product route renders this inside <AppShell>
    EmployerVerify.jsx  link-based verification screen — NO sidebar
    FoundationFrame.jsx  plain dev frame used by /ui only
    UIShowcase.jsx     /ui — renders every primitive (build-time check)
    NotFound.jsx
  App.jsx             route tree (Build Spec §4); in-app routes nest under <AppShell>
  main.jsx            entry; imports styles in order tokens → primitives → base
```

## Design tokens

`tailwind.config.js` maps every colour / radius / shadow / font / spacing
utility onto the CSS variables in `tokens.css`, so Tailwind utilities and the
approved component classes (`.btn`, `.card`, `.badge`, `.tbl`, `.timeline`, …)
stay in lockstep. Tailwind's preflight is disabled — `tokens.css` owns the
baseline. Breakpoints: `sm` 768, `lg` 1100, `xl` 1200 (Flagship Screens spec).

## UI primitives (`src/components/ui`)

`Button` · `Card` · `Badge` · `StatusBadge` · `RiskBadge` · `Input` · `Select`
· `Table` · `Tabs` (segmented control) · `Modal` · `Drawer` · `Tooltip` ·
`Dropdown` · `Alert` · `InsightPanel` · `EmptyState` · `ErrorState` ·
`Skeleton` / `SkeletonText` / `Spinner`

Import from the barrel: `import { Button, Card } from '../components/ui'`.
See `/ui` in the running app for a live catalogue.

## Application shell

`src/components/shell/AppShell.jsx` is a layout route: the `--ink` sidebar
(Design System §19) + `--paper` topbar (crumb + serif H1, role indicator,
notifications entry, profile/settings menu) around an `<Outlet/>`. It requires
a session — unauthenticated visitors are redirected to `/login`. `Login` and
`EmployerVerify` render outside the shell.

Navigation is role-aware (`config/nav.js`): government / provider / counsellor
/ trainee each get their RBAC-appropriate subset of the MVP areas (Overview,
Trainees, Providers, Follow-ups, Risk & Interventions, Skill Intelligence,
Analytics, Settings / Consent). Active state matches detail routes to the
right area. Below 768px the sidebar becomes a hamburger-triggered drawer.

## Screens built

- **Government Impact Dashboard** (`/government/dashboard`) — live from
  `GET /api/dashboards/government`. KPI strip (Placement / Retention / Wage
  Growth / Skill Match with confidence breakdown), computed alerts,
  Provider/District performance table (By Provider · By District, drill-down
  rows), Skill Gap Intelligence, Non-Placement Reasons. Scope filters
  (state / district / All-data · Verified-only) live in the topbar via
  `components/shell/TopbarSlot`.
- **Trainee Profile + Career Timeline** (`/provider/trainee/:id`,
  `/counsellor/trainee/:id`) — live from `GET /api/trainees/:id`. Profile
  header (identity, status/confidence, role-gated actions), sticky Snapshot
  rail (Current employment, Wage progression + sparkline, Skill relevance
  gauge, Risk + factors, Consent), and the **`components/Timeline.jsx`**
  reusable component: an --ink spine of dated events assembled server-side
  from every child collection, with the seal/outline/dashed node treatment,
  Plum insight panels for interventions, a chip filter (All / Outcomes /
  Follow-ups / Verification / Interventions), and "View details" expanders.
- **Trainee Directory** (`/provider/trainees`, `/counsellor/trainees`) —
  live from `GET /api/trainees`; status + risk filters; rows open the profile.
- **Risk & Intervention Center** (`/counsellor/worklist`, `/provider/risk`) —
  master-detail worklist; detail from `GET /api/trainees/:id/risk`; Approve /
  Dismiss / Reassign persist via `POST` / `PATCH /api/interventions/:id`.
- **Provider Dashboard** (`/provider/dashboard`) — `GET /api/dashboards/provider/:id`.
  KPIs, cohort/course table, outcome-mix + wage-trend charts, trainees
  requiring attention, non-placement reasons, skill-gap bars, recent
  interventions. Provider + course switchers in the topbar.
- **Trainee "My Career"** (`/trainee/home`) — `GET /api/trainees/:id`. Summary,
  current status / income / skill-match cards, recommended next steps,
  follow-up + consent status, and the full career timeline (reuses
  `components/Timeline.jsx`). Trainee switcher for the demo.
- **Employer Dashboard** (`/employer/dashboard`) — `GET /api/dashboards/employer`.
  Hiring KPIs, verification-request table (→ `/employer/verify/:id`),
  employees & outcomes, skill-requirement cards. Employer switcher.
- **District & Outcome Analytics** (`/government/analytics`,
  `/government/district/:id`) — `GET /api/analytics/outcomes`. KPI strip,
  wage-trend + outcome-mix, provider & course comparison, non-placement
  reasons, skill supply-vs-demand, district × skill-gap heatmap,
  demographics cross-tabs. District / provider / course filters.
- **Secondary** — Provider Performance, Skill Intelligence, Follow-up Queue
  (provider/counsellor/trainee), Intervention Log, Course Skill-Gap report,
  Career Timeline, Consent controls (persist via `PATCH /trainees/:id/consent`),
  conversational Follow-up check-in (`POST /followups/:id/response`), shared
  Settings, and Seed/Reset (`POST /admin/seed/reset`).

Charts are pure SVG/CSS (`components/charts/index.jsx`) — no chart library
was added. `hooks/useScopedEntity.jsx` handles the provider / employer /
trainee scope switchers (mock login only binds a role). `components/
ErrorBoundary.jsx` wraps the app (in `main.jsx`) and each route (in
`AppShell`) so a bug on one screen can never blank the whole app.

### Real-browser validation

With both dev servers running:

```
npx playwright install chromium   # one-time
node scripts/browse-check.mjs      # every route × every role in Chromium
node scripts/browse-nav.mjs        # sidebar nav, internal nav, error handling
```

## Dependency note — IMPORTANT

An external process (an IDE/editor auto-updater) repeatedly rewrites
`package.json` to `vite@8` + `react-router-dom@7`. **`vite@8` (rolldown) is
incompatible with `@vitejs/plugin-react@4`**: it fails to inject
`window.__vite_plugin_react_preamble_installed__`, so every `.jsx` component
throws `"@vitejs/plugin-react can't detect preamble"` at import — **every page
renders blank**.

This is pinned back to a coherent, compatible set and reinstalled:
`vite@5.4.11`, `@vitejs/plugin-react@4.3.4`, `react-router-dom@6.28.0`
(exact versions, no `^`). `vite.config.js` also loads the React plugin
defensively — if it ever can't load, Vite's built-in JSX transform keeps the
app rendering (only component-level HMR is lost).

If pages go blank again: check `node -e "console.log(require('vite/package.json').version)"`.
If it's `8.x`, run `rm -rf node_modules package-lock.json && npm install`
(the pinned `package.json` on disk installs the right versions; `npm run dev`
uses whatever `vite` is in `node_modules/.bin` regardless of a later rewrite).
