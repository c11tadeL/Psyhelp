-- =====================================================================
-- 03_roles.sql — Ролі й GRANT-и
--
-- Модель ролей (принцип найменших привілеїв):
--
--   psyhelp_owner    — власник схем і таблиць. DDL-роль. Нею запускаються
--                      лише міграції (наприклад, з CI), НЕ через backend.
--
--   psyhelp_app      — роль application-підключення backend (Node.js).
--                      Має DML на всі таблиці, але через RLS бачить тільки
--                      дозволене. SET ROLE з неї у psyhelp_user/_moderator
--                      робиться middleware-ом після валідації JWT.
--
--   psyhelp_user     — роль "звичайний користувач" (non-login).
--                      Backend робить SET ROLE psyhelp_user + SET
--                      app.current_user_id = <uuid> на початку транзакції.
--
--   psyhelp_moderator — те саме для модераторів.
--
--   psyhelp_readonly  — read-only роль для аналітики/резервного копіювання.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Створення ролей (ідемпотентно)
-- ---------------------------------------------------------------------
-- ПАРОЛІ встановлюються окремо через ALTER ROLE після створення, щоб
-- не тримати їх у міграціях. Приклад (виконати вручну від суперюзера):
--
--   ALTER ROLE psyhelp_owner    WITH PASSWORD 'з-vault';
--   ALTER ROLE psyhelp_app      WITH PASSWORD 'з-vault';
--   ALTER ROLE psyhelp_readonly WITH PASSWORD 'з-vault';
--
-- У production використовуйте SCRAM-SHA-256 (pg_hba.conf + password_encryption).

DO $$ BEGIN
    CREATE ROLE psyhelp_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE ROLE psyhelp_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE ROLE psyhelp_user NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE ROLE psyhelp_moderator NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE ROLE psyhelp_readonly LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- app має право "стати" будь-ким з двох нижче — середній крок у
-- ланцюгу безпеки: navbar-middleware викликає SET ROLE.
GRANT psyhelp_user      TO psyhelp_app;
GRANT psyhelp_moderator TO psyhelp_app;

-- ---------------------------------------------------------------------
-- 2. Власник таблиць
-- ---------------------------------------------------------------------
-- Рекомендується створювати всі об'єкти від імені psyhelp_owner,
-- щоб уникнути неконсистентного owner-а після міграцій:
ALTER SCHEMA psyhelp             OWNER TO psyhelp_owner;
ALTER SCHEMA psyhelp_audit       OWNER TO psyhelp_owner;

DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname IN ('psyhelp', 'psyhelp_audit')
    LOOP
        EXECUTE format('ALTER TABLE %I.%I OWNER TO psyhelp_owner',
                       r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 3. USAGE на схеми
-- ---------------------------------------------------------------------
GRANT USAGE ON SCHEMA psyhelp       TO psyhelp_app, psyhelp_user,
                                       psyhelp_moderator, psyhelp_readonly;
GRANT USAGE ON SCHEMA psyhelp_audit TO psyhelp_app, psyhelp_moderator, psyhelp_readonly;

-- ---------------------------------------------------------------------
-- 4. Права на таблиці
-- ---------------------------------------------------------------------

-- PSYHELP_APP — базові CRUD-права; RLS робить все інше.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA psyhelp TO psyhelp_app;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA psyhelp TO psyhelp_app;

-- PSYHELP_USER — ідентичні права app, але з іншим RLS-контекстом.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA psyhelp TO psyhelp_user;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA psyhelp TO psyhelp_user;

-- PSYHELP_MODERATOR
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA psyhelp TO psyhelp_moderator;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA psyhelp TO psyhelp_moderator;

-- Модератор пише в audit-log.
GRANT INSERT, SELECT ON psyhelp_audit.moderation_log TO psyhelp_moderator;
GRANT USAGE, SELECT  ON SEQUENCE psyhelp_audit.moderation_log_id_seq TO psyhelp_moderator;

-- Явно забороняємо модераторам UPDATE/DELETE на audit-log:
REVOKE UPDATE, DELETE ON psyhelp_audit.moderation_log FROM psyhelp_moderator;

-- READONLY — тільки SELECT (крім чутливих таблиць).
GRANT SELECT ON ALL TABLES IN SCHEMA psyhelp TO psyhelp_readonly;
REVOKE SELECT ON psyhelp.diary, psyhelp.chat_ai, psyhelp.sessions FROM psyhelp_readonly;

-- ---------------------------------------------------------------------
-- 5. Дефолти для майбутніх об'єктів
-- ---------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE psyhelp_owner IN SCHEMA psyhelp
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
    TO psyhelp_app, psyhelp_user, psyhelp_moderator;

ALTER DEFAULT PRIVILEGES FOR ROLE psyhelp_owner IN SCHEMA psyhelp
    GRANT USAGE, SELECT ON SEQUENCES
    TO psyhelp_app, psyhelp_user, psyhelp_moderator;

ALTER DEFAULT PRIVILEGES FOR ROLE psyhelp_owner IN SCHEMA psyhelp
    GRANT SELECT ON TABLES TO psyhelp_readonly;

-- ---------------------------------------------------------------------
-- 6. Явні REVOKE для чутливих колонок
-- ---------------------------------------------------------------------
-- Страховка, навіть якщо RLS хтось вимкне:
REVOKE SELECT (password_hash, email) ON psyhelp.users FROM psyhelp_moderator;
REVOKE SELECT (password_hash)        ON psyhelp.users FROM psyhelp_user, psyhelp_readonly;

-- psyhelp_user НЕ бачить audit-log взагалі:
REVOKE ALL ON SCHEMA psyhelp_audit FROM psyhelp_user;
