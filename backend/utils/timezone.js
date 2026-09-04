// utils/timezone.js
const { toZonedTime, fromZonedTime, format } = require('date-fns-tz');
const { startOfDay } = require('date-fns');

function todayDateString(timezone, now = new Date()) {
  return format(toZonedTime(now, timezone), 'yyyy-MM-dd', { timeZone: timezone });
}

function currentTimeString(timezone, now = new Date()) {
  return format(toZonedTime(now, timezone), 'HH:mm', { timeZone: timezone });
}

function startOfTodayUtc(timezone, now = new Date()) {
  const zonedNow = toZonedTime(now, timezone);
  const zonedMidnight = startOfDay(zonedNow);
  return fromZonedTime(zonedMidnight, timezone);
}

/**
 * Day of week (0=Sun..6=Sat) of `now`'s calendar date in `timezone`. Reuses
 * todayDateString (already timezone-correct) and derives the weekday from
 * the resulting date string parsed as UTC midnight.
 */
function weekdayInTimezone(timezone, now = new Date()) {
  const dateStr = todayDateString(timezone, now);
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

function isValidTimezone(timezone) {
  if (typeof Intl.supportedValuesOf !== 'function') return true;
  try {
    return Intl.supportedValuesOf('timeZone').includes(timezone);
  } catch {
    return true;
  }
}

module.exports = { todayDateString, currentTimeString, startOfTodayUtc, weekdayInTimezone, isValidTimezone };
