const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Reference table: what skills a given occupation title requires.
 * Used by the Skill Match Engine to compare against a course's skillTags.
 */
const JobSkillReferenceSchema = new Schema(
  {
    occupationTitle: { type: String, required: true, unique: true, trim: true },
    requiredSkills: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobSkillReference', JobSkillReferenceSchema);
