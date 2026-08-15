// controllers/taskController.js
const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const Task = require('../models/Task');
const Reminder = require('../models/Reminder');

// GET /api/tasks
// Supports: ?search=&status=&priority=&category=&tag=&sortBy=&order=&page=&limit=
const getTasks = asyncHandler(async (req, res) => {
  const {
    search,
    status,
    priority,
    category,
    tag,
    sortBy = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 20,
  } = req.query;

  const query = { user: req.user._id, isDeleted: false };

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (category) query.category = category;
  if (tag) query.tags = tag.toLowerCase();
  if (search) query.$text = { $search: search };

  const allowedSortFields = ['createdAt', 'dueDate', 'priority', 'title', 'status'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const sortDir = order === 'asc' ? 1 : -1;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const [tasks, total] = await Promise.all([
    Task.find(query)
      .sort({ [sortField]: sortDir })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Task.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: tasks,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// GET /api/tasks/trash — soft-deleted tasks, for the "restore" UI
const getTrash = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ user: req.user._id, isDeleted: true }).sort({ deletedAt: -1 });
  res.json({ success: true, data: tasks });
});

// GET /api/tasks/:id
const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id, isDeleted: false });
  if (!task) throw new ApiError(404, 'Task not found');
  res.json({ success: true, data: task });
});

// POST /api/tasks
const createTask = asyncHandler(async (req, res) => {
  const { title, description, category, tags, priority, dueDate, subtasks } = req.body;

  const task = await Task.create({
    user: req.user._id,
    title,
    description,
    category,
    tags,
    priority,
    dueDate,
    subtasks,
  });

  res.status(201).json({ success: true, data: task });
});

// Keeps completedAt in sync whenever status changes — set on transition
// into 'completed', cleared on transition out of it. Shared by updateTask
// (PUT) and updateTaskStatus (PATCH) so both endpoints behave identically.
function applyStatus(task, newStatus) {
  if (newStatus === task.status) return;
  if (newStatus === 'completed') {
    task.completedAt = new Date();
  } else if (task.status === 'completed') {
    task.completedAt = null;
  }
  task.status = newStatus;
}

// PUT /api/tasks/:id
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id, isDeleted: false });
  if (!task) throw new ApiError(404, 'Task not found');

  const editableFields = [
    'title',
    'description',
    'category',
    'tags',
    'priority',
    'dueDate',
    'subtasks', // full replace — lets the client add/remove checklist items, not just toggle one
  ];
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) task[field] = req.body[field];
  });
  if (req.body.status !== undefined) applyStatus(task, req.body.status);

  await task.save();
  res.json({ success: true, data: task });
});

// PATCH /api/tasks/:id/status
const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id, isDeleted: false });
  if (!task) throw new ApiError(404, 'Task not found');

  applyStatus(task, status);
  await task.save();
  res.json({ success: true, data: task });
});

// PATCH /api/tasks/:id/subtasks/:subtaskId
const updateSubtask = asyncHandler(async (req, res) => {
  const { id, subtaskId } = req.params;
  const { title, done } = req.body;

  const task = await Task.findOne({ _id: id, user: req.user._id, isDeleted: false });
  if (!task) throw new ApiError(404, 'Task not found');

  const subtask = task.subtasks.id(subtaskId);
  if (!subtask) throw new ApiError(404, 'Subtask not found');

  if (title !== undefined) subtask.title = title;
  if (done !== undefined) subtask.done = done;

  await task.save();
  res.json({ success: true, data: task });
});

// DELETE /api/tasks/:id  — soft delete (moves to trash)
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id, isDeleted: false });
  if (!task) throw new ApiError(404, 'Task not found');

  task.softDelete();
  await task.save();

  // Cancel any pending reminders tied to this task so the scheduler skips them.
  await Reminder.updateMany(
    { task: task._id, status: 'pending' },
    { $set: { status: 'cancelled' } }
  );

  res.json({ success: true, message: 'Task moved to trash', data: task });
});

// PATCH /api/tasks/:id/restore
const restoreTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id, isDeleted: true });
  if (!task) throw new ApiError(404, 'Task not found in trash');

  task.restore();
  await task.save();
  res.json({ success: true, data: task });
});

// DELETE /api/tasks/:id/permanent — permanent delete, only from trash
const permanentlyDeleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id, isDeleted: true });
  if (!task) throw new ApiError(404, 'Task not found in trash');

  await Reminder.deleteMany({ task: task._id });
  await task.deleteOne();

  res.json({ success: true, message: 'Task permanently deleted' });
});

module.exports = {
  getTasks,
  getTrash,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  updateSubtask,
  deleteTask,
  restoreTask,
  permanentlyDeleteTask,
};
