# LifeTrack — Technical Architecture (MERN, <24-hour SIH build)

This document replaces the stack section of the Prototype Build Specification with a MERN-based architecture and gives the single, final technical design the team should build against.

---

## 1. Stack Options Considered

| Option | Fit for this prototype | Verdict |
|---|---|---|
| **MERN** (MongoDB, Express, React, Node) | One language (JS) across the whole stack, flexible schema suits a fast-moving trainee/outcome record, free managed DB (Atlas) removes all DB-ops work, huge ecosystem for auth/charts/UI so nothing has to be built from scratch. | **Chosen** |
| **Next.js + Postgres (Prisma)** | Very productive for CRUD screens and would give relational integrity out of the box, but adds ORM setup, migrations, and a routing/rendering model (SSR/RSC) the team has to think about mid-build — overhead that buys correctness the demo doesn't need in one day. | Rejected — extra setup cost, not extra demo value |
| **Firebase/Supabase (BaaS) + React** | Fastest possible auth and hosting, and Supabase's Postgres would technically satisfy "relational data" better than Mongo — but it locks the AI-scoring logic (Section 9 of the Build Spec) into either client-side code (insecure/inconsistent) or Cloud Functions (extra deployment surface, cold starts, another platform to configure under time pressure). | Rejected — good for CRUD, awkward for the custom intelligence layer that is this project's core differentiator |

**Chosen stack: MERN.** It is the only option where every requirement (auth, relational-enough data, dashboards, custom AI-style scoring, seed data, deployment) is served by tools the team can wire together in hours, not by tools that are individually best-in-class but collectively add integration risk.

---

## 2. Stack Components

### Frontend
**React (Vite) + Tailwind CSS + React Router.** Vite gives instant dev-server startup and fast HMR — no time lost to build tooling. Tailwind means no separate CSS files or design decisions mid-build. React Router handles the role-scoped route list from the Build Spec (Section 4) with no extra library.

### Backend
**Node.js + Express**, single service, structured by feature (routes/controllers), not microservices. Express is chosen over NestJS/Fastify purely for build speed — no decorators, no DI container, minimal boilerplate, and every teammate can read any route file cold.

### Database
**MongoDB (via Mongoose), hosted on MongoDB Atlas free tier.** Mongoose gives schema definitions with validation and `ref`/`populate` for relationships — so the data is still meaningfully relational (Trainee → Course → Provider, Trainee → OutcomeEvents, Trainee → Interventions) without needing migrations. Atlas removes all database installation/ops work: connect with one URI and start writing.

### Authentication
**JWT-based mock-login, role claims in the token.** A `POST /api/auth/login` issues a signed JWT containing `{ userId, role, scopeId }` for a seeded demo user (no password flow needed — pick-a-user login, same UX as the original plan, but now backed by a real, verifiable token instead of a bare header). Express middleware (`verifyToken` + `requireRole`) decodes and enforces RBAC on every protected route. This is intentionally still lightweight (no refresh tokens, no OAuth) but is a real, demonstrable auth mechanism — closing the "must support authentication/RBAC" requirement properly rather than with a header-only shortcut.

### AI Integration
**In-process Node scoring module (`/backend/lib/intelligence.js`)** — the same explainable, rule-based functions defined in the Build Spec (Outcome Risk, Skill Mismatch, Attrition Risk, Root-Cause, Intervention Recommendation), called directly inside Express route handlers. No external AI API, no separate inference service. This keeps the "AI-powered" features fully inside the one deployable backend, with zero network dependency and zero latency/cost risk during judging, while still returning structured, explainable output to the UI.

### Charts
**Recharts.** Pure React components, composes directly with Tailwind layout, covers every chart the Build Spec needs (wage line chart, placement bar chart, non-placement-reason stacked bar) without extra configuration.

### UI Component Library
**Tailwind CSS + shadcn/ui** for the small set of interactive primitives (dialog/modal for intervention approval, badge, tabs, table) that would otherwise cost real build time to style from scratch. shadcn/ui components are copied into the codebase (not an npm dependency), so there's no version-lock risk mid-build.

