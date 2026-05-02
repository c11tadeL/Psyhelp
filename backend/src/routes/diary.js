const express = require('express');
const { dbHandler, requireAuth } = require('../middleware/auth');
const { CreateDiarySchema, DiaryQuerySchema } = require('../validators/schemas');
const { NotFoundError } = require('../utils/errors');

const router = express.Router();

/** GET /api/me/diary  */
router.get(
  '/',
  requireAuth,
  dbHandler(async (client, req) => {
    const q = DiaryQuerySchema.parse(req.query);

    const where = ['user_id = $1'];
    const params = [req.ctx.userId];

    if (q.from) {
      params.push(q.from);
      where.push(`entry_date >= $${params.length}`);
    }
    if (q.to) {
      params.push(q.to);
      where.push(`entry_date <= $${params.length}`);
    }
    params.push(q.limit);

    const { rows } = await client.query(
      `SELECT id, mood, note, entry_date, created_at, updated_at
       FROM   psyhelp.v_diary
       WHERE  ${where.join(' AND ')}
       ORDER BY entry_date DESC
       LIMIT  $${params.length}`,
      params
    );
    return { items: rows };
  })
);

/** GET /api/me/diary/analytics  */
router.get(
  '/analytics',
  requireAuth,
  dbHandler(async (client, req) => {
    const q = DiaryQuerySchema.parse(req.query);

    const params = [req.ctx.userId];
    let where = 'user_id = $1';
    if (q.from) {
      params.push(q.from);
      where += ` AND entry_date >= $${params.length}`;
    }
    if (q.to) {
      params.push(q.to);
      where += ` AND entry_date <= $${params.length}`;
    }

    const stats = await client.query(
      `SELECT COUNT(*)::int        AS total_entries,
              ROUND(AVG(mood)::numeric, 2) AS avg_mood,
              MIN(mood)::int       AS min_mood,
              MAX(mood)::int       AS max_mood,
              MAX(entry_date)      AS last_entry
       FROM   psyhelp.diary
       WHERE  ${where}`,
      params
    );

    const series = await client.query(
      `SELECT entry_date, mood
       FROM   psyhelp.diary
       WHERE  ${where}
       ORDER BY entry_date ASC`,
      params
    );

    return {
      stats: stats.rows[0],
      series: series.rows,
    };
  })
);

/** PUT /api/me/diary */
router.put(
  '/',
  requireAuth,
  dbHandler(async (client, req) => {
    const data = CreateDiarySchema.parse(req.body);

    const { rows } = await client.query(
      `INSERT INTO psyhelp.diary (user_id, mood, note_encrypted, entry_date)
       VALUES ($1, $2,
               CASE WHEN $3::TEXT IS NULL THEN NULL ELSE psyhelp.encrypt_text($3) END,
               COALESCE($4::DATE, CURRENT_DATE))
       ON CONFLICT (user_id, entry_date)
       DO UPDATE SET mood           = EXCLUDED.mood,
                     note_encrypted = EXCLUDED.note_encrypted,
                     updated_at     = now()
       RETURNING id, entry_date, mood, updated_at`,
      [req.ctx.userId, data.mood, data.note ?? null, data.entry_date ?? null]
    );
    return rows[0];
  })
);

/** DELETE /api/me/diary/:id  */
router.delete(
  '/:id',
  requireAuth,
  dbHandler(async (client, req, res) => {
    const id = Number(req.params.id);
    const { rowCount } = await client.query(
      `DELETE FROM psyhelp.diary WHERE id = $1 AND user_id = $2`,
      [id, req.ctx.userId]
    );
    if (rowCount === 0) {
      throw new NotFoundError('Diary entry not found');
    }
    res.status(204);
    return null;
  })
);

module.exports = router;
