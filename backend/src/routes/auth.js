/**
 * routes/auth.js — реєстрація, логін, refresh, logout.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');

const { withUserContext } = require('../db/pool');
const { hashPassword, verifyPassword } = require('../services/passwordService');
const {
  issueTokens,
  findActiveSession,
  revokeSession,
  generateAccessToken,
} = require('../services/tokenService');
const {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
} = require('../validators/schemas');
const { UnauthorizedError, ConflictError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10, 
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later' },
});

/**
 * POST /api/auth/register
 */
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const data = RegisterSchema.parse(req.body);
    const passwordHash = await hashPassword(data.password);

    const result = await withUserContext({ role: 'app' }, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO psyhelp.users (email, password_hash, nickname)
         VALUES ($1, $2, $3)
         RETURNING id, email, nickname, role, created_at`,
        [data.email, passwordHash, data.nickname]
      );
      return rows[0];
    });

    logger.info({ userId: result.id, email: result.email }, 'User registered');

    res.status(201).json({
      user: {
        id: result.id,
        nickname: result.nickname,
        role: result.role,
      },
    });
  } catch (err) {
    if (err.code === '23505') {
      const field = err.detail?.includes('email') ? 'email' : 'nickname';
      return next(new ConflictError(`User with this ${field} already exists`));
    }
    next(err);
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const data = LoginSchema.parse(req.body);

    const result = await withUserContext({ role: 'app' }, async (client) => {
      const { rows } = await client.query(
        `SELECT id, email, password_hash, nickname, role,
                is_active, is_banned, banned_until
         FROM   psyhelp.users
         WHERE  email = $1`,
        [data.email]
      );
      const user = rows[0];

      if (!user) return { error: 'invalid' };
      if (!user.is_active) return { error: 'inactive' };
      if (user.is_banned && (!user.banned_until || user.banned_until > new Date())) {
        return { error: 'banned', banned_until: user.banned_until };
      }

      const valid = await verifyPassword(data.password, user.password_hash);
      if (!valid) return { error: 'invalid' };

      const tokens = await issueTokens(client, user, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      await client.query(
        'UPDATE psyhelp.users SET last_login_at = now() WHERE id = $1',
        [user.id]
      );

      return {
        user: { id: user.id, nickname: user.nickname, role: user.role },
        ...tokens,
      };
    });

    if (result.error === 'invalid') {
      return next(new UnauthorizedError('Invalid email or password'));
    }
    if (result.error === 'inactive') {
      return next(new ForbiddenError('Account is deactivated'));
    }
    if (result.error === 'banned') {
      return next(new ForbiddenError('Account is banned'));
    }

    logger.info({ userId: result.user.id }, 'User logged in');

    res.json({
      user: result.user,
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const data = RefreshSchema.parse(req.body);

    const result = await withUserContext({ role: 'app' }, async (client) => {
      const session = await findActiveSession(client, data.refresh_token);
      if (!session) return { error: 'invalid' };
      if (!session.is_active || session.is_banned) return { error: 'inactive' };

      const accessToken = generateAccessToken({
        id: session.user_id,
        role: session.role,
        nickname: session.nickname,
      });

      return { accessToken };
    });

    if (result.error) {
      return next(new UnauthorizedError('Invalid or expired refresh token'));
    }

    res.json({ access_token: result.accessToken });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const data = RefreshSchema.parse(req.body);

    await withUserContext({ role: 'app' }, async (client) => {
      await revokeSession(client, data.refresh_token);
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
