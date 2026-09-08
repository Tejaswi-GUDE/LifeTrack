const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Append-only consent history. Trainee.consentSummary holds the current
 * state for quick reads; every change is also logged here so consent
 * history/audit requirements (PRD Section 21) are satisfiable.
 */
const ConsentRecordSchema = new Schema(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'Trainee', required: true },
    purpose: {
      type: String,
      required: true,
      enum: ['data_collection', 'employer_contact', 'analytics'],
    },
    granted: { type: Boolean, required: true },
    version: { type: Number, required: true, default: 1 },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

ConsentRecordSchema.index({ traineeId: 1, purpose: 1, timestamp: -1 });

module.exports = mongoose.model('ConsentRecord', ConsentRecordSchema);
