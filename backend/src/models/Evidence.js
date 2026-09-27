const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Evidence — trainee-uploaded documents (offer letter, salary slip, business photo)
 * Provider reviews and approves/rejects to set verification level L3
 */
const EvidenceSchema = new Schema(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'Trainee', required: true },
    type: { type: String, enum: ['offer_letter', 'salary_slip', 'business_photo', 'other'], required: true },
    fileUrl: { type: String, required: true },
    fileName: String,
    uploadedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: String,
    reviewedAt: Date,
    notes: String,
  },
  { timestamps: true }
);

EvidenceSchema.index({ traineeId: 1, status: 1 });

module.exports = mongoose.model('Evidence', EvidenceSchema);
