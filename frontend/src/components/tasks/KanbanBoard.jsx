// src/components/tasks/KanbanBoard.jsx
import { useState } from 'react';
import TaskCard from './TaskCard';
import EmptyState from '../common/EmptyState';
import { Inbox } from 'lucide-react';
import { STATUS_OPTIONS } from '../../utils/constants';

export default function KanbanBoard({ tasks, onOpen, onEdit, onDelete, onToggleComplete, onStatusChange }) {
  const [dragOverStatus, setDragOverStatus] = useState(null);

  const columns = STATUS_OPTIONS.map((s) => ({
    ...s,
    tasks: tasks.filter((t) => t.status === s.value),
  }));

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('text/plain', task._id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) onStatusChange(taskId, status);
    setDragOverStatus(null);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {columns.map((col) => (
        <div
          key={col.value}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverStatus(col.value);
          }}
          onDragLeave={() => setDragOverStatus((s) => (s === col.value ? null : s))}
          onDrop={(e) => handleDrop(e, col.value)}
          className={`flex flex-col gap-3 rounded-card border p-3 transition-colors ${
            dragOverStatus === col.value ? 'border-primary bg-primary-soft/40' : 'border-border bg-surface-alt/50'
          }`}
        >
          <div className="flex items-center justify-between px-1">
            <h3 className="font-display text-sm font-semibold text-ink">{col.label}</h3>
            <span className="font-mono text-xs text-ink-muted">{col.tasks.length}</span>
          </div>

          <div className="flex min-h-[6rem] flex-col gap-2.5">
            {col.tasks.length === 0 ? (
              <EmptyState icon={Inbox} title="Nothing here" description="Drag a task in, or create one." />
            ) : (
              col.tasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onOpen={onOpen}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleComplete={onToggleComplete}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
