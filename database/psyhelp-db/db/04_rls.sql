-- =====================================================================
-- 04_rls.sql — Row-Level Security (RLS)
--
-- RLS — основний механізм, яким реалізується вимога з п.2.3.2:
-- «Модератор не повинен мати доступу до вмісту емоційних щоденників та
-- історії спілкування з AI-помічником».
--
-- Ключовий прийом: backend після валідації JWT виконує на початку
-- транзакції:
--
--     SET LOCAL app.current_user_id = '<uuid юзера>';
--     SET LOCAL ROLE psyhelp_user;           -- або psyhelp_moderator
--
-- Політики нижче читають app.current_user_id через current_setting().
-- =====================================================================

SET search_path TO psyhelp, public;

-- ---------------------------------------------------------------------
-- Допоміжна функція: поточний user_id з GUC, UUID.
-- STABLE — планувальник може кешувати в межах запиту.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION psyhelp.current_user_id()
RETURNS UUID
LANGUAGE SQL STABLE AS $$
    SELECT NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
$$;

-- ---------------------------------------------------------------------
-- USERS: юзер бачить свій запис, модератор — усі (крім password_hash,
-- який REVOKE-нутий на рівні колонок).
-- ---------------------------------------------------------------------
ALTER TABLE psyhelp.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE psyhelp.users FORCE  ROW LEVEL SECURITY;

CREATE POLICY users_self_select ON psyhelp.users
    FOR SELECT TO psyhelp_user
    USING (id = psyhelp.current_user_id());

CREATE POLICY users_self_update ON psyhelp.users
    FOR UPDATE TO psyhelp_user
    USING     (id = psyhelp.current_user_id())
    WITH CHECK (id = psyhelp.current_user_id()
                AND role = 'user');   -- не дати ескалувати роль

CREATE POLICY users_moderator_all ON psyhelp.users
    FOR ALL TO psyhelp_moderator
    USING (TRUE);

-- psyhelp_app може робити ВСЕ (вона — "ніхто" до SET ROLE, нею виконуються
-- службові операції типу реєстрації, де current_user_id ще не встановлений).
CREATE POLICY users_app_all ON psyhelp.users
    FOR ALL TO psyhelp_app
    USING (TRUE) WITH CHECK (TRUE);

-- ---------------------------------------------------------------------
-- POSTS: усі бачать не-видалені; автор бачить свої навіть видалені;
-- модератор бачить усе.
-- ---------------------------------------------------------------------
ALTER TABLE psyhelp.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE psyhelp.posts FORCE  ROW LEVEL SECURITY;

-- Перегляд (публічна стрічка для всіх зі SET ROLE psyhelp_user).
CREATE POLICY posts_read_public ON psyhelp.posts
    FOR SELECT TO psyhelp_user
    USING (is_deleted = FALSE OR user_id = psyhelp.current_user_id());

-- Створення — лише від імені себе.
CREATE POLICY posts_insert_self ON psyhelp.posts
    FOR INSERT TO psyhelp_user
    WITH CHECK (user_id = psyhelp.current_user_id());

-- Редагування — лише власних і не-видалених.
CREATE POLICY posts_update_own ON psyhelp.posts
    FOR UPDATE TO psyhelp_user
    USING      (user_id = psyhelp.current_user_id() AND is_deleted = FALSE)
    WITH CHECK (user_id = psyhelp.current_user_id());

-- Soft-delete робиться через UPDATE is_deleted=TRUE — DELETE заборонено.
CREATE POLICY posts_moderator_all ON psyhelp.posts
    FOR ALL TO psyhelp_moderator
    USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY posts_app_all ON psyhelp.posts
    FOR ALL TO psyhelp_app
    USING (TRUE) WITH CHECK (TRUE);

-- ---------------------------------------------------------------------
-- COMMENTS: аналогічно posts
-- ---------------------------------------------------------------------
ALTER TABLE psyhelp.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE psyhelp.comments FORCE  ROW LEVEL SECURITY;

CREATE POLICY comments_read_public ON psyhelp.comments
    FOR SELECT TO psyhelp_user
    USING (is_deleted = FALSE OR user_id = psyhelp.current_user_id());

CREATE POLICY comments_insert_self ON psyhelp.comments
    FOR INSERT TO psyhelp_user
    WITH CHECK (user_id = psyhelp.current_user_id());

CREATE POLICY comments_update_own ON psyhelp.comments
    FOR UPDATE TO psyhelp_user
    USING      (user_id = psyhelp.current_user_id())
    WITH CHECK (user_id = psyhelp.current_user_id());

CREATE POLICY comments_moderator_all ON psyhelp.comments
    FOR ALL TO psyhelp_moderator USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY comments_app_all ON psyhelp.comments
    FOR ALL TO psyhelp_app USING (TRUE) WITH CHECK (TRUE);

-- ---------------------------------------------------------------------
-- DIARY: тільки власник. Модератор — ніколи.
-- ---------------------------------------------------------------------
ALTER TABLE psyhelp.diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE psyhelp.diary FORCE  ROW LEVEL SECURITY;

