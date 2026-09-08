const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * One row per job / apprenticeship / self-employment spell.
 * A trainee can have many periods over time (job loss -> re-employment ->
 * job change, etc). endDate = null means currently active.
 */
const EmploymentPeriodSchema = new Schema(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'Trainee', required: true },
    kind: {
      type: String,
      required: true,
      enum: ['employment', 'self_employment', 'apprenticeship'],
    },
    employerName: { type: String, required: true, trim: true },
    occupation: { type: String, required: true, trim: true }, // used to look up JobSkillReference
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    exitReason: { type: String, default: null },
    isActive: { type: Boolean, default: true }, // convenience flag, kept in sync with endDate
  },
  { timestamps: true }
);

EmploymentPeriodSchema.index({ traineeId: 1, startDate: 1 });
EmploymentPeriodSchema.index({ traineeId: 1, isActive: 1 });

module.exports = mongoose.model('EmploymentPeriod', EmploymentPeriodSchema);
