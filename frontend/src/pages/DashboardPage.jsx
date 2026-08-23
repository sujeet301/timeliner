// src/pages/DashboardPage.jsx
import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, LayoutList, KanbanSquare, ClipboardList } from 'lucide-react';
import clsx from 'clsx';
import FilterBar from '../components/tasks/FilterBar';
import TaskCard from '../components/tasks/TaskCard';
import KanbanBoard from '../components/tasks/KanbanBoard';
import TaskForm from '../components/tasks/TaskForm';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import { TaskListSkeleton } from '../components/common/Skeletons';
import {
  fetchTasks,
  setFilters,
  createTask,
  updateTaskStatus,
  softDeleteTask,
  restoreTask,
} from '../redux/taskSlice';
import { showUndoToast } from '../utils/toastHelpers';

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { items, status, pagination, filters } = useSelector((s) => s.tasks);
  const [view, setView] = useState('list');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchInput, setSearchInput] = useState(filters.search);

  // Debounce the free-text search so we're not firing a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.search) {
        dispatch(setFilters({ ...filters, search: searchInput, page: 1 }));
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    dispatch(fetchTasks(filters));
  }, [dispatch, filters]);

  const handleFilterChange = useCallback(
    (patch) => {
      dispatch(setFilters({ ...filters, ...patch, page: 1 }));
    },
    [dispatch, filters]
  );

  const changeView = (nextView) => {
    setView(nextView);
    // Kanban reads better with more tasks visible at once than the paginated list default.
    dispatch(setFilters({ ...filters, page: 1, limit: nextView === 'board' ? 100 : 20 }));
  };

  const handleCreate = async (payload) => {
    setCreating(true);
    try {
      await dispatch(createTask(payload)).unwrap();
      setCreateOpen(false);
    } catch {
      // toast already shown by the thunk
    } finally {
      setCreating(false);
    }
  };

  const handleToggleComplete = (task) => {
    dispatch(updateTaskStatus({ id: task._id, status: task.status === 'completed' ? 'pending' : 'completed' }));
  };

  const handleStatusChange = (taskId, status) => {
    dispatch(updateTaskStatus({ id: taskId, status }));
  };

  const handleDelete = async (task) => {
    await dispatch(softDeleteTask(task._id));
    showUndoToast(`"${task.title}" deleted`, async () => {
      await dispatch(restoreTask(task._id));
      dispatch(fetchTasks(filters));
    });
  };

  const openDetail = (task) => setSelectedTask(task);

  const isEmpty = status === 'succeeded' && items.length === 0;
  const isLoadingFirstPage = status === 'loading' && items.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-muted">
            {pagination.total} task{pagination.total === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-surface p-0.5">
            <button
              onClick={() => changeView('list')}
              className={clsx(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                view === 'list' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
              )}
            >
              <LayoutList size={14} /> <span className="hidden xs:inline">List</span>
            </button>
            <button
              onClick={() => changeView('board')}
              className={clsx(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                view === 'board' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
              )}
            >
              <KanbanSquare size={14} /> <span className="hidden xs:inline">Board</span>
            </button>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> <span className="hidden xs:inline">New task</span>
          </Button>
        </div>
      </div>

      <FilterBar
        filters={{ ...filters, search: searchInput }}
        onChange={(patch) => {
          if ('search' in patch) setSearchInput(patch.search);
          else handleFilterChange(patch);
        }}
      />

      {isLoadingFirstPage && <TaskListSkeleton />}

      {isEmpty && (
        <EmptyState
          icon={ClipboardList}
          title="No tasks match these filters"
          description="Try clearing your search or filters, or create a new task."
          action={
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> New task
            </Button>
          }
        />
      )}

      {!isLoadingFirstPage && items.length > 0 && view === 'list' && (
        <div className="flex flex-col gap-2.5">
          {items.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onOpen={openDetail}
              onEdit={openDetail}
              onDelete={handleDelete}
              onToggleComplete={handleToggleComplete}
            />
          ))}
        </div>
      )}

      {!isLoadingFirstPage && items.length > 0 && view === 'board' && (
        <KanbanBoard
          tasks={items}
          onOpen={openDetail}
          onEdit={openDetail}
          onDelete={handleDelete}
          onToggleComplete={handleToggleComplete}
          onStatusChange={handleStatusChange}
        />
      )}

      {view === 'list' && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => handleFilterChange({ page: pagination.page - 1 })}
          >
            Previous
          </Button>
          <span className="font-mono text-xs text-ink-muted">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => handleFilterChange({ page: pagination.page + 1 })}
          >
            Next
          </Button>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New task">
        <TaskForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitting={creating} />
      </Modal>

      <TaskDetailModal task={selectedTask} open={Boolean(selectedTask)} onClose={() => setSelectedTask(null)} />
    </div>
  );
}