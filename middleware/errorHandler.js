import logger from '../logger.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFoundHandler(req, res, next) {
  const err = new AppError(`Endpoint not found: ${req.method} ${req.originalUrl}`, 404);
  next(err);
}

export function globalErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const requestId = req.headers['x-request-id'] || 'req_' + Date.now();

  logger.error('Unhandled or Application Error', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    details: err.details
  });

  res.status(statusCode).json({
    success: false,
    requestId,
    error: err.message || 'Internal Server Error',
    ...(err.details ? { details: err.details } : {})
  });
}
