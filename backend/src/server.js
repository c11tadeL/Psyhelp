require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');

const config = require('./config');
const logger = require('./utils/logger');
const { authenticate, requireAuth, requireRole } = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { healthCheck, closePool } = require('./db/pool');

// Routes
const authRoutes = require('./routes/auth');
const categoriesRoutes = require('./routes/categories');
const postsRoutes = require('./routes/posts');
const commentsRoutes = require('./routes/comments');
const meRoutes = require('./routes/me');
const diaryRoutes = require('./routes/diary');
const chatRoutes = require('./routes/chat');
const notificationsRoutes = require('./routes/notifications');
const complaintsRoutes = require('./routes/complaints');
const moderationRoutes = require('./routes/moderation');

const app = express();

// ─── Security & infrastructure middleware ─────────────────────────────
app.set('trust proxy', 1); 

app.use(helmet());

app.use(
  cors({
    origin: config.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.use(
  pinoHttp({
    logger,
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  })
);

// ─── Auth middleware 
app.use(authenticate);

// ─── Routes ────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const dbOk = await healthCheck();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/posts/:postId/comments', commentsRoutes);

app.use('/api/me', requireAuth, meRoutes);
app.use('/api/me/diary', requireAuth, diaryRoutes);
app.use('/api/me/chat', requireAuth, chatRoutes);
app.use('/api/me/notifications', requireAuth, notificationsRoutes);
app.use('/api/complaints', complaintsRoutes);

app.use('/api/moderation', requireRole('moderator'), moderationRoutes);

// ─── 404 + error handler ───────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.PORT, () => {
  logger.info(
    { port: config.PORT, env: config.NODE_ENV },
    `🧠 PsyHelp backend listening on http://localhost:${config.PORT}`
  );
});

// ─── Graceful shutdown ─────────────────────────────────────────────────
async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down gracefully...');
  server.close(async () => {
    await closePool();
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    logger.warn('Forced shutdown');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});

module.exports = app;
