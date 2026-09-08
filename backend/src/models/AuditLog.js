const mongoose = require('mongoose');
const { Schema } = mongoose;

const AuditLogSchema = new Schema(
  {
    entity: { type: String, required: true }, // e.g. 'Trainee', 'Verification'
    entityId: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, required: true }, // e.g. 'consent_updated', 'verification_responded'
    actorRole: {
      type: String,
      required: true,
      enum: ['government', 'provider', 'trainee', 'counsellor', 'employer', 'system'],
    },
    actorId: { type: Schema.Types.ObjectId, default: null },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

AuditLogSchema.index({ entity: 1, entityId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
