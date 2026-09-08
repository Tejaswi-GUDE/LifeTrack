const mongoose = require('mongoose');
const { Schema } = mongoose;

const RootCauseSchema = new Schema(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'Trainee', required: true },
    label: {
      type: String,
      required: true,
      enum: [
        'skill_mismatch',
        'insufficient_vacancies',
        'salary_mismatch',
        'interview_failure',
        'location_barrier',
        'further_education',
        'candidate_preference',
        'employer_rejection',
        'training_engagement_issue',
        'other',
      ],
    },
    source: { type: String, required: true, enum: ['self_reported', 'inferred'] },
    determinedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

RootCauseSchema.index({ traineeId: 1, determinedAt: -1 });

module.exports = mongoose.model('RootCause', RootCauseSchema);
