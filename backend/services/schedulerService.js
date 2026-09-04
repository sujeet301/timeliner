// services/schedulerService.js
// The task-reminder cron job. Checks Reminder documents where
// status='pending' AND nextTriggerAt <= now, sends via email/SMS, then
// either marks 'sent' (one-off) or computes the next occurrence via
// utils/recurrence.js (recurring), or increments attempts/marks 'failed'
// after REMINDER_MAX_ATTEMPTS on send failure.

const cron = require('node-cron');
const { format } = require('date-fns');
const env = require('../config/env');
const Reminder = require('../models/Reminder');
const { sendEmail } = require('./emailService');
const { sendSMS } = require('./smsService');
const { computeNextTrigger } = require('../utils/recurrence');

function buildMessage(reminder) {
  if (reminder.message) return reminder.message;
  const task = reminder.task;
  const dueText = task.dueDate ? ` (due ${format(new Date(task.dueDate), 'PPP p')})` : '';
  return `Reminder: "${task.title}"${dueText}`;
}

async function dispatchReminder(reminder) {
  const user = reminder.user;
  const task = reminder.task;
  const message = buildMessage(reminder);
  const errors = [];

  const wantsEmail = reminder.channel === 'email' || reminder.channel === 'both';
  const wantsSms = reminder.channel === 'sms' || reminder.channel === 'both';

  if (wantsEmail) {
    try {
      if (!user.email) throw new Error('User has no email on file');
      await sendEmail({ to: user.email, subject: `Task Reminder: ${task.title}`, text: message });
    } catch (err) {
      errors.push(`email: ${err.message}`);
    }
  }
  if (wantsSms) {
    try {
      if (!user.phone) throw new Error('User has no phone number on file');
      await sendSMS({ to: user.phone, body: message });
    } catch (err) {
      errors.push(`sms: ${err.message}`);
    }
  }
  if (reminder.channel === 'push') {
    errors.push('push: channel not yet implemented');
  }

  if (errors.length > 0) return { ok: false, error: errors.join('; ') };
  return { ok: true };
}

async function processDueReminders() {
  const now = new Date();
  const dueReminders = await Reminder.find({ status: 'pending', nextTriggerAt: { $lte: now } }).populate('task').populate('user');

  for (const reminder of dueReminders) {
    if (!reminder.task || !reminder.user) {
      reminder.status = 'cancelled';
      reminder.lastError = 'Referenced task or user no longer exists';
      // eslint-disable-next-line no-await-in-loop
      await reminder.save();
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const result = await dispatchReminder(reminder);

    if (result.ok) {
      reminder.lastSentAt = now;
      reminder.attempts = 0;
      reminder.lastError = null;
      const next = computeNextTrigger(reminder.nextTriggerAt, reminder.repeat);
      if (next) {
        reminder.nextTriggerAt = next;
        reminder.status = 'pending';
      } else {
        reminder.status = 'sent';
      }
    } else {
      reminder.attempts += 1;
      reminder.lastError = result.error;
      if (reminder.attempts >= env.scheduler.maxAttempts) reminder.status = 'failed';
    }

    // eslint-disable-next-line no-await-in-loop
    await reminder.save();
  }
  return dueReminders.length;
}

let scheduledTask = null;

function startScheduler() {
  if (scheduledTask) return scheduledTask;
  scheduledTask = cron.schedule(env.scheduler.cronExpression, async () => {
    try {
      const count = await processDueReminders();
      if (count > 0) console.log(`[scheduler] Processed ${count} due reminder(s) at ${new Date().toISOString()}`);
    } catch (err) {
      console.error('[scheduler] Error while processing due reminders:', err);
    }
  });
  console.log(`[scheduler] Reminder scheduler started (cron: "${env.scheduler.cronExpression}")`);
  return scheduledTask;
}

function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

module.exports = { startScheduler, stopScheduler, processDueReminders };
