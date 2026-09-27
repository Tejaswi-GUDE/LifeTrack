# LifeTrack Product Requirements Document (PRD)

---

## **1. PRODUCT OVERVIEW**

### **Product Name**
LifeTrack

### **Mission**
Track, verify, and improve outcomes for trainees after skilling programs end.

### **Problem Statement**
- 50M+ trainees trained annually in India
- No one tracks what happens after training ends
- Skilling programs claim success with zero proof
- Counsellors react to problems, not prevent them
- Government makes funding decisions without real data

### **Solution**
A real-time outcome tracking platform that:
1. Tracks every trainee's employment journey
2. Verifies outcomes with employers & government
3. Flags at-risk trainees early
4. Enables counsellor interventions
5. Provides government with verified outcome data

### **Success Metric**
- Placement rate visibility: 60% → 75% (with interventions)
- Outcome verification: 22% unknown → <10% unknown
- Trainee intervention reach: 100% at-risk trainees contacted within 7 days

---

## **2. CORE FEATURES**

### **Feature 1: Verification Levels (L0-L5)**
**Purpose:** Build trust in outcome data through confidence levels

**Specification:**
- L0: Self-reported (trainee says)
- L1: Field-verified (counsellor confirms via call/visit)
- L2: Assisted-verified (field agent call recorded)
- L3: Provider-evidence (documents uploaded: offer letter, salary slip, business photo)
- L4: Employer-verified (employer confirms via link)
- L5: Government-official (NAPS or state labour board record)

**Behavior:**
- Every outcome event has a verification level
- Trainees show badge: "Employed · L4"
- Verification history visible: "L1 Sep 15 → L4 Oct 1"
- Government can filter by verification level
- Dashboard shows breakdown: L0=20%, L1=15%, etc.

**Technical:**
- Trainee.verificationLevel (0-5)
- Trainee.verificationHistory (array of {level, source, actor, date})
- BadgeComponent shows level + tooltip with history

---

### **Feature 2: Outcome Timeline**
**Purpose:** Show full career journey for every trainee

**Specification:**
- Timeline view shows: Certification → Employment → Wages → Interventions
- Each event has: Date, type (employment_start, wage_milestone, risk_flag, intervention), verification level
- Events are immutable (never deleted, only appended)
- Trainee can see own timeline
- Counsellor can see trainee's full story

**Events Tracked:**
- training_completed (certification date)
- employment_started (job start date, role, employer)
- wage_milestone (every 3 months: salary amount)
- employment_ended (job loss)
- risk_flag (high risk detected)
- intervention_approved (counsellor recommends action)
- intervention_completed (trainee completed bridge course, negotiated wage, etc.)
- verification_confirmed (employer verified)
- verification_disputed (employer disputed outcome)

**Technical:**
- OutcomeEvent collection (append-only)
- Timeline.jsx component renders events chronologically
- Each event: traineeId, type, date, verificationLevel, reportedVia, reason, notes

---

### **Feature 3: Multi-Channel Follow-Up Escalation**
**Purpose:** Reach trainees across multiple channels automatically

**Specification:**
- 4-step escalation ladder:
  1. **Step 0 (WhatsApp):** Send initial message, wait 2 days
  2. **Step 1 (SMS):** Auto-escalate to SMS, wait 2 days
  3. **Step 2 (IVR):** Auto-escalate to IVR (Interactive Voice Response), wait 2 days
  4. **Step 3 (Field Agent):** Flag for field agent call, high priority

- Triggers: No outcome reported for 7 days
- Each attempt logged: channel, timestamp, response (if any), next action date
- Trainee can provide outcome via any channel (NLP parses "I got a new job" → Creates outcome event)

**Behavior:**
- Mock Phone UI shows all 4 tabs (WhatsApp, SMS, IVR, Field Agent)
- Counsellor can manually trigger follow-ups
- System auto-escalates if trainee doesn't respond
- Message history visible per trainee per channel
- Clock control for testing (advance time, trigger auto-escalations)

**Technical:**
- FollowupSchedule.currentStep (0-4)
- FollowupSchedule.attempts (array of {channel, date, response})
- MockMessage collection logs all messages
- Dev route: POST /api/dev/run-followups (trigger escalation)
- NLP keyword parsing for auto-outcome creation

---

### **Feature 4: Risk Scoring with Root Causes**
**Purpose:** Predict at-risk trainees and recommend interventions

