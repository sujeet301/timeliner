// middleware/errorMiddleware.js
const env = require('../config/env');

function notFound(req, res, next) {
  const err = new Error(`Route not found — ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
}

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  }
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `${field} already in use` : 'Duplicate value';
  }
  if (statusCode === 500) console.error('[error]', err);

  res.status(statusCode).json({ success: false, message, details, stack: env.isProduction ? undefined : err.stack });
}

module.exports = { notFound, errorHandler };
