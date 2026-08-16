// services/leetcodeReminderService.js
//
// ============================================================================
// LEETCODE REMINDER — how it works
// ============================================================================
// A node-cron job runs every few minutes (REMINDER_CRON... see
// LEETCODE_REMINDER_CRON_EXPRESSION, default every 15 minutes — a daily
// nudge doesn't need per-minute precision, unlike task reminders). On each
// tick it loads every user with `leetcode.enabled === true` and a
// `leetcode.username` set, and for each one:
//
//   1. Skips them if they've already been checked/handled today
//      (`leetcode.lastReminderSentDate` matches today's date *in their own
//      timezone* — see utils/timezone.js).
//   2. Skips them if it's not yet their configured `reminderTime` (their
//      local wall-clock time) — so a 20:00 reminder doesn't fire at 09:00.
//   3. Otherwise asks services/leetcodeService.js whether they have any
//      accepted LeetCode submission since local midnight today.
//        - If yes: mark today as handled (no notification needed) —
//          without this, the API would get re-queried every tick for the
//          rest of the day.
//        - If no: send a nudge through whichever of email/SMS the user has
//          enabled (services/emailService.js / smsService.js — the exact
//          same delivery functions the task-reminder scheduler uses), then
//          mark today as handled either way, so a delivery failure doesn't
//          cause a retry storm every 15 minutes.
//
// A failed LeetCode API call (bad username, network hiccup, LeetCode
// changing their unofficial schema) is treated as "couldn't verify" and
// simply retried on the next tick — it does NOT mark the day as handled and
// does NOT send a false-negative reminder.
// ============================================================================

const cron = require('node-cron');
const env = require('../config/env');
const User = require('../models/User');
const { hasSolvedSince } = require('./leetcodeService');
const { sendEmail } = require('./emailService');
const { sendSMS } = require('./smsService');
const { todayDateString, currentTimeString, startOfTodayUtc } = require('../utils/timezone');

function buildReminderMessage(user) {
  return (
    `You haven't solved a LeetCode problem yet today, ${user.name}. ` +
    `Keep the streak alive — even one problem counts!`
  );
}

async function notifyUser(user) {
  const message = buildReminderMessage(user);
  const wantsEmail = user.notificationPrefs.email;
  const wantsSms = user.notificationPrefs.sms && user.phoneVerified && user.phone;

  const errors = [];

  if (wantsEmail) {
    try {
      await sendEmail({
        to: user.email,
        subject: "No LeetCode activity yet today \u2014 don't break the streak",
        text: message,
      });
    } catch (err) {
      errors.push(`email: ${err.message}`);
    }
  }

  if (wantsSms) {
    try {
      await sendSMS({ to: user.phone, body: message });
    } catch (err) {
      errors.push(`sms: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[leetcodeReminder] delivery issue for ${user.email}: ${errors.join('; ')}`);
  }
}

/**
 * Evaluates and, if appropriate, notifies a single user. Exported
 * separately from the cron wiring so Settings' "check now" preview and
 * tests can reuse the same logic without waiting for the clock.
 */
async function checkAndRemindUser(user) {
  const tz = user.leetcode.timezone || 'UTC';
  const today = todayDateString(tz);

  if (user.leetcode.lastReminderSentDate === today) return { skipped: 'already-handled-today' };

  const nowTime = currentTimeString(tz);
  if (nowTime < user.leetcode.reminderTime) return { skipped: 'not-time-yet' };

  let solvedToday;
  try {
    solvedToday = await hasSolvedSince(user.leetcode.username, startOfTodayUtc(tz));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `[leetcodeReminder] Could not check LeetCode for "${user.leetcode.username}" (${user.email}): ${err.message}`
    );
    return { skipped: 'check-failed' }; // deliberately do NOT mark today as handled — retry next tick
  }

  if (!solvedToday) {
    await notifyUser(user);
  }

  user.leetcode.lastReminderSentDate = today;
  await user.save({ validateBeforeSave: false });

  return { solvedToday };
}

async function processLeetcodeReminders() {
  const users = await User.find({ 'leetcode.enabled': true, 'leetcode.username': { $ne: null } });

  for (const user of users) {
    // eslint-disable-next-line no-await-in-loop
    await checkAndRemindUser(user);
  }

  return users.length;
}

let scheduledTask = null;

function startLeetcodeReminderScheduler() {
  if (scheduledTask) return scheduledTask; // idempotent

  scheduledTask = cron.schedule(env.leetcode.cronExpression, async () => {
    try {
      const count = await processLeetcodeReminders();
      if (count > 0) {
        // eslint-disable-next-line no-console
        console.log(`[leetcodeReminder] Evaluated ${count} opted-in user(s) at ${new Date().toISOString()}`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[leetcodeReminder] Error while processing reminders:', err);
    }
  });

  // eslint-disable-next-line no-console
  console.log(`[leetcodeReminder] scheduler started (cron: "${env.leetcode.cronExpression}")`);
  return scheduledTask;
}

function stopLeetcodeReminderScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

module.exports = {
  startLeetcodeReminderScheduler,
  stopLeetcodeReminderScheduler,
  processLeetcodeReminders,
  checkAndRemindUser,
};
