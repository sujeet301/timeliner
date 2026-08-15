// src/utils/dateHelpers.js
// Countdown/urgency logic drives the app's signature "departure board" chip:
// tasks are labeled with how much runway is left, color-coded by urgency,
// the same way a schedule board flags "on time" vs "final call" vs "delayed".
import { format, formatDistanceToNowStrict, isPast, isToday, differenceInHours } from 'date-fns';

export function formatDueDate(date) {
  if (!date) return null;
  return format(new Date(date), 'MMM d, yyyy \u00b7 h:mm a');
}

export function formatShortDate(date) {
  if (!date) return null;
  return format(new Date(date), 'MMM d');
}

export function formatTime(date) {
  if (!date) return null;
  return format(new Date(date), 'h:mm a');
}

/**
 * Returns { label, tone } describing urgency for a due date.
 * tone maps directly to the urgent/warn/success color tokens.
 */
export function getUrgency(dueDate, status) {
  if (!dueDate) return { label: 'No due date', tone: 'muted' };
  if (status === 'completed') return { label: 'Done', tone: 'success' };

  const date = new Date(dueDate);
  if (isPast(date) && !isToday(date)) {
    return { label: `Overdue \u00b7 ${formatDistanceToNowStrict(date)}`, tone: 'urgent' };
  }
  const hoursLeft = differenceInHours(date, new Date());
  if (hoursLeft <= 24) {
    return { label: `${formatDistanceToNowStrict(date)} left`, tone: 'urgent' };
  }
  if (hoursLeft <= 72) {
    return { label: `${formatDistanceToNowStrict(date)} left`, tone: 'warn' };
  }
  return { label: `${formatDistanceToNowStrict(date)} left`, tone: 'success' };
}

export function toDateTimeLocalValue(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}
