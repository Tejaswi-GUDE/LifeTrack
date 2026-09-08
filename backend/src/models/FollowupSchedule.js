const mongoose = require('mongoose');
const { Schema } = mongoose;

const FollowupScheduleSchema = new Schema(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'Trainee', required: true },
    checkpointDay: { type: Number, required: true, enum: [30, 90, 180, 365] },
    scheduledDate: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'non_responsive'],
      default: 'pending',
    },
    reminderSentAt: { type: Date, default: null },
    escalatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// A trainee should only have one schedule per checkpoint
FollowupScheduleSchema.index({ traineeId: 1, checkpointDay: 1 }, { unique: true });
FollowupScheduleSchema.index({ status: 1, scheduledDate: 1 });

module.exports = mongoose.model('FollowupSchedule', FollowupScheduleSchema);
