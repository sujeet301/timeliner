// routes/reminderRoutes.js
const express = require('express');
const { body, param } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const reminderCtrl = require('../controllers/reminderController');

const router = express.Router();

router.use(protect);

router.put(
  '/:id',
  [
    param('id').isMongoId(),
    body('channel').optional().isIn(['email', 'sms', 'both', 'push']),
    body('scheduledTime').optional().isISO8601(),
    body('offset').optional().isObject(),
    body('repeat.type').optional().isIn(['none', 'daily', 'weekly', 'monthly', 'custom']),
  ],
  validate,
  reminderCtrl.updateReminder
);

router.delete('/:id', param('id').isMongoId(), validate, reminderCtrl.deleteReminder);

router.patch(
  '/:id/snooze',
  [
    param('id').isMongoId(),
    body('minutes').optional().isInt({ min: 1 }),
    body('until').optional().isISO8601(),
  ],
  validate,
  reminderCtrl.snoozeReminder
);

module.exports = router;
