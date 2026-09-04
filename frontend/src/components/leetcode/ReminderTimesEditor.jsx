// src/components/leetcode/ReminderTimesEditor.jsx
import { Plus, X } from 'lucide-react';
import Button from '../common/Button';

export default function ReminderTimesEditor({ times, onChange }) {
  const updateTime = (idx, value) => onChange(times.map((t, i) => (i === idx ? value : t)));
  const removeTime = (idx) => onChange(times.filter((_, i) => i !== idx));
  const addTime = () => onChange([...times, '20:00']);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink">Remind me at</span>
      <div className="flex flex-col gap-2">
        {times.map((t, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="time"
              value={t}
              onChange={(e) => updateTime(idx, e.target.value)}
              className="w-full max-w-[10rem] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {times.length > 1 && (
              <button type="button" onClick={() => removeTime(idx)} aria-label="Remove this reminder time" className="shrink-0 rounded p-1.5 text-ink-muted hover:bg-urgent-soft hover:text-urgent">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      <Button type="button" variant="secondary" size="sm" className="self-start" onClick={addTime}>
        <Plus size={13} /> Add another time
      </Button>
      {times.length > 1 && <p className="text-xs text-ink-muted">You&apos;ll get nudged at each of these times, until you&apos;ve solved something that day.</p>}
    </div>
  );
}
