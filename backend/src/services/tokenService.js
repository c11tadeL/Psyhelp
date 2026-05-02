const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      nickname: user.nickname,
    },
    config.JWT_ACCESS_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: config.JWT_ACCESS_TTL,
    }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, type: 'refresh' },
    config.JWT_REFRESH_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: config.JWT_REFRESH_TTL,
    }
  );
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.JWT_REFRESH_SECRET, {
    algorithms: ['HS256'],
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueTokens(client, user, { userAgent, ipAddress }) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  const tokenHash = hashToken(refreshToken);

  // 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

  await client.query(
    `INSERT INTO psyhelp.sessions
       (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, tokenHash, userAgent || null, ipAddress || null, expiresAt]
  );

  return { accessToken, refreshToken };
}

async function findActiveSession(client, refreshToken) {
  const tokenHash = hashToken(refreshToken);
  const { rows } = await client.query(
    `SELECT s.id, s.user_id, s.expires_at, s.revoked_at,
            u.id AS user_id, u.role, u.nickname, u.is_active, u.is_banned, u.banned_until
     FROM   psyhelp.sessions s
     JOIN   psyhelp.users u ON u.id = s.user_id
     WHERE  s.token_hash = $1
       AND  s.revoked_at IS NULL
       AND  s.expires_at > now()`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function revokeSession(client, refreshToken) {
  const tokenHash = hashToken(refreshToken);
  await client.query(
    `UPDATE psyhelp.sessions
     SET    revoked_at = now()
     WHERE  token_hash = $1
       AND  revoked_at IS NULL`,
    [tokenHash]
  );
}

async function revokeAllSessions(client, userId) {
  await client.query(
    `UPDATE psyhelp.sessions
     SET    revoked_at = now()
     WHERE  user_id = $1
       AND  revoked_at IS NULL`,
    [userId]
  );
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  issueTokens,
  findActiveSession,
  revokeSession,
  revokeAllSessions,
};
