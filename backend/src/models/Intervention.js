const mongoose = require('mongoose');
const { Schema } = mongoose;

const InterventionSchema = new Schema(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'Trainee', required: true },
    type: {
      type: String,
      required: true,
      enum: [
        'bridge_course_referral',
        'employer_referral_drive',
        'career_counselling',
        'interview_prep_session',
        'relocation_or_remote_referral',
        'general_counselling',
        're_employment_support',
      ],
    },
    rationale: { type: String, default: '' },
    recommendedBy: { type: String, required: true, enum: ['system', 'counsellor'] },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      required: true,
      enum: ['recommended', 'in_progress', 'completed', 'dismissed'],
      default: 'recommended',
    },
    outcomeNotes: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

InterventionSchema.index({ traineeId: 1, status: 1 });

module.exports = mongoose.model('Intervention', InterventionSchema);
