// src/components/leetcode/DailyChallengeCard.jsx
import { ExternalLink, Sparkles } from 'lucide-react';
import Badge from '../common/Badge';

const DIFFICULTY_TONE = { Easy: 'success', Medium: 'warn', Hard: 'urgent' };

export default function DailyChallengeCard({ challenge }) {
  if (!challenge) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt/50 p-3">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Sparkles size={15} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-muted">Today&apos;s Daily Challenge</p>
          <p className="truncate text-sm font-semibold text-ink">{challenge.title}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge tone={DIFFICULTY_TONE[challenge.difficulty] || 'muted'}>{challenge.difficulty}</Badge>
        <a href={challenge.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover">
          Solve <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
