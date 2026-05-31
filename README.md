
**ПсиДопомога** — веб-платформа, що надає людям безпечний анонімний простір для отримання психологічної підтримки від спільноти та AI-помічника. Проєкт розроблено як дипломну роботу за спеціальністю 122 «Комп'ютерні науки» в ЧНУ ім. Б. Хмельницького.

### Ключові принципи
- 🔒 **Повна анонімність** — лише нікнейм, жодних персональних даних
- 🛡️ **Безпека даних** — шифрування щоденника та AI-чату на рівні БД (AES-256)
- 🤝 **Peer-to-peer підтримка** — спільнота людей, які переживають схожі труднощі
- 🧠 **AI-помічник** — уважний співрозмовник, адаптований до українського контексту

---

## Функціональність

### Для незареєстрованих користувачів
- Перегляд стрічки звернень спільноти
- Доступ до інструментів швидкої допомоги

### Для зареєстрованих користувачів
- Створення анонімних звернень та коментарів підтримки
- Емоційний щоденник з календарем настрою та аналітикою
- AI-помічник для особистих розмов
- Сповіщення про відповіді на звернення

### Для модераторів
- Панель модерації зі статистикою
- Розгляд скарг з можливістю попередження або видалення контенту
- Автоматичний бан після 3 попереджень
- Сповіщення скаржникам про результат розгляду

### Швидка допомога (без реєстрації)
- Дихальні вправи (техніка 4-4-4)
- Техніка заземлення 5-4-3-2-1
- Прогресивна м'язова релаксація
- Заспокійливі звуки (9 треків)
- Міні-ігри для переключення уваги

---

## Технічний стек

### Frontend
| Технологія | Призначення |
|---|---|
| React 18 + Vite | UI фреймворк |
| TanStack Query | Серверний стейт |
| Zustand | Клієнтський стейт |
| React Router v6 | Маршрутизація |
| Tailwind CSS | Стилізація |
| Recharts | Графіки аналітики |
| Lucide React | Іконки |

### Backend
| Технологія | Призначення |
|---|---|
| Node.js + Express | REST API |
| PostgreSQL 15 | База даних |
| JWT (access 15хв / refresh 30д) | Автентифікація |
| bcrypt | Хешування паролів |
| OpenRouter API | AI-помічник |

### Безпека БД
- Row-Level Security (RLS) на всіх таблицях
- Колонкове шифрування щоденника та чату (pgcrypto AES-256)
- Аудит-лог дій модераторів
- Модератор не має доступу до щоденників та AI-чатів користувачів

---

## Швидкий старт

### Вимоги
- Node.js 18+
- PostgreSQL 15+
- npm або yarn

### Встановлення

```bash
# Клонування репозиторію
git clone https://github.com/your-username/psyhelp.git
cd psyhelp

# Backend
cd backend
cp .env.example .env
# Заповніть .env своїми значеннями
npm install
npm run dev

# Frontend (в окремому терміналі)
cd frontend
npm install
npm run dev
```

### Налаштування БД

```bash
export PSYHELP_DB_URL="postgresql://postgres@localhost:5432/psyhelp"
cd database/psyhelp-db
chmod +x migrate.sh
./migrate.sh
```

### Змінні середовища

```env
NODE_ENV=development
PORT=3000
PSYHELP_APP_DB_URL=postgresql://psyhelp_app:password@localhost:5432/psyhelp
PSYHELP_ENCRYPTION_KEY=your-32-char-key
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
OPENAI_API_KEY=your-openrouter-key
OPENAI_MODEL=openai/gpt-oss-120b:free
```

---

## Структура проєкту

```
psyhelp/
├── backend/
│   ├── src/
│   │   ├── db/          # Пул з'єднань, RLS-контекст
│   │   ├── middleware/  # Auth, error handling
│   │   ├── routes/      # API роути
│   │   ├── services/    # Бізнес-логіка
│   │   └── utils/       # Утиліти
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── api/         # HTTP клієнт, endpoints
│   │   ├── components/  # UI компоненти
│   │   ├── hooks/       # Custom hooks
│   │   ├── pages/       # Сторінки
│   │   └── utils/       # Утиліти
│   └── index.html
└── database/
    └── psyhelp-db/
        └── db/          # SQL міграції
```

