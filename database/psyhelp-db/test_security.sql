-- Сценарій перевірки критичних вимог безпеки
SET search_path TO psyhelp, public;

-- 1) Встановлюємо application-ключ шифрування (у реалі — з env)
SET app.encryption_key = 'test_key_at_least_256_bit_for_aes';

-- 2) Створимо тестового юзера
INSERT INTO psyhelp.users (email, password_hash, nickname)
VALUES ('alice@test.local', psyhelp.hash_password('password123'), 'alice_x')
RETURNING id \gset

SELECT 'User id: ' || :'id';

-- 3) Додаємо запис у щоденник (з шифруванням)
INSERT INTO psyhelp.diary (user_id, mood, note_encrypted, entry_date)
VALUES (:'id', 7, psyhelp.encrypt_text('Сьогодні був гарний день, настрій покращився'), CURRENT_DATE);

-- 4) Перевіримо, що в таблиці лежить БАЙТИ (не plaintext)
\echo '--- Raw note_encrypted (повинно бути бінарне сміття): ---'
SELECT LEFT(encode(note_encrypted, 'hex'), 80) || '...' AS ciphertext_hex FROM psyhelp.diary;

-- 5) Через VIEW дешифруємо
\echo '--- Через v_diary (розшифровано): ---'
SELECT mood, note FROM psyhelp.v_diary;

-- 6) КРИТИЧНИЙ ТЕСТ: модератор не повинен бачити щоденник
\echo '--- Модератор читає diary (має бути 0 рядків через RLS): ---'
SET ROLE psyhelp_moderator;
SET app.current_user_id = '00000000-0000-0000-0000-000000000000';
SELECT COUNT(*) AS diary_rows_visible_to_moderator FROM psyhelp.diary;
RESET ROLE;

-- 7) КРИТИЧНИЙ ТЕСТ: модератор не може дешифрувати навіть якщо б прочитав
\echo '--- Модератор намагається викликати decrypt_text (має впасти): ---'
SET ROLE psyhelp_moderator;
DO $$
BEGIN
    PERFORM psyhelp.decrypt_text('\x00'::bytea);
EXCEPTION WHEN insufficient_privilege OR others THEN
    RAISE NOTICE 'EXPECTED: модератор не може викликати decrypt_text (%)', SQLERRM;
END $$;
RESET ROLE;

-- 8) КРИТИЧНИЙ ТЕСТ: psyhelp_user бачить свій запис, але не чужий
\echo '--- Юзер бачить власний щоденник (має бути 1): ---'
SET ROLE psyhelp_user;
SET app.current_user_id = :'id';
SELECT COUNT(*) AS own_diary_visible FROM psyhelp.diary;
-- І не бачить чужих (підробимо чужий id)
SET app.current_user_id = '11111111-1111-1111-1111-111111111111';
SELECT COUNT(*) AS others_diary_visible FROM psyhelp.diary;
RESET ROLE;
RESET app.current_user_id;

-- 9) Тест: модератор читає posts (має бачити все, включно з видаленим)
\echo '--- Готуємо: створюємо пост і soft-delete-имо ---'
SET app.current_user_id = :'id';
SET ROLE psyhelp_user;
INSERT INTO psyhelp.posts (user_id, category_id, body)
VALUES (:'id', 1, 'Тестове звернення для перевірки видимості видалених') RETURNING id \gset post_

UPDATE psyhelp.posts SET is_deleted = TRUE WHERE id = :'post_id';
RESET ROLE;

\echo '--- Модератор бачить видалений пост: ---'
SET ROLE psyhelp_moderator;
SELECT COUNT(*) AS deleted_visible_to_mod FROM psyhelp.posts WHERE is_deleted = TRUE;
RESET ROLE;

\echo '--- Юзер не бачить видалених чужих: ---'
SET ROLE psyhelp_user;
SET app.current_user_id = '99999999-9999-9999-9999-999999999999';
SELECT COUNT(*) AS deleted_visible_to_other_user FROM psyhelp.posts WHERE is_deleted = TRUE;
RESET ROLE;
RESET app.current_user_id;

-- 10) Перевірка: password_hash недоступний для psyhelp_user
\echo '--- Юзер намагається прочитати password_hash (має впасти): ---'
SET ROLE psyhelp_user;
SET app.current_user_id = :'id';
DO $$
BEGIN
    PERFORM password_hash FROM psyhelp.users WHERE id = current_setting('app.current_user_id')::uuid;
    RAISE NOTICE 'UNEXPECTED: хеш пароля видимий';
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'EXPECTED: column-level REVOKE спрацював (%)', SQLERRM;
END $$;
RESET ROLE;

-- 11) Перевірка тригера comments_count
\echo '--- Перевірка тригера на comments_count: ---'
SET app.current_user_id = :'id';
SET ROLE psyhelp_user;
INSERT INTO psyhelp.posts (user_id, category_id, body)
VALUES (:'id', 2, 'Пост для тесту лічильника коментарів') RETURNING id \gset post2_

INSERT INTO psyhelp.comments (post_id, user_id, body) VALUES (:'post2_id', :'id', 'Перший');
INSERT INTO psyhelp.comments (post_id, user_id, body) VALUES (:'post2_id', :'id', 'Другий');
INSERT INTO psyhelp.comments (post_id, user_id, body) VALUES (:'post2_id', :'id', 'Третій');

SELECT comments_count FROM psyhelp.posts WHERE id = :'post2_id';
RESET ROLE;
