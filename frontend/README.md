# LifeTrack — Frontend

React (Vite) + Tailwind CSS + React Router, per `docs/02_Architecture.md`.
This is the **foundation** only: project structure, routing, design tokens,
global styling, and reusable UI primitives. No dashboards or workflows yet.

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

Each renders the real `<App/>` in jsdom against `http://localhost:4000`.
`smoke-riskcenter` mutates an intervention, so restart the backend before
re-running it.

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
- **Risk & Intervention Center** (`/counsellor/worklist`) — master-detail
  worklist. List from `GET /api/trainees` (risk-sorted, `flags` for the
  status filter); detail from `GET /api/trainees/:id/risk` (explained risk
  score + factor list, root cause, course-vs-job skill-mismatch panel,
  recommended intervention with priority + human-review status). Approve /
  Dismiss / Reassign write through `POST` / `PATCH /api/interventions/:id`
  (with `AuditLog` rows) — the review-status pill reflects the **persisted**
  state. Selected trainee is held in the `?t=` URL param.

## Not done yet (later steps)

Real mock-login against `POST /api/auth/login`, the district / provider
drill-down screens (routes are placeholders), the trainee self-view
(`/trainee/*`), and the remaining role dashboards / workflow screens.

## Dependency note

`package.json` currently resolves `vite@8` + `react-router-dom@7` +
`@vitejs/plugin-react@4`, which have a peer-dependency conflict
(`npm ci` fails; `npm install --legacy-peer-deps` works). The app builds and
runs on this combination, and all headless smokes pass. A coherent pin is
`vite@^5.4`, `@vitejs/plugin-react@^4.3`, `react-router-dom@^6.28`.
