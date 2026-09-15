const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * A request a trainee raises to their training provider or to their
 * course-assigned counsellor — plus the message thread that follows.
 * This is the "trainee → provider / counsellor" contact channel.
 */
const MessageSchema = new Schema(
  {
    fromRole: { type: String, required: true, enum: ['trainee', 'provider', 'counsellor'] },
    fromName: { type: String, default: null },
    text: { type: String, required: true, trim: true },
    at: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const SupportRequestSchema = new Schema(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'Trainee', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider', default: null },
    toRole: { type: String, required: true, enum: ['provider', 'counsellor'] },
    // for counsellor requests: the counsellor resolved from the trainee's course
    assignedCounsellorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    category: {
      type: String,
      required: true,
      enum: [
        'counselling', // needs guidance / mentoring
        'placement_help', // wants help finding a job
        'skill_support', // wants a bridge course / to learn a skill
        'record_update', // "please update my record — new job / salary"
        'grievance', // a complaint
        'other',
      ],
      default: 'counselling',
    },
    subject: { type: String, required: true, trim: true },
    status: { type: String, required: true, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true }
);

SupportRequestSchema.index({ traineeId: 1, createdAt: -1 });
SupportRequestSchema.index({ assignedCounsellorId: 1, status: 1 });
SupportRequestSchema.index({ providerId: 1, status: 1 });

module.exports = mongoose.model('SupportRequest', SupportRequestSchema);
