-- =====================================================================
-- 06_queries.sql — Оптимізовані запити для основних use-case-ів backend
--
-- Кожен запит підібраний під існуючий індекс із 02_indexes.sql.
-- Усі параметризовані ($1, $2...) — як у node-postgres / pg.
-- =====================================================================

SET search_path TO psyhelp, public;

-- =====================================================================
-- 1. СТРІЧКА ЗВЕРНЕНЬ (головна сторінка, публічна)
--    Індекс: idx_posts_feed  або  idx_posts_category_created
-- =====================================================================
--
-- Keyset pagination (НЕ OFFSET!) — O(log n) незалежно від глибини.
--
-- $1 = category_id   (NULL → всі категорії)
-- $2 = cursor_created_at (NULL → перша сторінка)
-- $3 = cursor_id     (tie-break за id)
-- $4 = limit         (напр. 20)

SELECT  p.id,
        p.body,
        p.comments_count,
        p.rating_score,
        p.created_at,
        c.id   AS category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        u.nickname    -- тільки нікнейм! email НЕ повертається
FROM    psyhelp.posts p
JOIN    psyhelp.categories c ON c.id = p.category_id
JOIN    psyhelp.users      u ON u.id = p.user_id
WHERE   p.is_deleted = FALSE
  AND   ($1::SMALLINT IS NULL OR p.category_id = $1)
  AND   ($2::TIMESTAMPTZ IS NULL OR (p.created_at, p.id) < ($2, $3))
ORDER BY p.created_at DESC, p.id DESC
LIMIT   $4;

-- =====================================================================
-- 2. РЕЙТИНГ АКТУАЛЬНИХ ПРОБЛЕМ
--    Індекс: idx_posts_rating
-- =====================================================================
-- Формула rating_score (оновлюється фоновим cron-job-ом раз на 10-15 хв):
--
--   score = (comments_count * 3 + views * 0.1) * time_decay
--   time_decay = 1 / POW((EXTRACT(EPOCH FROM now()-created_at)/3600 + 2), 1.5)
--
-- Запит на топ-20:
SELECT  p.id, p.body, p.comments_count, p.rating_score,
        c.name AS category_name
FROM    psyhelp.posts p
JOIN    psyhelp.categories c ON c.id = p.category_id
WHERE   p.is_deleted = FALSE
  AND   p.created_at > now() - INTERVAL '7 days'   -- обмеження для релевантності
ORDER BY p.rating_score DESC
LIMIT   20;

-- Batch-оновлення rating_score (виконується з cron):
/*
UPDATE psyhelp.posts
SET    rating_score = (comments_count * 3.0)
                    / POWER(EXTRACT(EPOCH FROM now() - created_at)/3600 + 2, 1.5)
WHERE  is_deleted = FALSE
  AND  created_at > now() - INTERVAL '14 days';
*/

-- =====================================================================
-- 3. ВІДКРИТТЯ ЗВЕРНЕННЯ ЗІ СПИСКОМ КОМЕНТАРІВ (1 запит, не N+1)
--    Індекси: PK(posts), idx_comments_post_created
-- =====================================================================
-- $1 = post_id
-- Повертаємо у 1-му запиті пост і агрегований масив коментарів:
SELECT  p.id, p.body, p.created_at, p.comments_count,
        c.name AS category_name,
        u.nickname AS author_nickname,
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                        'id',         cm.id,
                        'body',       cm.body,
                        'created_at', cm.created_at,
                        'nickname',   cu.nickname
                    ) ORDER BY cm.created_at ASC)
             FROM   psyhelp.comments cm
             JOIN   psyhelp.users    cu ON cu.id = cm.user_id
             WHERE  cm.post_id = p.id
               AND  cm.is_deleted = FALSE),
            '[]'::jsonb
        ) AS comments
FROM    psyhelp.posts p
JOIN    psyhelp.categories c ON c.id = p.category_id
JOIN    psyhelp.users      u ON u.id = p.user_id
WHERE   p.id = $1
  AND   p.is_deleted = FALSE;

