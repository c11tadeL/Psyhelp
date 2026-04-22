/**
 * db.js — пул з'єднань та обгортка запиту з RLS-контекстом
 *
 * Ключова ідея: на кожен HTTP-запит ми беремо ОДНЕ з'єднання з пула,
 * встановлюємо на ньому SET LOCAL app.current_user_id / ROLE, робимо
 * всі потрібні SQL-операції в одній транзакції, COMMIT і повертаємо
 * з'єднання в пул. SET LOCAL скидається сам на COMMIT/ROLLBACK.
 *
 * БЕЗ цього RLS-політики не матимуть контексту і повертатимуть 0 рядків.
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.PSYHELP_APP_DB_URL,
  min: Number(process.env.PSYHELP_DB_POOL_MIN || 2),
  max: Number(process.env.PSYHELP_DB_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.PSYHELP_DB_IDLE_TIMEOUT || 30000),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});

/**
 * Виконати функцію в транзакції з RLS-контекстом.
 *
 *   await withUserContext({ userId: '...', role: 'user' }, async (client) => {
 *     const { rows } = await client.query('SELECT ... FROM psyhelp.posts WHERE ...');
 *     ...
 *   });
 *
 * @param {{ userId?: string, role: 'user'|'moderator'|'app' }} ctx
 * @param {(client: import('pg').PoolClient) => Promise<any>} fn
 */
async function withUserContext(ctx, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Виставляємо application-level ключ шифрування.
    //    Використовуємо set_config(..., is_local=true) замість SET LOCAL,
    //    бо параметризоване значення не можна передати через SET LOCAL.
    await client.query(
      "SELECT set_config('app.encryption_key', $1, true)",
      [process.env.PSYHELP_ENCRYPTION_KEY]
    );

    // 2) Виставляємо поточного користувача (для RLS)
    if (ctx.userId) {
      // UUID валідовано раніше при декодуванні JWT; тут ще одна страховка.
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ctx.userId)) {
        throw new Error('Invalid userId format');
      }
      await client.query(
        "SELECT set_config('app.current_user_id', $1, true)",
        [ctx.userId]
      );
    }

    // 3) SET LOCAL ROLE — допустимі значення лише з білого списку.
    //    НЕ підставляти ctx.role у шаблон без перевірки (ризик SQL-ін'єкції).
    const allowedRoles = new Set(['psyhelp_user', 'psyhelp_moderator']);
    const pgRole = ctx.role === 'moderator' ? 'psyhelp_moderator'
                 : ctx.role === 'user'      ? 'psyhelp_user'
                 : null;

    if (pgRole && allowedRoles.has(pgRole)) {
      // Тут конкатенація безпечна, бо pgRole з білого списку.
      await client.query(`SET LOCAL ROLE ${pgRole}`);
    }
    // Якщо ctx.role === 'app' або undefined → лишаємося в ролі psyhelp_app
    // (для реєстрації, логіну, службових операцій до отримання JWT).

    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, withUserContext };
