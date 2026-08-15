// src/pages/CalendarPage.jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CalendarView from '../components/calendar/CalendarView';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import { LineSkeleton } from '../components/common/Skeletons';
import { fetchTasks } from '../redux/taskSlice';

export default function CalendarPage() {
  const dispatch = useDispatch();
  const { items, status } = useSelector((s) => s.tasks);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    // Pull a wide window of tasks so the month grid isn't limited by the
    // dashboard's normal page size.
    dispatch(fetchTasks({ page: 1, limit: 300, sortBy: 'dueDate', order: 'asc' }));
  }, [dispatch]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Calendar</h1>
        <p className="text-sm text-ink-muted">Everything with a due date, laid out by month.</p>
      </div>

      {status === 'loading' && items.length === 0 ? (
        <LineSkeleton className="h-96 w-full" />
      ) : (
        <CalendarView tasks={items} onOpenTask={setSelectedTask} />
      )}

      <TaskDetailModal task={selectedTask} open={Boolean(selectedTask)} onClose={() => setSelectedTask(null)} />
    </div>
  );
}
