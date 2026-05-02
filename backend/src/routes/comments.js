const express = require('express');
const { dbHandler, requireAuth } = require('../middleware/auth');
const { CreateCommentSchema } = require('../validators/schemas');
const { NotFoundError } = require('../utils/errors');

const router = express.Router({ mergeParams: true });

/** GET /api/posts/:postId/comments */
router.get(
  '/',
  dbHandler(async (client, req) => {
    const postId = Number(req.params.postId);
    const { rows } = await client.query(
      `SELECT  c.id, c.body, c.created_at, u.nickname
       FROM    psyhelp.comments c
       JOIN    psyhelp.users u ON u.id = c.user_id
       WHERE   c.post_id = $1 AND c.is_deleted = FALSE
       ORDER BY c.created_at ASC`,
      [postId]
    );
    return { items: rows };
  })
);

/** POST /api/posts/:postId/comments  */
router.post(
  '/',
  requireAuth,
  dbHandler(async (client, req, res) => {
    const postId = Number(req.params.postId);
    const data = CreateCommentSchema.parse(req.body);

    const post = await client.query(
      `SELECT user_id FROM psyhelp.posts
       WHERE id = $1 AND is_deleted = FALSE`,
      [postId]
    );
    if (post.rows.length === 0) {
      throw new NotFoundError('Post not found');
    }

    const { rows } = await client.query(
      `INSERT INTO psyhelp.comments (post_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, body, created_at`,
      [postId, req.ctx.userId, data.body]
    );

    const postAuthorId = post.rows[0].user_id;
    if (postAuthorId !== req.ctx.userId) {
      await client.query(
        `INSERT INTO psyhelp.notifications (user_id, type, post_id, comment_id, payload)
         VALUES ($1, 'new_comment', $2, $3, $4)`,
        [
          postAuthorId,
          postId,
          rows[0].id,
          JSON.stringify({ from: req.ctx.userId }),
        ]
      );
    }

    res.status(201);
    return rows[0];
  })
);

/** DELETE /api/posts/:postId/comments/:id  */
router.delete(
  '/:id',
  requireAuth,
  dbHandler(async (client, req, res) => {
    const id = Number(req.params.id);
    const { rowCount } = await client.query(
      `UPDATE psyhelp.comments
       SET    is_deleted = TRUE, deleted_at = now(), deleted_by = $1
       WHERE  id = $2 AND user_id = $1 AND is_deleted = FALSE`,
      [req.ctx.userId, id]
    );
    if (rowCount === 0) {
      throw new NotFoundError('Comment not found or not yours');
    }
    res.status(204);
    return null;
  })
);

module.exports = router;
