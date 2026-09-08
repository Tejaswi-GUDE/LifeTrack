const mongoose = require('mongoose');
const { Schema } = mongoose;

const CourseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider', required: true },
    skillTags: { type: [String], default: [] }, // skills taught in this course
  },
  { timestamps: true }
);

CourseSchema.index({ providerId: 1 });

module.exports = mongoose.model('Course', CourseSchema);
