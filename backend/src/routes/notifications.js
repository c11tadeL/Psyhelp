const express = require('express');
const { dbHandler, requireAuth } = require('../middleware/auth');

const router = express.Router();

/** GET /api/me/notifications  */
router.get(
  '/',
  requireAuth,
  dbHandler(async (client, req) => {
    const { rows } = await client.query(
      `SELECT id, type, payload, is_read, created_at, post_id, comment_id
       FROM   psyhelp.notifications
       WHERE  user_id = $1
       ORDER BY created_at DESC
       LIMIT  50`,
      [req.ctx.userId]
    );
    return { items: rows };
  })
);

/** GET /api/me/notifications/unread-count */
router.get(
  '/unread-count',
  requireAuth,
  dbHandler(async (client, req) => {
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM   psyhelp.notifications
       WHERE  user_id = $1 AND is_read = FALSE`,
      [req.ctx.userId]
    );
    return rows[0];
  })
);

/** POST /api/me/notifications/mark-read */
router.post(
  '/mark-read',
  requireAuth,
  dbHandler(async (client, req) => {
    const { rowCount } = await client.query(
      `UPDATE psyhelp.notifications
       SET    is_read = TRUE, read_at = now()
       WHERE  user_id = $1 AND is_read = FALSE`,
      [req.ctx.userId]
    );
    return { updated: rowCount };
  })
);

module.exports = router;
