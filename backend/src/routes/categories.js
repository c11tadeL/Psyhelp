const express = require('express');
const { dbHandler } = require('../middleware/auth');

const router = express.Router();

/** GET /api/categories  */
router.get(
  '/',
  dbHandler(async (client) => {
    const { rows } = await client.query(
      `SELECT id, name, slug, description, sort_order
       FROM   psyhelp.categories
       WHERE  is_active = TRUE
       ORDER BY sort_order, name`
    );
    return { items: rows };
  })
);

module.exports = router;
