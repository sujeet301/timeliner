// src/components/common/Skeletons.jsx
export function TaskCardSkeleton() {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="skeleton h-4 w-2/3 animate-shimmer rounded" />
      <div className="skeleton mt-3 h-3 w-1/3 animate-shimmer rounded" />
      <div className="mt-4 flex gap-2">
        <div className="skeleton h-5 w-16 animate-shimmer rounded-full" />
        <div className="skeleton h-5 w-20 animate-shimmer rounded-full" />
      </div>
    </div>
  );
}

export function TaskListSkeleton({ count = 5 }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => <TaskCardSkeleton key={i} />)}
    </div>
  );
}

export function LineSkeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton animate-shimmer rounded ${className}`} />;
}
