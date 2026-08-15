// src/components/tasks/TaskDetailModal.jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import Modal from '../common/Modal';
import TaskForm from './TaskForm';
import ReminderForm from '../reminders/ReminderForm';
import ReminderList from '../reminders/ReminderList';
import Button from '../common/Button';
import { LineSkeleton } from '../common/Skeletons';
import { updateTask } from '../../redux/taskSlice';
import {
  fetchReminders,
  createReminder,
  snoozeReminder,
  cancelReminder,
} from '../../redux/reminderSlice';

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'reminders', label: 'Reminders' },
];

export default function TaskDetailModal({ task, open, onClose }) {
  const dispatch = useDispatch();
  const [tab, setTab] = useState('details');
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);

  const reminders = useSelector((s) => (task ? s.reminders.byTaskId[task._id] : undefined));
  const reminderStatus = useSelector((s) => s.reminders.status);

  useEffect(() => {
    if (open && task && tab === 'reminders') {
      dispatch(fetchReminders(task._id));
    }
  }, [open, task, tab, dispatch]);

  useEffect(() => {
    if (!open) {
      setTab('details');
      setShowReminderForm(false);
    }
  }, [open]);

  if (!task) return null;

  const handleSaveTask = async (payload) => {
    setSavingTask(true);
    try {
      await dispatch(updateTask({ id: task._id, payload })).unwrap();
      onClose();
    } catch {
      // errors are surfaced via toast in the thunk
    } finally {
      setSavingTask(false);
    }
  };

  const handleCreateReminder = async (payload) => {
    setSavingReminder(true);
    try {
      await dispatch(createReminder({ taskId: task._id, payload })).unwrap();
      setShowReminderForm(false);
    } catch {
      // toast already shown
    } finally {
      setSavingReminder(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={task.title} size="lg">
      <div className="mb-5 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <TaskForm initialTask={task} onSubmit={handleSaveTask} onCancel={onClose} submitting={savingTask} />
      )}

      {tab === 'reminders' && (
        <div className="flex flex-col gap-4">
          {!showReminderForm && (
            <Button variant="secondary" size="sm" className="self-start" onClick={() => setShowReminderForm(true)}>
              <Plus size={14} /> Add reminder
            </Button>
          )}

          {showReminderForm && (
            <div className="rounded-lg border border-border p-3">
              <ReminderForm
                task={task}
                submitting={savingReminder}
                onSubmit={handleCreateReminder}
                onCancel={() => setShowReminderForm(false)}
              />
            </div>
          )}

          {reminderStatus === 'loading' && !reminders ? (
            <div className="flex flex-col gap-2">
              <LineSkeleton className="h-12 w-full" />
              <LineSkeleton className="h-12 w-full" />
            </div>
          ) : (
            <ReminderList
              reminders={reminders}
              onSnooze={(id, payload) => dispatch(snoozeReminder({ id, taskId: task._id, payload }))}
              onCancel={(id) => dispatch(cancelReminder({ id, taskId: task._id }))}
            />
          )}
        </div>
      )}
    </Modal>
  );
}
