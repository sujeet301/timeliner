// utils/recurrence.js
//
// Pure date-math helpers for reminders. Kept separate from the scheduler and
// controllers so the recurrence rules are unit-testable in isolation and are
// guaranteed to be applied consistently in both places that need them:
//   1) reminderController — to compute the very first `scheduledTime`/
//      `nextTriggerAt` when a reminder is created (optionally relative to a
//      task's dueDate via `offset`).
//   2) schedulerService — to compute the *next* `nextTriggerAt` after a
//      recurring reminder has just fired.

const { addDays, addWeeks, addMonths, subMinutes, subHours, subDays, subWeeks } = require('date-fns');

/**
 * Shifts `baseDate` backwards by the given offset (e.g. "1 day before").
 * Used to turn a task's dueDate into a reminder's scheduledTime.
 * Returns baseDate unchanged if no offset is given.
 */
function applyOffset(baseDate, offset) {
  if (!offset || !offset.amount || !offset.unit) return new Date(baseDate);

  const { amount, unit } = offset;
  switch (unit) {
    case 'minutes':
      return subMinutes(baseDate, amount);
    case 'hours':
      return subHours(baseDate, amount);
    case 'days':
      return subDays(baseDate, amount);
    case 'weeks':
      return subWeeks(baseDate, amount);
    default:
      return new Date(baseDate);
  }
}

/**
 * Finds the next occurrence of one of `daysOfWeek` (0=Sun..6=Sat) strictly
 * after `from`, preserving `from`'s time-of-day. Looks ahead at most 7 days.
 */
function nextWeekdayMatch(from, daysOfWeek) {
  const hours = from.getHours();
  const minutes = from.getMinutes();
  const seconds = from.getSeconds();

  for (let i = 1; i <= 7; i += 1) {
    const candidate = addDays(from, i);
    if (daysOfWeek.includes(candidate.getDay())) {
      candidate.setHours(hours, minutes, seconds, 0);
      return candidate;
    }
  }
  // Defensive fallback; only reachable if daysOfWeek was empty.
  return addWeeks(from, 1);
}

/**
 * Given the trigger time that just fired (`currentTrigger`) and a repeat
 * rule, returns the Date the reminder should next fire, or `null` if the
 * reminder does not recur (type === 'none') or has passed its `endDate`.
 *
 * repeat = { type: 'none'|'daily'|'weekly'|'monthly'|'custom', interval, daysOfWeek, endDate }
 */
function computeNextTrigger(currentTrigger, repeat) {
  if (!repeat || repeat.type === 'none') return null;

  let next;
  switch (repeat.type) {
    case 'daily':
      next = addDays(currentTrigger, 1);
      break;

    case 'weekly':
      next =
        repeat.daysOfWeek && repeat.daysOfWeek.length > 0
          ? nextWeekdayMatch(currentTrigger, repeat.daysOfWeek)
          : addWeeks(currentTrigger, 1);
      break;

    case 'monthly':
      // date-fns clamps overflow (e.g. Jan 31 -> Feb 28/29) rather than
      // rolling into the next month, which is the behavior most users expect.
      next = addMonths(currentTrigger, 1);
      break;

    case 'custom': {
      const interval = repeat.interval && repeat.interval > 0 ? repeat.interval : 1;
      next = addDays(currentTrigger, interval);
      break;
    }

    default:
      return null;
  }

  if (repeat.endDate && next.getTime() > new Date(repeat.endDate).getTime()) {
    return null;
  }
  return next;
}

module.exports = { applyOffset, computeNextTrigger, nextWeekdayMatch };
