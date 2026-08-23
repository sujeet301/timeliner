// src/components/tasks/TaskForm.jsx
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X, GripVertical } from 'lucide-react';
import { Input, Textarea, Select } from '../common/FormFields';
import Button from '../common/Button';
import { taskSchema } from '../../utils/validationSchemas';
import { PRIORITY_OPTIONS } from '../../utils/constants';
import { toDateTimeLocalValue } from '../../utils/dateHelpers';

export default function TaskForm({ initialTask, onSubmit, onCancel, submitting }) {
  const isEdit = Boolean(initialTask);
  const [subtasks, setSubtasks] = useState(
    initialTask?.subtasks?.map((s) => ({ ...s })) || []
  );
  const [newSubtask, setNewSubtask] = useState('');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialTask?.title || '',
      description: initialTask?.description || '',
      category: initialTask?.category || '',
      tags: initialTask?.tags?.join(', ') || '',
      priority: initialTask?.priority || 'medium',
      dueDate: toDateTimeLocalValue(initialTask?.dueDate),
    },
  });

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks((prev) => [...prev, { title: newSubtask.trim(), done: false }]);
    setNewSubtask('');
  };

  const removeSubtask = (idx) => setSubtasks((prev) => prev.filter((_, i) => i !== idx));
  const toggleSubtask = (idx) =>
    setSubtasks((prev) => prev.map((s, i) => (i === idx ? { ...s, done: !s.done } : s)));

  const submit = (values) => {
    const payload = {
      title: values.title,
      description: values.description || '',
      category: values.category || 'General',
      tags: values.tags
        ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      priority: values.priority,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
      subtasks,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <Input label="Title" id="title" placeholder="Submit quarterly report" error={errors.title?.message} {...register('title')} />

      <Textarea
        label="Description"
        id="description"
        placeholder="Add any useful detail…"
        error={errors.description?.message}
        {...register('description')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <Select label="Priority" id="priority" {...field}>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          )}
        />
        <Input label="Due date" id="dueDate" type="datetime-local" error={errors.dueDate?.message} {...register('dueDate')} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Category" id="category" placeholder="Work" {...register('category')} />
        <Input label="Tags" id="tags" placeholder="finance, urgent" hint="Comma-separated" {...register('tags')} />
      </div>

      {/* Subtask checklist editor */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">Subtasks</span>
        <div className="flex flex-col gap-1.5">
          {subtasks.map((s, idx) => (
            <div
              key={s._id || idx}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface-alt px-2.5 py-1.5"
            >
              <GripVertical size={14} className="shrink-0 text-ink-muted" />
              <input
                type="checkbox"
                checked={s.done}
                onChange={() => toggleSubtask(idx)}
                className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
              />
              <span className={`flex-1 truncate text-sm ${s.done ? 'text-ink-muted line-through' : 'text-ink'}`}>
                {s.title}
              </span>
              <button
                type="button"
                onClick={() => removeSubtask(idx)}
                aria-label="Remove subtask"
                className="shrink-0 rounded p-0.5 text-ink-muted hover:text-urgent"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSubtask();
              }
            }}
            placeholder="Add a checklist item…"
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button type="button" variant="secondary" size="sm" onClick={addSubtask}>
            <Plus size={14} /> Add
          </Button>
        </div>
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {isEdit ? 'Save changes' : 'Create task'}
        </Button>
      </div>
    </form>
  );
}