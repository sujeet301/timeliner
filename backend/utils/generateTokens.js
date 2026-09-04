// utils/generateTokens.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

function generateAccessToken(userId) {
  return jwt.sign({ sub: userId.toString() }, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn });
}

function generateRefreshToken(userId) {
  return jwt.sign({ sub: userId.toString() }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Cookie attributes depend on the deployment shape:
//   - In production, frontend and backend are commonly on different
//     origins. A cookie sent on a cross-site XHR/fetch request MUST be
//     `SameSite=None; Secure` — `Strict`/`Lax` are never sent back on
//     cross-site requests at all.
//   - Locally, frontend/backend are different ports but the same site, so
//     `Lax` over plain HTTP works fine.
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/api/auth',
  };
}

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, { ...refreshCookieOptions(), maxAge: env.jwt.refreshCookieMaxAgeMs });
}

function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', refreshCookieOptions());
}

module.exports = { generateAccessToken, generateRefreshToken, hashToken, setRefreshTokenCookie, clearRefreshTokenCookie };
