// src/components/common/Badge.jsx
import clsx from 'clsx';

const TONES = {
  urgent: 'bg-urgent-soft text-urgent',
  warn: 'bg-warn-soft text-warn',
  success: 'bg-success-soft text-success',
  primary: 'bg-primary-soft text-primary',
  muted: 'bg-surface-alt text-ink-muted',
};

export default function Badge({ children, tone = 'muted', className, mono = false }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        mono && 'font-mono tracking-tight',
        TONES[tone] || TONES.muted,
        className
      )}
    >
      {children}
    </span>
  );
}
