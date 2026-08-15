// src/components/reminders/ReminderForm.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { Input, Select, Textarea } from '../common/FormFields';
import Button from '../common/Button';
import RecurrenceBuilder from './RecurrenceBuilder';
import { reminderSchema } from '../../utils/validationSchemas';
import { CHANNEL_OPTIONS, OFFSET_UNIT_OPTIONS } from '../../utils/constants';

// Reminders can be created without a task due date (absolute time) or, when
// the task has one, relative to it via an offset — mirrors the backend's
// `offset` vs `scheduledTime` split in POST /tasks/:id/reminders.
export default function ReminderForm({ task, onSubmit, onCancel, submitting }) {
  const hasDueDate = Boolean(task?.dueDate);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      channel: 'email',
      scheduleMode: hasDueDate ? 'offset' : 'absolute',
      offsetAmount: 1,
      offsetUnit: 'days',
      scheduledTime: '',
      repeatType: 'none',
      repeatInterval: 1,
      daysOfWeek: [],
      endDate: '',
      message: '',
    },
  });

  const scheduleMode = watch('scheduleMode');

  const submit = (values) => {
    const payload = {
      channel: values.channel,
      message: values.message || undefined,
      repeat: {
        type: values.repeatType,
        interval: values.repeatType === 'custom' ? Number(values.repeatInterval) : undefined,
        daysOfWeek: values.repeatType === 'weekly' ? values.daysOfWeek : undefined,
        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
      },
    };

    if (values.scheduleMode === 'offset') {
      payload.offset = { amount: Number(values.offsetAmount), unit: values.offsetUnit };
    } else {
      payload.scheduledTime = new Date(values.scheduledTime).toISOString();
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <Select label="Send via" id="channel" {...register('channel')}>
        {CHANNEL_OPTIONS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </Select>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">When</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!hasDueDate}
            onClick={() => setValue('scheduleMode', 'offset')}
            className={clsx(
              'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
              scheduleMode === 'offset'
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border text-ink-muted hover:text-ink'
            )}
            title={hasDueDate ? '' : 'This task has no due date to be relative to'}
          >
            Relative to due date
          </button>
          <button
            type="button"
            onClick={() => setValue('scheduleMode', 'absolute')}
            className={clsx(
              'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              scheduleMode === 'absolute'
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border text-ink-muted hover:text-ink'
            )}
          >
            Specific date &amp; time
          </button>
        </div>

        {scheduleMode === 'offset' ? (
          <div className="flex items-end gap-2">
            <Input
              label="Amount"
              id="offsetAmount"
              type="number"
              min={1}
              className="w-24"
              error={errors.offsetAmount?.message}
              {...register('offsetAmount')}
            />
            <Select id="offsetUnit" className="mb-[1px]" {...register('offsetUnit')}>
              {OFFSET_UNIT_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </Select>
            <span className="pb-2 text-sm text-ink-muted">before due date</span>
          </div>
        ) : (
          <Input
            id="scheduledTime"
            type="datetime-local"
            error={errors.scheduledTime?.message}
            {...register('scheduledTime')}
          />
        )}
      </div>

      <RecurrenceBuilder register={register} watch={watch} setValue={setValue} errors={errors} />

      <Textarea
        label="Custom message (optional)"
        id="message"
        placeholder={`Reminder: "${task?.title || 'your task'}" is due soon`}
        error={errors.message?.message}
        {...register('message')}
      />

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Schedule reminder
        </Button>
      </div>
    </form>
  );
}
