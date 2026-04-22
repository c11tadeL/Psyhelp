# PsyHelp — PostgreSQL database

База даних для інформаційної системи **«Психологічна допомога»** (дипломна
робота, Попілевич О.О., КН-22, ЧНУ ім. Б. Хмельницького).

Схема відповідає інфологічній моделі з п.2.7 кваліфікаційної роботи:
9 основних сутностей (Users, Posts, Categories, Comments, Diary, Chat_AI,
Complaints, Notifications, Sessions) + два допоміжні об'єкти (Warnings
для історії попереджень модератора та moderation_log для аудиту).

---

## Що всередині

```
psyhelp-db/
├── db/
│   ├── 01_schema.sql        -- таблиці, ENUM-и, CHECK-и, тригери
│   ├── 02_indexes.sql       -- індекси (переважно часткові)
│   ├── 03_roles.sql         -- ролі та GRANT-и
│   ├── 04_rls.sql           -- Row-Level Security політики
│   ├── 05_encryption.sql    -- pgp_sym_encrypt + bcrypt + views
│   ├── 06_seed.sql          -- початкові категорії
│   └── queries_reference.sql -- довідник оптимізованих запитів (НЕ міграція)
├── examples/
│   ├── db.js                -- Node.js: пул + withUserContext()
│   └── middleware.js        -- Express: authenticate, requireAuth, dbHandler
├── migrate.sh               -- bash-раннер міграцій
├── .env.example             -- шаблон змінних середовища
└── README.md
```

---

## Вимоги

- PostgreSQL **15+** (використовуємо `security_invoker` для VIEW, який з'явився в 15)
- Розширення: `pgcrypto`, `citext`, `pg_trgm` (входять у `postgresql-contrib`)
- Для backend-прикладів: Node.js 18+, пакети `pg`, `jsonwebtoken`

---

## Порядок розгортання

### 1. Створити БД і користувача-власника

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE psyhelp
    WITH ENCODING 'UTF8'
         LC_COLLATE 'uk_UA.UTF-8'
         LC_CTYPE   'uk_UA.UTF-8'
         TEMPLATE template0;
SQL
```

### 2. Заповнити `.env`

```bash
cp .env.example .env
# Згенерувати секрети:
openssl rand -base64 48          # PSYHELP_ENCRYPTION_KEY
openssl rand -base64 48          # JWT_ACCESS_SECRET
openssl rand -base64 48          # JWT_REFRESH_SECRET
```

**Важливо**: `PSYHELP_ENCRYPTION_KEY` втратити = втратити записи щоденника
і AI-чату. Зберігайте в Vault/Secrets Manager, робіть офлайн-копію.

### 3. Застосувати міграції

```bash
export PSYHELP_DB_URL="postgresql://postgres@localhost:5432/psyhelp"
chmod +x migrate.sh
./migrate.sh
```

Після успішного застосування встановіть паролі для login-ролей
(НЕ зберігайте їх у міграціях — беріть зі Vault):

```sql
ALTER ROLE psyhelp_owner    WITH PASSWORD '...';
ALTER ROLE psyhelp_app      WITH PASSWORD '...';
ALTER ROLE psyhelp_readonly WITH PASSWORD '...';
```

Очікуваний вивід:

```
==> Applying 01_schema.sql
    OK
==> Applying 02_indexes.sql
    OK
...
==> All migrations applied successfully
```

### 4. Створити першого модератора

Seed створює запис із placeholder-хешем, який треба замінити:

```sql
UPDATE psyhelp.users
SET    password_hash = psyhelp.hash_password('YourRealPassword!')
WHERE  email = 'moderator@psyhelp.local';
```

Або створити нового через CLI-скрипт (рекомендовано).

---

## Як працює ланцюг безпеки

```
┌─────────────┐   TLS   ┌──────────────┐   RLS   ┌──────────────┐
│   Browser   │────────▶│   Backend    │────────▶│  PostgreSQL  │
│  (React)    │ HTTPS   │ (Node.js)    │ SET ROLE│              │
└─────────────┘         └──────────────┘         └──────────────┘
                              │                          │
                              │ JWT verify               │ RLS читає
                              │ → {userId, role}         │ app.current_user_id
                              │                          │
                              └─ SET app.current_user_id ┘
                                 SET ROLE psyhelp_user
```

**Один запит = одна транзакція = один `SET LOCAL`**. Пул з'єднань
перевикористовує з'єднання, але `SET LOCAL` скидається на `COMMIT`,
тож наступний запит на цьому ж з'єднанні отримає свіжий контекст.

---

## Перевірка критичних вимог

Після застосування міграцій можна прогнати:

```bash
psql "$PSYHELP_DB_URL" -f db/test_security.sql
```

(файл `test_security.sql` — з попередньої ітерації розробки, генерує
такі перевірки:

| Тест | Очікуваний результат |
|---|---|
| Модератор читає `diary` | `0 рядків` |
| Модератор викликає `decrypt_text()` | `permission denied` |
| Юзер бачить чужий щоденник | `0 рядків` |
| Юзер бачить власний | `1 рядок` |
| `note_encrypted` у `SELECT *` | hex-сміття, не plaintext |
| Через `v_diary` | розшифрований текст |
| Тригер `comments_count` | інкремент при INSERT коментаря |

---

## Відображення вимог із диплома на реалізацію

| Вимога з п.2.3.2 | Як реалізовано |
|---|---|
| HTTPS/TLS | на рівні Nginx + `pg_hba.conf` `hostssl` + `sslmode=require` у клієнта |
| Паролі bcrypt | `psyhelp.hash_password()` cost=12, функція `SECURITY DEFINER` |
| Анонімність у публічному API | `nickname` публічний, `email` / `user_id` не віддаються, `password_hash` REVOKE-нутий на рівні колонки |
| JWT з обмеженим TTL | access 15 хв, refresh 30 днів (хеш у `sessions.token_hash`) |
| Модератор не бачить щоденник / AI | RLS без політики для `psyhelp_moderator` на `diary` / `chat_ai` + REVOKE на `decrypt_text()` |
| 500 одночасних користувачів | keyset-пагінація, часткові індекси, денормалізовані лічильники через тригери |
| Резервне копіювання | поза міграціями: `pg_dump` + WAL-G в S3 (Ansible/Terraform) |
| Розширюваність категорій | окрема таблиця `categories` замість ENUM |
| REST API | запити в `06_queries.sql` → hooks у `examples/middleware.js` |

---

## Попередження

1. Параметр `role` у JWT клієнт не контролює — він підписаний сервером.
   Але переконайтеся, що при реєстрації `role` завжди `'user'` (це вже
   захищено політикою `users_self_update` — див. `WITH CHECK role = 'user'`).
2. RLS `FORCE` увімкнено на всіх таблицях — це означає, що навіть власник
   таблиці підпадає під політики. При ручних міграціях тимчасово
   переключайтеся на суперюзера.
3. `rating_score` оновлюється фоновим cron-job-ом (приклад у
   `06_queries.sql` §2), не тригером — інакше популярні пости зіткнуться
   на UPDATE-ах.
4. Ротація `PSYHELP_ENCRYPTION_KEY` потребує окремого скрипта, який
   читає всі `note_encrypted` / `message_encrypted` старим ключем і
   перезаписує новим. У міграціях не реалізовано.
5. `chat_ai.message_encrypted` не має `ON CONFLICT` — це append-only
   журнал; якщо треба «очистити історію», видаляйте WHERE conversation_id=...
