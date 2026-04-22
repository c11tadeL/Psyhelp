-- =====================================================================
-- Інформаційна система «Психологічна допомога»
-- 01_schema.sql — Схема БД (PostgreSQL 15+)
--
-- Автор: Попілевич О.О., КН-22, ЧНУ ім. Б. Хмельницького
-- Науковий керівник: викл. Науменко С.В.
--
-- Відповідає інфологічній моделі з п.2.7 кваліфікаційної роботи:
-- 9 сутностей: Users, Posts, Categories, Comments, Diary,
-- Chat_AI, Complaints, Notifications, Sessions
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Розширення
-- ---------------------------------------------------------------------
-- pgcrypto — для gen_random_uuid(), crypt() (bcrypt), pgp_sym_encrypt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- citext — case-insensitive text для email (щоб 'A@x.com' = 'a@x.com')
CREATE EXTENSION IF NOT EXISTS citext;
-- pg_trgm — trigram-індекси для ILIKE-пошуку по тексту звернень/коментарів
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------
-- 1. Схеми (логічне розділення)
-- ---------------------------------------------------------------------
-- Виносимо публічні дані в окрему схему, щоб грануляція дозволів була
-- легшою і щоб міграції не перетиналися з системним public.
CREATE SCHEMA IF NOT EXISTS psyhelp;
CREATE SCHEMA IF NOT EXISTS psyhelp_audit;  -- для журналу дій модератора

-- За замовчуванням search_path треба виставити на рівні ролі/БД.
SET search_path TO psyhelp, public;

-- ---------------------------------------------------------------------
-- 2. ENUM-типи
-- ---------------------------------------------------------------------
-- Використовуємо ENUM замість VARCHAR для фіксованих доменів —
-- економія місця, захист від "магічних" значень, кращі плани запитів.

CREATE TYPE user_role AS ENUM ('user', 'moderator');

CREATE TYPE chat_role AS ENUM ('user', 'assistant');

CREATE TYPE content_type AS ENUM ('post', 'comment');

CREATE TYPE complaint_reason AS ENUM (
    'offensive',      -- образливий контент
    'spam',           -- спам / реклама
    'threat',         -- загрозливий вміст
    'self_harm',      -- заклики до самоушкодження
    'misinformation', -- дезінформація
    'other'
);

CREATE TYPE complaint_status AS ENUM (
    'open',      -- нова, не розглянута
    'resolved',  -- контент видалено
    'rejected'   -- скаргу відхилено
);

CREATE TYPE notification_type AS ENUM (
    'new_comment',    -- новий коментар під моїм зверненням
    'warning',        -- попередження від модератора
    'content_removed' -- мій контент видалено модератором
);

