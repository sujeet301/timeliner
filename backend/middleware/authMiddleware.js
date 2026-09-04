// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) throw new ApiError(401, 'Not authorized — no access token provided');

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwt.accessSecret);
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Access token expired' : 'Not authorized — invalid access token';
    throw new ApiError(401, message);
  }

  const user = await User.findById(decoded.sub);
  if (!user) throw new ApiError(401, 'Not authorized — user no longer exists');

  req.user = user;
  next();
});

module.exports = { protect };
