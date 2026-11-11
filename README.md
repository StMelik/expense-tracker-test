# Expense Tracker

Веб-приложение для учёта личных доходов и расходов. Пользователь регистрируется, заводит собственные категории и записывает транзакции; на главном экране видны последние операции и форма быстрого добавления. Бэкенд отдаёт итоги (доход, расход, баланс) за выбранный период с пагинацией.

## Стек

| Слой       | Технологии                                                                   |
| ---------- | ---------------------------------------------------------------------------- |
| Фронтенд   | Next.js 15 (App Router), React 19, Tailwind CSS 4, shadcn/ui, react-hook-form |
| Бэкенд     | NestJS 11, `@nestjs/cqrs`, `@nestjs/jwt`, bcryptjs, Swagger (`@nestjs/swagger`) |
| БД         | PostgreSQL 16 (Docker Compose), Prisma 6                                     |
| Контракты  | Zod-схемы и типы DTO в `packages/shared`                                     |
| Инструменты | TypeScript (strict), npm workspaces, Prettier                               |

## Требования

- Node.js 22+ (нужен флаг `--env-file`, на котором работают скрипты API)
- npm 10+
- Docker с Docker Compose (для PostgreSQL)

## Быстрый старт

```bash
# 1. Переменные окружения
cp .env.example .env

# 2. Зависимости (устанавливаются для всех workspaces сразу)
npm install

# 3. Общий пакет: api и web используют его собранный dist/
npm run build -w packages/shared

# 4. PostgreSQL в Docker
npm run db:up

# 5. Миграции Prisma (и генерация клиента)
npm run db:migrate

# 6. Dev-серверы — в двух отдельных терминалах
npm run dev:api   # http://localhost:3001
npm run dev:web   # http://localhost:3000
```

После запуска:

- приложение — http://localhost:3000 (сначала `/register`, затем `/login`);
- Swagger UI — http://localhost:3001/docs;
- PostgreSQL — `localhost:5432`.

### Переменные окружения

Шаблон — `.env.example`.

| Переменная            | Назначение                                                        | По умолчанию в шаблоне                                                   |
| --------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `POSTGRES_USER`       | Пользователь БД (для Docker Compose)                              | `expense`                                                                |
| `POSTGRES_PASSWORD`   | Пароль БД                                                         | `expense`                                                                |
| `POSTGRES_DB`         | Имя БД                                                            | `expense_tracker`                                                        |
| `DATABASE_URL`        | Строка подключения Prisma                                         | `postgresql://expense:expense@localhost:5432/expense_tracker?schema=public` |
| `API_PORT`            | Порт API                                                          | `3001`                                                                   |
| `NEXT_PUBLIC_API_URL` | Адрес API для фронтенда                                           | `http://localhost:3001`                                                  |
| `JWT_SECRET`          | Секрет подписи JWT. **Обязателен**, API не стартует без него      | `change-me` (замените)                                                   |
| `JWT_EXPIRES_IN`      | Время жизни токена                                                | `1h`                                                                     |

### Полезные команды

```bash
npm run build          # shared -> api -> web (строго в таком порядке)
npm run db:down        # остановить контейнеры
npm run format         # prettier --write .
npm run prisma:generate -w apps/api                  # после изменений schema.prisma
npm run prisma:migrate -w apps/api -- --name <имя>   # новая миграция
```

Линтера и автотестов в проекте пока нет.

## Структура проекта