-- ---------------------------------------------------------------------
-- 3. Функція-тригер для updated_at (DRY — використаємо на кількох таблицях)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION psyhelp.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 4. Таблиця USERS — облікові записи
-- ---------------------------------------------------------------------
-- Рішення нормалізації:
--   * email/nickname — NOT NULL UNIQUE (3НФ: жодних залежностей між ними)
--   * role винесений в ENUM замість окремої таблиці Roles — доменів
--     всього 2-3, окрема таблиця була б over-engineering
--   * warnings_count зберігається денормалізовано для швидкого відображення
--     в панелі модерації; підтримується тригером на warnings (див. далі)
-- Анонімність: у публічних API назовні віддаємо лише nickname; email ніколи.
CREATE TABLE psyhelp.users (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email           CITEXT       NOT NULL UNIQUE,
    password_hash   TEXT         NOT NULL,       -- bcrypt: $2b$12$...
    nickname        VARCHAR(32)  NOT NULL UNIQUE,
    role            user_role    NOT NULL DEFAULT 'user',

    -- Стан облікового запису
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    is_banned       BOOLEAN      NOT NULL DEFAULT FALSE,
    banned_until    TIMESTAMPTZ,                 -- NULL = не заблоковано / перманент
    warnings_count  SMALLINT     NOT NULL DEFAULT 0 CHECK (warnings_count >= 0),

    -- Аудит
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_login_at   TIMESTAMPTZ,

    -- Валідація
    CONSTRAINT users_nickname_format CHECK (nickname ~ '^[A-Za-z0-9_]{3,32}$'),
    CONSTRAINT users_email_format    CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON psyhelp.users
    FOR EACH ROW EXECUTE FUNCTION psyhelp.set_updated_at();

COMMENT ON TABLE  psyhelp.users IS 'Облікові записи. Anonym-first: nickname публічний, email — ні.';
COMMENT ON COLUMN psyhelp.users.password_hash IS 'bcrypt cost>=12. НІКОЛИ не повертати назовні.';

-- ---------------------------------------------------------------------
-- 5. Таблиця CATEGORIES — тематичні категорії звернень
-- ---------------------------------------------------------------------
-- Виокремлена в таблицю (а не ENUM), бо з вимог 2.3.1 та нефункціональних
-- вимог: «структура БД має дозволяти ефективне додавання нових категорій».
-- ENUM вимагав би міграцій — тут список редагується модератором через адмінку.
CREATE TABLE psyhelp.categories (
    id          SMALLSERIAL  PRIMARY KEY,
    name        VARCHAR(64)  NOT NULL UNIQUE,
    slug        VARCHAR(64)  NOT NULL UNIQUE,    -- для URL: /posts?cat=anxiety
    description TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order  SMALLINT     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE psyhelp.categories IS
    'Тематики звернень (тривожність, стосунки, робота тощо). Редагується модератором.';

-- ---------------------------------------------------------------------
-- 6. Таблиця POSTS — анонімні звернення
-- ---------------------------------------------------------------------
-- Ключові рішення:
--   * ON DELETE RESTRICT для user_id — звернення не зникають при видаленні
--     автора; замість цього використовується soft-delete is_deleted.
--     Це потрібно і для анонімності (збережені коментарі не "згорають"),
--     і для аудиту модерації.
--   * ON DELETE RESTRICT для category_id — не даємо видалити категорію,
--     якщо в ній є звернення (примус ре-категоризувати).
--   * Денормалізовані лічильники comments_count, complaints_count —
--     підтримуються тригерами. Інакше стрічка з 10к звернень + сортування
--     "за кількістю коментарів" = 10к COUNT(*) запитів = смерть.
--   * rating_score (FLOAT) — хранимий score "актуальності проблеми",
--     оновлюється фоновим job-ом (див. query-приклади).
CREATE TABLE psyhelp.posts (
    id               BIGSERIAL    PRIMARY KEY,
    user_id          UUID         NOT NULL REFERENCES psyhelp.users(id)      ON DELETE RESTRICT,
    category_id      SMALLINT     NOT NULL REFERENCES psyhelp.categories(id) ON DELETE RESTRICT,

    body             TEXT         NOT NULL CHECK (char_length(body) BETWEEN 10 AND 5000),

    -- Денормалізовані лічильники (підтримуються тригерами)
    comments_count   INTEGER      NOT NULL DEFAULT 0 CHECK (comments_count   >= 0),
    complaints_count INTEGER      NOT NULL DEFAULT 0 CHECK (complaints_count >= 0),

    -- Рейтинг актуальності (для "Рейтингу проблем")
    rating_score     DOUBLE PRECISION NOT NULL DEFAULT 0,

    -- Soft-delete (модератор або автор)
    is_deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at       TIMESTAMPTZ,
    deleted_by       UUID         REFERENCES psyhelp.users(id) ON DELETE SET NULL,

    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_posts_updated_at
    BEFORE UPDATE ON psyhelp.posts
    FOR EACH ROW EXECUTE FUNCTION psyhelp.set_updated_at();

COMMENT ON COLUMN psyhelp.posts.user_id IS
    'Автор. У публічному API НІКОЛИ не віддається — лише через join з users.nickname.';

-- ---------------------------------------------------------------------
-- 7. Таблиця COMMENTS — коментарі підтримки
-- ---------------------------------------------------------------------
CREATE TABLE psyhelp.comments (
    id           BIGSERIAL    PRIMARY KEY,
    post_id      BIGINT       NOT NULL REFERENCES psyhelp.posts(id) ON DELETE CASCADE,
    user_id      UUID         NOT NULL REFERENCES psyhelp.users(id) ON DELETE RESTRICT,

    body         TEXT         NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),

    is_deleted   BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at   TIMESTAMPTZ,
    deleted_by   UUID         REFERENCES psyhelp.users(id) ON DELETE SET NULL,

    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_comments_updated_at
    BEFORE UPDATE ON psyhelp.comments
    FOR EACH ROW EXECUTE FUNCTION psyhelp.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. Таблиця DIARY — записи емоційного щоденника (ЧУТЛИВІ ДАНІ)
-- ---------------------------------------------------------------------
-- ВАЖЛИВО: відповідно до вимог 2.3.2 («Модератор не повинен мати доступу
-- до вмісту емоційних щоденників») цю таблицю захищено через RLS (див. 04_rls.sql).
-- Нотатка note зашифрована симетрично pgp_sym_encrypt з ключем з GUC,
-- щоб навіть при витоку дампа БД вміст був недоступний без application-ключа.
CREATE TABLE psyhelp.diary (
    id             BIGSERIAL    PRIMARY KEY,
    user_id        UUID         NOT NULL REFERENCES psyhelp.users(id) ON DELETE CASCADE,

    mood           SMALLINT     NOT NULL CHECK (mood BETWEEN 1 AND 10),
    note_encrypted BYTEA,        -- pgp_sym_encrypt(note, current_setting('app.encryption_key'))

    entry_date     DATE         NOT NULL DEFAULT CURRENT_DATE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Один запис на день на користувача (бізнес-правило: 1 фіксація настрою в день).
    -- Якщо користувач редагує — UPDATE, а не новий INSERT.
    CONSTRAINT diary_one_per_day UNIQUE (user_id, entry_date)
);

CREATE TRIGGER trg_diary_updated_at
    BEFORE UPDATE ON psyhelp.diary
    FOR EACH ROW EXECUTE FUNCTION psyhelp.set_updated_at();

COMMENT ON TABLE  psyhelp.diary IS
    'ЧУТЛИВІ ДАНІ. RLS-захищена. Модератори НЕ мають доступу. Нотатка шифрована.';
COMMENT ON COLUMN psyhelp.diary.note_encrypted IS
    'pgp_sym_encrypt(note_plaintext, current_setting(''app.encryption_key'')). Розшифровка лише в app-шарі або через SECURITY DEFINER функції від імені власника.';

-- ---------------------------------------------------------------------
-- 9. Таблиця CHAT_AI — історія діалогів з AI-помічником (ЧУТЛИВІ ДАНІ)
-- ---------------------------------------------------------------------
-- Аналогічно diary — RLS, шифрування повідомлень.
-- conversation_id групує повідомлення в сесію чату (UX: "Новий чат").
CREATE TABLE psyhelp.chat_ai (
    id                BIGSERIAL    PRIMARY KEY,
    user_id           UUID         NOT NULL REFERENCES psyhelp.users(id) ON DELETE CASCADE,
    conversation_id   UUID         NOT NULL,              -- група повідомлень одного діалогу

    role              chat_role    NOT NULL,              -- 'user' | 'assistant'
    message_encrypted BYTEA        NOT NULL,              -- pgp_sym_encrypt(...)

    -- Токени (для бюджетування OpenAI на стороні backend)
    token_count       INTEGER      CHECK (token_count IS NULL OR token_count >= 0),

    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE psyhelp.chat_ai IS
    'ЧУТЛИВІ ДАНІ. RLS-захищена. Модератори НЕ мають доступу.';

-- ---------------------------------------------------------------------
-- 10. Таблиця COMPLAINTS — скарги
-- ---------------------------------------------------------------------
-- Зауваження щодо нормалізації: (content_type, content_id) — це
-- «polymorphic FK» (пост АБО коментар). Чистий реляційний підхід —
-- дві окремі таблиці complaints_on_posts / complaints_on_comments.
-- Але це подвоює DAO-шар у backend без вигод → лишаємо polymorphic +
-- CHECK через тригер (див. нижче) для цілісності.
CREATE TABLE psyhelp.complaints (
    id            BIGSERIAL          PRIMARY KEY,
    reporter_id   UUID               NOT NULL REFERENCES psyhelp.users(id) ON DELETE CASCADE,

    content_type  content_type       NOT NULL,
    content_id    BIGINT             NOT NULL,

    reason        complaint_reason   NOT NULL,
    comment       VARCHAR(500),      -- уточнення скаржника

    status        complaint_status   NOT NULL DEFAULT 'open',
    resolved_by   UUID               REFERENCES psyhelp.users(id) ON DELETE SET NULL,
    resolved_at   TIMESTAMPTZ,

    created_at    TIMESTAMPTZ        NOT NULL DEFAULT now(),

    -- Одна скарга від одного юзера на одну одиницю контенту
    CONSTRAINT complaints_unique_per_user
        UNIQUE (reporter_id, content_type, content_id)
);

-- Тригер цілісності для polymorphic FK: переконуємося, що content_id
-- реально існує у відповідній таблиці.
CREATE OR REPLACE FUNCTION psyhelp.complaints_check_target()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.content_type = 'post' THEN
        IF NOT EXISTS (SELECT 1 FROM psyhelp.posts WHERE id = NEW.content_id) THEN
            RAISE EXCEPTION 'Post % does not exist', NEW.content_id;
        END IF;
    ELSIF NEW.content_type = 'comment' THEN
        IF NOT EXISTS (SELECT 1 FROM psyhelp.comments WHERE id = NEW.content_id) THEN
            RAISE EXCEPTION 'Comment % does not exist', NEW.content_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_complaints_check_target
    BEFORE INSERT OR UPDATE OF content_type, content_id ON psyhelp.complaints
    FOR EACH ROW EXECUTE FUNCTION psyhelp.complaints_check_target();

-- ---------------------------------------------------------------------
-- 11. Таблиця NOTIFICATIONS — сповіщення
-- ---------------------------------------------------------------------
CREATE TABLE psyhelp.notifications (
    id          BIGSERIAL         PRIMARY KEY,
    user_id     UUID              NOT NULL REFERENCES psyhelp.users(id) ON DELETE CASCADE,

    type        notification_type NOT NULL,

    -- Опціональні посилання на сутності (залежно від type)
    post_id     BIGINT            REFERENCES psyhelp.posts(id)    ON DELETE CASCADE,
    comment_id  BIGINT            REFERENCES psyhelp.comments(id) ON DELETE CASCADE,

    payload     JSONB             NOT NULL DEFAULT '{}'::JSONB,  -- доп. дані (текст, URL)
    is_read     BOOLEAN           NOT NULL DEFAULT FALSE,
    read_at     TIMESTAMPTZ,

    created_at  TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 12. Таблиця SESSIONS — JWT-сесії / refresh-токени
-- ---------------------------------------------------------------------
-- ВАЖЛИВО: зберігаємо хеш токена, а не сам токен. Витік дампа БД ≠ витік сесій.
CREATE TABLE psyhelp.sessions (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES psyhelp.users(id) ON DELETE CASCADE,

    token_hash      TEXT         NOT NULL UNIQUE,  -- SHA-256(refresh_token)
    user_agent      TEXT,
    ip_address      INET,

    issued_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ  NOT NULL,
    revoked_at      TIMESTAMPTZ,

    CONSTRAINT sessions_expires_future CHECK (expires_at > issued_at)
);

COMMENT ON COLUMN psyhelp.sessions.token_hash IS
    'SHA-256 від refresh-токена. Сам токен ніколи не зберігається.';

-- ---------------------------------------------------------------------
-- 13. Таблиця WARNINGS — попередження модератора користувачам
-- ---------------------------------------------------------------------
-- Не згадана прямо в п.2.7, але випливає з користувацьких історій модератора
-- («винести попередження», users.warnings_count). Тримаємо історію окремо.
CREATE TABLE psyhelp.warnings (
    id              BIGSERIAL    PRIMARY KEY,
    user_id         UUID         NOT NULL REFERENCES psyhelp.users(id) ON DELETE CASCADE,
    moderator_id    UUID         NOT NULL REFERENCES psyhelp.users(id) ON DELETE RESTRICT,
    complaint_id    BIGINT       REFERENCES psyhelp.complaints(id) ON DELETE SET NULL,
    reason          TEXT         NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Тригер для підтримки users.warnings_count
CREATE OR REPLACE FUNCTION psyhelp.warnings_sync_counter()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE psyhelp.users SET warnings_count = warnings_count + 1 WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE psyhelp.users SET warnings_count = GREATEST(warnings_count - 1, 0) WHERE id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_warnings_counter
    AFTER INSERT OR DELETE ON psyhelp.warnings
    FOR EACH ROW EXECUTE FUNCTION psyhelp.warnings_sync_counter();

-- ---------------------------------------------------------------------
-- 14. Таблиця AUDIT — журнал дій модератора (у окремій схемі)
-- ---------------------------------------------------------------------
CREATE TABLE psyhelp_audit.moderation_log (
    id           BIGSERIAL    PRIMARY KEY,
    moderator_id UUID         NOT NULL,
    action       TEXT         NOT NULL,   -- 'delete_post', 'delete_comment', 'warn_user', 'ban_user', 'resolve_complaint'
    target_type  TEXT         NOT NULL,   -- 'post' | 'comment' | 'user' | 'complaint'
    target_id    TEXT         NOT NULL,
    details      JSONB        NOT NULL DEFAULT '{}'::JSONB,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE psyhelp_audit.moderation_log IS
    'Immutable-журнал усіх дій модератора. INSERT-only (ніяких UPDATE/DELETE з app).';

-- ---------------------------------------------------------------------
-- 15. Тригери для денормалізованих лічильників
-- ---------------------------------------------------------------------

-- posts.comments_count
CREATE OR REPLACE FUNCTION psyhelp.sync_comments_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE psyhelp.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE psyhelp.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted IS DISTINCT FROM NEW.is_deleted THEN
        -- soft-delete/undelete також має оновлювати лічильник
        IF NEW.is_deleted THEN
            UPDATE psyhelp.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = NEW.post_id;
        ELSE
            UPDATE psyhelp.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_comments_counter
    AFTER INSERT OR DELETE OR UPDATE OF is_deleted ON psyhelp.comments
    FOR EACH ROW EXECUTE FUNCTION psyhelp.sync_comments_count();

-- posts.complaints_count (підтримується тригером на complaints.status='open')
CREATE OR REPLACE FUNCTION psyhelp.sync_complaints_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.content_type = 'post' AND TG_OP = 'INSERT' THEN
        UPDATE psyhelp.posts SET complaints_count = complaints_count + 1 WHERE id = NEW.content_id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_complaints_counter
    AFTER INSERT ON psyhelp.complaints
    FOR EACH ROW EXECUTE FUNCTION psyhelp.sync_complaints_count();
