// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false, // never returned by default on queries
    },
    avatar: {
      type: String, // URL to an image
      default: null,
    },

    // --- Email verification ---
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifyToken: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },

    // --- Phone verification (OTP), relevant since SMS reminders need a trusted number ---
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    otpCodeHash: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },

    // --- Password reset ---
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // --- Refresh token rotation ---
    // We store a hash of the current valid refresh token so /logout and
    // /refresh-token can invalidate old tokens instead of trusting any
    // token that is merely well-signed.
    refreshTokenHash: { type: String, select: false },

    notificationPrefs: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// ---------- Hooks ----------
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ---------- Instance methods ----------
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Generates a random reset token, stores only its SHA-256 hash on the
// document (so a leaked DB doesn't leak usable tokens), and returns the
// plaintext token to be emailed to the user.
userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const env = require('../config/env');
  this.passwordResetExpires = new Date(
    Date.now() + env.passwordReset.expiresMinutes * 60 * 1000
  );
  return rawToken;
};

userSchema.methods.createOtp = function createOtp() {
  const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
  this.otpCodeHash = crypto.createHash('sha256').update(otp).digest('hex');
  this.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
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
    notificationPrefs: this.notificationPrefs,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
