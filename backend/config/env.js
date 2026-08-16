// config/env.js
// Loads and validates environment variables in one place so the rest of the
// app can `require('../config/env')` and trust that everything it needs
// exists, instead of reading `process.env` (and re-checking for typos)
// all over the codebase.

const dotenv = require('dotenv');
dotenv.config();

// Variables that MUST be present for the app to start safely.
const REQUIRED_VARS = [
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Fail fast and loudly at boot rather than mysteriously later at runtime.
const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error(
    `\n[env] Missing required environment variables: ${missing.join(', ')}\n` +
      '[env] Copy .env.example to .env and fill in real values.\n'
  );
  process.exit(1);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT, 10) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  mongoUri: requireEnv('MONGO_URI'),

  jwt: {
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    refreshCookieMaxAgeMs:
      parseInt(process.env.JWT_REFRESH_COOKIE_MAX_AGE_MS, 10) || 7 * 24 * 60 * 60 * 1000,
  },

  passwordReset: {
    expiresMinutes: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES_MIN, 10) || 30,
  },

  email: {
    from: process.env.EMAIL_FROM || 'Task Reminder <no-reply@taskreminder.app>',
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
  },

  google: {
    // Not in REQUIRED_VARS — Google sign-in is optional. If unset, the
    // /auth/google endpoint responds 501 instead of the server refusing to boot.
    clientId: process.env.GOOGLE_CLIENT_ID || null,
  },

  leetcode: {
    cronExpression: process.env.LEETCODE_REMINDER_CRON_EXPRESSION || '*/15 * * * *',
  },

  scheduler: {
    cronExpression: process.env.REMINDER_CRON_EXPRESSION || '* * * * *',
    maxAttempts: parseInt(process.env.REMINDER_MAX_ATTEMPTS, 10) || 3,
  },

  rateLimit: {
    authWindowMin: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MIN, 10) || 15,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
  },
};
