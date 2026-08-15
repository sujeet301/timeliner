// utils/ApiError.js
// A small typed error so controllers can `throw new ApiError(404, 'Task not found')`
// and the central error middleware knows exactly what status/message to send,
// instead of every route hand-rolling res.status(...).json(...) on failure paths.
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // distinguishes expected errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
