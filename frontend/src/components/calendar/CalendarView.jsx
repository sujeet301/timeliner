// src/components/calendar/CalendarView.jsx
import { useMemo, useState } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOT_TONE = { low: 'bg-success', medium: 'bg-warn', high: 'bg-urgent' };

export default function CalendarView({ tasks, onOpenTask }) {
  const [cursor, setCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const tasksByDay = useMemo(() => {
    const map = new Map();
    tasks.filter((t) => t.dueDate).forEach((t) => {
      const key = format(new Date(t.dueDate), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    return map;
  }, [tasks]);

  const selectedTasks = selectedDay ? tasksByDay.get(format(selectedDay, 'yyyy-MM-dd')) || [] : [];

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1 rounded-card border border-border bg-surface p-4 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{format(cursor, 'MMMM yyyy')}</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setCursor((c) => subMonths(c, 1))} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-ink" aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setCursor(new Date())} className="rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-surface-alt hover:text-ink">Today</button>
            <button onClick={() => setCursor((c) => addMonths(c, 1))} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-ink" aria-label="Next month">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-center">
          {WEEKDAY_LABELS.map((d) => <div key={d} className="bg-surface-alt py-1.5 text-xs font-medium text-ink-muted">{d}</div>)}
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDay.get(key) || [];
            const inMonth = isSameMonth(day, cursor);
            const selected = selectedDay && isSameDay(day, selectedDay);
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(day)}
                className={clsx('flex min-h-[4.5rem] flex-col items-start gap-1 bg-surface p-1.5 text-left transition-colors hover:bg-surface-alt', !inMonth && 'opacity-40', selected && 'ring-2 ring-inset ring-primary')}
              >
                <span className={clsx('flex h-5 w-5 items-center justify-center rounded-full font-mono text-xs', isToday(day) ? 'bg-primary text-white' : 'text-ink-muted')}>{format(day, 'd')}</span>
                <div className="flex flex-wrap gap-0.5">
                  {dayTasks.slice(0, 4).map((t) => <span key={t._id} title={t.title} className={clsx('h-1.5 w-1.5 rounded-full', DOT_TONE[t.priority])} />)}
                  {dayTasks.length > 4 && <span className="font-mono text-[10px] text-ink-muted">+{dayTasks.length - 4}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full shrink-0 rounded-card border border-border bg-surface p-4 shadow-card lg:w-72">
        <h3 className="font-display text-sm font-semibold text-ink">{selectedDay ? format(selectedDay, 'EEEE, MMM d') : 'Pick a day'}</h3>
        {!selectedDay && <p className="mt-2 text-sm text-ink-muted">Select a date to see what&apos;s due.</p>}
        {selectedDay && selectedTasks.length === 0 && <p className="mt-2 text-sm text-ink-muted">Nothing due this day.</p>}
        <ul className="mt-3 flex flex-col gap-2">
          {selectedTasks.map((t) => (
            <li key={t._id}>
              <button onClick={() => onOpenTask(t)} className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm text-ink hover:bg-surface-alt">
                <span className={clsx('h-2 w-2 shrink-0 rounded-full', DOT_TONE[t.priority])} />
                <span className="truncate">{t.title}</span>
                <span className={clsx('ml-auto shrink-0 font-mono text-xs', t.status === 'completed' ? 'text-success' : 'text-ink-muted')}>{format(new Date(t.dueDate), 'h:mm a')}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
