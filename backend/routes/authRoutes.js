// routes/authRoutes.js
const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { validate } = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/authController');

const router = express.Router();

// Stricter limiter on auth endpoints to slow down credential-stuffing / brute force.
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

module.exports = router;
