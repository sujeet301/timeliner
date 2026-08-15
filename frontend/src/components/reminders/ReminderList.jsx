// src/components/reminders/ReminderList.jsx
import { useState } from 'react';
import { Mail, MessageSquare, Bell, BellOff, Clock, X, Repeat } from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';
import { formatDueDate } from '../../utils/dateHelpers';
import { WEEKDAYS } from '../../utils/constants';

const CHANNEL_ICON = { email: Mail, sms: MessageSquare, both: Bell, push: Bell };

const STATUS_TONE = {
  pending: 'primary',
  sent: 'success',
  failed: 'urgent',
  cancelled: 'muted',
  snoozed: 'warn',
};

function repeatSummary(repeat) {
  if (!repeat || repeat.type === 'none') return 'Does not repeat';
  if (repeat.type === 'daily') return 'Repeats daily';
  if (repeat.type === 'monthly') return 'Repeats monthly';
  if (repeat.type === 'custom') return `Repeats every ${repeat.interval || 1} day(s)`;
  if (repeat.type === 'weekly') {
    if (repeat.daysOfWeek?.length) {
      const labels = repeat.daysOfWeek.map((d) => WEEKDAYS.find((w) => w.value === d)?.label).join(', ');
      return `Repeats weekly on ${labels}`;
    }
    return 'Repeats weekly';
  }
  return '';
}

const SNOOZE_PRESETS = [
  { label: '+10 min', minutes: 10 },
  { label: '+1 hour', minutes: 60 },
  { label: '+1 day', minutes: 60 * 24 },
];

export default function ReminderList({ reminders, onSnooze, onCancel }) {
  const [openSnoozeFor, setOpenSnoozeFor] = useState(null);

  if (!reminders || reminders.length === 0) {
    return (
      <EmptyState
        icon={BellOff}
        title="No reminders yet"
        description="Add one so you don't have to remember this yourself."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {reminders.map((reminder) => {
        const Icon = CHANNEL_ICON[reminder.channel] || Bell;
        const isActionable = reminder.status === 'pending' || reminder.status === 'snoozed';

        return (
          <li key={reminder._id} className="rounded-lg border border-border bg-surface-alt/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Icon size={14} />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-sm text-ink">{formatDueDate(reminder.nextTriggerAt)}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                    <Repeat size={11} /> {repeatSummary(reminder.repeat)}
                  </p>
                  {reminder.message && (
                    <p className="mt-1 text-xs text-ink-muted italic">&ldquo;{reminder.message}&rdquo;</p>
                  )}
                </div>
              </div>
              <Badge tone={STATUS_TONE[reminder.status]}>{reminder.status}</Badge>
            </div>

            {isActionable && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-9">
                {openSnoozeFor === reminder._id ? (
                  <>
                    {SNOOZE_PRESETS.map((p) => (
                      <Button
                        key={p.label}
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          onSnooze(reminder._id, { minutes: p.minutes });
                          setOpenSnoozeFor(null);
                        }}
                      >
                        {p.label}
                      </Button>
                    ))}
                    <Button size="sm" variant="ghost" onClick={() => setOpenSnoozeFor(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setOpenSnoozeFor(reminder._id)}>
                      <Clock size={13} /> Snooze
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onCancel(reminder._id)}>
                      <X size={13} /> Cancel
                    </Button>
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
