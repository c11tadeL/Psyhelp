const bcrypt = require('bcryptjs');
const config = require('../config');

async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, config.BCRYPT_COST);
}

async function verifyPassword(plaintext, hash) {
  if (!hash || typeof hash !== 'string') return false;
  return bcrypt.compare(plaintext, hash);
}

module.exports = { hashPassword, verifyPassword };
