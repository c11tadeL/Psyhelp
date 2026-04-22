/**
 * middleware.js — Express-middleware, що декодує JWT і передає контекст далі.
 *
 * Порядок ланцюжка:
 *   app.use(express.json())
 *   app.use(authenticate)           // опціональний, лише читає токен
 *   app.use('/api/me',    requireAuth)           // 401 якщо немає
 *   app.use('/api/admin', requireRole('moderator'))
 *
 * У хендлерах використовуйте req.ctx → передавайте у withUserContext().
 */

const jwt = require('jsonwebtoken');
const { withUserContext } = require('./db');

/**
 * М'яка аутентифікація: якщо токен є і валідний — заповнюємо req.ctx,
 * якщо ні — йдемо далі як гість (для публічних ендпоінтів типу стрічки).
 */
function authenticate(req, res, next) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    req.ctx = { role: 'app' };  // гість
    return next();
  }

  try {
    const payload = jwt.verify(match[1], process.env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    });
    // payload: { sub: <uuid>, role: 'user'|'moderator', iat, exp }
    req.ctx = {
      userId: payload.sub,
      role: payload.role === 'moderator' ? 'moderator' : 'user',
    };
    return next();
  } catch (err) {
    // Невалідний токен трактуємо як відсутність — frontend отримає 401
    // на захищених ендпоінтах.
    req.ctx = { role: 'app' };
    return next();
  }
}

/** Сувора аутентифікація: 401, якщо немає userId. */
function requireAuth(req, res, next) {
  if (!req.ctx || !req.ctx.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/** Сувора авторизація за роллю. */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.ctx || !req.ctx.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (req.ctx.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

/**
 * Хелпер для хендлерів — автоматично обгортає запит у withUserContext.
 *
 *   app.get('/api/me/diary', requireAuth, dbHandler(async (client, req) => {
 *     const { rows } = await client.query(
 *       'SELECT entry_date, mood, note FROM psyhelp.v_diary WHERE user_id = $1 ORDER BY entry_date DESC LIMIT 30',
 *       [req.ctx.userId]
 *     );
 *     return rows;
 *   }));
 */
function dbHandler(fn) {
  return async (req, res, next) => {
    try {
      const result = await withUserContext(req.ctx, (client) => fn(client, req));
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { authenticate, requireAuth, requireRole, dbHandler };
