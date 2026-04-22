-- =====================================================================
-- 05_encryption.sql — Шифрування чутливих даних
--
-- Рівні захисту:
--
--  1) Транспорт: HTTPS/TLS (вимога 2.3.2) — конфігурується на
--     reverse-proxy (Nginx) і pg_hba.conf (hostssl).
--
--  2) At rest: ОС-рівневе шифрування диска (LUKS/AWS EBS/dm-crypt) —
--     задається на рівні інфраструктури, тут не показано.
--
--  3) Колонкове (app-level) шифрування через pgcrypto — для найбільш
--     чутливих полів: diary.note, chat_ai.message. Ключ шифрування НЕ
--     зберігається в БД, а передається при старті backend через
--     env var (PSYHELP_ENCRYPTION_KEY) і виставляється як GUC:
--
--         SET app.encryption_key = '<key_from_env>';
--
--     Так витік дампа БД без доступу до runtime-середовища =
--     зашифровані байти.
--
--  4) Паролі: bcrypt (pgcrypto crypt()), cost 12.
--
--  5) Refresh-токени: SHA-256, ніколи не зберігаються в plaintext.
-- =====================================================================

SET search_path TO psyhelp, public;

-- ---------------------------------------------------------------------
-- 1. Хелпери для шифрування / дешифрування
-- ---------------------------------------------------------------------
-- SECURITY DEFINER — функція виконується з правами власника (psyhelp_owner),
-- що дозволяє backend викликати їх, не маючи прямого доступу до ключа
-- з псевдо-ролей psyhelp_user/_moderator.
--
-- STABLE — не модифікує дані; дозволяє використання в WHERE.

CREATE OR REPLACE FUNCTION psyhelp.encrypt_text(plaintext TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    k TEXT;
BEGIN
    k := current_setting('app.encryption_key', TRUE);
    IF k IS NULL OR k = '' THEN
        RAISE EXCEPTION 'app.encryption_key is not set';
    END IF;
    IF plaintext IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN pgp_sym_encrypt(plaintext, k, 'cipher-algo=aes256');
END;
$$;

CREATE OR REPLACE FUNCTION psyhelp.decrypt_text(ciphertext BYTEA)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    k TEXT;
BEGIN
    k := current_setting('app.encryption_key', TRUE);
    IF k IS NULL OR k = '' THEN
        RAISE EXCEPTION 'app.encryption_key is not set';
    END IF;
    IF ciphertext IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN pgp_sym_decrypt(ciphertext, k);
END;
$$;

REVOKE ALL ON FUNCTION psyhelp.encrypt_text(TEXT)  FROM PUBLIC;
REVOKE ALL ON FUNCTION psyhelp.decrypt_text(BYTEA) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION psyhelp.encrypt_text(TEXT)  TO psyhelp_user, psyhelp_app;
GRANT  EXECUTE ON FUNCTION psyhelp.decrypt_text(BYTEA) TO psyhelp_user, psyhelp_app;
-- psyhelp_moderator НЕ отримує EXECUTE — навіть випадковий виклик
-- декриптора модератором поверне помилку недостатньо прав.

-- ---------------------------------------------------------------------
-- 2. VIEW з автоматичним дешифруванням (зручно для backend)
-- ---------------------------------------------------------------------
-- В'юшка наслідує RLS батьківської таблиці (secure-invoker behavior
-- у PostgreSQL 15+).

CREATE OR REPLACE VIEW psyhelp.v_diary
WITH (security_invoker = TRUE) AS
SELECT  id,
        user_id,
        mood,
        psyhelp.decrypt_text(note_encrypted) AS note,
        entry_date,
        created_at,
        updated_at
FROM    psyhelp.diary;

GRANT SELECT ON psyhelp.v_diary TO psyhelp_user, psyhelp_app;

CREATE OR REPLACE VIEW psyhelp.v_chat_ai
WITH (security_invoker = TRUE) AS
SELECT  id,
        user_id,
        conversation_id,
        role,
        psyhelp.decrypt_text(message_encrypted) AS message,
        token_count,
        created_at
FROM    psyhelp.chat_ai;

GRANT SELECT ON psyhelp.v_chat_ai TO psyhelp_user, psyhelp_app;

-- ---------------------------------------------------------------------
-- 3. Хелпери для роботи з паролями (bcrypt)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION psyhelp.hash_password(password TEXT)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT crypt(password, gen_salt('bf', 12));
$$;

CREATE OR REPLACE FUNCTION psyhelp.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT hash = crypt(password, hash);
$$;

REVOKE ALL ON FUNCTION psyhelp.hash_password(TEXT)           FROM PUBLIC;
REVOKE ALL ON FUNCTION psyhelp.verify_password(TEXT, TEXT)   FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION psyhelp.hash_password(TEXT)           TO psyhelp_app;
GRANT  EXECUTE ON FUNCTION psyhelp.verify_password(TEXT, TEXT)   TO psyhelp_app;
-- Примітка: перевірка пароля можлива й на стороні backend (bcryptjs).
-- Тоді password_hash тільки зберігається, а не перевіряється в БД.

-- ---------------------------------------------------------------------
-- 4. Приклад використання з backend
-- ---------------------------------------------------------------------
--
-- INSERT diary:
--   INSERT INTO psyhelp.diary (user_id, mood, note_encrypted, entry_date)
--   VALUES ($1, $2, psyhelp.encrypt_text($3), CURRENT_DATE)
--   ON CONFLICT (user_id, entry_date) DO UPDATE
--     SET mood = EXCLUDED.mood,
--         note_encrypted = EXCLUDED.note_encrypted;
--
-- SELECT diary:
--   SELECT id, mood, note, entry_date FROM psyhelp.v_diary
--   WHERE user_id = current_setting('app.current_user_id')::UUID
--   ORDER BY entry_date DESC LIMIT 30;
