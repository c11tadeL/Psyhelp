const express = require('express');
const { dbHandler } = require('../middleware/auth');
const { ResolveComplaintSchema } = require('../validators/schemas');
const { NotFoundError, ValidationError } = require('../utils/errors');

const router = express.Router();

/**
 * GET /api/moderation/dashboard 
 */
router.get(
  '/dashboard',
  dbHandler(async (client) => {
    const [stats, complaints] = await Promise.all([
      client.query(`
        SELECT
          (SELECT COUNT(*)::int FROM psyhelp.users WHERE is_active = TRUE)            AS users_total,
          (SELECT COUNT(*)::int FROM psyhelp.users WHERE created_at > now() - INTERVAL '24 hours') AS users_new_24h,
          (SELECT COUNT(*)::int FROM psyhelp.posts WHERE is_deleted = FALSE)          AS posts_total,
          (SELECT COUNT(*)::int FROM psyhelp.posts WHERE is_deleted = FALSE AND created_at > now() - INTERVAL '24 hours') AS posts_new_24h,
          (SELECT COUNT(*)::int FROM psyhelp.complaints WHERE status = 'open')        AS complaints_open
      `),
      client.query(`
        SELECT id, content_type, content_id, reason, comment, created_at
        FROM   psyhelp.complaints
        WHERE  status = 'open'
        ORDER BY created_at DESC
        LIMIT  10
      `),
    ]);

    return {
      stats: stats.rows[0],
      latest_complaints: complaints.rows,
    };
  })
);

/**
 * GET /api/moderation/complaints */
router.get(
  '/complaints',
  dbHandler(async (client, req) => {
    const status = ['open', 'resolved', 'rejected'].includes(req.query.status)
      ? req.query.status
      : 'open';
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const { rows } = await client.query(
      `
      SELECT  co.id, co.reason, co.comment, co.status, co.created_at,
              co.content_type, co.content_id,
              u.nickname AS reporter_nickname,
              CASE co.content_type
                WHEN 'post'    THEN (SELECT LEFT(body, 200) FROM psyhelp.posts    WHERE id = co.content_id)
                WHEN 'comment' THEN (SELECT LEFT(body, 200) FROM psyhelp.comments WHERE id = co.content_id)
              END AS target_preview,
              CASE co.content_type
                WHEN 'post'    THEN (SELECT user_id FROM psyhelp.posts    WHERE id = co.content_id)
                WHEN 'comment' THEN (SELECT user_id FROM psyhelp.comments WHERE id = co.content_id)
              END AS target_author_id
      FROM    psyhelp.complaints co
      JOIN    psyhelp.users u ON u.id = co.reporter_id
      WHERE   co.status = $1
      ORDER BY co.created_at DESC
      LIMIT   $2
      `,
      [status, limit]
    );
    return { items: rows };
  })
);

/**
 * POST /api/moderation/complaints/:id/resolve .
 *
 * Body:
 *   { action: 'delete_content' | 'reject' | 'warn_user', warning_reason?: string }
 */
router.post(
  '/complaints/:id/resolve',
  dbHandler(async (client, req) => {
    const complaintId = Number(req.params.id);
    const data = ResolveComplaintSchema.parse(req.body);

    const complaint = await client.query(
      `SELECT content_type, content_id, status FROM psyhelp.complaints WHERE id = $1`,
      [complaintId]
    );
    if (complaint.rows.length === 0) {
      throw new NotFoundError('Complaint not found');
    }
    if (complaint.rows[0].status !== 'open') {
      throw new ValidationError('Complaint is already resolved');
    }
    const { content_type, content_id } = complaint.rows[0];

    const author = await client.query(
      content_type === 'post'
        ? `SELECT user_id FROM psyhelp.posts WHERE id = $1`
        : `SELECT user_id FROM psyhelp.comments WHERE id = $1`,
      [content_id]
    );
    const authorId = author.rows[0]?.user_id;

    if (data.action === 'reject') {
      await client.query(
        `UPDATE psyhelp.complaints
         SET    status = 'rejected', resolved_by = $1, resolved_at = now()
         WHERE  id = $2`,
        [req.ctx.userId, complaintId]
      );
      await logModeration(client, req.ctx.userId, 'reject_complaint', 'complaint', complaintId);
      return { status: 'rejected' };
    }

    if (data.action === 'delete_content') {
      // Soft-delete 
      const table = content_type === 'post' ? 'posts' : 'comments';
      await client.query(
        `UPDATE psyhelp.${table}
         SET    is_deleted = TRUE, deleted_at = now(), deleted_by = $1
         WHERE  id = $2 AND is_deleted = FALSE`,
        [req.ctx.userId, content_id]
      );

      // Resolve 
      await client.query(
        `UPDATE psyhelp.complaints
         SET    status = 'resolved', resolved_by = $1, resolved_at = now()
         WHERE  id = $2`,
        [req.ctx.userId, complaintId]
      );

      if (authorId) {
        await client.query(
          `INSERT INTO psyhelp.notifications (user_id, type, payload)
           VALUES ($1, 'content_removed', $2)`,
          [authorId, JSON.stringify({ content_type, content_id })]
        );
      }

      await logModeration(client, req.ctx.userId, `delete_${content_type}`, content_type, content_id);
      return { status: 'resolved', deleted_content: { content_type, content_id } };
    }

    if (data.action === 'warn_user') {
      if (!authorId) {
        throw new NotFoundError('Cannot warn: content author not found');
      }
      const reason = data.warning_reason || `Warning for ${content_type} #${content_id}`;
      const { rows: warningRows } = await client.query(
        `INSERT INTO psyhelp.warnings (user_id, moderator_id, complaint_id, reason)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [authorId, req.ctx.userId, complaintId, reason]
      );

      await client.query(
        `UPDATE psyhelp.complaints
         SET    status = 'resolved', resolved_by = $1, resolved_at = now()
         WHERE  id = $2`,
        [req.ctx.userId, complaintId]
      );

      await client.query(
        `INSERT INTO psyhelp.notifications (user_id, type, payload)
         VALUES ($1, 'warning', $2)`,
        [authorId, JSON.stringify({ reason })]
      );

      await logModeration(client, req.ctx.userId, 'warn_user', 'user', authorId, { warning_id: warningRows[0].id });
      return { status: 'resolved', warning_id: warningRows[0].id };
    }
  })
);

async function logModeration(client, moderatorId, action, targetType, targetId, details = {}) {
  await client.query(
    `INSERT INTO psyhelp_audit.moderation_log
       (moderator_id, action, target_type, target_id, details)
     VALUES ($1, $2, $3, $4::TEXT, $5)`,
    [moderatorId, action, targetType, String(targetId), JSON.stringify(details)]
  );
}

module.exports = router;
