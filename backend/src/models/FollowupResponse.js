const mongoose = require('mongoose');
const { Schema } = mongoose;

const FollowupResponseSchema = new Schema(
  {
    scheduleId: { type: Schema.Types.ObjectId, ref: 'FollowupSchedule', required: true },
    traineeId: { type: Schema.Types.ObjectId, ref: 'Trainee', required: true },
    channel: {
      type: String,
      required: true,
      enum: ['web', 'sms', 'whatsapp', 'ivr', 'assisted'],
      default: 'web',
    },
    answers: {
      status: { type: String }, // employed/self_employed/apprentice/unemployed/studying
      employerName: { type: String, default: null },
      role: { type: String, default: null },
      startDate: { type: Date, default: null },
      monthlyIncome: { type: Number, default: null },
      skillsRelevant: { type: String, enum: ['yes', 'partially', 'no', null], default: null },
      nonPlacementReason: { type: String, default: null },
    },
    submittedDate: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

FollowupResponseSchema.index({ traineeId: 1, submittedDate: 1 });

module.exports = mongoose.model('FollowupResponse', FollowupResponseSchema);
