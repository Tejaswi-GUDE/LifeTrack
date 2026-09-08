// Plain JS seed data - deliberately framework-agnostic so it can be
// consumed both by the real Mongoose seed script (seed.js) and by the
// in-memory verification harness (verify/inMemoryVerify.js).
//
// "today" is fixed so follow-up scheduling / checkpoint math is deterministic
// for the demo, regardless of when it's actually run.
const TODAY = new Date('2026-09-08T00:00:00.000Z');
const daysAgo = (n) => new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n) => new Date(TODAY.getTime() + n * 24 * 60 * 60 * 1000);

const providers = [
  { slug: 'prov_a', name: 'Ranchi Skill Mission Center', district: 'Ranchi' },
  { slug: 'prov_b', name: 'Patna Livelihood Institute', district: 'Patna' },
  { slug: 'prov_c', name: 'Ranchi Women Skill Academy', district: 'Ranchi' },
];

const courses = [
  {
    slug: 'course_retail',
    name: 'Retail Sales Associate',
    providerSlug: 'prov_a',
    skillTags: ['Customer Communication', 'Point of Sale Billing', 'Inventory Basics', 'Retail Etiquette'],
  },
  {
    slug: 'course_office',
    name: 'Data Entry & Office Assistant',
    providerSlug: 'prov_a',
    skillTags: ['Typing Speed', 'MS Word', 'Basic Filing', 'Communication'],
    // Deliberately NOT including "MS Excel" - this is the seeded skill gap.
  },
  {
    slug: 'course_electrician',
    name: 'Electrician - Basic Wiring',
    providerSlug: 'prov_b',
    skillTags: ['Basic Wiring', 'Safety Protocols', 'Tool Handling', 'Circuit Reading'],
  },
  {
    slug: 'course_tailoring',
    name: 'Tailoring & Garment Making',
    providerSlug: 'prov_c',
    skillTags: ['Pattern Cutting', 'Machine Stitching', 'Measurement Taking', 'Finishing'],
  },
];

const jobSkillReferences = [
  {
    occupationTitle: 'Sales Associate',
    requiredSkills: ['Customer Communication', 'Point of Sale Billing', 'Retail Etiquette'],
  },
  {
    occupationTitle: 'Data Entry Operator',
    requiredSkills: ['Typing Speed', 'MS Excel', 'Basic Filing', 'Communication'],
    // Requires "MS Excel", which course_office does not teach -> mismatch case.
  },
  {
    occupationTitle: 'Site Electrician',
    requiredSkills: ['Basic Wiring', 'Safety Protocols', 'Tool Handling', 'Circuit Reading'],
  },
  {
    occupationTitle: 'Garment Machine Operator',
    requiredSkills: ['Pattern Cutting', 'Machine Stitching', 'Finishing'],
  },
];

/**
 * Each trainee entry is a self-contained scenario bundle. `courseSlug` /
 * `providerSlug` are resolved to real ObjectIds by seed.js after
 * Provider/Course insertion.
 */
