// src/components/leetcode/RecentSolvesList.jsx
import { formatDistanceToNowStrict } from 'date-fns';
import { ExternalLink } from 'lucide-react';

export default function RecentSolvesList({ solves }) {
  if (!solves || solves.length === 0) {
    return <p className="text-sm text-ink-muted">No recent solves found for this username yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {solves.map((s) => (
        <li key={s.id}>
          <a href={`https://leetcode.com/problems/${s.titleSlug}/`} target="_blank" rel="noreferrer" className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-alt">
            <span className="min-w-0 truncate text-ink">{s.title}</span>
            <span className="flex shrink-0 items-center gap-1 font-mono text-xs text-ink-muted">
              {formatDistanceToNowStrict(new Date(Number(s.timestamp) * 1000))} ago
              <ExternalLink size={11} className="opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