**Specification:**
- Risk Score: 0-100 (higher = more risk)
- Bands: Low (<40), Medium (40-70), High (>70)

**Risk Factors:**
- Wage vs. market rate: If wage < market by 20%+, add -20 pts
- Skills gap: If job requires skills trainee doesn't have, add -15 to -25 pts (by gap size)
- Engagement: If unreachable for 7+ days, add -5 pts per week
- Time-in-job: If employed <3 months, add -10 pts (early dropout risk)
- Market demand: If skill has low region demand, add -10 pts

**Example:**
```
Lakshmi: Risk 78 (High)
- Low wage (15k vs 20k market): -20
- Skills gap (trained logistics, job retail): -18
- Unreachable 14 days: -15
- Time-in-job 2 months: -10
- Low market demand for retail: -5
```

**Recommendations:**
- Low wage → Wage negotiation coaching
- Skills gap → Bridge course recommended
- Unreachable → Escalate to field agent call
- Market mismatch → Employer switch recommended

**Behavior:**
- Risk card shows score, band (color-coded), and inline factors with points
- Counsellor sees "Why?" explanation
- Recommendations shown as action items
- Risk score recomputed when outcomes change

**Technical:**
- Trainee.outcomeRisk (score, band, factors, computedAt)
- Trainee.attritionRisk (score, band, factors, computedAt)
- Intelligence.js computes scores based on rules
- Counsellor UI shows risk card with factors

---

### **Feature 5: Employer One-Click Verification**
**Purpose:** Verify employment outcomes directly from employers

**Specification:**
- Employer receives verification link (no login required)
- Link opens: Simple question "Is this trainee employed?"
- If yes: Employer enters job title, salary range (optional)
- Response automatically syncs to trainee's record
- Trainee's badge updates: L1 → L4 in real-time
- Government sees verified outcome immediately

**Behavior:**
- Employer link is unique, one-time use
- Expires after 30 days
- Response logged with timestamp
- If "No" or "Disputed": Flag for review
- Response rate tracked: Pending, Confirmed, Disputed, No response

**Endpoints:**
- GET /api/verifications/:id (fetch verification details, no auth)
- POST /api/verifications/:id/respond (submit response)

**Technical:**
- Verification model (traineeId, employerName, status, respondedAt)
- Unique link generation (UUID)
- Webhook update to Trainee when response received
- OutcomeEvent created when verified

---

### **Feature 6: Equity Analysis**
**Purpose:** Flag demographic gaps in outcomes

**Specification:**
- Track placement rate by:
  - Gender (Male, Female, Other, Undisclosed)
  - Age band (18-24, 25-34, 35-44, 45+)
  - District
  - Course

- Auto-alerts:
  - If any demographic placement rate < 60%, flag as "equity gap"
  - Comparison to state/national average
  - Hidden groups <10 (suppress to maintain privacy)

**Dashboard Display:**
- Gender breakdown cards (F: 68%, M: 72%, Other: 60%)
- Age band breakdown cards (18-24: 65%, 25-34: 78%, etc.)
- Color-coded: Green if above avg, Yellow if below

**Government Actions:**
- Filter KPIs by demographic
- Export equity report
- Targeted intervention recommendations

**Technical:**
- governmentDashboard.js computes equityAnalysis
- Group trainees by demographicTags
- Calculate placement % per group
- Return with suppression flag if n<10

---

### **Feature 7: Live Dashboard with KPIs**
**Purpose:** Real-time outcome visibility for government

**Specification:**

**KPI 1: Placement Rate**
- Definition: (Employed + Self-employed + Apprentice) / Certified trainees
- Denominator: All certified trainees
- Shows: Overall % + breakdown by verification level
- Unknown %: Certified trainees with no outcome reported
- Toggle: "Verified Only" (filters to L4+ only)
- Impact: Confident placement rate (55%) vs. self-reported (70%)

**KPI 2: Outcomes Known**
- Definition: Certified trainees with confirmed outcome / All certified trainees
- Shows: Known %, Unknown %, Not responding %
- Tracks: How many trainees can we confirm an outcome for?
- Alert: If Unknown > 30%, flag for follow-up push

**KPI 3: Retention Rate**
- Definition: Trainees employed 12 months later / Ever employed trainees
- Shows: % still in first job after 12 months
- Indicates: Job satisfaction, wage stability