const trainees = [
  // 1. SUCCESSFULLY EMPLOYED, verified, high confidence, good skill match
  {
    slug: 'priya',
    name: 'Priya Kumari',
    contact: '9800000001',
    district: 'Ranchi',
    demographicTags: { gender: 'female', ageBand: '18-24' },
    courseSlug: 'course_retail',
    providerSlug: 'prov_a',
    batchId: 'RET-2026-A',
    training: { attendancePct: 92, assessmentScore: 81, certified: true, certificationDate: daysAgo(95) },
    currentStatus: 'employed',
    currentConfidence: 'high',
    outcomeEvents: [{ type: 'employed', source: 'self', occurredAt: daysAgo(65) }],
    employmentPeriods: [
      {
        slug: 'priya_job1',
        kind: 'employment',
        employerName: 'BrightRetail Pvt Ltd',
        occupation: 'Sales Associate',
        startDate: daysAgo(65),
        endDate: null,
        isActive: true,
      },
    ],
    incomeCheckpoints: [
      { checkpointDay: 30, amountInr: 12000, recordedDate: daysAgo(65) },
      { checkpointDay: 90, amountInr: 13500, recordedDate: daysAgo(5) },
    ],
    verifications: [
      {
        employmentPeriodSlug: 'priya_job1',
        method: 'employer',
        employerName: 'BrightRetail Pvt Ltd',
        claim: { role: 'Sales Associate', joinDate: daysAgo(65) },
        status: 'confirmed',
        respondedAt: daysAgo(60),
      },
    ],
    skillMatchResults: [
      {
        employmentPeriodSlug: 'priya_job1',
        score: 100,
        band: 'good',
        missingSkills: [],
        bridgeSuggestions: [],
        computedAt: daysAgo(60),
      },
    ],
    followupSchedules: [
      { checkpointDay: 30, scheduledDate: daysAgo(65), status: 'completed' },
      { checkpointDay: 90, scheduledDate: daysAgo(5), status: 'completed' },
      { checkpointDay: 180, scheduledDate: daysFromNow(85), status: 'pending' },
      { checkpointDay: 365, scheduledDate: daysFromNow(270), status: 'pending' },
    ],
    followupResponses: [
      {
        checkpointDay: 30,
        channel: 'web',
        answers: {
          status: 'employed',
          employerName: 'BrightRetail Pvt Ltd',
          role: 'Sales Associate',
          startDate: daysAgo(65),
          monthlyIncome: 12000,
          skillsRelevant: 'yes',
        },
        submittedDate: daysAgo(65),
      },
      {
        checkpointDay: 90,
        channel: 'web',
        answers: {
          status: 'employed',
          employerName: 'BrightRetail Pvt Ltd',
          role: 'Sales Associate',
          monthlyIncome: 13500,
          skillsRelevant: 'yes',
        },
        submittedDate: daysAgo(5),
      },
    ],
    rootCauses: [],
    interventions: [],
    consentRecords: [
      { purpose: 'data_collection', granted: true, timestamp: daysAgo(96) },
      { purpose: 'employer_contact', granted: true, timestamp: daysAgo(96) },
      { purpose: 'analytics', granted: true, timestamp: daysAgo(96) },
    ],
    consentSummary: { dataCollection: true, employerContact: true, analytics: true },
    outcomeRisk: { score: 5, band: 'low', factors: [], computedAt: daysAgo(5) },
    attritionRisk: { score: 0, band: 'low', factors: [], computedAt: daysAgo(5) },
  },

  // 2. UNEMPLOYED, high risk, root cause inferred, low/medium confidence
  {
    slug: 'ravi',
    name: 'Ravi Oraon',
    contact: '9800000002',
    district: 'Ranchi',
    demographicTags: { gender: 'male', ageBand: '18-24' },
    courseSlug: 'course_office',
    providerSlug: 'prov_a',
    batchId: 'OFF-2026-A',
    training: { attendancePct: 64, assessmentScore: 42, certified: true, certificationDate: daysAgo(52) },
    currentStatus: 'unemployed',
    currentConfidence: 'medium',
    outcomeEvents: [{ type: 'unemployed', source: 'self', occurredAt: daysAgo(22) }],
    employmentPeriods: [],
    incomeCheckpoints: [],
    verifications: [],
    skillMatchResults: [],
    followupSchedules: [
      { checkpointDay: 30, scheduledDate: daysAgo(22), status: 'completed' },
      { checkpointDay: 90, scheduledDate: daysFromNow(38), status: 'pending' },
      { checkpointDay: 180, scheduledDate: daysFromNow(128), status: 'pending' },
      { checkpointDay: 365, scheduledDate: daysFromNow(313), status: 'pending' },
    ],
    followupResponses: [
      {
        checkpointDay: 30,
        channel: 'web',
        answers: { status: 'unemployed', nonPlacementReason: null },
        submittedDate: daysAgo(22),
      },
    ],
    rootCauses: [{ label: 'skill_mismatch', source: 'inferred', determinedAt: daysAgo(20) }],
    interventions: [
      {
        type: 'bridge_course_referral',
        rationale:
          "Root cause is 'skill mismatch' (inferred); Advanced Excel is the most frequently missing skill in this cohort.",
        recommendedBy: 'system',
        status: 'recommended',
      },
    ],
    consentRecords: [
      { purpose: 'data_collection', granted: true, timestamp: daysAgo(53) },
      { purpose: 'employer_contact', granted: true, timestamp: daysAgo(53) },
      { purpose: 'analytics', granted: true, timestamp: daysAgo(53) },
    ],
    consentSummary: { dataCollection: true, employerContact: true, analytics: true },
    outcomeRisk: {
      score: 85,
      band: 'high',
      factors: [
        { label: 'No placement 52 days after certification', points: 30 },
        { label: 'Missed most recent follow-up engagement', points: 15 },
        { label: 'Assessment score 42% (below 50%)', points: 20 },
        { label: 'Attendance 64% (below 70%)', points: 20 },
      ],
      computedAt: daysAgo(1),
    },
    attritionRisk: { score: 0, band: 'low', factors: [], computedAt: daysAgo(1) },
  },

  // 3. EMPLOYED but SKILL MISMATCH, self-reported, medium confidence
  {
    slug: 'sana',
    name: 'Sana Khatoon',
    contact: '9800000003',
    district: 'Ranchi',
    demographicTags: { gender: 'female', ageBand: '25-34' },
    courseSlug: 'course_office',
    providerSlug: 'prov_a',
    batchId: 'OFF-2026-A',
    training: { attendancePct: 88, assessmentScore: 74, certified: true, certificationDate: daysAgo(70) },
    currentStatus: 'employed',
    currentConfidence: 'medium',
    outcomeEvents: [{ type: 'employed', source: 'self', occurredAt: daysAgo(40) }],
    employmentPeriods: [
      {
        slug: 'sana_job1',
        kind: 'employment',
        employerName: 'QuickBooks Data Solutions',
        occupation: 'Data Entry Operator',
        startDate: daysAgo(40),
        endDate: null,
        isActive: true,
      },
    ],
    incomeCheckpoints: [{ checkpointDay: 30, amountInr: 9500, recordedDate: daysAgo(40) }],
    verifications: [
      {
        employmentPeriodSlug: 'sana_job1',
        method: 'employer',
        employerName: 'QuickBooks Data Solutions',
        claim: { role: 'Data Entry Operator', joinDate: daysAgo(40) },
        status: 'pending',
        respondedAt: null,
      },
    ],
    skillMatchResults: [
      {
        employmentPeriodSlug: 'sana_job1',
        score: 30,
        band: 'mismatch',
        missingSkills: ['MS Excel'],
        bridgeSuggestions: ['Bridge Course: Advanced Excel'],
        computedAt: daysAgo(38),
      },
    ],
    followupSchedules: [
      { checkpointDay: 30, scheduledDate: daysAgo(40), status: 'completed' },
      { checkpointDay: 90, scheduledDate: daysFromNow(20), status: 'pending' },
      { checkpointDay: 180, scheduledDate: daysFromNow(110), status: 'pending' },
      { checkpointDay: 365, scheduledDate: daysFromNow(295), status: 'pending' },
    ],
    followupResponses: [
      {
        checkpointDay: 30,
        channel: 'sms',
        answers: {
          status: 'employed',
          employerName: 'QuickBooks Data Solutions',
          role: 'Data Entry Operator',
          startDate: daysAgo(40),
          monthlyIncome: 9500,
          skillsRelevant: 'partially',
        },
        submittedDate: daysAgo(40),
      },
    ],
    rootCauses: [],
    interventions: [
      {
        type: 'bridge_course_referral',
        rationale: "Skill Match score 30% (Mismatch) - missing: MS Excel.",
        recommendedBy: 'system',
        status: 'recommended',
      },
    ],
    consentRecords: [
      { purpose: 'data_collection', granted: true, timestamp: daysAgo(71) },
      { purpose: 'employer_contact', granted: true, timestamp: daysAgo(71) },
      { purpose: 'analytics', granted: false, timestamp: daysAgo(71) },
    ],
    consentSummary: { dataCollection: true, employerContact: true, analytics: false },
    outcomeRisk: { score: 20, band: 'low', factors: [], computedAt: daysAgo(38) },
    attritionRisk: {
      score: 25,
      band: 'low',
      factors: [{ label: 'Job requires skills outside training (mismatch)', points: 25 }],
      computedAt: daysAgo(38),
    },
  },

  // 4. JOB LOSS -> RE-EMPLOYED, medium confidence (two employment periods)
  {
    slug: 'amit',
    name: 'Amit Verma',
    contact: '9800000004',
    district: 'Patna',
    demographicTags: { gender: 'male', ageBand: '25-34' },
    courseSlug: 'course_electrician',
    providerSlug: 'prov_b',
    batchId: 'ELE-2026-A',
    training: { attendancePct: 90, assessmentScore: 78, certified: true, certificationDate: daysAgo(200) },
    currentStatus: 'employed',
    currentConfidence: 'medium',
    outcomeEvents: [
      { type: 'employed', source: 'self', occurredAt: daysAgo(170) },
      { type: 'job_lost', source: 'self', occurredAt: daysAgo(60) },
      { type: 'employed', source: 'self', occurredAt: daysAgo(35) },
    ],
    employmentPeriods: [
      {
        slug: 'amit_job1',
        kind: 'employment',
        employerName: 'Patna Electricals Co.',
        occupation: 'Site Electrician',
        startDate: daysAgo(170),
        endDate: daysAgo(60),
        exitReason: 'Contract ended, project completed',
        isActive: false,
      },
      {
        slug: 'amit_job2',
        kind: 'employment',
        employerName: 'BuildRight Contractors',
        occupation: 'Site Electrician',
        startDate: daysAgo(35),
        endDate: null,
        isActive: true,
      },
    ],
    incomeCheckpoints: [
      { checkpointDay: 30, amountInr: 11000, recordedDate: daysAgo(140), employmentPeriodSlug: 'amit_job1' },
      { checkpointDay: 90, amountInr: 11500, recordedDate: daysAgo(80), employmentPeriodSlug: 'amit_job1' },
      { checkpointDay: 30, amountInr: 12000, recordedDate: daysAgo(5), employmentPeriodSlug: 'amit_job2' },
    ],
    verifications: [
      {
        employmentPeriodSlug: 'amit_job1',
        method: 'employer',
        employerName: 'Patna Electricals Co.',
        claim: { role: 'Site Electrician', joinDate: daysAgo(170) },
        status: 'confirmed',
        respondedAt: daysAgo(165),
      },
      {
        employmentPeriodSlug: 'amit_job2',
        method: 'employer',
        employerName: 'BuildRight Contractors',
        claim: { role: 'Site Electrician', joinDate: daysAgo(35) },
        status: 'pending',
        respondedAt: null,
      },
    ],
    skillMatchResults: [
      {
        employmentPeriodSlug: 'amit_job2',
        score: 100,
        band: 'good',
        missingSkills: [],
        bridgeSuggestions: [],
        computedAt: daysAgo(34),
      },
    ],
    followupSchedules: [
      { checkpointDay: 30, scheduledDate: daysAgo(140), status: 'completed' },
      { checkpointDay: 90, scheduledDate: daysAgo(80), status: 'completed' },
      { checkpointDay: 180, scheduledDate: daysAgo(10), status: 'completed' },
      { checkpointDay: 365, scheduledDate: daysFromNow(165), status: 'pending' },
    ],
    followupResponses: [
      {
        checkpointDay: 30,
        channel: 'web',
        answers: {
          status: 'employed',
          employerName: 'Patna Electricals Co.',
          role: 'Site Electrician',
          monthlyIncome: 11000,
          skillsRelevant: 'yes',
        },
        submittedDate: daysAgo(140),
      },
      {
        checkpointDay: 180,
        channel: 'assisted',
        answers: {
          status: 'employed',
          employerName: 'BuildRight Contractors',
          role: 'Site Electrician',
          monthlyIncome: 12000,
          skillsRelevant: 'yes',
        },
        submittedDate: daysAgo(10),
      },
    ],
    rootCauses: [],
    interventions: [
      {
        type: 're_employment_support',
        rationale: 'Job loss reported at day-180 follow-up; re-employment support offered.',
        recommendedBy: 'system',
        status: 'completed',
        outcomeNotes: 'Trainee found new employer (BuildRight Contractors) within 25 days.',
        completedAt: daysAgo(35),
      },
    ],
    consentRecords: [
      { purpose: 'data_collection', granted: true, timestamp: daysAgo(201) },
      { purpose: 'employer_contact', granted: true, timestamp: daysAgo(201) },
      { purpose: 'analytics', granted: true, timestamp: daysAgo(201) },
    ],
    consentSummary: { dataCollection: true, employerContact: true, analytics: true },
    outcomeRisk: { score: 10, band: 'low', factors: [], computedAt: daysAgo(5) },
    attritionRisk: {
      score: 25,
      band: 'low',
      factors: [{ label: 'Short tenure at current employer (<90 days)', points: 25 }],
      computedAt: daysAgo(5),
    },
  },

  // 5. SELF-EMPLOYED, assisted-verified, high confidence
  {
    slug: 'fatima',
    name: 'Fatima Begum',
    contact: '9800000005',
    district: 'Ranchi',
    demographicTags: { gender: 'female', ageBand: '25-34' },
    courseSlug: 'course_tailoring',
    providerSlug: 'prov_c',
    batchId: 'TAI-2026-A',
    training: { attendancePct: 95, assessmentScore: 88, certified: true, certificationDate: daysAgo(190) },
    currentStatus: 'self_employed',
    currentConfidence: 'high',
    outcomeEvents: [{ type: 'self_employed', source: 'self', occurredAt: daysAgo(160) }],
    employmentPeriods: [
      {
        slug: 'fatima_biz1',
        kind: 'self_employment',
        employerName: 'Fatima Tailoring & Boutique (own business)',
        occupation: 'Garment Machine Operator',
        startDate: daysAgo(160),
        endDate: null,
        isActive: true,
      },
    ],
    incomeCheckpoints: [
      { checkpointDay: 30, amountInr: 6000, recordedDate: daysAgo(130), employmentPeriodSlug: 'fatima_biz1' },
      { checkpointDay: 90, amountInr: 8500, recordedDate: daysAgo(70), employmentPeriodSlug: 'fatima_biz1' },
      { checkpointDay: 180, amountInr: 10500, recordedDate: daysAgo(5), employmentPeriodSlug: 'fatima_biz1' },
    ],
    verifications: [
      {
        employmentPeriodSlug: 'fatima_biz1',
        method: 'assisted',
        employerName: 'Fatima Tailoring & Boutique (own business)',
        claim: { role: 'Owner / Tailor', joinDate: daysAgo(160) },
        status: 'confirmed',
        respondedAt: daysAgo(150),
      },
    ],
    skillMatchResults: [
      {
        employmentPeriodSlug: 'fatima_biz1',
        score: 100,
        band: 'good',
        missingSkills: [],
        bridgeSuggestions: [],
        computedAt: daysAgo(150),
      },
    ],
    followupSchedules: [
      { checkpointDay: 30, scheduledDate: daysAgo(130), status: 'completed' },
      { checkpointDay: 90, scheduledDate: daysAgo(70), status: 'completed' },
      { checkpointDay: 180, scheduledDate: daysAgo(5), status: 'completed' },
      { checkpointDay: 365, scheduledDate: daysFromNow(175), status: 'pending' },
    ],
    followupResponses: [
      {
        checkpointDay: 30,
        channel: 'assisted',
        answers: { status: 'self_employed', monthlyIncome: 6000, skillsRelevant: 'yes' },
        submittedDate: daysAgo(130),
      },
      {
        checkpointDay: 180,
        channel: 'whatsapp',
        answers: { status: 'self_employed', monthlyIncome: 10500, skillsRelevant: 'yes' },
        submittedDate: daysAgo(5),
      },
    ],
    rootCauses: [],
    interventions: [],
    consentRecords: [
      { purpose: 'data_collection', granted: true, timestamp: daysAgo(191) },
      { purpose: 'employer_contact', granted: false, timestamp: daysAgo(191) },
      { purpose: 'analytics', granted: true, timestamp: daysAgo(191) },
    ],
    consentSummary: { dataCollection: true, employerContact: false, analytics: true },
    outcomeRisk: { score: 0, band: 'low', factors: [], computedAt: daysAgo(5) },
    attritionRisk: { score: 0, band: 'low', factors: [], computedAt: daysAgo(5) },
  },

  // 6. APPRENTICE -> CONVERTED TO EMPLOYMENT, verified, high confidence
  {
    slug: 'karan',
    name: 'Karan Singh',
    contact: '9800000006',
    district: 'Patna',
    demographicTags: { gender: 'male', ageBand: '18-24' },
    courseSlug: 'course_electrician',
    providerSlug: 'prov_b',
    batchId: 'ELE-2026-B',
    training: { attendancePct: 85, assessmentScore: 70, certified: true, certificationDate: daysAgo(210) },
    currentStatus: 'employed',
    currentConfidence: 'high',
    outcomeEvents: [
      { type: 'apprentice', source: 'provider', occurredAt: daysAgo(200) },
      { type: 'apprenticeship_converted', source: 'employer', occurredAt: daysAgo(20) },
    ],
    employmentPeriods: [
      {
        slug: 'karan_apprentice',
        kind: 'apprenticeship',
        employerName: 'Patna Electricals Co.',
        occupation: 'Site Electrician',
        startDate: daysAgo(200),
        endDate: daysAgo(20),
        exitReason: 'Converted to full-time employment',
        isActive: false,
      },
      {
        slug: 'karan_job1',
        kind: 'employment',
        employerName: 'Patna Electricals Co.',
        occupation: 'Site Electrician',
        startDate: daysAgo(20),
        endDate: null,
        isActive: true,
      },
    ],
    incomeCheckpoints: [
      { checkpointDay: 90, amountInr: 7000, recordedDate: daysAgo(110), employmentPeriodSlug: 'karan_apprentice' },
      { checkpointDay: 30, amountInr: 13000, recordedDate: daysAgo(5), employmentPeriodSlug: 'karan_job1' },
    ],
    verifications: [
      {
        employmentPeriodSlug: 'karan_job1',
        method: 'employer',
        employerName: 'Patna Electricals Co.',
        claim: { role: 'Site Electrician (Permanent)', joinDate: daysAgo(20) },
        status: 'confirmed',
        respondedAt: daysAgo(18),
      },
    ],
    skillMatchResults: [
      {
        employmentPeriodSlug: 'karan_job1',
        score: 100,
        band: 'good',
        missingSkills: [],
        bridgeSuggestions: [],
        computedAt: daysAgo(18),
      },
    ],
    followupSchedules: [
      { checkpointDay: 90, scheduledDate: daysAgo(110), status: 'completed' },
      { checkpointDay: 180, scheduledDate: daysAgo(20), status: 'completed' },
      { checkpointDay: 365, scheduledDate: daysFromNow(155), status: 'pending' },
    ],
    followupResponses: [
      {
        checkpointDay: 90,
        channel: 'web',
        answers: { status: 'apprentice', monthlyIncome: 7000, skillsRelevant: 'yes' },
        submittedDate: daysAgo(110),
      },
      {
        checkpointDay: 180,
        channel: 'web',
        answers: {
          status: 'employed',
          employerName: 'Patna Electricals Co.',
          role: 'Site Electrician (Permanent)',
          monthlyIncome: 13000,
          skillsRelevant: 'yes',
        },
        submittedDate: daysAgo(20),
      },
    ],
    rootCauses: [],
    interventions: [],
    consentRecords: [
      { purpose: 'data_collection', granted: true, timestamp: daysAgo(211) },
      { purpose: 'employer_contact', granted: true, timestamp: daysAgo(211) },
      { purpose: 'analytics', granted: true, timestamp: daysAgo(211) },
    ],
    consentSummary: { dataCollection: true, employerContact: true, analytics: true },
    outcomeRisk: { score: 0, band: 'low', factors: [], computedAt: daysAgo(18) },
    attritionRisk: { score: 0, band: 'low', factors: [], computedAt: daysAgo(18) },
  },

  // 7. NON-RESPONSIVE, low confidence (decayed), needed to demonstrate the
  //    "not responding" state and low-confidence handling distinctly.
  {
    slug: 'deepak',
    name: 'Deepak Mahato',
    contact: '9800000007',
    district: 'Patna',
    demographicTags: { gender: 'male', ageBand: '35-44' },
    courseSlug: 'course_electrician',
    providerSlug: 'prov_b',
    batchId: 'ELE-2026-A',
    training: { attendancePct: 80, assessmentScore: 60, certified: true, certificationDate: daysAgo(250) },
    currentStatus: 'not_responding',
    currentConfidence: 'low',
    outcomeEvents: [],
    employmentPeriods: [],
    incomeCheckpoints: [],
    verifications: [],
    skillMatchResults: [],
    followupSchedules: [
      { checkpointDay: 30, scheduledDate: daysAgo(220), status: 'non_responsive', escalatedAt: daysAgo(210) },
      { checkpointDay: 90, scheduledDate: daysAgo(160), status: 'non_responsive', escalatedAt: daysAgo(150) },
      { checkpointDay: 180, scheduledDate: daysAgo(70), status: 'non_responsive', escalatedAt: daysAgo(60) },
      { checkpointDay: 365, scheduledDate: daysFromNow(115), status: 'pending' },
    ],
    followupResponses: [],
    rootCauses: [{ label: 'other', source: 'inferred', determinedAt: daysAgo(60) }],
    interventions: [
      {
        type: 'general_counselling',
        rationale: 'Non-responsive across 3 consecutive follow-up windows - escalated for field visit.',
        recommendedBy: 'system',
        status: 'recommended',
      },
    ],
    consentRecords: [{ purpose: 'data_collection', granted: true, timestamp: daysAgo(251) }],
    consentSummary: { dataCollection: true, employerContact: false, analytics: false },
    outcomeRisk: {
      score: 65,
      band: 'medium',
      factors: [
        { label: 'No response for 3 consecutive follow-up windows', points: 45 },
        { label: 'No skill-match data available', points: 15 },
      ],
      computedAt: daysAgo(60),
    },
    attritionRisk: { score: 0, band: 'low', factors: [], computedAt: daysAgo(60) },
  },

  // 8. CONFLICTING VERIFICATION ("needs review"), medium/low confidence
  {
    slug: 'neha',
    name: 'Neha Devi',
    contact: '9800000008',
    district: 'Ranchi',
    demographicTags: { gender: 'female', ageBand: '18-24' },
    courseSlug: 'course_retail',
    providerSlug: 'prov_a',
    batchId: 'RET-2026-B',
    training: { attendancePct: 78, assessmentScore: 66, certified: true, certificationDate: daysAgo(100) },
    currentStatus: 'employed',
    currentConfidence: 'low',
    outcomeEvents: [{ type: 'employed', source: 'self', occurredAt: daysAgo(60) }],
    employmentPeriods: [
      {
        slug: 'neha_job1',
        kind: 'employment',
        employerName: 'CityMart Stores',
        occupation: 'Sales Associate',
        startDate: daysAgo(60),
        endDate: null,
        isActive: true,
      },
    ],
    incomeCheckpoints: [{ checkpointDay: 30, amountInr: 10000, recordedDate: daysAgo(60) }],
    verifications: [
      {
        employmentPeriodSlug: 'neha_job1',
        method: 'employer',
        employerName: 'CityMart Stores',
        claim: { role: 'Sales Associate', joinDate: daysAgo(60) },
        status: 'disputed',
        respondedAt: daysAgo(50),
      },
    ],
    skillMatchResults: [
      {
        employmentPeriodSlug: 'neha_job1',
        score: 100,
        band: 'good',
        missingSkills: [],
        bridgeSuggestions: [],
        computedAt: daysAgo(58),
      },
    ],
    followupSchedules: [
      { checkpointDay: 30, scheduledDate: daysAgo(60), status: 'completed' },
      { checkpointDay: 90, scheduledDate: daysFromNow(30), status: 'pending' },
    ],
    followupResponses: [
      {
        checkpointDay: 30,
        channel: 'web',
        answers: {
          status: 'employed',
          employerName: 'CityMart Stores',
          role: 'Sales Associate',
          monthlyIncome: 10000,
          skillsRelevant: 'yes',
        },
        submittedDate: daysAgo(60),
      },
    ],
    rootCauses: [],
    interventions: [
      {
        type: 'general_counselling',
        rationale: "Employer disputed the claimed employment - conflicting information needs manual review.",
        recommendedBy: 'system',
        status: 'recommended',
      },
    ],
    consentRecords: [
      { purpose: 'data_collection', granted: true, timestamp: daysAgo(101) },
      { purpose: 'employer_contact', granted: true, timestamp: daysAgo(101) },
    ],
    consentSummary: { dataCollection: true, employerContact: true, analytics: false },
    outcomeRisk: { score: 30, band: 'low', factors: [{ label: 'Conflicting verification', points: 30 }], computedAt: daysAgo(49) },
    attritionRisk: { score: 0, band: 'low', factors: [], computedAt: daysAgo(49) },
  },
];

// Seeded users (mock login list) - one per role, plus provider-scoped and
// trainee-scoped users resolved to real ObjectIds at seed time.
const users = [
  { slug: 'user_gov', name: 'Dept. of Skill Development (State)', role: 'government' },
  { slug: 'user_provider_a', name: 'Ranchi Skill Mission Center - Admin', role: 'provider', scopeSlug: 'prov_a' },
  { slug: 'user_provider_b', name: 'Patna Livelihood Institute - Admin', role: 'provider', scopeSlug: 'prov_b' },
  { slug: 'user_counsellor_1', name: 'Sunita Rao (Counsellor)', role: 'counsellor' },
  { slug: 'user_trainee_priya', name: 'Priya Kumari', role: 'trainee', scopeSlug: 'priya' },
  { slug: 'user_trainee_ravi', name: 'Ravi Oraon', role: 'trainee', scopeSlug: 'ravi' },
];

module.exports = { TODAY, daysAgo, daysFromNow, providers, courses, jobSkillReferences, trainees, users };
