const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * MockMessage — outbound/inbound messages for the mock follow-up channels
 * (WhatsApp, SMS, IVR). Simulates what a real channel adapter would log.
 */
const MockMessageSchema = new Schema(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'Trainee', required: true },
    phone: { type: String, required: true }, // phone number targeted
    channel: {
      type: String,
      enum: ['whatsapp', 'sms', 'ivr'],
      required: true,
    },
    direction: {
      type: String,
      enum: ['outbound', 'inbound'],
      required: true,
    },
    body: { type: String, required: true }, // message text or IVR prompt
    digits: { type: String, default: null }, // IVR response (e.g., "1", "2")
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed', 'received'],
      default: 'sent',
    },
    sentAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

MockMessageSchema.index({ traineeId: 1, sentAt: 1 });
MockMessageSchema.index({ phone: 1, channel: 1 });

module.exports = mongoose.model('MockMessage', MockMessageSchema);
