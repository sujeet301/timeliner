// src/components/layout/AuthLayout.jsx
import { Clock3 } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            <Clock3 size={20} />
          </span>
          <h1 className="font-display text-xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
        </div>
        <div className="rounded-card border border-border bg-surface p-6 shadow-card">{children}</div>
      </div>
    </div>
  );
}
