// src/components/tasks/FilterBar.jsx
import { Search, ArrowUpDown } from 'lucide-react';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../utils/constants';

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date created' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
];

export default function FilterBar({ filters, onChange }) {
  const set = (patch) => onChange({ ...patch });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 sm:max-w-xs">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Search tasks…"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={filters.status} onChange={(e) => set({ status: e.target.value })} className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select value={filters.priority} onChange={(e) => set({ priority: e.target.value })} className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">All priorities</option>
          {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-2">
          <ArrowUpDown size={14} className="text-ink-muted" />
          <select value={filters.sortBy} onChange={(e) => set({ sortBy: e.target.value })} className="bg-transparent text-sm text-ink focus:outline-none">
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={() => set({ order: filters.order === 'asc' ? 'desc' : 'asc' })} className="ml-1 text-xs font-mono text-ink-muted hover:text-ink" title="Toggle sort direction">
            {filters.order === 'asc' ? '\u2191' : '\u2193'}
          </button>
        </div>
      </div>
    </div>
  );
}
