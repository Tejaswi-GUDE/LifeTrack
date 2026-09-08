const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * An employer (or, for self-employment, a counsellor "assisted verification")
 * confirming or disputing a trainee's self-reported outcome claim.
 */
const VerificationSchema = new Schema(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'Trainee', required: true },
    employmentPeriodId: { type: Schema.Types.ObjectId, ref: 'EmploymentPeriod', default: null },
    method: { type: String, required: true, enum: ['employer', 'assisted'] }, // assisted = counsellor field-verified (self-employment)
    employerName: { type: String, required: true, trim: true },
    claim: {
      role: { type: String },
      joinDate: { type: Date },
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'confirmed', 'disputed', 'no_record'],
      default: 'pending',
    },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

VerificationSchema.index({ traineeId: 1 });
VerificationSchema.index({ status: 1 });

module.exports = mongoose.model('Verification', VerificationSchema);
