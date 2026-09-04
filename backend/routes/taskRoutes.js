// routes/taskRoutes.js
const express = require('express');
const { body, param } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const taskCtrl = require('../controllers/taskController');
const reminderCtrl = require('../controllers/reminderController');

const router = express.Router();
router.use(protect);

router.get('/trash', taskCtrl.getTrash);

router
  .route('/')
  .get(taskCtrl.getTasks)
  .post(
    [
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('priority').optional().isIn(['low', 'medium', 'high']),
      body('dueDate').optional().isISO8601().withMessage('dueDate must be a valid date'),
      body('tags').optional().isArray(),
    ],
    validate,
    taskCtrl.createTask
  );

router
  .route('/:id')
  .get(param('id').isMongoId(), validate, taskCtrl.getTaskById)
  .put(
    [
      param('id').isMongoId(),
      body('priority').optional().isIn(['low', 'medium', 'high']),
      body('status').optional().isIn(['pending', 'in-progress', 'completed']),
      body('dueDate').optional().isISO8601(),
    ],
    validate,
    taskCtrl.updateTask
  )
  .delete(param('id').isMongoId(), validate, taskCtrl.deleteTask);

router.patch(
  '/:id/status',
  [param('id').isMongoId(), body('status').isIn(['pending', 'in-progress', 'completed']).withMessage('Invalid status')],
  validate,
  taskCtrl.updateTaskStatus
);

router.patch('/:id/restore', param('id').isMongoId(), validate, taskCtrl.restoreTask);
router.delete('/:id/permanent', param('id').isMongoId(), validate, taskCtrl.permanentlyDeleteTask);

router.patch(
  '/:id/subtasks/:subtaskId',
  [param('id').isMongoId(), param('subtaskId').isMongoId()],
  validate,
  taskCtrl.updateSubtask
);

router.get('/:id/reminders', param('id').isMongoId(), validate, reminderCtrl.getRemindersForTask);

router.post(
  '/:id/reminders',
  [
    param('id').isMongoId(),
    body('channel').isIn(['email', 'sms', 'both', 'push']).withMessage('Invalid channel'),
    body('offset').optional().isObject(),
    body('offset.amount').if(body('offset').exists()).isInt({ min: 1 }),
    body('offset.unit').if(body('offset').exists()).isIn(['minutes', 'hours', 'days', 'weeks']),
    body('scheduledTime').optional().isISO8601(),
    body('repeat.type').optional().isIn(['none', 'daily', 'weekly', 'monthly', 'custom']),
  ],
  validate,
  reminderCtrl.createReminder
);

module.exports = router;
