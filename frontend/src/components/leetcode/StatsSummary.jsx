// src/components/leetcode/StatsSummary.jsx
import { Flame, Trophy, CheckCircle2, Circle } from 'lucide-react';

const TONE_CLASSES = {
  flame: 'bg-flame-soft text-flame',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warn: 'bg-warn-soft text-warn',
  urgent: 'bg-urgent-soft text-urgent',
};

function StatChip({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface p-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[tone]}`}>
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="font-mono text-base font-semibold leading-tight text-ink">{value}</p>
        <p className="truncate text-xs text-ink-muted">{label}</p>
      </div>
    </div>
  );
}

export default function StatsSummary({ currentStreak, longestStreak, solvedByDifficulty }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <StatChip icon={Flame} label="day streak" value={currentStreak} tone="flame" />
        <StatChip icon={Trophy} label="Best streak (days)" value={longestStreak} tone="primary" />
      </div>
      {solvedByDifficulty && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatChip icon={CheckCircle2} label="Total solved" value={solvedByDifficulty.all} tone="primary" />
          <StatChip icon={Circle} label="Easy" value={solvedByDifficulty.easy} tone="success" />
          <StatChip icon={Circle} label="Medium" value={solvedByDifficulty.medium} tone="warn" />
          <StatChip icon={Circle} label="Hard" value={solvedByDifficulty.hard} tone="urgent" />
        </div>
      )}
    </div>
  );
}
