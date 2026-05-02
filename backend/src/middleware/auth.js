const jwt = require('jsonwebtoken');
const config = require('../config');
const { withUserContext } = require('../db/pool');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

function authenticate(req, res, next) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    req.ctx = { role: 'app' };
    return next();
  }

  try {
    const payload = jwt.verify(match[1], config.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    });
    // payload: { sub: <uuid>, role: 'user'|'moderator', iat, exp }
    req.ctx = {
      userId: payload.sub,
      role: payload.role === 'moderator' ? 'moderator' : 'user',
    };
    return next();
  } catch (err) {
    logger.debug({ err: err.message }, 'JWT verify failed');
    req.ctx = { role: 'app' };
    return next();
  }
}

function requireAuth(req, res, next) {
  if (!req.ctx?.userId) {
    return next(new UnauthorizedError('Authentication required'));
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.ctx?.userId) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (req.ctx.role !== role) {
      return next(new ForbiddenError(`Role '${role}' required`));
    }
    next();
  };
}

function dbHandler(fn) {
  return async (req, res, next) => {
    try {
      const result = await withUserContext(req.ctx, (client) => fn(client, req, res));
      if (!res.headersSent) {
        res.json(result);
      }
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { authenticate, requireAuth, requireRole, dbHandler };
