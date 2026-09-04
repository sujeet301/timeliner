// routes/authRoutes.js
const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { validate } = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/authController');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: env.rateLimit.authWindowMin * 60 * 1000,
  max: env.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

router.post(
  '/signup',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('phone').optional().isString(),
  ],
  validate,
  ctrl.signup
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  ctrl.login
);

router.post(
  '/google',
  authLimiter,
  [body('credential').notEmpty().withMessage('Google credential is required')],
  validate,
  ctrl.googleLogin
);

router.post('/logout', ctrl.logout);
router.post('/refresh-token', ctrl.refreshTokenHandler);
router.get('/me', protect, ctrl.getMe);

router.put(
  '/profile',
  protect,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('notificationPrefs.email').optional().isBoolean(),
    body('notificationPrefs.sms').optional().isBoolean(),
  ],
  validate,
  ctrl.updateProfile
);

router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  validate,
  ctrl.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  ctrl.resetPassword
);

router.post(
  '/request-otp',
  protect,
  [body('phone').notEmpty().withMessage('Phone number is required')],
  validate,
  ctrl.requestPhoneOtp
);

router.post(
  '/verify-otp',
  protect,
  [body('otp').notEmpty().withMessage('OTP is required')],
  validate,
  ctrl.verifyOtp
);

router.put(
  '/leetcode-settings',
  protect,
  [
    body('username').optional({ nullable: true }).isString().trim(),
    body('enabled').optional().isBoolean(),
    body('reminderTimes').optional().isArray({ min: 1 }).withMessage('Provide at least one reminder time'),
    body('reminderTimes.*')
      .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
      .withMessage('Each reminder time must be in 24h HH:mm format'),
    body('activeDays').optional().isArray(),
    body('activeDays.*').isInt({ min: 0, max: 6 }).withMessage('activeDays values must be 0 (Sun) through 6 (Sat)'),
    body('timezone').optional().isString(),
  ],
  validate,
  ctrl.updateLeetcodeSettings
);

router.get('/leetcode-status', protect, ctrl.getLeetcodeStatus);

module.exports = router;
