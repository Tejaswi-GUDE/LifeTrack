const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Trainee is the central longitudinal record. Fast-changing "current state"
 * fields are embedded directly (cheap dashboard reads); full history lives
 * in the separate referenced collections (OutcomeEvent, EmploymentPeriod,
 * IncomeCheckpoint, Verification, FollowupResponse, Intervention, RootCause,
 * ConsentRecord) so nothing is ever overwritten - only appended.
 */
const TraineeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    contact: { type: String, required: true, trim: true }, // primary phone
    alternatePhone: { type: String, default: null },
    alternateContactName: { type: String, default: null }, // e.g., "Brother Raj"
    alternateContactRelation: { type: String, default: null }, // e.g., "brother", "mother"
    preferredChannel: { type: String, enum: ['whatsapp', 'sms', 'ivr', 'web'], default: 'web' },
    preferredTimeWindow: { type: String, default: null }, // e.g., "6-8pm"
    district: { type: String, required: true, trim: true },
    demographicTags: {
      gender: { type: String, enum: ['male', 'female', 'other', 'undisclosed'], default: 'undisclosed' },
      ageBand: { type: String, enum: ['18-24', '25-34', '35-44', '45+'], default: '18-24' },
    },

    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider', required: true },
    batchId: { type: String, required: true },

    // Training/certification record (kept embedded: one course cycle per trainee for this prototype)
    training: {
      attendancePct: { type: Number, min: 0, max: 100, default: 0 },
      assessmentScore: { type: Number, min: 0, max: 100, default: 0 },
      certified: { type: Boolean, default: false },
      certificationDate: { type: Date, default: null },
    },

    // Skills the trainee actually has. Seeded from the course's skillTags and
    // then grown as they self-report holding a skill in a follow-up check-in.
    skills: { type: [String], default: [] },

    // --- Current-state snapshot (recomputed by the Outcome/Intelligence engines) ---
    currentStatus: {
      type: String,
      enum: [
        'in_training', // enrolled, course not finished
        'dropped_out', // left the course before completing
        'certified_no_outcome', // certified, no outcome_event yet
        'employed',
        'self_employed',
        'apprentice',
        'further_education', // positive outcome: pursuing higher education
        'unemployed',
        'job_lost',
        'not_responding', // all follow-up attempts failed
        'other',
      ],
      default: 'certified_no_outcome',
    },
    currentConfidence: { type: String, enum: ['high', 'medium', 'low'], default: 'low' },
    // Verification level: L0–L5 mapping to confidence
    verificationLevel: {
      level: { type: Number, min: 0, max: 5, default: 0 }, // L0 Unknown, L1 Self-report, L2 Assisted, L3 Document, L4 Employer, L5 Official
      source: { type: String, default: null }, // where this level came from (self_report, field_agent, employer, epfo, etc.)
      actor: { type: String, default: null }, // who recorded it (trainee name, agent name, employer name)
      verifiedAt: { type: Date, default: null },
      history: [
        {
          level: Number,
          source: String,
          actor: String,
          verifiedAt: Date,
        },
      ],
    },
    // Conflicted: true if multiple sources disagree (e.g., employer says no record vs trainee says employed)
    isConflicted: { type: Boolean, default: false },

    outcomeRisk: {
      score: { type: Number, min: 0, max: 100, default: 0 },
      band: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
      factors: [{ label: String, points: Number }],
      computedAt: { type: Date, default: null },
    },
    attritionRisk: {
      score: { type: Number, min: 0, max: 100, default: 0 },
      band: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
      factors: [{ label: String, points: Number }],
      computedAt: { type: Date, default: null },
    },

    consentSummary: {
      dataCollection: { type: Boolean, default: false },
      employerContact: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
    },

    // Intelligence: skill matching & market insights
    skillMatches: [
      {
        jobId: { type: Schema.Types.ObjectId, ref: 'JobSkillReference' },
        matchScore: { type: Number, min: 0, max: 100 },
        matchedSkills: [String],
        gapSkills: [String],
        marketDemand: { type: String, enum: ['low', 'medium', 'high'] },
      },
    ],
    marketInsights: {
      avgSalaryRange: { type: String }, // e.g., "20k-30k"
      topEmployers: [String],
      regionDemand: { type: String, enum: ['low', 'medium', 'high'] },
      lastUpdatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

TraineeSchema.index({ providerId: 1 });
TraineeSchema.index({ courseId: 1 });
TraineeSchema.index({ currentStatus: 1 });
TraineeSchema.index({ district: 1 });
TraineeSchema.index({ 'outcomeRisk.score': -1 });

module.exports = mongoose.model('Trainee', TraineeSchema);
