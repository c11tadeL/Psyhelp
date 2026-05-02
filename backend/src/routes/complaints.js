const express = require('express');
const { dbHandler, requireAuth } = require('../middleware/auth');
const { CreateComplaintSchema } = require('../validators/schemas');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  dbHandler(async (client, req, res) => {
    const data = CreateComplaintSchema.parse(req.body);

    const { rows } = await client.query(
      `INSERT INTO psyhelp.complaints
         (reporter_id, content_type, content_id, reason, comment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (reporter_id, content_type, content_id) DO NOTHING
       RETURNING id, created_at, status`,
      [
        req.ctx.userId,
        data.content_type,
        data.content_id,
        data.reason,
        data.comment ?? null,
      ]
    );

    if (rows.length === 0) {
      return { message: 'Complaint already submitted' };
    }

    res.status(201);
    return rows[0];
  })
);

/** GET /api/me/complaints  */
router.get(
  '/me',
  requireAuth,
  dbHandler(async (client, req) => {
    const { rows } = await client.query(
      `SELECT id, content_type, content_id, reason, status, created_at, resolved_at
       FROM   psyhelp.complaints
       WHERE  reporter_id = $1
       ORDER BY created_at DESC
       LIMIT  50`,
      [req.ctx.userId]
    );
    return { items: rows };
  })
);

module.exports = router;
