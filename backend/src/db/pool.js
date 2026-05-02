const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: config.PSYHELP_APP_DB_URL,
  min: config.PSYHELP_DB_POOL_MIN,
  max: config.PSYHELP_DB_POOL_MAX,
  idleTimeoutMillis: config.PSYHELP_DB_IDLE_TIMEOUT,
  ssl: config.isProd ? { rejectUnauthorized: true } : false,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected PG pool error');
});

pool.on('connect', () => {
  logger.debug('PG pool: client connected');
});

const ALLOWED_ROLES = new Set(['psyhelp_user', 'psyhelp_moderator']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * callback 
 *
 * @param {{ userId?: string, role?: 'user'|'moderator'|'app' }} ctx
 * @param {(client) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withUserContext(ctx, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query("SELECT set_config('app.encryption_key', $1, true)", [
      config.PSYHELP_ENCRYPTION_KEY,
    ]);

    if (ctx.userId) {
      if (!UUID_RE.test(ctx.userId)) {
        throw new Error('Invalid userId format (must be UUID)');
      }
      await client.query("SELECT set_config('app.current_user_id', $1, true)", [
        ctx.userId,
      ]);
    }

    let pgRole = null;
    if (ctx.role === 'moderator') pgRole = 'psyhelp_moderator';
    else if (ctx.role === 'user') pgRole = 'psyhelp_user';

    if (pgRole && ALLOWED_ROLES.has(pgRole)) {
      await client.query(`SET LOCAL ROLE ${pgRole}`);
    }
    
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

async function healthCheck() {
  try {
    const { rows } = await pool.query('SELECT 1 AS ok');
    return rows[0]?.ok === 1;
  } catch (err) {
    logger.error({ err }, 'DB health check failed');
    return false;
  }
}

/**
 * Graceful shutdown.
 */
async function closePool() {
  logger.info('Closing PG pool...');
  await pool.end();
}

module.exports = { pool, withUserContext, healthCheck, closePool };
