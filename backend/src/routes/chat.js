const express = require('express');
const crypto = require('crypto');
const { dbHandler, requireAuth } = require('../middleware/auth');
const { SendMessageSchema } = require('../validators/schemas');
const { AppError } = require('../utils/errors');
const { detectCrisis, getCrisisResponse, validateResponse } = require('../services/chatSafety');
const config = require('../config');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Системний промт ───────────────────────────────────────────────
// Налаштовує модель як уважного співрозмовника, не психолога
const SYSTEM_PROMPT = `Ти — уважний співрозмовник на платформі психологічної підтримки «ПсиДопомога».

Твоя роль:
- Слухати і підтримувати, як близький друг
- Відповідати тепло, щиро і просто — без шаблонів і канцеляризмів
- Валідувати почуття людини — давати зрозуміти що її переживання нормальні
- Іноді ставити одне запитання щоб краще зрозуміти ситуацію
- Якщо доречно — ділитися практичними думками, але без нав'язування

Чого НЕ робити:
- Не починай відповідь з «Я розумію», «Звісно», «Безперечно» — це шаблонно
- Не давай медичних порад і не призначай «діагнози»
- Не кажи людині йти до психолога при кожній нагоді — тільки якщо ситуація справді серйозна
- Не будь занадто формальним або офіційним
- Не перевантажуй відповідь — краще коротко і по суті

Відповідай виключно українською мовою.
Максимум 3-4 абзаци. Будь живим, не роботом.`;

// ─── Виклик OpenRouter API ─────────────────────────────────────────
async function callLLM(messages) {
  if (!config.OPENAI_API_KEY) {
    throw new AppError('AI assistant is not configured', 503, 'AI_UNAVAILABLE');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
      'HTTP-Referer': 'https://psyhelp.local',
      'X-Title': 'PsyHelp',
    },
    body: JSON.stringify({
      model: config.OPENAI_MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.75,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error({ status: response.status, body: text }, 'OpenRouter API error');
    throw new AppError('AI service error', 502, 'AI_ERROR');
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || '',
    tokens: data.usage?.total_tokens || 0,
  };
}

// ─── Маршрути ──────────────────────────────────────────────────────

/** GET /api/me/chat/conversations */
router.get(
  '/conversations',
  requireAuth,
  dbHandler(async (client, req) => {
    const { rows } = await client.query(
      `SELECT  conversation_id,
               MIN(created_at) AS started_at,
               MAX(created_at) AS last_message_at,
               COUNT(*)::int   AS messages_count
       FROM    psyhelp.chat_ai
       WHERE   user_id = $1
       GROUP BY conversation_id
       ORDER BY MAX(created_at) DESC
       LIMIT   50`,
      [req.ctx.userId]
    );
    return { items: rows };
  })
);

/** GET /api/me/chat/:conversationId */
router.get(
  '/:conversationId',
  requireAuth,
  dbHandler(async (client, req) => {
    const { rows } = await client.query(
      `SELECT id, role, message, token_count, created_at
       FROM   psyhelp.v_chat_ai
       WHERE  user_id = $1 AND conversation_id = $2
       ORDER BY id ASC`,
      [req.ctx.userId, req.params.conversationId]
    );
    return { items: rows };
  })
);

/** POST /api/me/chat */
router.post(
  '/',
  requireAuth,
  dbHandler(async (client, req, res) => {
    const data = SendMessageSchema.parse(req.body);
    const conversationId = data.conversation_id || crypto.randomUUID();

    // Зберігаємо повідомлення користувача і отримуємо його id та created_at
    const { rows: userRows } = await client.query(
      `INSERT INTO psyhelp.chat_ai (user_id, conversation_id, role, message_encrypted)
       VALUES ($1, $2, 'user', psyhelp.encrypt_text($3))
       RETURNING id, created_at`,
      [req.ctx.userId, conversationId, data.message]
    );

    const userMessage = {
      id: userRows[0].id,
      role: 'user',
      message: data.message,
      created_at: userRows[0].created_at,
    };

    // Pre-filter — перевірка на кризові тригери
    if (detectCrisis(data.message)) {
      logger.warn({ userId: req.ctx.userId }, 'Crisis trigger detected');

      const crisisText = getCrisisResponse();

      const { rows } = await client.query(
        `INSERT INTO psyhelp.chat_ai
           (user_id, conversation_id, role, message_encrypted, token_count)
         VALUES ($1, $2, 'assistant', psyhelp.encrypt_text($3), 0)
         RETURNING id, created_at`,
        [req.ctx.userId, conversationId, crisisText]
      );

      res.status(201);
      return {
        conversation_id: conversationId,
        crisis: true,
        messages: [
          userMessage,
          {
            id: rows[0].id,
            role: 'assistant',
            message: crisisText,
            created_at: rows[0].created_at,
          },
        ],
      };
    }

    const history = await client.query(
      `SELECT role, message
       FROM   psyhelp.v_chat_ai
       WHERE  conversation_id = $1
       ORDER BY created_at DESC
       LIMIT  10`,
      [conversationId]
    );

    const messages = history.rows
      .reverse()
      .map((m) => ({ role: m.role, content: m.message }));

    const { content, tokens } = await callLLM(messages);

    const finalContent = validateResponse(content)
      ? content
      : 'Розкажи мені більше — хочу краще зрозуміти що відбувається.';

    const { rows } = await client.query(
      `INSERT INTO psyhelp.chat_ai
         (user_id, conversation_id, role, message_encrypted, token_count)
       VALUES ($1, $2, 'assistant', psyhelp.encrypt_text($3), $4)
       RETURNING id, created_at`,
      [req.ctx.userId, conversationId, finalContent, tokens]
    );

    res.status(201);
    return {
      conversation_id: conversationId,
      messages: [
        userMessage,
        {
          id: rows[0].id,
          role: 'assistant',
          message: finalContent,
          created_at: rows[0].created_at,
        },
      ],
    };
  })
);

module.exports = router;