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

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.isProduction, // requires HTTPS in production
    sameSite: 'strict',
    maxAge: env.jwt.refreshCookieMaxAgeMs,
    path: '/api/auth', // only sent to auth routes (refresh/logout)
  });
}

function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', { path: '/api/auth' });
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
};
