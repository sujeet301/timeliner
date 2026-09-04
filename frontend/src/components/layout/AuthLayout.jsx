// src/components/layout/AuthLayout.jsx
import { Clock3 } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary opacity-20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-flame opacity-20 blur-3xl" />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="gradient-brand flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-sm">
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
