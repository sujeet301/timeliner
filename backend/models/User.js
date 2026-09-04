// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: { type: String, trim: true, default: null },
    password: {
      type: String,
      // Not required for Google-only accounts — see googleId below.
      required: function passwordRequired() {
        return !this.googleId;
      },
      minlength: 8,
      select: false,
    },
    avatar: { type: String, default: null },

    // --- Google Sign-In ---
    googleId: { type: String, default: null, unique: true, sparse: true },

    // --- Email verification ---
    isVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },

    // --- Phone verification (OTP) ---
    phoneVerified: { type: Boolean, default: false },
    otpCodeHash: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },

    // --- Password reset ---
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // --- Refresh token rotation ---
    refreshTokenHash: { type: String, select: false },

    notificationPrefs: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
    },

    // --- LeetCode daily-practice reminder ---
    leetcode: {
      username: { type: String, default: null, trim: true },
      enabled: { type: Boolean, default: false },
      reminderTimes: {
        type: [String],
        default: ['20:00'],
        validate: {
          validator: (arr) => arr.every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)),
          message: 'Each reminder time must be in 24h HH:mm format',
        },
      },
      activeDays: {
        type: [Number],
        default: [],
        validate: {
          validator: (arr) => arr.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
          message: 'activeDays values must be integers between 0 (Sun) and 6 (Sat)',
        },
      },
      timezone: { type: String, default: 'UTC' },
      lastHandledDate: { type: String, default: null },
      handledTimesToday: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const env = require('../config/env');
  this.passwordResetExpires = new Date(Date.now() + env.passwordReset.expiresMinutes * 60 * 1000);
  return rawToken;
};

userSchema.methods.createOtp = function createOtp() {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  this.otpCodeHash = crypto.createHash('sha256').update(otp).digest('hex');
  this.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  this.otpAttempts = 0;
  return otp;
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    avatar: this.avatar,
    isVerified: this.isVerified,
    phoneVerified: this.phoneVerified,
    hasGoogleAuth: Boolean(this.googleId),
    notificationPrefs: this.notificationPrefs,
    leetcode: this.leetcode,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
