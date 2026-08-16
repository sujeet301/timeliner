// src/components/auth/OrDivider.jsx
export default function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs text-ink-muted">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
