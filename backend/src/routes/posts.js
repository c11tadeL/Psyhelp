const express = require('express');
const { dbHandler, requireAuth } = require('../middleware/auth');
const {
  CreatePostSchema,
  UpdatePostSchema,
  PostsListQuerySchema,
} = require('../validators/schemas');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

const router = express.Router();

/**
 * GET /api/posts  */
router.get(
  '/',
  dbHandler(async (client, req) => {
    const q = PostsListQuerySchema.parse(req.query);

    let orderBy;
    let where = 'p.is_deleted = FALSE';
    const params = [];

    if (q.category) {
      params.push(q.category);
      where += ` AND p.category_id = $${params.length}`;
    }

    if (q.sort === 'rating') {
      where += ` AND p.created_at > now() - INTERVAL '7 days'`;
      orderBy = 'p.rating_score DESC, p.id DESC';
    } else {
      // Recent
      if (q.cursor_date && q.cursor_id) {
        params.push(q.cursor_date, q.cursor_id);
        where += ` AND (p.created_at, p.id) < ($${params.length - 1}, $${params.length})`;
      }
      orderBy = 'p.created_at DESC, p.id DESC';
    }

    params.push(q.limit);

    const sql = `
      SELECT  p.id, p.body, p.comments_count, p.rating_score, p.created_at,
              c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
              u.nickname
      FROM    psyhelp.posts p
      JOIN    psyhelp.categories c ON c.id = p.category_id
      JOIN    psyhelp.users      u ON u.id = p.user_id
      WHERE   ${where}
      ORDER BY ${orderBy}
      LIMIT   $${params.length}
    `;

    const { rows } = await client.query(sql, params);

    // next-cursor
    const last = rows[rows.length - 1];
    return {
      items: rows,
      next_cursor: last ? { date: last.created_at, id: Number(last.id) } : null,
    };
  })
);

/**
 * GET /api/posts/:id — пост */
router.get(
  '/:id',
  dbHandler(async (client, req) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw new NotFoundError('Post not found');
    }

    const { rows } = await client.query(
      `
      SELECT  p.id, p.body, p.created_at, p.comments_count,
              c.name AS category_name, c.slug AS category_slug,
              u.nickname AS author_nickname,
              COALESCE(
                (SELECT jsonb_agg(jsonb_build_object(
                          'id',         cm.id,
                          'body',       cm.body,
                          'created_at', cm.created_at,
                          'nickname',   cu.nickname
                        ) ORDER BY cm.created_at ASC)
                 FROM   psyhelp.comments cm
                 JOIN   psyhelp.users    cu ON cu.id = cm.user_id
                 WHERE  cm.post_id = p.id
                   AND  cm.is_deleted = FALSE),
                '[]'::jsonb
              ) AS comments
      FROM    psyhelp.posts p
      JOIN    psyhelp.categories c ON c.id = p.category_id
      JOIN    psyhelp.users      u ON u.id = p.user_id
      WHERE   p.id = $1 AND p.is_deleted = FALSE
      `,
      [id]
    );

    if (rows.length === 0) {
      throw new NotFoundError('Post not found');
    }
    return rows[0];
  })
);

/**
 * POST /api/posts */
router.post(
  '/',
  requireAuth,
  dbHandler(async (client, req, res) => {
    const data = CreatePostSchema.parse(req.body);

    const { rows } = await client.query(
      `INSERT INTO psyhelp.posts (user_id, category_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [req.ctx.userId, data.category_id, data.body]
    );

    res.status(201);
    return rows[0];
  })
);

/**
 * PATCH /api/posts/:id */
router.patch(
  '/:id',
  requireAuth,
  dbHandler(async (client, req) => {
    const id = Number(req.params.id);
    const data = UpdatePostSchema.parse(req.body);

    const fields = [];
    const params = [];
    if (data.body !== undefined) {
      params.push(data.body);
      fields.push(`body = $${params.length}`);
    }
    if (data.category_id !== undefined) {
      params.push(data.category_id);
      fields.push(`category_id = $${params.length}`);
    }
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const { rows } = await client.query(
      `UPDATE psyhelp.posts
       SET    ${fields.join(', ')}
       WHERE  id = $${params.length} AND is_deleted = FALSE
       RETURNING id, body, category_id, updated_at`,
      params
    );

    if (rows.length === 0) {
      throw new NotFoundError('Post not found or not yours');
    }
    return rows[0];
  })
);

/**
 * DELETE /api/posts/:id */
router.delete(
  '/:id',
  requireAuth,
  dbHandler(async (client, req, res) => {
    const id = Number(req.params.id);

    const { rowCount } = await client.query(
      `UPDATE psyhelp.posts
       SET    is_deleted = TRUE,
              deleted_at = now(),
              deleted_by = $1
       WHERE  id = $2 AND is_deleted = FALSE`,
      [req.ctx.userId, id]
    );

    if (rowCount === 0) {
      throw new NotFoundError('Post not found or not yours');
    }
    res.status(204);
    return null;
  })
);

/**
 * GET /api/me/posts */
router.get(
  '/me/list',
  requireAuth,
  dbHandler(async (client, req) => {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const { rows } = await client.query(
      `SELECT  p.id, p.body, p.comments_count, p.created_at,
               c.name AS category_name
       FROM    psyhelp.posts p
       JOIN    psyhelp.categories c ON c.id = p.category_id
       WHERE   p.user_id = $1 AND p.is_deleted = FALSE
       ORDER BY p.created_at DESC
       LIMIT   $2`,
      [req.ctx.userId, limit]
    );
    return { items: rows };
  })
);

module.exports = router;
