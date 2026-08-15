// controllers/authController.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require('../utils/generateTokens');
const { sendEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');

// Issues a fresh access+refresh token pair, persists the refresh token hash
// on the user (so it can be revoked), and sets the refresh cookie.
async function issueTokens(user, res) {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshTokenHash = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  setRefreshTokenCookie(res, refreshToken);
  return accessToken;
}

// POST /api/auth/signup
const signup = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'An account with that email already exists');
  }

  const user = await User.create({ name, email, password, phone });

  const accessToken = await issueTokens(user, res);

  // Best-effort welcome email; failure here shouldn't block signup.
  sendEmail({
    to: user.email,
    subject: 'Welcome to Task Reminder',
    text: `Hi ${user.name}, your account has been created successfully.`,
  }).catch((err) => console.warn('[authController] welcome email failed:', err.message));

  res.status(201).json({
    success: true,
    data: { user: user.toSafeJSON(), accessToken },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const accessToken = await issueTokens(user, res);

  res.json({
    success: true,
    data: { user: user.toSafeJSON(), accessToken },
  });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies || {};

  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, env.jwt.refreshSecret);
      await User.findByIdAndUpdate(decoded.sub, { $unset: { refreshTokenHash: 1 } });
    } catch {
      // Token invalid/expired — nothing to revoke, fall through to clearing the cookie.
    }
  }

  clearRefreshTokenCookie(res);
  res.json({ success: true, message: 'Logged out' });
});

// POST /api/auth/refresh-token
// Reads the httpOnly refresh cookie, validates it against the hash stored on
// the user (so a previously-logged-out/rotated token is rejected even if the
// JWT signature still checks out), and issues a brand new token pair.
const refreshTokenHandler = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies || {};
  if (!refreshToken) throw new ApiError(401, 'No refresh token provided');

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.sub).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash || user.refreshTokenHash !== hashToken(refreshToken)) {
    throw new ApiError(401, 'Refresh token has been revoked');
  }

  const accessToken = await issueTokens(user, res); // rotates the refresh token too

  res.json({ success: true, data: { accessToken } });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeJSON() } });
});

// PUT /api/auth/profile
// Updates the display name and/or notification channel preferences.
// Phone number changes are intentionally NOT accepted here — they go
// through request-otp/verify-otp so a number is never trusted for SMS
// reminders without being verified first.
const updateProfile = asyncHandler(async (req, res) => {
  const { name, notificationPrefs } = req.body;
  const user = await User.findById(req.user._id);

  if (name !== undefined) user.name = name;
  if (notificationPrefs !== undefined) {
    user.notificationPrefs = {
      email: notificationPrefs.email ?? user.notificationPrefs.email,
      sms: notificationPrefs.sms ?? user.notificationPrefs.sms,
    };
  }

  await user.save({ validateBeforeSave: false });
  res.json({ success: true, data: { user: user.toSafeJSON() } });
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always respond the same way whether or not the account exists, so this
  // endpoint can't be used to enumerate registered emails.
  const genericResponse = {
    success: true,
    message: 'If an account with that email exists, a reset link has been sent.',
  };

  if (!user) return res.json(genericResponse);

  const rawToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${env.clientOrigin}/reset-password?token=${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Reset your password',
    text: `Reset your password using this link (valid for ${env.passwordReset.expiresMinutes} minutes): ${resetUrl}`,
  }).catch((err) => console.warn('[authController] reset email failed:', err.message));

  res.json(genericResponse);
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpires');

  if (!user) throw new ApiError(400, 'Password reset token is invalid or has expired');

  user.password = password; // pre-save hook re-hashes it
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokenHash = undefined; // force re-login on all devices
  await user.save();

  res.json({ success: true, message: 'Password has been reset. Please log in again.' });
});

// POST /api/auth/verify-otp
// Two-step flow: authenticated user first requests an OTP be sent to their
// phone (below), then confirms it here to mark the phone as verified — a
// prerequisite for relying on that number for SMS reminders.
const requestPhoneOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) throw new ApiError(400, 'Phone number is required');

  const user = await User.findById(req.user._id);
  if (user.phone !== phone) {
    // A changed number can't inherit the old number's verified status.
    user.phoneVerified = false;
  }
  user.phone = phone;
  const otp = user.createOtp();
  await user.save({ validateBeforeSave: false });

  await sendSMS({ to: phone, body: `Your Task Reminder verification code is ${otp}` });

  res.json({ success: true, message: 'OTP sent' });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const user = await User.findById(req.user._id).select(
    '+otpCodeHash +otpExpires +otpAttempts'
  );

  if (!user.otpCodeHash || !user.otpExpires || user.otpExpires < new Date()) {
    throw new ApiError(400, 'No valid OTP request found — please request a new code');
  }

  if (user.otpAttempts >= 5) {
    throw new ApiError(429, 'Too many incorrect attempts — please request a new code');
  }

  const candidateHash = crypto.createHash('sha256').update(String(otp)).digest('hex');
  if (candidateHash !== user.otpCodeHash) {
    user.otpAttempts += 1;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(400, 'Incorrect OTP');
  }

  user.phoneVerified = true;
  user.otpCodeHash = undefined;
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'Phone number verified' });
});

module.exports = {
  signup,
  login,
  logout,
  refreshTokenHandler,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  requestPhoneOtp,
  verifyOtp,
};
