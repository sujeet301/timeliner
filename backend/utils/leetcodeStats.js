// utils/leetcodeStats.js
//
// Turns LeetCode's raw `submissionCalendar` (a JSON string mapping Unix-day
// timestamps to a submission count for that day, UTC-aligned) into streak
// numbers. Pure functions, unit-testable without network access.
//
// Note: `submissionCalendar` reflects ALL submissions (not just accepted
// ones), matching what LeetCode's own profile page streak is based on.

function parseSubmissionCalendar(raw) {
  let obj;
  try {
    obj = JSON.parse(raw || '{}');
  } catch {
    obj = {};
  }
  const map = new Map();
  for (const [key, count] of Object.entries(obj)) {
    const seconds = Number(key);
    if (!Number.isFinite(seconds)) continue;
    const dateStr = new Date(seconds * 1000).toISOString().slice(0, 10);
    map.set(dateStr, (map.get(dateStr) || 0) + Number(count));
  }
  return map;
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Current streak walks backward from today (UTC calendar day). If today
 * has no recorded activity yet, that's not a break — the day isn't over.
 * Only a full day with zero activity ends the streak.
 */
function computeStreaks(calendarMap, referenceDate = new Date()) {
  let cursor = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));

  let currentStreak = 0;
  const hasActivity = (d) => (calendarMap.get(toDateStr(d)) || 0) > 0;

  if (!hasActivity(cursor)) {
    cursor = new Date(cursor.getTime() - 86400000);
  }
  while (hasActivity(cursor)) {
    currentStreak += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }

  const sortedDays = Array.from(calendarMap.keys()).sort();
  let longestStreak = 0;
  let run = 0;
  let prevDate = null;

  for (const dateStr of sortedDays) {
    const count = calendarMap.get(dateStr);
    if (!count || count <= 0) {
      run = 0;
      prevDate = null;
      continue;
    }
    const d = new Date(`${dateStr}T00:00:00Z`);
    run = prevDate && d.getTime() - prevDate.getTime() === 86400000 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prevDate = d;
  }

  return { currentStreak, longestStreak: Math.max(longestStreak, currentStreak) };
}

module.exports = { parseSubmissionCalendar, computeStreaks };
