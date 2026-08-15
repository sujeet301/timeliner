// controllers/reminderController.js
const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const Task = require('../models/Task');
const Reminder = require('../models/Reminder');
const { applyOffset } = require('../utils/recurrence');

// Confirms the task exists, isn't deleted, and belongs to the requesting user.
async function getOwnedTask(taskId, userId) {
  const task = await Task.findOne({ _id: taskId, user: userId, isDeleted: false });
  if (!task) throw new ApiError(404, 'Task not found');
  return task;
}

// GET /api/tasks/:id/reminders
const getRemindersForTask = asyncHandler(async (req, res) => {
  await getOwnedTask(req.params.id, req.user._id);
  const reminders = await Reminder.find({ task: req.params.id, user: req.user._id }).sort({
    nextTriggerAt: 1,
  });
  res.json({ success: true, data: reminders });
});

// POST /api/tasks/:id/reminders
// Body: { channel, message?, offset?: {amount, unit}, scheduledTime?, repeat? }
//
// Exactly one of `offset` or `scheduledTime` should be provided:
//   - `offset`        -> reminder fires relative to the task's dueDate (task must have a dueDate)
//   - `scheduledTime`  -> reminder fires at an explicit absolute time
// This lets a single task have multiple reminders — e.g. an "offset: 1 day
// before" reminder AND an "offset: 1 hour before" reminder — matching the
// "multiple reminder offsets per task" requirement.
const createReminder = asyncHandler(async (req, res) => {
  const task = await getOwnedTask(req.params.id, req.user._id);
  const { channel, message, offset, scheduledTime, repeat } = req.body;

  let baseTime;
  if (offset) {
    if (!task.dueDate) {
      throw new ApiError(400, 'Task has no dueDate to compute an offset-based reminder from');
    }
    baseTime = applyOffset(task.dueDate, offset);
  } else if (scheduledTime) {
    baseTime = new Date(scheduledTime);
  } else {
    throw new ApiError(400, 'Provide either "offset" (relative to dueDate) or "scheduledTime"');
  }

  if (Number.isNaN(baseTime.getTime())) {
    throw new ApiError(400, 'Computed/invalid scheduled time');
  }

  const reminder = await Reminder.create({
    task: task._id,
    user: req.user._id,
    channel,
    message,
    offset: offset || null,
    scheduledTime: baseTime,
    nextTriggerAt: baseTime, // the scheduler only ever looks at nextTriggerAt
    repeat: repeat || { type: 'none' },
    status: 'pending',
  });

  res.status(201).json({ success: true, data: reminder });
});

async function getOwnedReminder(reminderId, userId) {
  const reminder = await Reminder.findOne({ _id: reminderId, user: userId });
  if (!reminder) throw new ApiError(404, 'Reminder not found');
  return reminder;
}

// PUT /api/reminders/:id
const updateReminder = asyncHandler(async (req, res) => {
  const reminder = await getOwnedReminder(req.params.id, req.user._id);
  const { channel, message, offset, scheduledTime, repeat, status } = req.body;

  if (channel !== undefined) reminder.channel = channel;
  if (message !== undefined) reminder.message = message;
  if (repeat !== undefined) reminder.repeat = repeat;
  if (status !== undefined) reminder.status = status;

  // Recompute the trigger time if the caller changed how it's scheduled.
  if (offset !== undefined) {
    const task = await Task.findById(reminder.task);
    if (!task || !task.dueDate) {
      throw new ApiError(400, 'Task has no dueDate to compute an offset-based reminder from');
    }
    reminder.offset = offset;
    const newTime = applyOffset(task.dueDate, offset);
    reminder.scheduledTime = newTime;
    reminder.nextTriggerAt = newTime;
  } else if (scheduledTime !== undefined) {
    reminder.offset = null;
    reminder.scheduledTime = new Date(scheduledTime);
    reminder.nextTriggerAt = new Date(scheduledTime);
  }

  await reminder.save();
  res.json({ success: true, data: reminder });
});

// DELETE /api/reminders/:id  (cancels it — keeps history instead of hard-deleting)
const deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await getOwnedReminder(req.params.id, req.user._id);
  reminder.status = 'cancelled';
  await reminder.save();
  res.json({ success: true, message: 'Reminder cancelled', data: reminder });
});

// PATCH /api/reminders/:id/snooze
// Body: { minutes } OR { until: ISO date }
const snoozeReminder = asyncHandler(async (req, res) => {
  const reminder = await getOwnedReminder(req.params.id, req.user._id);
  const { minutes, until } = req.body;

  let newTime;
  if (until) {
    newTime = new Date(until);
  } else if (minutes) {
    newTime = new Date(Date.now() + minutes * 60 * 1000);
  } else {
    throw new ApiError(400, 'Provide either "minutes" or "until" to snooze');
  }

  if (Number.isNaN(newTime.getTime())) {
    throw new ApiError(400, 'Invalid snooze time');
  }

  reminder.nextTriggerAt = newTime;
  reminder.snoozedUntil = newTime;
  reminder.status = 'pending'; // in case it had failed/been cancelled, snoozing reactivates it
  reminder.attempts = 0;
  await reminder.save();

  res.json({ success: true, data: reminder });
});

module.exports = {
  getRemindersForTask,
  createReminder,
  updateReminder,
  deleteReminder,
  snoozeReminder,
};