---

## Автор

**Попілевич Олександр** — студент 4 курсу, спеціальність 122  
Черкаський національний університет імені Богдана Хмельницького  
Науковий керівник: С.В. Науменко

---

---

# PsyHelp — Psychological Support Platform

> An anonymous peer-to-peer psychological support platform with an AI assistant, mood diary, and self-help tools.

---

## About

**PsyHelp** is a web platform that provides people with a safe, anonymous space for psychological support from a community and an AI companion. The project was developed as a diploma thesis in Computer Science (specialty 122) at Bohdan Khmelnytsky National University of Cherkasy.

### Core Principles
- 🔒 **Full Anonymity** — only a nickname, no personal data required
- 🛡️ **Data Security** — diary and AI chat encrypted at the database level (AES-256)
- 🤝 **Peer-to-peer Support** — a community of people going through similar challenges
- 🧠 **AI Companion** — an empathetic conversational assistant adapted to the Ukrainian context

---

## Features

### For Unregistered Users
- Browse community support posts
- Access all quick self-help tools

### For Registered Users
- Create anonymous support posts and comments
- Mood diary with calendar view and analytics
- AI companion for private conversations
- Notifications for replies to your posts

### For Moderators
- Moderation dashboard with statistics
- Review complaints with options to warn or delete content
- Automatic ban after 3 warnings
- Notifications to reporters about complaint outcomes

### Quick Help (No Registration Required)
- Breathing exercises (4-4-4 technique)
- 5-4-3-2-1 grounding technique
- Progressive muscle relaxation
- Relaxation sounds (9 tracks)
- Mini-games for attention switching

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + Vite | UI framework |
| TanStack Query | Server state management |
| Zustand | Client state management |
| React Router v6 | Routing |
| Tailwind CSS | Styling |
| Recharts | Analytics charts |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API |
| PostgreSQL 15 | Database |
| JWT (access 15min / refresh 30d) | Authentication |
| bcrypt | Password hashing |
| OpenRouter API | AI companion |

### Database Security
- Row-Level Security (RLS) on all tables
- Column-level encryption for diary and chat (pgcrypto AES-256)
- Audit log for moderator actions
- Moderators cannot access user diaries or AI chat history

---

## Quick Start

### Requirements
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/psyhelp.git
cd psyhelp

# Backend
cd backend
cp .env.example .env
# Fill in your values in .env
npm install
npm run dev

# Frontend (in a separate terminal)
cd frontend
npm install
npm run dev
```

### Database Setup

```bash
export PSYHELP_DB_URL="postgresql://postgres@localhost:5432/psyhelp"
cd database/psyhelp-db
chmod +x migrate.sh
./migrate.sh
```

### Environment Variables

```env
NODE_ENV=development
PORT=3000
PSYHELP_APP_DB_URL=postgresql://psyhelp_app:password@localhost:5432/psyhelp
PSYHELP_ENCRYPTION_KEY=your-32-char-key
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
OPENAI_API_KEY=your-openrouter-key
OPENAI_MODEL=openai/gpt-oss-120b:free
```

---

## Project Structure

```
psyhelp/
├── backend/
│   ├── src/
│   │   ├── db/          # Connection pool, RLS context
│   │   ├── middleware/  # Auth, error handling
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── utils/       # Utilities
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── api/         # HTTP client, endpoints
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom hooks
│   │   ├── pages/       # Pages
│   │   └── utils/       # Utilities
│   └── index.html
└── database/
    └── psyhelp-db/
        └── db/          # SQL migrations
```

---

## Author

**Oleksandr Popilevych** — 4th year student, specialty 122 Computer Science  
Bohdan Khmelnytsky National University of Cherkasy  
Supervisor: S.V. Naumenko
