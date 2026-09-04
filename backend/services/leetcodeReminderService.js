// services/leetcodeReminderService.js
//
// ============================================================================
// LEETCODE REMINDER — how it works
// ============================================================================
// A node-cron job runs every few minutes (LEETCODE_REMINDER_CRON_EXPRESSION,
// default every 15 minutes). On each tick it loads every user with
// `leetcode.enabled === true` and a `leetcode.username` set, and for each:
//
//   1. If today (in the user's timezone) differs from `lastHandledDate`,
//      resets `handledTimesToday` — otherwise yesterday's list would look
//      like every slot was already handled.
//   2. Skips entirely if `activeDays` is non-empty and today's weekday
//      isn't in it.
//   3. Works out which `reminderTimes` are due (time has passed) and not
//      yet in `handledTimesToday`.
//   4. If any slot is due, checks (once per tick, even if multiple slots
//      are simultaneously due) whether the user has solved anything since
//      local midnight. Not solved -> notify via email/SMS with today's
//      Daily Challenge suggested. Either way, all due slots are marked
//      handled so they don't fire again today.
//
// A failed LeetCode API call is retried next tick — it does NOT mark any
// slot handled and does NOT send a false-negative reminder.
// ============================================================================

const cron = require('node-cron');
const env = require('../config/env');
const User = require('../models/User');
const { hasSolvedSince, fetchDailyChallenge } = require('./leetcodeService');
const { sendEmail } = require('./emailService');
const { sendSMS } = require('./smsService');
const { todayDateString, currentTimeString, startOfTodayUtc, weekdayInTimezone } = require('../utils/timezone');

async function buildReminderMessage(user) {
  let suggestion = '';
  try {
    const challenge = await fetchDailyChallenge();
    suggestion = ` Today's Daily Challenge: "${challenge.title}" (${challenge.difficulty}) \u2014 ${challenge.url}`;
  } catch {
    // nice-to-have; don't block the core reminder on a LeetCode API hiccup
  }
  return `You haven't solved a LeetCode problem yet today, ${user.name}. Keep the streak alive — even one problem counts!${suggestion}`;
}

async function notifyUser(user) {
  const message = await buildReminderMessage(user);
  const wantsEmail = user.notificationPrefs.email;
  const wantsSms = user.notificationPrefs.sms && user.phoneVerified && user.phone;
  const errors = [];

  if (wantsEmail) {
    try {
      await sendEmail({ to: user.email, subject: "No LeetCode activity yet today \u2014 don't break the streak", text: message });
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
  if (errors.length > 0) console.warn(`[leetcodeReminder] delivery issue for ${user.email}: ${errors.join('; ')}`);
}

async function checkAndRemindUser(user) {
  const tz = user.leetcode.timezone || 'UTC';
  const today = todayDateString(tz);

  if (user.leetcode.lastHandledDate !== today) {
    user.leetcode.lastHandledDate = today;
    user.leetcode.handledTimesToday = [];
  }

  const activeDays = user.leetcode.activeDays || [];
  if (activeDays.length > 0 && !activeDays.includes(weekdayInTimezone(tz))) {
    await user.save({ validateBeforeSave: false });
    return { skipped: 'not-an-active-day' };
  }

  const nowTime = currentTimeString(tz);
  const reminderTimes = user.leetcode.reminderTimes?.length ? user.leetcode.reminderTimes : ['20:00'];
  const dueSlots = reminderTimes.filter((t) => nowTime >= t && !user.leetcode.handledTimesToday.includes(t));

  if (dueSlots.length === 0) {
    await user.save({ validateBeforeSave: false });
    return { skipped: 'not-time-yet' };
  }

  let solvedToday;
  try {
    solvedToday = await hasSolvedSince(user.leetcode.username, startOfTodayUtc(tz));
  } catch (err) {
    console.error(`[leetcodeReminder] Could not check LeetCode for "${user.leetcode.username}" (${user.email}): ${err.message}`);
    return { skipped: 'check-failed' };
  }

  if (!solvedToday) await notifyUser(user);

  user.leetcode.handledTimesToday = [...user.leetcode.handledTimesToday, ...dueSlots];
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
  if (scheduledTask) return scheduledTask;
  scheduledTask = cron.schedule(env.leetcode.cronExpression, async () => {
    try {
      const count = await processLeetcodeReminders();
      if (count > 0) console.log(`[leetcodeReminder] Evaluated ${count} opted-in user(s) at ${new Date().toISOString()}`);
    } catch (err) {
      console.error('[leetcodeReminder] Error while processing reminders:', err);
    }
  });
  console.log(`[leetcodeReminder] scheduler started (cron: "${env.leetcode.cronExpression}")`);
  return scheduledTask;
}

function stopLeetcodeReminderScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

module.exports = { startLeetcodeReminderScheduler, stopLeetcodeReminderScheduler, processLeetcodeReminders, checkAndRemindUser };