-- =====================================================================
-- 4. СТВОРЕННЯ АНОНІМНОГО ЗВЕРНЕННЯ
-- =====================================================================
-- Перед INSERT-ом backend має:
--   SET LOCAL app.current_user_id = '...';
--   SET LOCAL ROLE psyhelp_user;
-- RLS сам приб'є, якщо user_id ≠ current_user_id.

INSERT INTO psyhelp.posts (user_id, category_id, body)
VALUES ($1, $2, $3)
RETURNING id, created_at;

-- =====================================================================
-- 5. АНАЛІТИКА НАСТРОЮ (графік за період)
--    Індекс: idx_diary_user_date_desc
-- =====================================================================
-- $1 = user_id, $2 = from_date, $3 = to_date
-- Не використовуємо v_diary — нам не потрібен note, не витрачаємо цикли CPU.
SELECT  entry_date, mood
FROM    psyhelp.diary
WHERE   user_id     = $1
  AND   entry_date >= $2
  AND   entry_date <= $3
ORDER BY entry_date ASC;

-- Зведена статистика:
SELECT  COUNT(*)           AS total_entries,
        AVG(mood)::numeric(4,2) AS avg_mood,
        MIN(mood)          AS min_mood,
        MAX(mood)          AS max_mood,
        MAX(entry_date)    AS last_entry
FROM    psyhelp.diary
WHERE   user_id     = $1
  AND   entry_date >= $2
  AND   entry_date <= $3;

-- =====================================================================
-- 6. СТВОРЕННЯ / ОНОВЛЕННЯ ЗАПИСУ ЩОДЕННИКА (upsert, 1 запит на день)
-- =====================================================================
INSERT INTO psyhelp.diary (user_id, mood, note_encrypted, entry_date)
VALUES ($1, $2, psyhelp.encrypt_text($3), COALESCE($4, CURRENT_DATE))
ON CONFLICT (user_id, entry_date)
DO UPDATE SET mood            = EXCLUDED.mood,
              note_encrypted  = EXCLUDED.note_encrypted,
              updated_at      = now()
RETURNING id, entry_date, mood;

-- =====================================================================
-- 7. ЧАТ AI: завантаження історії розмови
--    Індекс: idx_chat_conversation
-- =====================================================================
SELECT  id, role, message, token_count, created_at
FROM    psyhelp.v_chat_ai
WHERE   conversation_id = $1
  AND   user_id = $2        -- RLS вже обмежує, але ставимо для ясності
ORDER BY created_at ASC;

-- Додавання повідомлення:
INSERT INTO psyhelp.chat_ai (user_id, conversation_id, role, message_encrypted, token_count)
VALUES ($1, $2, $3, psyhelp.encrypt_text($4), $5)
RETURNING id, created_at;

-- =====================================================================
-- 8. ПАНЕЛЬ МОДЕРАТОРА: відкриті скарги + контекст
--    Індекс: idx_complaints_open
-- =====================================================================
-- Повертаємо одним запитом скаргу + превʼю контенту (LATERAL).
SELECT  co.id, co.reason, co.comment, co.created_at,
        co.content_type, co.content_id,
        u.nickname AS reporter_nickname,
        target.*
FROM    psyhelp.complaints co
JOIN    psyhelp.users u ON u.id = co.reporter_id
CROSS JOIN LATERAL (
    SELECT CASE co.content_type
             WHEN 'post'    THEN (SELECT LEFT(body, 200)
                                  FROM psyhelp.posts    WHERE id = co.content_id)
             WHEN 'comment' THEN (SELECT LEFT(body, 200)
                                  FROM psyhelp.comments WHERE id = co.content_id)
           END AS target_preview,
           CASE co.content_type
             WHEN 'post'    THEN (SELECT user_id FROM psyhelp.posts    WHERE id = co.content_id)
             WHEN 'comment' THEN (SELECT user_id FROM psyhelp.comments WHERE id = co.content_id)
           END AS target_author_id
) target
WHERE   co.status = 'open'
ORDER BY co.created_at DESC
LIMIT   50;

-- =====================================================================
-- 9. МОДЕРАТОРСЬКА ДІЯ: видалити пост + зафіксувати в audit
--    Виконувати в 1 транзакції!
-- =====================================================================
BEGIN;

