const mongoose = require('mongoose');
const { Schema } = mongoose;

const SkillMatchResultSchema = new Schema(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'Trainee', required: true },
    employmentPeriodId: { type: Schema.Types.ObjectId, ref: 'EmploymentPeriod', default: null },
    score: { type: Number, required: true, min: 0, max: 100 },
    band: { type: String, required: true, enum: ['good', 'partial', 'mismatch'] },
    missingSkills: { type: [String], default: [] },
    bridgeSuggestions: { type: [String], default: [] },
    computedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

SkillMatchResultSchema.index({ traineeId: 1, computedAt: -1 });

module.exports = mongoose.model('SkillMatchResult', SkillMatchResultSchema);
