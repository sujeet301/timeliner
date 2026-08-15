// src/components/tasks/TaskCard.jsx
import { CheckCircle2, Circle, ListChecks, Pencil, Trash2, Bell } from 'lucide-react';
import clsx from 'clsx';
import Badge from '../common/Badge';
import { getUrgency } from '../../utils/dateHelpers';
import { PRIORITY_COLOR } from '../../utils/constants';

export default function TaskCard({ task, onOpen, onToggleComplete, onEdit, onDelete, draggable, onDragStart }) {
  const urgency = getUrgency(task.dueDate, task.status);
  const doneSubtasks = task.subtasks?.filter((s) => s.done).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const isCompleted = task.status === 'completed';

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={() => onOpen(task)}
      className="group flex cursor-pointer flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-popover"
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task);
          }}
          aria-label={isCompleted ? 'Mark as pending' : 'Mark as completed'}
          className="mt-0.5 shrink-0 text-primary hover:opacity-80"
        >
          {isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} className="text-ink-muted" />}
        </button>

        <div className="min-w-0 flex-1">
          <h3
            className={clsx(
              'truncate text-sm font-semibold text-ink',
              isCompleted && 'text-ink-muted line-through'
            )}
          >
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{task.description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            aria-label="Edit task"
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-ink"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task);
            }}
            aria-label="Delete task"
            className="rounded-md p-1.5 text-ink-muted hover:bg-urgent-soft hover:text-urgent"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-8">
        <Badge tone={PRIORITY_COLOR[task.priority]}>{task.priority}</Badge>
        {task.category && <Badge tone="muted">{task.category}</Badge>}
        {task.dueDate && (
          <Badge tone={urgency.tone} mono>
            {urgency.label}
          </Badge>
        )}
        {totalSubtasks > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
            <ListChecks size={13} />
            {doneSubtasks}/{totalSubtasks}
          </span>
        )}
        {task.reminderCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
            <Bell size={13} />
            {task.reminderCount}
          </span>
        )}
        {task.tags?.map((tag) => (
          <span key={tag} className="text-xs text-ink-muted">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
}