UPDATE psyhelp.posts
SET    is_deleted = TRUE,
       deleted_at = now(),
       deleted_by = $1    -- moderator_id (з JWT)
WHERE  id = $2
  AND  is_deleted = FALSE
RETURNING user_id;

UPDATE psyhelp.complaints
SET    status = 'resolved',
       resolved_by = $1,
       resolved_at = now()
WHERE  content_type = 'post'
  AND  content_id = $2;

INSERT INTO psyhelp_audit.moderation_log
      (moderator_id, action, target_type, target_id, details)
VALUES ($1, 'delete_post', 'post', $2::TEXT,
        jsonb_build_object('reason', $3));

COMMIT;

-- =====================================================================
-- 10. СПОВІЩЕННЯ: непрочитані для бейджа + останні 20
--     Індекс: idx_notifications_unread
-- =====================================================================
-- Лічильник (використовуємо частковий індекс — швидко):
SELECT COUNT(*) FROM psyhelp.notifications
WHERE  user_id = $1 AND is_read = FALSE;

-- Останні 20 (будь-якого статусу):
SELECT  id, type, payload, is_read, created_at, post_id, comment_id
FROM    psyhelp.notifications
WHERE   user_id = $1
ORDER BY created_at DESC
LIMIT   20;

-- Масове позначення як прочитане:
UPDATE  psyhelp.notifications
SET     is_read = TRUE, read_at = now()
WHERE   user_id = $1 AND is_read = FALSE;

-- =====================================================================
-- 11. ПОШУК ЗВЕРНЕНЬ за текстом (trigram-індекс)
--     Індекс: idx_posts_body_trgm
-- =====================================================================
SELECT  id, body, created_at, comments_count
FROM    psyhelp.posts
WHERE   is_deleted = FALSE
  AND   body ILIKE '%' || $1 || '%'
ORDER BY similarity(body, $1) DESC, created_at DESC
LIMIT   30;

-- =====================================================================
-- 12. РЕЄСТРАЦІЯ КОРИСТУВАЧА
-- =====================================================================
-- Викликається backend-ом у ролі psyhelp_app (ще без current_user_id).
INSERT INTO psyhelp.users (email, password_hash, nickname)
VALUES ($1, psyhelp.hash_password($2), $3)
RETURNING id, email, nickname, role, created_at;

-- =====================================================================
-- 13. АВТОРИЗАЦІЯ: пошук користувача + перевірка пароля
-- =====================================================================
-- Варіант А (перевірка на стороні БД):
SELECT id, nickname, role
FROM   psyhelp.users
WHERE  email = $1
  AND  is_active = TRUE
  AND  (is_banned = FALSE OR (banned_until IS NOT NULL AND banned_until < now()))
  AND  psyhelp.verify_password($2, password_hash);

-- Варіант Б (перевірка на стороні backend через bcryptjs):
SELECT id, nickname, role, password_hash, is_banned, banned_until
FROM   psyhelp.users
WHERE  email = $1 AND is_active = TRUE;

-- =====================================================================
-- 14. ПОТОЧНА СЕСІЯ: збереження хешу refresh-токена
-- =====================================================================
INSERT INTO psyhelp.sessions
       (user_id, token_hash, user_agent, ip_address, expires_at)
VALUES ($1, encode(digest($2::bytea, 'sha256'), 'hex'),
        $3, $4::INET, now() + INTERVAL '30 days')
RETURNING id;

-- Лукап при refresh:
SELECT id, user_id, expires_at, revoked_at
FROM   psyhelp.sessions
WHERE  token_hash = encode(digest($1::bytea, 'sha256'), 'hex')
  AND  revoked_at IS NULL
  AND  expires_at > now();

-- Logout:
UPDATE psyhelp.sessions SET revoked_at = now()
WHERE  token_hash = encode(digest($1::bytea, 'sha256'), 'hex');

-- =====================================================================
-- 15. ОЧИЩЕННЯ ПРОТЕРМІНОВАНИХ СЕСІЙ (cron)
-- =====================================================================
DELETE FROM psyhelp.sessions
WHERE  expires_at < now() - INTERVAL '7 days'
   OR  (revoked_at IS NOT NULL AND revoked_at < now() - INTERVAL '30 days');
