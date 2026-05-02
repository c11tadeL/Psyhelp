const express = require('express');
const crypto = require('crypto');
const { dbHandler, requireAuth } = require('../middleware/auth');
const { SendMessageSchema } = require('../validators/schemas');
const { AppError } = require('../utils/errors');
const config = require('../config');
const logger = require('../utils/logger');

const router = express.Router();

const SYSTEM_PROMPT = `Ти — емпатичний AI-помічник на платформі анонімної психологічної підтримки. \
Твоя роль — слухати, валідувати почуття людини і пропонувати м'які, практичні рекомендації. \
Завжди наголошуй: "Я не замінюю професійного психолога. Якщо стан критичний — зверніться до фахівця або на гарячу лінію." \
Відповідай українською мовою, тепло, без шаблонних фраз.`;

async function callOpenAI(messages) {
  if (!config.OPENAI_API_KEY) {
    throw new AppError('AI assistant is not configured', 503, 'AI_UNAVAILABLE');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.OPENAI_MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.7,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error({ status: response.status, body: text }, 'OpenAI API error');
    throw new AppError('AI service error', 502, 'AI_ERROR');
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || '',
    tokens: data.usage?.total_tokens || 0,
  };
}

/**
 * GET /api/me/chat/conversations */
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

/**
 * GET /api/me/chat/:conversationId */
router.get(
  '/:conversationId',
  requireAuth,
  dbHandler(async (client, req) => {
    const { rows } = await client.query(
      `SELECT id, role, message, token_count, created_at
       FROM   psyhelp.v_chat_ai
       WHERE  user_id = $1 AND conversation_id = $2
       ORDER BY created_at ASC`,
      [req.ctx.userId, req.params.conversationId]
    );
    return { items: rows };
  })
);

/**
 * POST /api/me/chat */
router.post(
  '/',
  requireAuth,
  dbHandler(async (client, req, res) => {
    const data = SendMessageSchema.parse(req.body);
    const conversationId = data.conversation_id || crypto.randomUUID();

    await client.query(
      `INSERT INTO psyhelp.chat_ai (user_id, conversation_id, role, message_encrypted)
       VALUES ($1, $2, 'user', psyhelp.encrypt_text($3))`,
      [req.ctx.userId, conversationId, data.message]
    );

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

    const { content, tokens } = await callOpenAI(messages);

    const { rows } = await client.query(
      `INSERT INTO psyhelp.chat_ai
         (user_id, conversation_id, role, message_encrypted, token_count)
       VALUES ($1, $2, 'assistant', psyhelp.encrypt_text($3), $4)
       RETURNING id, created_at`,
      [req.ctx.userId, conversationId, content, tokens]
    );

    res.status(201);
    return {
      conversation_id: conversationId,
      message: {
        id: rows[0].id,
        role: 'assistant',
        message: content,
        created_at: rows[0].created_at,
      },
    };
  })
);

module.exports = router;
