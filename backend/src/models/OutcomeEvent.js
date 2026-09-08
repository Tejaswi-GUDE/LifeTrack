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
        'unemployed',
        'job_lost',
        'other',
      ],
    },
    source: { type: String, required: true, enum: ['self', 'provider', 'employer', 'counsellor'] },
    notes: { type: String, default: '' },
    occurredAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

OutcomeEventSchema.index({ traineeId: 1, occurredAt: 1 });

module.exports = mongoose.model('OutcomeEvent', OutcomeEventSchema);
