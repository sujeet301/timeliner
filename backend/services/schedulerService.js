// services/schedulerService.js
//
// ============================================================================
// REMINDER SCHEDULER — how it works
// ============================================================================
// A node-cron job runs on the interval defined by REMINDER_CRON_EXPRESSION
// (default: "* * * * *", i.e. every minute). On every tick it:
//
//   1. Finds all Reminder documents that are DUE:
//        status === 'pending'  AND  nextTriggerAt <= now
//      (the compound index on { status, nextTriggerAt } in Reminder.js keeps
//      this query fast even with a large collection).
//
//   2. For each due reminder, sends it through the requested channel(s)
//      (email and/or SMS) using emailService / smsService.
//
//   3. Depending on the outcome:
//        - Send succeeded, reminder does NOT repeat (repeat.type === 'none'):
//            -> status = 'sent', lastSentAt = now
//        - Send succeeded, reminder DOES repeat:
//            -> compute the next occurrence with utils/recurrence.js
//            -> if a next occurrence exists (and is before any `repeat.endDate`):
//                 nextTriggerAt = <that time>, status stays 'pending', attempts reset to 0
//               else (recurrence has ended):
//                 status = 'sent' (no more occurrences to schedule)
//        - Send failed (network/provider error, etc.):
//            -> attempts += 1, lastError = <message>
//            -> if attempts have reached REMINDER_MAX_ATTEMPTS -> status = 'failed'
//               otherwise the reminder is left 'pending' with the same
//               nextTriggerAt, so it is simply retried on the next tick.
//
// This file intentionally contains ONLY the orchestration logic. The actual
// "what time comes next" math lives in utils/recurrence.js so it can be
// reused (and unit tested) independently of the cron wiring, and the actual
// "how do I send an email/SMS" logic lives in services/emailService.js and
// services/smsService.js.
// ============================================================================

const cron = require('node-cron');
const { format } = require('date-fns');
const env = require('../config/env');
const Reminder = require('../models/Reminder');
const { sendEmail } = require('./emailService');
const { sendSMS } = require('./smsService');
const { computeNextTrigger } = require('../utils/recurrence');

function buildMessage(reminder) {
  if (reminder.message) return reminder.message;

  const task = reminder.task; // populated
  const dueText = task.dueDate ? ` (due ${format(new Date(task.dueDate), 'PPP p')})` : '';
  return `Reminder: "${task.title}"${dueText}`;
}

/**
 * Sends one reminder through every channel it's configured for.
 * Returns { ok: true } on full success, or { ok: false, error } if any
 * channel failed. Channels are attempted independently so, e.g., a bad
 * phone number doesn't prevent the email half of `channel: 'both'` from
 * going out.
 */
async function dispatchReminder(reminder) {
  const user = reminder.user; // populated
  const task = reminder.task; // populated
  const message = buildMessage(reminder);
  const errors = [];

  const wantsEmail = reminder.channel === 'email' || reminder.channel === 'both';
  const wantsSms = reminder.channel === 'sms' || reminder.channel === 'both';

  if (wantsEmail) {
    try {
      if (!user.email) throw new Error('User has no email on file');
      await sendEmail({
        to: user.email,
        subject: `Task Reminder: ${task.title}`,
        text: message,
      });
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
    // Placeholder for the optional Web Push extension mentioned in the spec.
    // Left unimplemented in Phase 1 since it requires client-side subscription
    // handling; wire in web-push here when that feature is built.
    errors.push('push: channel not yet implemented');
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join('; ') };
  }
  return { ok: true };
}

/**
 * Processes every reminder that is currently due. Exported separately from
 * the cron wiring so it can also be triggered manually (e.g. from a test
 * script or an admin "run now" endpoint) without waiting for the clock.
 */
async function processDueReminders() {
  const now = new Date();

  const dueReminders = await Reminder.find({
    status: 'pending',
    nextTriggerAt: { $lte: now },
  })
    .populate('task')
    .populate('user');

  for (const reminder of dueReminders) {
    // A reminder's task or user may have been deleted after the reminder was
    // scheduled; skip and cancel it rather than crashing the whole batch.
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
        // Recurring reminder: schedule the next occurrence and keep it pending.
        reminder.nextTriggerAt = next;
        reminder.status = 'pending';
      } else {
        // One-off reminder, or a recurring one that has passed its endDate.
        reminder.status = 'sent';
      }
    } else {
      reminder.attempts += 1;
      reminder.lastError = result.error;

      if (reminder.attempts >= env.scheduler.maxAttempts) {
        reminder.status = 'failed';
      }
      // else: leave status 'pending' with the same nextTriggerAt so the next
      // cron tick retries it automatically.
    }

    // eslint-disable-next-line no-await-in-loop
    await reminder.save();
  }

  return dueReminders.length;
}

let scheduledTask = null;

function startScheduler() {
  if (scheduledTask) return scheduledTask; // idempotent — don't double-schedule

  scheduledTask = cron.schedule(env.scheduler.cronExpression, async () => {
    try {
      const count = await processDueReminders();
      if (count > 0) {
        // eslint-disable-next-line no-console
        console.log(`[scheduler] Processed ${count} due reminder(s) at ${new Date().toISOString()}`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[scheduler] Error while processing due reminders:', err);
    }
  });

  // eslint-disable-next-line no-console
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