### Hosting / Deployment
- **Frontend:** Vercel (static Vite build, auto-deploy from GitHub, free tier, custom domain optional).
- **Backend:** Render (Node web service, free tier, auto-deploy from GitHub).
- **Database:** MongoDB Atlas (free M0 cluster, same URI used locally and in production).
- **Fallback:** run both frontend and backend locally (`npm run dev`) pointed at the same Atlas URI, so judging is not dependent on free-tier cold starts or venue Wi-Fi.

---

## 3. Why MERN Is the Fastest, Safest Choice Here

1. **One language everywhere.** No context-switching between SQL, an ORM DSL, and JS — the whole team writes JavaScript in the frontend, backend, and data layer, which matters more in an 8-hour build than any framework's individual merits.
2. **Schema flexibility matches how the data will actually be built.** The trainee/outcome model in the PRD grows organically as follow-ups, verifications, and interventions accumulate — Mongoose lets a field be added to a schema without a migration step, which a relational ORM would require mid-build.
3. **Relationships are still explicit and queryable.** `ref` + `.populate()` in Mongoose gives the same practical relational behavior (Trainee references Course/Provider; OutcomeEvents/Interventions/Verifications reference Trainee) needed for dashboards and drill-downs, without needing a full RDBMS for a dataset of ~30 trainees.
4. **Zero database operations work.** Atlas is provisioned in minutes, requires no server management, and the same connection string works identically in local dev and in production — one less thing that can break between "it works on my machine" and the judging demo.
5. **The AI layer stays simple and dependency-free.** Because the "AI" is deterministic scoring code, not a hosted model, MERN's single-backend-service model means there is no second service, no API key, and no external network call that could fail live in front of judges.
6. **Deployment is a known, well-trodden path.** Vercel + Render + Atlas is a combination thousands of hackathon teams use successfully; documentation and defaults are optimized for exactly this "get a working full-stack app live fast" scenario.

---

## 4. Final Architecture Diagram

```
                                   ┌─────────────────────────────┐
                                   │        JUDGES / USERS        │
                                   └───────────────┬───────────────┘
                                                   │ HTTPS
                                   ┌───────────────▼───────────────┐
                                   │   FRONTEND (React + Vite)      │
                                   │   Tailwind CSS + shadcn/ui      │
                                   │   React Router (role-scoped)    │
                                   │   Recharts (dashboards/charts)  │
                                   │   Hosted on: Vercel             │
                                   └───────────────┬───────────────┘
                                                   │ REST/JSON
                                                   │ (JWT in Authorization header)
                                   ┌───────────────▼───────────────┐
                                   │   BACKEND (Node.js + Express)   │
                                   │  ┌───────────────────────────┐ │
                                   │  │ Auth middleware (JWT+RBAC) │ │
                                   │  └───────────────────────────┘ │
                                   │  ┌───────────────────────────┐ │
                                   │  │ Route/Controller layer     │ │
                                   │  │ trainees, followups,       │ │
                                   │  │ verifications,             │ │
                                   │  │ interventions, dashboards  │ │
                                   │  └───────────────────────────┘ │
                                   │  ┌───────────────────────────┐ │
                                   │  │ AI / Intelligence module   │ │
                                   │  │ risk • mismatch • attrition│ │
                                   │  │ root-cause • intervention  │ │
                                   │  └───────────────────────────┘ │
                                   │  ┌───────────────────────────┐ │
                                   │  │ KPI aggregation module     │ │
                                   │  └───────────────────────────┘ │
                                   │   Hosted on: Render             │
                                   └───────────────┬───────────────┘
                                                   │ Mongoose (ODM)
                                   ┌───────────────▼───────────────┐
                                   │   DATABASE (MongoDB Atlas)      │
                                   │   Collections: users, providers,│
                                   │   courses, trainees,            │
                                   │   outcomeEvents,                │
                                   │   employmentPeriods,            │
                                   │   incomeCheckpoints,             │
                                   │   verifications, followups,      │
                                   │   interventions, consentRecords, │
                                   │   auditLog                       │
                                   │   Hosted on: MongoDB Atlas (M0)  │
                                   └─────────────────────────────────┘

  Seed script (Node, run once/reset via /api/admin/seed/reset) writes
  demo data directly into the same Atlas cluster used above.
```

