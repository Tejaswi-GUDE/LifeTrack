const mongoose = require('mongoose');
const { Schema } = mongoose;

const IncomeCheckpointSchema = new Schema(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'Trainee', required: true },
    employmentPeriodId: { type: Schema.Types.ObjectId, ref: 'EmploymentPeriod', default: null },
    checkpointDay: { type: Number, required: true, enum: [0, 30, 90, 180, 365] }, // 0 = baseline
    amountInr: { type: Number, required: true, min: 0 },
    recordedDate: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

IncomeCheckpointSchema.index({ traineeId: 1, checkpointDay: 1 });

module.exports = mongoose.model('IncomeCheckpoint', IncomeCheckpointSchema);
