// src/components/common/Button.jsx
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'gradient-brand text-white shadow-sm hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100',
  secondary: 'bg-surface-alt text-ink hover:bg-border/60 border border-border disabled:opacity-50',
  ghost: 'text-ink-muted hover:text-ink hover:bg-surface-alt disabled:opacity-50',
  danger: 'bg-urgent text-white hover:opacity-90 disabled:opacity-50',
};

const SIZES = {
  sm: 'text-sm px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-base px-5 py-2.5 gap-2',
};

export default function Button({ children, variant = 'primary', size = 'md', className, loading = false, disabled, type = 'button', ...props }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx('inline-flex items-center justify-center rounded-lg font-medium transition-colors', 'disabled:cursor-not-allowed', VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
