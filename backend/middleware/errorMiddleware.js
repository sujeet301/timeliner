// middleware/errorMiddleware.js
const env = require('../config/env');

// Catches requests to routes that don't exist and forwards a 404 into
// the error handler below, so every error (known or not) has one shape.
function notFound(req, res, next) {
  const err = new Error(`Route not found — ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
}

// Must be registered LAST, after all routes. Express recognizes it as an
// error handler because it takes 4 arguments.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  }

  // Mongoose duplicate key (e.g. email already registered)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `${field} already in use` : 'Duplicate value';
  }

  if (statusCode === 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details,
    // Never leak stack traces in production responses.
    stack: env.isProduction ? undefined : err.stack,
  });
}

module.exports = { notFound, errorHandler };
