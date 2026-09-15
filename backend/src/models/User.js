const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * A demo/system user. Role determines dashboard access and RBAC scope.
 * scopeRef points at the entity this user is scoped to:
 *   provider -> Provider._id, trainee -> Trainee._id, counsellor/government -> null (broad scope)
 */
const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      required: true,
      enum: ['government', 'provider', 'trainee', 'counsellor'],
    },
    scopeRef: { type: Schema.Types.ObjectId, default: null }, // providerId or traineeId depending on role
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: null },
    // for counsellors: the courses whose trainees route to this counsellor
    assignedCourseIds: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    availability: { type: String, trim: true, default: null }, // e.g. "Mon–Fri, 10am–5pm"
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });

module.exports = mongoose.model('User', UserSchema);
