const { ZodError } = require('zod');
const { AppError } = require('../utils/errors');
const config = require('../config');
const logger = require('../utils/logger');

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  if (err instanceof AppError) {
    const body = {
      error: err.message,
      code: err.code,
    };
    if (err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  if (err.code) {
    // unique_violation
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'Resource already exists',
        code: 'DUPLICATE',
        detail: config.isDev ? err.detail : undefined,
      });
    }
    // foreign_key_violation
    if (err.code === '23503') {
      return res.status(400).json({
        error: 'Referenced resource does not exist',
        code: 'FK_VIOLATION',
      });
    }
    // check_violation
    if (err.code === '23514') {
      return res.status(400).json({
        error: 'Constraint violation',
        code: 'CHECK_VIOLATION',
        detail: config.isDev ? err.detail : undefined,
      });
    }
    // insufficient_privilege (RLS / REVOKE)
    if (err.code === '42501') {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'FORBIDDEN',
      });
    }
  }

  logger.error({ err, url: req.originalUrl, method: req.method }, 'Unhandled error');

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(config.isDev && { stack: err.stack }),
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route ${req.method} ${req.originalUrl} not found`,
    code: 'NOT_FOUND',
  });
}

module.exports = { errorHandler, notFoundHandler };
