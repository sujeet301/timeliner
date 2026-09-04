// src/components/leetcode/ActiveDaysPicker.jsx
import clsx from 'clsx';
import { WEEKDAYS } from '../../utils/constants';

export default function ActiveDaysPicker({ activeDays, onChange }) {
  const toggleDay = (day) => {
    const next = activeDays.includes(day) ? activeDays.filter((d) => d !== day) : [...activeDays, day].sort();
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">Check on these days</span>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => toggleDay(d.value)}
            className={clsx('h-8 w-10 rounded-md border text-xs font-medium transition-colors', activeDays.includes(d.value) ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-ink-muted hover:text-ink')}
          >
            {d.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-muted">
        {activeDays.length === 0 ? 'Checking every day.' : `Only checking on the ${activeDays.length} selected day${activeDays.length === 1 ? '' : 's'}.`}
      </p>
    </div>
  );
}