**KPI 4: Wage Growth**
- Definition: Average (Wage at 12 months / Wage at training end)
- Shows: Multiple (e.g., 3.2x)
- Tracks: Economic impact of skilling

**Alerts:**
- Underperforming provider (placement < state avg -10%)
- Pending verifications (>5, >14 days old)
- Disputed outcomes (needs employer review)
- Skill gaps (>3 trainees missing same skill)

**Filters:**
- By district (dropdown)
- By provider (dropdown)
- By state (if applicable)
- Verified Only (toggle)

**Technical:**
- buildGovernmentDashboard() computes all KPIs
- Aggregates by scope (state, district, provider)
- Returns: totals, kpis, alerts, performance tables

---

## **3. USER ROLES & PERMISSIONS**

| Role | Features | Pages | Permissions |
|------|----------|-------|-------------|
| **Government Admin** | View dashboard, KPIs, alerts, provider performance, equity analysis | Dashboard, Analytics, Provider list | Read all data (aggregate only, no PII) |
| **Provider Admin** | Trainee list, timeline, mock phone, follow-ups | Trainees, Dashboard, Mock Phone | Create/update trainees, run follow-ups, export data |
| **Counsellor** | Risk worklist, risk details, recommend interventions | Worklist, Trainee profile | Read trainee data, approve interventions, log outcomes |
| **Field Agent** | Follow-up queue, message history, log calls | Agent queue, Trainee calls | Read trainee contact, log call outcomes |
| **Trainee** | View own timeline, employment history, consent matrix | Career timeline, Consent center | Read own data, manage consent, update status |
| **Employer** | Verification link, pending verification list | Verification page, Bulk portal (optional) | Confirm/dispute employment (one-time link, no login) |

---

## **4. DATA MODEL**

