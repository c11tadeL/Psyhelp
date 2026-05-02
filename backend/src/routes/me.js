const express = require('express');
const { dbHandler, requireAuth } = require('../middleware/auth');
const { UpdateProfileSchema } = require('../validators/schemas');
const { ConflictError, NotFoundError } = require('../utils/errors');

const router = express.Router();

router.get(
  '/',
  requireAuth,
  dbHandler(async (client, req) => {
    const { rows } = await client.query(
      `SELECT id, nickname, role, warnings_count, created_at, last_login_at
       FROM   psyhelp.users
       WHERE  id = $1`,
      [req.ctx.userId]
    );
    if (rows.length === 0) {
      throw new NotFoundError('User not found');
    }
    return rows[0];
  })
);

/** PATCH /api/me  */
router.patch(
  '/',
  requireAuth,
  dbHandler(async (client, req) => {
    const data = UpdateProfileSchema.parse(req.body);
    if (!data.nickname) {
      return { message: 'No fields to update' };
    }

    try {
      const { rows } = await client.query(
        `UPDATE psyhelp.users
         SET    nickname = $1
         WHERE  id = $2
         RETURNING id, nickname, updated_at`,
        [data.nickname, req.ctx.userId]
      );
      return rows[0];
    } catch (err) {
      if (err.code === '23505') {
        throw new ConflictError('Nickname is already taken');
      }
      throw err;
    }
  })
);

/** GET /api/me/sessions  */
router.get(
  '/sessions',
  requireAuth,
  dbHandler(async (client, req) => {
    const { rows } = await client.query(
      `SELECT id, user_agent, ip_address::text, issued_at, expires_at
       FROM   psyhelp.sessions
       WHERE  user_id = $1 AND revoked_at IS NULL AND expires_at > now()
       ORDER BY issued_at DESC`,
      [req.ctx.userId]
    );
    return { items: rows };
  })
);

/** DELETE /api/me/sessions/:id  */
router.delete(
  '/sessions/:id',
  requireAuth,
  dbHandler(async (client, req, res) => {
    const { rowCount } = await client.query(
      `UPDATE psyhelp.sessions
       SET    revoked_at = now()
       WHERE  id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [req.params.id, req.ctx.userId]
    );
    if (rowCount === 0) {
      throw new NotFoundError('Session not found');
    }
    res.status(204);
    return null;
  })
);

module.exports = router;
