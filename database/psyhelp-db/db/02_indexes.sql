-- =====================================================================
-- 02_indexes.sql — Індекси
--
-- Принцип: індекс створюється тоді й лише тоді, коли під нього є
-- конкретний запит у backend. Нижче кожен індекс коментовано цільовим
-- запитом (див. 05_queries.sql).
-- =====================================================================

SET search_path TO psyhelp, public;

-- ---------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------
-- UNIQUE(email, nickname) створені автоматично PRIMARY/UNIQUE ключами.
-- Додатково:

-- Частковий індекс по активних модераторах (панель модерації, таких рядків мало).
CREATE INDEX idx_users_moderators
    ON psyhelp.users (id)
    WHERE role = 'moderator' AND is_active = TRUE;

-- Для перевірки «чи заблокований/на скільки»
CREATE INDEX idx_users_banned_until
    ON psyhelp.users (banned_until)
    WHERE is_banned = TRUE;

-- ---------------------------------------------------------------------
-- POSTS
-- ---------------------------------------------------------------------

-- 1) Стрічка: WHERE is_deleted=FALSE ORDER BY created_at DESC
--    Частковий індекс → у 2-3 рази менший і швидший за повний.
CREATE INDEX idx_posts_feed
    ON psyhelp.posts (created_at DESC)
    WHERE is_deleted = FALSE;

-- 2) Фільтр за категорією + сортування — складений, DESC для правильного порядку.
CREATE INDEX idx_posts_category_created
    ON psyhelp.posts (category_id, created_at DESC)
    WHERE is_deleted = FALSE;

-- 3) «Мої звернення» — FK-індекс + сортування.
CREATE INDEX idx_posts_user_created
    ON psyhelp.posts (user_id, created_at DESC)
    WHERE is_deleted = FALSE;

-- 4) Рейтинг проблем: ORDER BY rating_score DESC.
CREATE INDEX idx_posts_rating
    ON psyhelp.posts (rating_score DESC)
    WHERE is_deleted = FALSE;

-- 5) Повнотекстовий пошук по тексту (trigram для ILIKE '%...%').
--    Якщо потрібен повноцінний FTS — замінити на GIN(to_tsvector(...)).
CREATE INDEX idx_posts_body_trgm
    ON psyhelp.posts USING GIN (body gin_trgm_ops)
    WHERE is_deleted = FALSE;

-- ---------------------------------------------------------------------
-- COMMENTS
-- ---------------------------------------------------------------------

-- Коментарі до звернення (основний запит відкриття поста).
CREATE INDEX idx_comments_post_created
    ON psyhelp.comments (post_id, created_at ASC)
    WHERE is_deleted = FALSE;

-- FK-індекс на user_id для історії активності користувача.
CREATE INDEX idx_comments_user_created
    ON psyhelp.comments (user_id, created_at DESC)
    WHERE is_deleted = FALSE;

-- ---------------------------------------------------------------------
-- DIARY
-- ---------------------------------------------------------------------

-- (user_id, entry_date) — вже є через UNIQUE. Додаємо DESC-індекс
-- для «останні N записів».
CREATE INDEX idx_diary_user_date_desc
    ON psyhelp.diary (user_id, entry_date DESC);

-- ---------------------------------------------------------------------
-- CHAT_AI
-- ---------------------------------------------------------------------

-- Завантаження історії конкретного діалогу (UI чату).
CREATE INDEX idx_chat_conversation
    ON psyhelp.chat_ai (conversation_id, created_at ASC);

-- Список розмов юзера (sidebar «Мої діалоги»).
CREATE INDEX idx_chat_user_conversations
    ON psyhelp.chat_ai (user_id, conversation_id, created_at DESC);

-- ---------------------------------------------------------------------
-- COMPLAINTS
-- ---------------------------------------------------------------------

-- Основний запит панелі модератора: WHERE status='open' ORDER BY created_at.
CREATE INDEX idx_complaints_open
    ON psyhelp.complaints (created_at DESC)
    WHERE status = 'open';

-- Пошук «всі скарги на цей пост/коментар» — для розширення прийняття рішень.
CREATE INDEX idx_complaints_target
    ON psyhelp.complaints (content_type, content_id);

CREATE INDEX idx_complaints_reporter
    ON psyhelp.complaints (reporter_id, created_at DESC);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------

-- Основний запит: WHERE user_id=? AND is_read=FALSE.
CREATE INDEX idx_notifications_unread
    ON psyhelp.notifications (user_id, created_at DESC)
    WHERE is_read = FALSE;

-- Повна історія сповіщень.
CREATE INDEX idx_notifications_user
    ON psyhelp.notifications (user_id, created_at DESC);

-- ---------------------------------------------------------------------
-- SESSIONS
-- ---------------------------------------------------------------------

-- Лукап при перевірці refresh-токена.
-- token_hash вже UNIQUE (автоіндекс).
-- Для очищення прострочених:
CREATE INDEX idx_sessions_expires
    ON psyhelp.sessions (expires_at)
    WHERE revoked_at IS NULL;

-- Активні сесії користувача (сторінка «Мої пристрої»).
CREATE INDEX idx_sessions_user_active
    ON psyhelp.sessions (user_id, issued_at DESC)
    WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------
-- WARNINGS
-- ---------------------------------------------------------------------
CREATE INDEX idx_warnings_user
    ON psyhelp.warnings (user_id, created_at DESC);

-- ---------------------------------------------------------------------
-- AUDIT
-- ---------------------------------------------------------------------
CREATE INDEX idx_audit_moderator
    ON psyhelp_audit.moderation_log (moderator_id, created_at DESC);

CREATE INDEX idx_audit_target
    ON psyhelp_audit.moderation_log (target_type, target_id);
