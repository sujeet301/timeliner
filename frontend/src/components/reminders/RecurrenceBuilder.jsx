// src/components/reminders/RecurrenceBuilder.jsx
import clsx from 'clsx';
import { Select, Input } from '../common/FormFields';
import { REPEAT_OPTIONS, WEEKDAYS } from '../../utils/constants';

export default function RecurrenceBuilder({ register, watch, setValue, errors }) {
  const repeatType = watch('repeatType');

  const selectedDays = watch('daysOfWeek') || [];
  const toggleDay = (day) => {
    const next = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day].sort();
    setValue('daysOfWeek', next);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-alt/50 p-3">
      <Select label="Repeat" id="repeatType" {...register('repeatType')}>
        {REPEAT_OPTIONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </Select>

      {repeatType === 'weekly' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">On these days</span>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={clsx(
                  'h-8 w-10 rounded-md border text-xs font-medium transition-colors',
                  selectedDays.includes(d.value)
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-ink-muted hover:text-ink'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-muted">Leave none selected to repeat every 7 days instead.</p>
        </div>
      )}

      {repeatType === 'custom' && (
        <Input
          label="Repeat every N days"
          id="repeatInterval"
          type="number"
          min={1}
          error={errors.repeatInterval?.message}
          {...register('repeatInterval')}
        />
      )}

      {repeatType !== 'none' && (
        <Input
          label="Stop repeating after (optional)"
          id="endDate"
          type="datetime-local"
          {...register('endDate')}
        />
      )}
    </div>
  );
}
