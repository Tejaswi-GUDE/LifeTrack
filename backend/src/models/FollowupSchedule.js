const mongoose = require('mongoose');
const { Schema } = mongoose;

const FollowupScheduleSchema = new Schema(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'Trainee', required: true },
    // null for an ad-hoc check-in requested by a provider/counsellor
    checkpointDay: { type: Number, enum: [30, 90, 180, 365, null], default: null },
    scheduledDate: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'non_responsive'],
      default: 'pending',
    },
    // ad-hoc request metadata (a provider/counsellor asking a trainee to check in now)
    adhoc: { type: Boolean, default: false },
    requestedByRole: { type: String, enum: ['provider', 'counsellor', 'government', null], default: null },
    note: { type: String, default: null },
    reminderSentAt: { type: Date, default: null },
    escalatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// A trainee should only have one scheduled checkpoint per checkpoint day — but
// ad-hoc requests are exempt (a trainee can have several).
FollowupScheduleSchema.index(
  { traineeId: 1, checkpointDay: 1 },
  { unique: true, partialFilterExpression: { adhoc: false } }
);
FollowupScheduleSchema.index({ status: 1, scheduledDate: 1 });

module.exports = mongoose.model('FollowupSchedule', FollowupScheduleSchema);