CREATE POLICY diary_owner_only ON psyhelp.diary
    FOR ALL TO psyhelp_user
    USING      (user_id = psyhelp.current_user_id())
    WITH CHECK (user_id = psyhelp.current_user_id());

-- ВАЖЛИВО: для psyhelp_moderator політики НЕМАЄ → усі запити повертають 0 рядків.
-- Це реалізує вимогу «модератор не має доступу до щоденників».

-- app може виконувати сервісні операції (наприклад, видалення при видаленні юзера):
CREATE POLICY diary_app_all ON psyhelp.diary
    FOR ALL TO psyhelp_app USING (TRUE) WITH CHECK (TRUE);

-- ---------------------------------------------------------------------
-- CHAT_AI: тільки власник. Модератор — ніколи.
-- ---------------------------------------------------------------------
ALTER TABLE psyhelp.chat_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE psyhelp.chat_ai FORCE  ROW LEVEL SECURITY;

CREATE POLICY chat_owner_only ON psyhelp.chat_ai
    FOR ALL TO psyhelp_user
    USING      (user_id = psyhelp.current_user_id())
    WITH CHECK (user_id = psyhelp.current_user_id());

CREATE POLICY chat_app_all ON psyhelp.chat_ai
    FOR ALL TO psyhelp_app USING (TRUE) WITH CHECK (TRUE);

-- ---------------------------------------------------------------------
-- COMPLAINTS: скаржник бачить свої скарги, модератор — усі.
-- ---------------------------------------------------------------------
ALTER TABLE psyhelp.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE psyhelp.complaints FORCE  ROW LEVEL SECURITY;

CREATE POLICY complaints_reporter_read ON psyhelp.complaints
    FOR SELECT TO psyhelp_user
    USING (reporter_id = psyhelp.current_user_id());

CREATE POLICY complaints_reporter_insert ON psyhelp.complaints
    FOR INSERT TO psyhelp_user
    WITH CHECK (reporter_id = psyhelp.current_user_id());

CREATE POLICY complaints_moderator_all ON psyhelp.complaints
    FOR ALL TO psyhelp_moderator USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY complaints_app_all ON psyhelp.complaints
    FOR ALL TO psyhelp_app USING (TRUE) WITH CHECK (TRUE);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS: тільки отримувач.
-- ---------------------------------------------------------------------
ALTER TABLE psyhelp.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE psyhelp.notifications FORCE  ROW LEVEL SECURITY;

CREATE POLICY notifications_owner ON psyhelp.notifications
    FOR ALL TO psyhelp_user
    USING      (user_id = psyhelp.current_user_id())
    WITH CHECK (user_id = psyhelp.current_user_id());

CREATE POLICY notifications_app_all ON psyhelp.notifications
    FOR ALL TO psyhelp_app USING (TRUE) WITH CHECK (TRUE);

-- ---------------------------------------------------------------------
-- SESSIONS: тільки власник.
-- ---------------------------------------------------------------------
ALTER TABLE psyhelp.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE psyhelp.sessions FORCE  ROW LEVEL SECURITY;

CREATE POLICY sessions_owner ON psyhelp.sessions
    FOR ALL TO psyhelp_user
    USING      (user_id = psyhelp.current_user_id())
    WITH CHECK (user_id = psyhelp.current_user_id());

-- app робить INSERT при логіні, DELETE при logout (current_user_id ще не виставлений
-- або тільки-що виставлений — app-політика потрібна).
CREATE POLICY sessions_app_all ON psyhelp.sessions
    FOR ALL TO psyhelp_app USING (TRUE) WITH CHECK (TRUE);

-- ---------------------------------------------------------------------
-- WARNINGS: юзер бачить власні попередження, модератор — усі.
-- ---------------------------------------------------------------------
ALTER TABLE psyhelp.warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE psyhelp.warnings FORCE  ROW LEVEL SECURITY;

CREATE POLICY warnings_user_read ON psyhelp.warnings
    FOR SELECT TO psyhelp_user
    USING (user_id = psyhelp.current_user_id());

CREATE POLICY warnings_moderator_all ON psyhelp.warnings
    FOR ALL TO psyhelp_moderator USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY warnings_app_all ON psyhelp.warnings
    FOR ALL TO psyhelp_app USING (TRUE) WITH CHECK (TRUE);

-- ---------------------------------------------------------------------
-- CATEGORIES: читають усі, пишуть модератори.
-- ---------------------------------------------------------------------
ALTER TABLE psyhelp.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE psyhelp.categories FORCE  ROW LEVEL SECURITY;

CREATE POLICY categories_read_all ON psyhelp.categories
    FOR SELECT USING (TRUE);                      -- будь-яка роль

CREATE POLICY categories_moderator_write ON psyhelp.categories
    FOR ALL TO psyhelp_moderator USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY categories_app_all ON psyhelp.categories
    FOR ALL TO psyhelp_app USING (TRUE) WITH CHECK (TRUE);
