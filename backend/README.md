# LifeTrack — Database Layer (Step 1 of the build)

This delivers the MERN database layer only, per the approved Architecture doc: Mongoose models, a real seed script, and verification. No Express routes or frontend yet.

## What's here

```
src/
  models/            15 Mongoose schemas (see below) + index.js barrel export
  db.js              Mongoose connection helper (reads MONGODB_URI from .env)
  seed/
    data.js          Framework-agnostic seed dataset (8 trainees, all required scenarios)
    seed.js          Real seed script - wipes + reloads every collection via Mongoose
  verify/
    validateSchemas.js  Validates all 137 seeded documents against the real Mongoose
                         schemas using .validate() - no DB connection required
    flatten.js           Turns data.js into flat collections for query verification
    runQueries.js        Runs 11 representative MongoDB aggregation pipelines against
                          the seed data via `mingo` (see "How verification works" below)
```

## Collections implemented (15)

`Provider`, `Course`, `JobSkillReference`, `Trainee`, `OutcomeEvent`, `EmploymentPeriod`,
`IncomeCheckpoint`, `Verification`, `SkillMatchResult`, `FollowupSchedule`, `FollowupResponse`,
`RootCause`, `Intervention`, `ConsentRecord`, `AuditLog`, `User` — every entity from the
Build Spec's data model, with `timestamps: true` on every schema, `ref` relationships between
collections, required/enum constraints, and indexes matching the query patterns the dashboards
need (e.g. `Trainee.outcomeRisk.score` descending for the at-risk worklist, compound index on
`FollowupSchedule{traineeId, checkpointDay}` to guarantee one schedule per checkpoint).

## Requirement coverage

| Requirement | Where |
|---|---|
| Relationships + constraints | `ref` fields throughout + Mongoose `required`/`enum` validators |
| Timestamps | `{ timestamps: true }` on all 16 schemas |
| Indexes | Declared per-schema (see each model file) |
| Longitudinal trainee history | `OutcomeEvent`, `FollowupResponse`, `EmploymentPeriod`, `IncomeCheckpoint` are append-only, never overwritten |
| Employment / self-employment / apprenticeship | `EmploymentPeriod.kind` enum + matching `OutcomeEvent.type` values |
| Follow-ups | `FollowupSchedule` + `FollowupResponse` |
| Employer verification | `Verification` (method: employer / assisted) |
| Wage progression | `IncomeCheckpoint` (checkpointDay 0/30/90/180/365) |
| Skill matching | `JobSkillReference` + `SkillMatchResult` |
| Risk / intervention | `Trainee.outcomeRisk`/`attritionRisk` (current) + `RootCause` + `Intervention` (history) |
| Consent + audit | `ConsentRecord` (append-only) + `AuditLog` |

## Seed data — required scenarios

| Scenario | Trainee | Confidence |
|---|---|---|
| Successfully employed, verified | **Priya Kumari** | high |
| Unemployed / non-placed, risk flagged | **Ravi Oraon** | medium |
| Employed but skill mismatch | **Sana Khatoon** | medium |
| Job loss → re-employed | **Amit Verma** | medium |
| Self-employed, assisted-verified | **Fatima Begum** | high |
| Apprentice → converted to employment | **Karan Singh** | high |
| Non-responsive (2 confidence decay) | **Deepak Mahato** | low |
| Conflicting/disputed verification | **Neha Devi** | low (needs review) |

3 providers, 4 courses, 4 job-skill references. `TODAY` is fixed to `2026-09-08` in `data.js` so all follow-up scheduling math is deterministic for the demo.

## Running it (against a real MongoDB Atlas cluster)

```bash
cp .env.example .env        # set MONGODB_URI to your Atlas connection string
npm install
npm run seed                # wipes and reloads all 15 collections
```

## How verification was done in this sandbox

This sandbox's outbound network is restricted to package registries (npm, pypi, etc.) and
does not reach MongoDB's binary distribution servers, so `mongodb-memory-server` (the usual
way to test Mongoose code without a real cluster) cannot download a `mongod` binary here —
confirmed by attempting it directly. Two things were done instead, both using the *real*
production code, not a re-implementation:

1. **Schema/constraint verification** — `npm run verify:schema` instantiates every one of the
   137 seeded documents against its actual Mongoose model and calls `.validate()`. This
   exercises the real `required`/`enum`/`ref`-type rules with no database needed. Result:
   **137/137 passed**.
2. **Query verification** — `npm run verify:queries` runs the exact MongoDB aggregation
   pipelines the API will use (Placement Rate, Wage Growth %, Skill Match average, Follow-up
   Response Rate, Verification Rate, Confidence Distribution, Root-Cause Distribution, the
   at-risk worklist sort, a full trainee-profile `$lookup` join, and a course skill-gap
   rollup) against the seed dataset via `mingo`, a spec-compliant pure-JS MongoDB query
   engine. Every pipeline is valid, unmodified input to `Model.aggregate(pipeline)` — once
   `MONGODB_URI` points at Atlas, the identical arrays run against the identical collections.

Run `npm run verify` to reproduce both. See the query results below.
