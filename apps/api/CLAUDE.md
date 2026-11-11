# CLAUDE.md (apps/api)

Руководство по бэкенду `@expense/api`. Общее описание монорепо, команды, ветки и коммиты — в корневом [CLAUDE.md](../../CLAUDE.md).

## Состояние

Миграции Prisma `init` (`Category`, `Expense`), `add_user` (`User`), `add_category_user` (`Category.userId`) и `add_transactions` (`Expense` заменена на `Transaction`) применены. Реализованы авторизация (`UsersModule`, `AuthModule`), CRUD категорий (`CategoriesModule`) и транзакции (`TransactionsModule`). Тестов и линтера нет.

## Стек

NestJS 11, порт 3001 (`API_PORT`), CORS включён в `src/main.ts`. PostgreSQL 16 (Docker Compose), ORM — Prisma, схема в `prisma/schema.prisma`. `tsconfig` использует `experimentalDecorators` и `emitDecoratorMetadata`.

## Модель данных

`User` 1—N `Category`, `User` 1—N `Transaction`, `Category` 1—N `Transaction`.

- `User`: `name`, `email` (unique), `passwordHash`.
- `Category`: уникальна пара `(userId, name)`.
- `Transaction`: `amount Decimal(12,2)`, `type` enum `income|expense`.

## Авторизация

JWT (`@nestjs/jwt`, без passport), пароли хэшируются `bcryptjs`. Эндпоинты: `POST /auth/register`, `POST /auth/login`, `GET /auth/me` (под `JwtAuthGuard`). `AuthModule` экспортирует `JwtAuthGuard` и `JwtModule`, чтобы другие модули защищали эндпоинты через `@UseGuards(JwtAuthGuard)`; `userId` берётся из `req.user.id`.

## Категории

`GET/POST /categories`, `PATCH/DELETE /categories/:id` (под `JwtAuthGuard`), каждый пользователь видит только свои.

- Чужая категория — 404, дубликат имени — 409, удаление категории с транзакциями — 409 (счётчик через `CountTransactionsByCategoryQuery`).
- Владелец при создании проверяется через `GetUserByIdQuery` (CQRS).

## Транзакции

`POST/GET /transactions`, `GET/PATCH/DELETE /transactions/:id` (под `JwtAuthGuard`), у каждого пользователя свои, чужая — 404.

`GET /transactions?year=&month=&page=&limit=`:
- `year`/`month` опциональны, без `year` — за всё время;
- `page` по умолчанию 1, макс. 100000; `limit` по умолчанию 10, макс. 100 — запрос без параметров отдаёт только 10 записей;
- порядок `date desc, createdAt desc, id desc`;
- ответ: `{ items, summary: { income, expense, balance }, pagination: { page, limit, total } }`; `items` — страница, `summary` — по всему периоду (UTC).

Категория при создании/смене проверяется через `GetCategoryByIdQuery` (чужая/несуществующая — 404); `amount` в ответе — number.

## CQRS: модули общаются только через него

`@nestjs/cqrs`, `CqrsModule.forRoot()` в `AppModule`. `AuthModule` и `UsersModule` не импортируют друг друга: общие команды/запросы/события лежат в `src/contracts/` (`CreateUserCommand`, `GetUserByEmailQuery`, `GetUserByIdQuery`, `UserCreatedEvent`, `GetCategoryByIdQuery`, `CountTransactionsByCategoryQuery`), handler'ы — внутри владельца данных (`src/users/handlers`). Новые межмодульные взаимодействия добавляйте так же. Пароль хэширует `auth`, `users` хранит только `passwordHash`.

## Правила

- `@nestjs/cqrs` и `@nestjs/jwt` держите на версии `^11` (12.x требует NestJS 12).
- Валидация тел запросов: Zod-схемы из `@expense/shared` + `ZodValidationPipe` (`src/common`).
- Prisma-скрипты запускаются через `node --env-file=../../.env`, потому что Prisma сама не видит корневой `.env`. Не заменяйте их на голый `prisma ...`, иначе `DATABASE_URL` не подхватится.
- Миграции Prisma пишутся вручную и применяются через `migrate deploy`, если `migrate dev` недоступен (неинтерактивная среда).
- После изменений `schema.prisma` — `npm run prisma:generate -w apps/api`; новая миграция — `npm run prisma:migrate -w apps/api -- --name <имя>`. Изменения схемы и миграция коммитятся вместе.
- Скрипты установки Prisma (`@prisma/client`, `@prisma/engines`, `prisma`) разрешены в `allowScripts` корневого `package.json`; при обновлении версий их может понадобиться одобрить заново (`npm approve-scripts`).
- `dev:api` (`nest start --watch`) запускается через `node --env-file=../../.env`, нужен `JWT_SECRET`.

## Переменные окружения

`DATABASE_URL` (читает Prisma), `API_PORT`, `JWT_SECRET` (обязателен, API не стартует без него), `JWT_EXPIRES_IN` (по умолчанию `1h`).

## Документация
- После изменения методов — обновляй JSDoc.
- Для DTO и контроллеров — добавляй/обновляй Swagger декораторы.
