// src/pages/TrashPage.jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Trash2, RotateCcw, XCircle } from 'lucide-react';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import { TaskListSkeleton } from '../components/common/Skeletons';
import { fetchTrash, restoreTask, permanentlyDeleteTask } from '../redux/taskSlice';
import { PRIORITY_COLOR } from '../utils/constants';
import { formatShortDate } from '../utils/dateHelpers';

export default function TrashPage() {
  const dispatch = useDispatch();
  const { trash, status } = useSelector((s) => s.tasks);
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => { dispatch(fetchTrash()); }, [dispatch]);
  const isLoading = status === 'loading' && trash.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Trash</h1>
        <p className="text-sm text-ink-muted">Deleted tasks stay here until you remove them for good.</p>
      </div>

      {isLoading && <TaskListSkeleton count={3} />}
      {!isLoading && trash.length === 0 && <EmptyState icon={Trash2} title="Trash is empty" description="Deleted tasks will show up here." />}

      {trash.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {trash.map((task) => (
            <div key={task._id} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{task.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge tone={PRIORITY_COLOR[task.priority]}>{task.priority}</Badge>
                  {task.deletedAt && <span className="font-mono text-xs text-ink-muted">deleted {formatShortDate(task.deletedAt)}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => dispatch(restoreTask(task._id))}>
                  <RotateCcw size={14} /> Restore
                </Button>
                {confirmingId === task._id ? (
                  <>
                    <Button size="sm" variant="danger" onClick={() => { dispatch(permanentlyDeleteTask(task._id)); setConfirmingId(null); }}>Confirm delete</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>Cancel</Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmingId(task._id)}>
                    <XCircle size={14} /> Delete forever
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
