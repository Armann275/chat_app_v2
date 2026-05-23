import { AppError } from '../errors/errors.js';
import { logger } from '../config/logger.js';

export function notFoundHandler(req, _res, next) {
  next(new (class extends AppError {
    constructor() {
      super(`Route not found: ${req.method} ${req.originalUrl}`, {
        statusCode: 404,
        code: 'ROUTE_NOT_FOUND',
      });
    }
  })());
}

export function errorHandler(err, req, res, _next) {
  const correlationId = req.id;

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { correlationId, code: err.code, stack: err.stack });
    } else {
      logger.warn(err.message, { correlationId, code: err.code });
    }
    const body = { success: false, code: err.code, message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  logger.error(err.message || 'Unknown error', { correlationId, stack: err.stack });
  return res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
}
