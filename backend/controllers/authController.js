// controllers/authController.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const { OAuth2Client } = require('google-auth-library');
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
const { hasSolvedSince, fetchUserStats, fetchRecentAcceptedSubmissions, fetchDailyChallenge } = require('../services/leetcodeService');
const { isValidTimezone, startOfTodayUtc } = require('../utils/timezone');
const { parseSubmissionCalendar, computeStreaks } = require('../utils/leetcodeStats');

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
  if (existing) throw new ApiError(409, 'An account with that email already exists');

  const user = await User.create({ name, email, password, phone });
  const accessToken = await issueTokens(user, res);

  sendEmail({ to: user.email, subject: 'Welcome to Task Reminder', text: `Hi ${user.name}, your account has been created successfully.` }).catch(
    (err) => console.warn('[authController] welcome email failed:', err.message)
  );

  res.status(201).json({ success: true, data: { user: user.toSafeJSON(), accessToken } });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !user.password || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  const accessToken = await issueTokens(user, res);
  res.json({ success: true, data: { user: user.toSafeJSON(), accessToken } });
});

let googleClient = null;
function getGoogleClient() {
  if (!env.google.clientId) return null;
  if (!googleClient) googleClient = new OAuth2Client(env.google.clientId);
  return googleClient;
}

// POST /api/auth/google
const googleLogin = asyncHandler(async (req, res) => {
  const client = getGoogleClient();
  if (!client) throw new ApiError(501, 'Google sign-in is not configured on this server');

  const { credential } = req.body;
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: env.google.clientId });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, 'Invalid Google credential');
  }

  if (!payload?.email) throw new ApiError(401, 'Google credential did not include an email address');
  if (!payload.email_verified) throw new ApiError(401, "Google reports this account's email is not verified");

  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] });

  if (!user) {
    user = await User.create({
      name: payload.name || payload.email.split('@')[0],
      email: payload.email,
      googleId: payload.sub,
      avatar: payload.picture || null,
      isVerified: true,
    });
  } else if (!user.googleId) {
    user.googleId = payload.sub;
    user.isVerified = true;
    if (!user.avatar) user.avatar = payload.picture || null;
    await user.save({ validateBeforeSave: false });
  }

  const accessToken = await issueTokens(user, res);
  res.json({ success: true, data: { user: user.toSafeJSON(), accessToken } });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies || {};
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, env.jwt.refreshSecret);
      await User.findByIdAndUpdate(decoded.sub, { $unset: { refreshTokenHash: 1 } });
    } catch {
      // invalid/expired — nothing to revoke
    }
  }
  clearRefreshTokenCookie(res);
  res.json({ success: true, message: 'Logged out' });
});

// POST /api/auth/refresh-token
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

  const accessToken = await issueTokens(user, res);
  res.json({ success: true, data: { accessToken } });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeJSON() } });
});

// PUT /api/auth/profile
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
  const genericResponse = { success: true, message: 'If an account with that email exists, a reset link has been sent.' };
  if (!user) return res.json(genericResponse);

  const rawToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  const resetUrl = `${env.clientOrigins[0]}/reset-password?token=${rawToken}`;

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
  const user = await User.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpires: { $gt: new Date() } }).select(
    '+passwordResetTokenHash +passwordResetExpires'
  );
  if (!user) throw new ApiError(400, 'Password reset token is invalid or has expired');

  user.password = password;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokenHash = undefined;
  await user.save();

  res.json({ success: true, message: 'Password has been reset. Please log in again.' });
});

// POST /api/auth/request-otp
const requestPhoneOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) throw new ApiError(400, 'Phone number is required');

  const user = await User.findById(req.user._id);
  if (user.phone !== phone) user.phoneVerified = false;
  user.phone = phone;
  const otp = user.createOtp();
  await user.save({ validateBeforeSave: false });

  await sendSMS({ to: phone, body: `Your Task Reminder verification code is ${otp}` });
  res.json({ success: true, message: 'OTP sent' });
});

// POST /api/auth/verify-otp
const verifyOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const user = await User.findById(req.user._id).select('+otpCodeHash +otpExpires +otpAttempts');

  if (!user.otpCodeHash || !user.otpExpires || user.otpExpires < new Date()) {
    throw new ApiError(400, 'No valid OTP request found — please request a new code');
  }
  if (user.otpAttempts >= 5) throw new ApiError(429, 'Too many incorrect attempts — please request a new code');

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

// PUT /api/auth/leetcode-settings
const updateLeetcodeSettings = asyncHandler(async (req, res) => {
  const { username, enabled, reminderTimes, activeDays, timezone } = req.body;
  const user = await User.findById(req.user._id);

  if (username !== undefined) user.leetcode.username = username || null;
  if (enabled !== undefined) user.leetcode.enabled = enabled;
  if (reminderTimes !== undefined) user.leetcode.reminderTimes = reminderTimes;
  if (activeDays !== undefined) user.leetcode.activeDays = activeDays;
  if (timezone !== undefined) {
    if (!isValidTimezone(timezone)) throw new ApiError(400, 'Unrecognized timezone');
    user.leetcode.timezone = timezone;
  }
  user.leetcode.lastHandledDate = null;
  user.leetcode.handledTimesToday = [];

  await user.save({ validateBeforeSave: false });
  res.json({ success: true, data: { user: user.toSafeJSON() } });
});

// GET /api/auth/leetcode-status
const getLeetcodeStatus = asyncHandler(async (req, res) => {
  const { username, timezone } = req.user.leetcode;
  if (!username) throw new ApiError(400, 'Set a LeetCode username first');
  const tz = timezone || 'UTC';

  const [solvedTodayResult, statsResult, recentResult, challengeResult] = await Promise.allSettled([
    hasSolvedSince(username, startOfTodayUtc(tz)),
    fetchUserStats(username),
    fetchRecentAcceptedSubmissions(username, 5),
    fetchDailyChallenge(),
  ]);

  if (solvedTodayResult.status === 'rejected') {
    throw new ApiError(502, `Could not reach LeetCode: ${solvedTodayResult.reason.message}`);
  }

  let solvedByDifficulty = null;
  let streaks = { currentStreak: 0, longestStreak: 0 };
  if (statsResult.status === 'fulfilled') {
    solvedByDifficulty = statsResult.value.solvedByDifficulty;
    streaks = computeStreaks(parseSubmissionCalendar(statsResult.value.submissionCalendarRaw));
  }

  res.json({
    success: true,
    data: {
      solvedToday: solvedTodayResult.value,
      solvedByDifficulty,
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
      recentSolves: recentResult.status === 'fulfilled' ? recentResult.value : [],
      dailyChallenge: challengeResult.status === 'fulfilled' ? challengeResult.value : null,
    },
  });
});

module.exports = {
  signup,
  login,
  logout,
  googleLogin,
  refreshTokenHandler,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  requestPhoneOtp,
  verifyOtp,
  updateLeetcodeSettings,
  getLeetcodeStatus,
};
