// src/components/common/FormFields.jsx
// Small, shared form-field wrappers so every page gets the same label/error
// treatment instead of re-implementing it. Designed to be used directly with
// react-hook-form's `register()` (spread as props) or `Controller`.
import { forwardRef } from 'react';
import clsx from 'clsx';

const fieldBase =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 ' +
  'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors';

export function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
      {error && <p className="text-xs text-urgent">{error}</p>}
    </div>
  );
}

export const Input = forwardRef(({ label, error, hint, id, className, ...props }, ref) => (
  <Field label={label} htmlFor={id} error={error} hint={hint}>
    <input
      id={id}
      ref={ref}
      className={clsx(fieldBase, error && 'border-urgent focus:border-urgent focus:ring-urgent', className)}
      {...props}
    />
  </Field>
));
Input.displayName = 'Input';

export const Textarea = forwardRef(({ label, error, hint, id, className, ...props }, ref) => (
  <Field label={label} htmlFor={id} error={error} hint={hint}>
    <textarea
      id={id}
      ref={ref}
      rows={4}
      className={clsx(fieldBase, 'resize-y', error && 'border-urgent focus:border-urgent focus:ring-urgent', className)}
      {...props}
    />
  </Field>
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef(({ label, error, hint, id, className, children, ...props }, ref) => (
  <Field label={label} htmlFor={id} error={error} hint={hint}>
    <select
      id={id}
      ref={ref}
      className={clsx(fieldBase, 'cursor-pointer', error && 'border-urgent focus:border-urgent focus:ring-urgent', className)}
      {...props}
    >
      {children}
    </select>
  </Field>
));
Select.displayName = 'Select';

export function Checkbox({ label, className, ...props }) {
  return (
    <label className={clsx('inline-flex items-center gap-2 text-sm text-ink cursor-pointer select-none', className)}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-[var(--color-primary)]"
        {...props}
      />
      {label}
    </label>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative h-6 w-11 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-border'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          )}
        />
      </button>
      {label && <span className="text-sm text-ink">{label}</span>}
    </label>
  );
}
