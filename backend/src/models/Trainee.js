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
    contact: { type: String, required: true, trim: true },
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

    // --- Current-state snapshot (recomputed by the Outcome/Intelligence engines) ---
    currentStatus: {
      type: String,
      enum: [
        'certified_no_outcome', // certified, no outcome_event yet
        'employed',
        'self_employed',
        'apprentice',
        'unemployed',
        'job_lost',
        'not_responding',
        'other',
      ],
      default: 'certified_no_outcome',
    },
    currentConfidence: { type: String, enum: ['high', 'medium', 'low'], default: 'low' },

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
  },
  { timestamps: true }
);

TraineeSchema.index({ providerId: 1 });
TraineeSchema.index({ courseId: 1 });
TraineeSchema.index({ currentStatus: 1 });
TraineeSchema.index({ district: 1 });
TraineeSchema.index({ 'outcomeRisk.score': -1 });

module.exports = mongoose.model('Trainee', TraineeSchema);
