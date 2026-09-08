const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProviderSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

ProviderSchema.index({ district: 1 });

module.exports = mongoose.model('Provider', ProviderSchema);
