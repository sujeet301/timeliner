// utils/timezone.js
//
// Small timezone-aware helpers used only by the LeetCode reminder feature.
// Built on date-fns-tz (same author/family as the date-fns already used in
// utils/recurrence.js) rather than hand-rolling offset math.

const { toZonedTime, fromZonedTime, format } = require('date-fns-tz');
const { startOfDay } = require('date-fns');

/**
 * Today's date as 'yyyy-MM-dd' in `timezone` — used as the dedupe key so a
 * user is only checked/reminded once per their own calendar day, no matter
 * how often the scheduler tick runs.
 */
function todayDateString(timezone, now = new Date()) {
  return format(toZonedTime(now, timezone), 'yyyy-MM-dd', { timeZone: timezone });
}

/**
 * Current wall-clock time as 'HH:mm' (24h) in `timezone` — compared against
 * the user's configured reminderTime.
 */
function currentTimeString(timezone, now = new Date()) {
  return format(toZonedTime(now, timezone), 'HH:mm', { timeZone: timezone });
}

/**
 * The UTC instant corresponding to local midnight (00:00) of `now`'s
 * calendar day in `timezone` — the lower bound for "solved today".
 */
function startOfTodayUtc(timezone, now = new Date()) {
  const zonedNow = toZonedTime(now, timezone);
  const zonedMidnight = startOfDay(zonedNow);
  return fromZonedTime(zonedMidnight, timezone);
}

/** True if `timezone` is a recognized IANA zone name. */
function isValidTimezone(timezone) {
  if (typeof Intl.supportedValuesOf !== 'function') return true; // older runtimes: skip the check rather than false-reject
  try {
    return Intl.supportedValuesOf('timeZone').includes(timezone);
  } catch {
    return true;
  }
}

module.exports = { todayDateString, currentTimeString, startOfTodayUtc, isValidTimezone };
