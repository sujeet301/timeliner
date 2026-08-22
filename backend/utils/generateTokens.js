// utils/generateTokens.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

// Short-lived token sent in the JSON response body and used in the
// `Authorization: Bearer <token>` header for protected requests.
function generateAccessToken(userId) {
  return jwt.sign({ sub: userId.toString() }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });
}

// Long-lived token stored ONLY in an httpOnly cookie (never readable by JS
// in the browser, which mitigates XSS token theft). We also persist a hash
// of it on the User document so it can be revoked on logout/refresh.
function generateRefreshToken(userId) {
  return jwt.sign({ sub: userId.toString() }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Cookie attributes depend on the deployment shape:
//   - In production, the frontend and backend are commonly on different
//     origins entirely (e.g. two separate Render/Vercel/Netlify services).
//     A cookie sent on a cross-site XHR/fetch request MUST be
//     `SameSite=None; Secure` — `Strict` or `Lax` are silently never sent
//     back on cross-site requests at all, which looks exactly like "the
//     refresh token doesn't exist" (a 401 on every refresh attempt) even
//     though login succeeded and the cookie was nominally set.
//   - Locally, frontend (localhost:5173) and backend (localhost:5000) are
//     different ports but the same site, so `Lax` over plain HTTP works
//     fine and doesn't require HTTPS.
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction, // Secure is REQUIRED whenever sameSite is 'none'
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/api/auth', // only sent to auth routes (refresh/logout)
  };
}

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    ...refreshCookieOptions(),
    maxAge: env.jwt.refreshCookieMaxAgeMs,
  });
}

function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', refreshCookieOptions());
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
};