### **Trainee (Central Record)**
```
{
  _id: ObjectId,
  name: String (required),
  contact: String (phone, required),
  alternatePhone: String (optional),
  alternateContactName: String (e.g., "Brother Raj"),
  alternateContactRelation: String (e.g., "brother", "mother"),
  preferredChannel: String (whatsapp|sms|ivr|web, default: web),
  preferredTimeWindow: String (e.g., "6-8pm"),
  district: String (required),
  demographicTags: {
    gender: String (male|female|other|undisclosed, default: undisclosed),
    ageBand: String (18-24|25-34|35-44|45+, default: 18-24)
  },
  
  courseId: ObjectId (ref: Course, required),
  providerId: ObjectId (ref: Provider, required),
  batchId: String (required),
  
  training: {
    attendancePct: Number (0-100, default: 0),
    assessmentScore: Number (0-100, default: 0),
    certified: Boolean (default: false),
    certificationDate: Date
  },
  
  skills: [String], // e.g., ["customer_service", "billing"]
  
  currentStatus: String (in_training|dropped_out|certified_no_outcome|employed|self_employed|apprentice|further_education|unemployed|job_lost|not_responding),
  
  verificationLevel: Number (0-5),
  verificationSource: String (self_report|field_verified|provider_evidence|employer_verified|government_official),
  verificationHistory: [{
    level: Number,
    source: String,
    actor: String (name of person who verified),
    date: Date
  }],
  
  isConflicted: Boolean (employer disputed, needs review),
  
  outcomeRisk: {
    score: Number (0-100),
    band: String (low|medium|high),
    factors: [{label: String, points: Number}],
    computedAt: Date
  },
  
  attritionRisk: {
    score: Number (0-100),
    band: String (low|medium|high),
    factors: [{label: String, points: Number}],
    computedAt: Date
  },
  
  skillMatches: [{
    jobId: ObjectId (ref: JobSkillReference),
    matchScore: Number (0-100),
    matchedSkills: [String],
    gapSkills: [String],
    marketDemand: String (low|medium|high)
  }],
  
  marketInsights: {
    avgSalaryRange: String,
    topEmployers: [String],
    regionDemand: String (low|medium|high),
    lastUpdatedAt: Date
  },
  
  consentSummary: {
    dataCollection: Boolean (default: false),
    employerContact: Boolean (default: false),
    analytics: Boolean (default: false)
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### **OutcomeEvent (Append-Only History)**
```
{
  _id: ObjectId,
  traineeId: ObjectId (ref: Trainee, required),
  type: String (employment_started|wage_milestone|employment_ended|further_education|not_responding|risk_flag|intervention_approved|verification_confirmed|verification_disputed),
  date: Date (required),
  verificationLevel: Number (0-5),
  reportedVia: String (self_report|field_agent|employer|government|trainer),
  reason: String (optional notes),
  
  // Employment details (if type = employment_started)
  employerName: String,
  jobTitle: String,
  salary: Number,
  
  createdAt: Date
}
```

### **Verification (Employer Confirmations)**
```
{
  _id: ObjectId,
  traineeId: ObjectId (ref: Trainee),
  employerName: String,
  method: String (online_link|bulk_portal|manual),
  claim: {
    role: String,
    joinDate: Date,
    salary: Number
  },
  status: String (pending|confirmed|disputed|no_record, default: pending),
  respondedAt: Date,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### **FollowupSchedule (Multi-Channel Ladder)**
```
{
  _id: ObjectId,
  traineeId: ObjectId (ref: Trainee),
  currentStep: Number (0-3),
  stepNames: [String] (["WhatsApp", "SMS", "IVR", "Field Agent"]),
  attempts: [{
    step: Number,
    channel: String (whatsapp|sms|ivr|call),
    sentAt: Date,
    response: String (optional),
    respondedAt: Date
  }],
  nextEscalationDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### **MockMessage (Message Logging)**
```
{
  _id: ObjectId,
  traineeId: ObjectId (ref: Trainee),
  channel: String (whatsapp|sms|ivr, required),
  direction: String (outbound|inbound, required),
  message: String,
  sentAt: Date,
  respondedAt: Date,
  createdAt: Date
}
```

### **Evidence (Document Uploads)**
```
{
  _id: ObjectId,
  traineeId: ObjectId (ref: Trainee),
  type: String (offer_letter|salary_slip|business_photo|other),
  fileUrl: String,
  fileName: String,
  uploadedAt: Date,
  status: String (pending|approved|rejected, default: pending),
  reviewedBy: String,
  reviewedAt: Date,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### **ConsentRecord (Privacy Audit Trail)**
```
{
  _id: ObjectId,
  traineeId: ObjectId (ref: Trainee),
  category: String (data_collection|employer_contact|analytics),
  granted: Boolean,
  grantedAt: Date,
  actor: String (trainee|system),
  createdAt: Date
}
```

---

## **5. API ENDPOINTS**

### **Government Dashboard APIs**
```
GET /api/dashboards/government?state=&district=&verifiedOnly=true
Response: {
  scope: {state, district, verifiedOnly},
  scopeOptions: {states: [], districts: []},
  generatedAt: ISO,
  totals: {trained, certified, employed, selfEmployed, apprentices, furtherEducation, unemployed, notResponding, unknown},
  kpis: {
    placementRate: {value, numerator, denominator, confidence},
    outcomesKnown: {value, numerator, denominator, unknownPct, notRespondingPct},
    retentionRate: {value, numerator, denominator},
    wageGrowth: {value, sampleSize},
    skillMatch: {value, sampleSize}
  },
  confidenceDistribution: {high, medium, low},
  performance: {byProvider: [], byDistrict: []},
  skillGaps: [{skill, courses, affectedTrainees}],
  nonPlacement: {total, reasons: []},
  equityAnalysis: {gender_male, gender_female, age_18_24, etc.},
  alerts: [{id, tone, title, body}]
}
```

### **Trainee APIs**
```
GET /api/trainees?status=&risk=&district=
Response: [{id, name, status, verificationLevel, risk, district, employment}]

GET /api/trainees/:id
Response: {full trainee record with timeline embedded}

POST /api/trainees (provider only)
Request: {name, contact, district, courseId}
Response: {_id, name, contact, ...}
```

### **Follow-Up APIs**
```
GET /api/dev/phone
Response: {trainees: [{id, name, district, currentStep, preferredChannel}]}

POST /api/dev/run-followups
Request: {traineeId} (optional, runs all if not provided)
Response: {escalated: [], already_contacted: [], no_action: []}

GET /api/dev/messages/:traineeId
Response: [{channel, direction, message, sentAt, respondedAt}]
```

### **Verification APIs**
```
GET /api/verifications/:id (public, no auth)
Response: {trainee: {id, name}, claim: {role, joinDate}, status}

POST /api/verifications/:id/respond (public, no auth)
Request: {status: confirmed|disputed|no_record, notes}
Response: {verification: {id, status, respondedAt}}

POST /api/verifications/evidence/upload
Request: {traineeId, type, fileUrl, fileName}
Response: {success, evidence: {...}}

POST /api/verifications/evidence/:id/review
Request: {status: approved|rejected, notes}
Response: {success, evidence: {...}}

GET /api/verifications/evidence/pending
Response: [{traineeId, type, uploadedAt, status}]
```

### **Intelligence APIs**
```
GET /api/intelligence/trainee/:id/job-matches
Response: [{jobTitle, matchScore, matchedSkills, gapSkills, avgSalary}]

GET /api/intelligence/market/insights?district=&skillTags=
Response: {jobCount, avgSalary, topEmployers, topSkills}
```

### **Employer APIs**
```
GET /api/employer/dashboard
Response: {pending: [], recentResponses, verified, disputed}

POST /api/employer/verify/:verificationId
Request: {status: confirmed|disputed, notes}
Response: {success, verification: {id, status}}

GET /api/employer/stats
Response: {pending, confirmed, responseRate}
```

### **Import APIs**
```
POST /api/import/csv
Request: {csv: "name,contact,district,status\n...", providerId, courseId, dedupeBy}
Response: {created: [], matched: [], errors: [], summary}
```

---

## **6. ARCHITECTURE**

### **Frontend Stack**
- React.js (components, hooks)
- React Router (navigation)
- Context API (session state, theme)
- CSS (design tokens from tokens.css)
- Responsive: 375px - 1920px

### **Backend Stack**
- Node.js + Express (REST API)
- MongoDB (document database)
- Mongoose (ODM, schema validation)

### **Key Libraries**
- Frontend: react-router-dom, axios
- Backend: express, mongoose, cors

### **Deployment**
- Frontend: Vercel/Netlify
- Backend: Vercel/AWS/Heroku
- Database: MongoDB Atlas

### **Architecture Pattern**
1. Frontend: React components + Context state
2. Backend: Express routes → Business logic (lib/) → Database
3. Database: MongoDB collections (Trainee, OutcomeEvent, Verification, etc.)
4. Auth: Mock JWT (x-demo-user-id header)

---

## **7. ROLLOUT PLAN**

### **Phase 1: Proof of Concept (Done)**
- 10 trainees tracked
- 7 core features working
- 20 alumni data sources
- Single state (Jharkhand)

### **Phase 2: Hackathon (36 hours)**
- Scale to 500 trainees
- 3 states (Jharkhand, Bihar, Odisha)
- 200+ alumni data sources
- Employer bulk portal
- Government integration (read NAPS)

### **Phase 3: Production (6 months)**
- 500K+ trainees
- All 28 states
- 1M+ data sources (official + alumni)
- Predictive ML (dropout prediction)
- Real WhatsApp/SMS/IVR APIs
- State funding automation

---

## **8. SUCCESS METRICS**

| Metric | Current | 36-hr Goal | 6-mo Goal |
|--------|---------|-----------|-----------|
| Trainees tracked | 10 | 500 | 500K |
| Verification level (avg) | L2 | L2.5 | L3.5 |
| Outcomes known % | 78% | 85% | 95% |
| Placement rate | 60% | 70% | 75% |
| Wage growth (avg) | 3.2x | 3.5x | 4.5x |
| Alumni data sources | 20 | 200 | 1M |

---

## **9. CONSTRAINTS & ASSUMPTIONS**

### **Constraints**
- Only track outcomes after training ends
- Don't store PII in government views (aggregate only)
- Verification link valid for 30 days
- Mock phone is for demo (production uses real APIs)

### **Assumptions**
- Trainees have mobile phone numbers
- Employers willing to verify employment (with one-click)
- Government will provide NAPS/labour data for integration
- Internet connectivity in all districts

---

## **10. FUTURE SCOPE**

- Real WhatsApp/SMS/IVR APIs (Twilio integration)
- ML dropout prediction (7-day early warning)
- Counsellor task automation (auto-recommend interventions)
- Employer salary data (anonymized market insights)
- Government policy rules engine (funding based on outcomes)
- Multi-language support (Hindi, Bengali, Odia, etc.)
- Mobile app for trainees & alumni

---

**Document Version:** 1.0  
**Last Updated:** Sept 28, 2026  
**Owner:** LifeTrack Team
