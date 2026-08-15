// models/Reminder.js
const mongoose = require('mongoose');

const repeatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'custom'],
      default: 'none',
    },
    // Used when type === 'custom': repeat every N days.
    interval: {
      type: Number,
      default: null,
      min: 1,
    },
    // Used when type === 'weekly' (or 'custom' combined with weekly-style rules)
    // to fire on specific weekdays. 0 = Sunday ... 6 = Saturday.
    daysOfWeek: {
      type: [Number],
      default: [],
      validate: {
        validator: (arr) => arr.every((d) => d >= 0 && d <= 6),
        message: 'daysOfWeek values must be between 0 (Sun) and 6 (Sat)',
      },
    },
    // Recurrence stops being rescheduled after this date, if provided.
    endDate: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

// Optional: express this reminder relative to the task's due date
// (e.g. "1 day before", "1 hour before") instead of an absolute time.
// If present, scheduledTime is (re)derived from task.dueDate - offset
// whenever the reminder is created; nextTriggerAt is still what actually
// drives the scheduler.
const offsetSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 1 },
    unit: {
      type: String,
      enum: ['minutes', 'hours', 'days', 'weeks'],
      required: true,
    },
  },
  { _id: false }
);

const reminderSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    channel: {
      type: String,
      enum: ['email', 'sms', 'both', 'push'], // 'push' reserved for the optional Web Push extension
      default: 'email',
    },

    // Optional custom text; falls back to a generated message using the task title.
    message: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },

    offset: {
      type: offsetSchema,
      default: null,
    },

    // The reminder's original/base fire time (informational; nextTriggerAt drives execution).
    scheduledTime: {
      type: Date,
      required: true,
    },

    repeat: {
      type: repeatSchema,
      default: () => ({ type: 'none' }),
    },

    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'cancelled', 'snoozed'],
      default: 'pending',
      index: true,
    },

    // The single field the scheduler actually queries on.
    nextTriggerAt: {
      type: Date,
      required: true,
      index: true,
    },

    lastSentAt: {
      type: Date,
      default: null,
    },

    // Incremented on each send failure; used for capped retries.
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: null,
    },

    snoozedUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// The scheduler's core query is: status = 'pending' AND nextTriggerAt <= now.
// This compound index makes that lookup fast even with a large collection.
reminderSchema.index({ status: 1, nextTriggerAt: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
