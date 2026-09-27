const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Append-only log of every outcome change for a trainee - the backbone of
 * the longitudinal timeline. Never updated in place, only inserted.
 */
const OutcomeEventSchema = new Schema(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'Trainee', required: true },
    type: {
      type: String,
      required: true,
      enum: [
        'employed',
        'self_employed',
        'apprentice',
        'apprenticeship_converted',
        'apprenticeship_exited',
        'further_education',
        'unemployed',
        'job_lost',
        'not_responding',
        'other',
      ],
    },
    source: { type: String, required: true, enum: ['self', 'provider', 'employer', 'counsellor', 'field_agent'] },
    reportedVia: { type: String, enum: ['whatsapp', 'sms', 'ivr', 'phone_call', 'in_person', 'form', null], default: null }, // channel if followup response

    // Verification level at time of recording
    verificationLevel: {
      level: { type: Number, min: 0, max: 5, default: 0 },
      source: String, // where this came from
      actor: String, // who recorded
    },

    // Reason for outcome (structured list)
    reason: { type: String, default: null }, // e.g., "no_suitable_jobs", "skill_mismatch", "low_pay", "location", "family", etc.

    notes: { type: String, default: '' },
    occurredAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

OutcomeEventSchema.index({ traineeId: 1, occurredAt: 1 });

module.exports = mongoose.model('OutcomeEvent', OutcomeEventSchema);