```
.
├── apps/
│   ├── api/                    # @expense/api — NestJS, порт 3001
│   │   ├── prisma/             # schema.prisma и миграции
│   │   └── src/
│   │       ├── auth/           # регистрация, вход, JwtAuthGuard
│   │       ├── users/          # хранение пользователей (CQRS-handler'ы)
│   │       ├── categories/     # CRUD категорий
│   │       ├── transactions/   # CRUD транзакций, сводка, пагинация
│   │       ├── contracts/      # межмодульные команды, запросы и события CQRS
│   │       ├── common/         # ZodValidationPipe
│   │       └── prisma/         # PrismaModule / PrismaService
│   └── web/                    # @expense/web — Next.js, порт 3000
│       └── src/                # Feature Slice Design
│           ├── app/            # маршруты App Router (тонкие обёртки)
│           ├── views/          # страницы: home, login, register, transactions, categories
│           ├── widgets/        # header, recent-transactions
│           ├── features/       # auth-login, auth-register, auth-guard, logout, transaction-create
│           ├── entities/       # category, transaction, session
│           └── shared/         # api-клиент, ui (shadcn/ui), утилиты
├── packages/
│   └── shared/                 # @expense/shared — Zod-схемы и типы DTO
├── docker-compose.yml          # PostgreSQL 16
├── tsconfig.base.json          # общий strict-конфиг TypeScript
└── .env.example
```

Подробности по подпроектам: [apps/api/CLAUDE.md](apps/api/CLAUDE.md), [apps/web/CLAUDE.md](apps/web/CLAUDE.md). Общие правила работы с ветками и коммитами — в [CLAUDE.md](CLAUDE.md).

### Архитектурные решения

- **Единый контракт.** Zod-схемы из `@expense/shared` валидируют тела запросов на API (`ZodValidationPipe`) и формы на фронтенде.
- **CQRS между модулями.** Модули API не импортируют друг друга: обращаются через команды и запросы из `src/contracts/`, handler'ы живут у владельца данных.
- **Данные изолированы по пользователю.** Каждый видит только свои категории и транзакции; чужой ресурс отдаёт 404.

## Основные эндпоинты

Полная интерактивная документация — Swagger UI на `/docs`. Все эндпоинты, кроме регистрации и входа, требуют заголовок `Authorization: Bearer <accessToken>`.

### Авторизация

| Метод | Путь             | Описание                                                  |
| ----- | ---------------- | --------------------------------------------------------- |
| POST  | `/auth/register` | Регистрация (`name`, `email`, `password` от 8 символов); возвращает `accessToken` и `user` |
| POST  | `/auth/login`    | Вход (`email`, `password`); возвращает `accessToken` и `user` |
| GET   | `/auth/me`       | Текущий пользователь                                      |

### Категории

| Метод  | Путь              | Описание                                                       |
| ------ | ----------------- | -------------------------------------------------------------- |
| GET    | `/categories`     | Список категорий пользователя                                  |
| POST   | `/categories`     | Создание (`name` до 50 символов, опционально `color` `#RRGGBB`, `icon`) |
| PATCH  | `/categories/:id` | Частичное обновление                                           |
| DELETE | `/categories/:id` | Удаление; 409, если в категории есть транзакции                |

Дубликат имени у одного пользователя — 409.

### Транзакции

| Метод  | Путь                | Описание                                                                    |
| ------ | ------------------- | --------------------------------------------------------------------------- |
| POST   | `/transactions`     | Создание (`amount` > 0, `type` `income`/`expense`, `date` ISO 8601, `categoryId`, опционально `description`) |
| GET    | `/transactions`     | Список с фильтром по периоду, сводкой и пагинацией                          |
| GET    | `/transactions/:id` | Одна транзакция                                                             |
| PATCH  | `/transactions/:id` | Частичное обновление                                                        |
| DELETE | `/transactions/:id` | Удаление                                                                    |

Параметры `GET /transactions`:

- `year`, `month` — необязательные; `month` допустим только вместе с `year`; без `year` — за всё время;
- `page` (по умолчанию 1) и `limit` (по умолчанию 10, максимум 100).

Ответ:

```json
{
  "items": [],
  "summary": { "income": 0, "expense": 0, "balance": 0 },
  "pagination": { "page": 1, "limit": 10, "total": 0 }
}
```

`items` — текущая страница (порядок: дата, затем время создания, по убыванию), `summary` считается по всему выбранному периоду (UTC).