---

## 5. Project Folder Structure

```
lifetrack/
├── backend/
│   ├── src/
│   │   ├── models/                     (Mongoose schemas)
│   │   │   ├── User.js
│   │   │   ├── Provider.js
│   │   │   ├── Course.js
│   │   │   ├── Trainee.js              (embeds current-state fields + refs to child collections)
│   │   │   ├── OutcomeEvent.js
│   │   │   ├── EmploymentPeriod.js
│   │   │   ├── IncomeCheckpoint.js
│   │   │   ├── Verification.js
│   │   │   ├── FollowupSchedule.js
│   │   │   ├── FollowupResponse.js
│   │   │   ├── RootCause.js
│   │   │   ├── Intervention.js
│   │   │   ├── ConsentRecord.js
│   │   │   └── AuditLog.js
│   │   ├── lib/
│   │   │   ├── intelligence.js         (risk, mismatch, attrition, root-cause, intervention lookup)
│   │   │   ├── kpis.js                 (Section 18 PRD formulas as Mongo aggregation pipelines)
│   │   │   └── confidence.js           (outcome classification + confidence rules)
│   │   ├── middleware/
│   │   │   ├── auth.js                 (verifyToken)
│   │   │   └── rbac.js                 (requireRole / scope checks)
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── trainees.routes.js
│   │   │   ├── followups.routes.js
│   │   │   ├── verifications.routes.js
│   │   │   ├── interventions.routes.js
│   │   │   ├── dashboards.routes.js
│   │   │   ├── courses.routes.js
│   │   │   └── admin.routes.js
│   │   ├── seed/
│   │   │   └── seed.js
│   │   ├── app.js
│   │   └── server.js
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── StatusBadge.jsx
│   │   │   ├── RiskBadge.jsx
│   │   │   ├── KpiCard.jsx
│   │   │   ├── TraineeTimeline.jsx
│   │   │   ├── WageChart.jsx
│   │   │   ├── SkillMatchGauge.jsx
│   │   │   ├── AtRiskTable.jsx
│   │   │   ├── FollowupChat.jsx
│   │   │   ├── InterventionCard.jsx
│   │   │   ├── ConsentToggleList.jsx
│   │   │   ├── RoleGate.jsx
│   │   │   └── ui/                     (shadcn/ui primitives: badge, dialog, tabs, table)
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── trainee/ (Home.jsx, Timeline.jsx, Followup.jsx, Consent.jsx)
│   │   │   ├── provider/ (Dashboard.jsx, TraineeProfile.jsx, CourseSkillGap.jsx, Interventions.jsx)
│   │   │   ├── counsellor/ (Worklist.jsx, TraineeProfile.jsx)
│   │   │   ├── government/ (Dashboard.jsx, DistrictDrilldown.jsx, ProviderComparison.jsx)
│   │   │   └── employer/ (Verify.jsx)
│   │   ├── api/
│   │   │   └── client.js               (axios/fetch wrapper, attaches JWT from localStorage)
│   │   ├── context/
│   │   │   └── SessionContext.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
└── README.md                            (env setup, seed command, local run, demo script link)
```

**Key modeling note:** `Trainee` documents embed the fast-changing current-state fields (status, confidence, risk scores) directly for cheap dashboard reads, while `OutcomeEvent`, `EmploymentPeriod`, `IncomeCheckpoint`, `Verification`, `FollowupResponse`, `Intervention` and `ConsentRecord` remain separate collections referencing `traineeId` — giving the append-only, auditable history the PRD requires (Section 11/21) while keeping every dashboard query a single indexed lookup rather than a multi-collection join.
