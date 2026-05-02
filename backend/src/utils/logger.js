const pino = require('pino');
const config = require('../config');

const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.password_hash',
      '*.token',
      '*.refresh_token',
      '*.access_token',
    ],
    censor: '[REDACTED]',
  },
});

module.exports = logger;
