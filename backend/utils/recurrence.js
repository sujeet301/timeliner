// utils/recurrence.js
const { addDays, addWeeks, addMonths, subMinutes, subHours, subDays, subWeeks } = require('date-fns');

function applyOffset(baseDate, offset) {
  if (!offset || !offset.amount || !offset.unit) return new Date(baseDate);
  const { amount, unit } = offset;
  switch (unit) {
    case 'minutes': return subMinutes(baseDate, amount);
    case 'hours': return subHours(baseDate, amount);
    case 'days': return subDays(baseDate, amount);
    case 'weeks': return subWeeks(baseDate, amount);
    default: return new Date(baseDate);
  }
}

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
  return addWeeks(from, 1);
}

function computeNextTrigger(currentTrigger, repeat) {
  if (!repeat || repeat.type === 'none') return null;
  let next;
  switch (repeat.type) {
    case 'daily':
      next = addDays(currentTrigger, 1);
      break;
    case 'weekly':
      next = repeat.daysOfWeek && repeat.daysOfWeek.length > 0 ? nextWeekdayMatch(currentTrigger, repeat.daysOfWeek) : addWeeks(currentTrigger, 1);
      break;
    case 'monthly':
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
  if (repeat.endDate && next.getTime() > new Date(repeat.endDate).getTime()) return null;
  return next;
}

module.exports = { applyOffset, computeNextTrigger, nextWeekdayMatch };
