// src/pages/AnalyticsPage.jsx
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CheckCircle2, Flame, ListTodo, TrendingUp } from 'lucide-react';
import { subDays, eachDayOfInterval, isSameDay, format, startOfDay } from 'date-fns';
import { fetchTasks } from '../redux/taskSlice';
import { LineSkeleton } from '../components/common/Skeletons';

const TONE_CLASSES = {
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  flame: 'bg-flame-soft text-flame',
  warn: 'bg-warn-soft text-warn',
};

function StatCard({ icon: Icon, label, value, sub, tone = 'primary' }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-card">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[tone]}`}>
        <Icon size={18} />
      </span>
      <div>
        <p className="font-mono text-xl font-semibold text-ink">{value}</p>
        <p className="text-xs text-ink-muted">{label}</p>
        {sub && <p className="text-xs text-ink-muted">{sub}</p>}
      </div>
    </div>
  );
}

// Consecutive-day streak counting backward from today, based on whether at
// least one task has a completedAt on that day.
function computeStreak(completedDates) {
  let streak = 0;
  let cursor = startOfDay(new Date());
  const daySet = new Set(completedDates.map((d) => format(d, 'yyyy-MM-dd')));

  while (daySet.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export default function AnalyticsPage() {
  const dispatch = useDispatch();
  const { items, status } = useSelector((s) => s.tasks);

  useEffect(() => {
    dispatch(fetchTasks({ page: 1, limit: 500, sortBy: 'createdAt', order: 'desc' }));
  }, [dispatch]);

  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((t) => t.status === 'completed');
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    const completedDates = completed.filter((t) => t.completedAt).map((t) => new Date(t.completedAt));
    const streak = computeStreak(completedDates);

    const last7 = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
    const weekly = last7.map((day) => ({
      day: format(day, 'EEE'),
      completed: completedDates.filter((d) => isSameDay(d, day)).length,
    }));

    return { total, completedCount: completed.length, completionRate, streak, weekly };
  }, [items]);

  const isLoading = status === 'loading' && items.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Analytics</h1>
        <p className="text-sm text-ink-muted">How you&apos;ve been keeping up, at a glance.</p>
      </div>

      {isLoading ? (
        <LineSkeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard icon={ListTodo} label="Total tasks" value={stats.total} tone="primary" />
            <StatCard icon={CheckCircle2} label="Completed" value={stats.completedCount} tone="success" />
            <StatCard icon={TrendingUp} label="Completion rate" value={`${stats.completionRate}%`} tone="warn" />
            <StatCard
              icon={Flame}
              label="Current streak"
              value={stats.streak}
              sub={stats.streak === 1 ? 'day' : 'days'}
              tone="flame"
            />
          </div>

          <div className="rounded-card border border-border bg-surface p-4 shadow-card">
            <h2 className="mb-4 font-display text-sm font-semibold text-ink">Completions — last 7 days</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weekly}>
                  <defs>
                    <linearGradient id="completedBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" />
                      <stop offset="100%" stopColor="var(--color-flame)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: 'var(--color-ink-muted)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: 'var(--color-ink-muted)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    cursor={{ fill: 'var(--color-surface-alt)' }}
                  />
                  <Bar dataKey="completed" fill="url(#completedBarGradient)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
