// models/Reminder.js
const mongoose = require('mongoose');

const repeatSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['none', 'daily', 'weekly', 'monthly', 'custom'], default: 'none' },
    interval: { type: Number, default: null, min: 1 },
    daysOfWeek: {
      type: [Number],
      default: [],
      validate: { validator: (arr) => arr.every((d) => d >= 0 && d <= 6), message: 'daysOfWeek values must be between 0 (Sun) and 6 (Sat)' },
    },
    endDate: { type: Date, default: null },
  },
  { _id: false }
);

const offsetSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 1 },
    unit: { type: String, enum: ['minutes', 'hours', 'days', 'weeks'], required: true },
  },
  { _id: false }
);

const reminderSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    channel: { type: String, enum: ['email', 'sms', 'both', 'push'], default: 'email' },
    message: { type: String, trim: true, maxlength: 500, default: '' },
    offset: { type: offsetSchema, default: null },
    scheduledTime: { type: Date, required: true },
    repeat: { type: repeatSchema, default: () => ({ type: 'none' }) },
    status: { type: String, enum: ['pending', 'sent', 'failed', 'cancelled', 'snoozed'], default: 'pending', index: true },
    nextTriggerAt: { type: Date, required: true, index: true },
    lastSentAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    snoozedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

reminderSchema.index({ status: 1, nextTriggerAt: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
