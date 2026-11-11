# Архитектура

Expense Tracker — монорепо на npm workspaces для учёта личных доходов и расходов. Документ описывает слои, модули и паттерны. Эндпоинты — в [api.md](api.md), схема БД — в [database.md](database.md), рецепты расширения — в [dev-guide.md](dev-guide.md).

## Обзор

```
┌────────────────┐   HTTP + JWT    ┌────────────────┐   Prisma   ┌──────────────┐
│  apps/web      │ ──────────────▶ │  apps/api      │ ─────────▶ │ PostgreSQL 16│
│  Next.js 15    │                 │  NestJS 11     │            │ (Docker)     │
│  :3000         │                 │  :3001         │            └──────────────┘
└───────┬────────┘                 └───────┬────────┘
        │        Zod-схемы и типы DTO      │
        └────────▶ packages/shared ◀───────┘
```

| Пакет             | Имя                | Назначение                                                        |
| ----------------- | ------------------ | ----------------------------------------------------------------- |
| `apps/web`        | `@expense/web`     | Фронтенд: Next.js 15, App Router, React 19, shadcn/ui, Tailwind 4 |
| `apps/api`        | `@expense/api`     | Бэкенд: NestJS 11, Prisma, CQRS, JWT, Swagger                     |
| `packages/shared` | `@expense/shared`  | Zod-схемы и типы DTO — единый контракт фронта и бэка              |

`packages/shared` собирается в CommonJS `dist/` через `tsc`, поэтому перед сборкой/запуском `api` и `web` его нужно собрать: `npm run build -w packages/shared`. Порядок полной сборки: `shared → api → web` (`npm run build`).

Все `tsconfig` наследуют `tsconfig.base.json` (strict).

## Контракт: `packages/shared`

Единственный источник правды о форме данных. Для каждой операции здесь лежат:

- Zod-схема запроса (`createTransactionSchema`, `loginSchema`, ...);
- тип, выведенный из неё (`CreateTransactionDto = z.infer<...>`);
- тип ответа (`TransactionResponse`, `AuthResponse`, ...).

Бэкенд валидирует тело запроса этой схемой (`ZodValidationPipe`), фронтенд использует её же в форме (`zodResolver`). Поменяв схему, нужно пересобрать пакет.

## Бэкенд (`apps/api`)

### Слои

```
HTTP-запрос
   │
   ▼
Controller      — маршрут, JwtAuthGuard, ZodValidationPipe, Swagger-декораторы
   │
   ▼
Service         — бизнес-логика, проверка владения, маппинг в ответ
   │       ├──▶ QueryBus / CommandBus  — вызовы в соседние модули (через contracts)
   ▼
PrismaService   — доступ к БД
```

- **Controller** тонкий: достаёт `req.user.id`, валидирует вход, делегирует сервису.
- **Service** содержит правила: «чужая сущность — 404», конфликты (409), расчёт итогов.
- **Handler** (`handlers/*.handler.ts`) — обработчик CQRS-запроса/команды; живёт в модуле — владельце данных.
- **PrismaModule** — `@Global()`, `PrismaService` доступен везде без импорта.

### Структура `src/`

```
src/
├── main.ts                  # bootstrap: CORS, Swagger (/docs), порт API_PORT
├── app.module.ts            # CqrsModule.forRoot(), PrismaModule + доменные модули
├── auth/                    # регистрация, логин, JwtAuthGuard
├── users/                   # владелец данных User (только handler'ы, без контроллера)
├── categories/              # CRUD категорий + GetCategoryByIdHandler
├── transactions/            # CRUD транзакций + CountTransactionsByCategoryHandler
├── contracts/               # CQRS-контракты между модулями (команды, запросы, события)
├── common/                  # ZodValidationPipe
└── prisma/                  # PrismaModule, PrismaService
```

### Модули

| Модуль               | Контроллер | Отвечает за                                          | Что отдаёт другим (через CQRS)                                             |
| -------------------- | ---------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| `UsersModule`        | нет        | Хранение пользователей                               | `CreateUserCommand`, `GetUserByEmailQuery`, `GetUserByIdQuery`             |
| `AuthModule`         | `/auth`    | Хэширование паролей, выпуск и проверка JWT           | Экспортирует `JwtAuthGuard` и `JwtModule` для защиты эндпоинтов            |
| `CategoriesModule`   | `/categories` | Категории пользователя                            | `GetCategoryByIdQuery`                                                     |
| `TransactionsModule` | `/transactions` | Транзакции, итоги за период, пагинация         | `CountTransactionsByCategoryQuery`                                         |

### Паттерны

**CQRS между модулями.** Модули не импортируют друг друга. Общие команды, запросы и события лежат в `src/contracts/*.contracts.ts`, а handler находится в модуле, владеющем данными. Например, `TransactionsService` проверяет категорию так:

```ts
const category = await this.queryBus.execute(new GetCategoryByIdQuery(userId, categoryId));
```

— и ничего не знает о `CategoriesModule`. Внутри одного модуля service обращается к Prisma напрямую. Типы результатов (`PublicUser`, `CategoryRef`) тоже лежат в contracts.

Соглашение: команды (`CommandBus`) меняют состояние, запросы (`QueryBus`) только читают, события (`EventBus`) сообщают о случившемся (`UserCreatedEvent`, публикуется после регистрации).

**Авторизация.** JWT без passport: `JwtAuthGuard` читает `Authorization: Bearer <token>`, проверяет подпись через `JwtService`, кладёт `req.user = { id: payload.sub }`. Эндпоинты защищаются `@UseGuards(JwtAuthGuard)`; модуль подключает `AuthModule` в `imports`. Пароли хэширует `AuthService` (`bcryptjs`, 10 раундов); `UsersModule` хранит только `passwordHash`.

**Изоляция данных по пользователю.** Каждый запрос в БД содержит `userId` из JWT. Чужая или несуществующая сущность даёт одинаковый `404` — id чужих записей не раскрываются.

**Валидация.** `ZodValidationPipe(schema)` применяется к `@Body`/`@Query`; при ошибке — `400` с `error.flatten()`.

**Обработка ошибок БД.** Prisma-ошибка `P2002` (нарушение unique) превращается в `409 Conflict` (дубликат email или имени категории).

**Деньги.** В БД `Decimal(12,2)`, в ответе API — `number` (`toResponse`). Итоги `balance` округляются до копеек.

**Документация.** Публичные методы снабжены JSDoc; DTO и контроллеры — Swagger-декораторами (`@ApiTags`, `@ApiOperation`, `@ApiResponse`). Swagger UI — `/docs`.

## Фронтенд (`apps/web`)

### Feature Slice Design

Слои `src/` (сверху вниз): `app → views → widgets → features → entities → shared`.

| Слой       | Что содержит                                                                                      | Примеры                                                              |
| ---------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `app`      | Роуты Next.js App Router, `layout.tsx`, `globals.css`. `page.tsx` — только `metadata` и реэкспорт | `(protected)/layout.tsx`, `login/page.tsx`                           |
| `views`    | FSD-слой «pages» (назван `views`, т. к. `src/pages` Next.js считает Pages Router)                 | `home`, `login`, `register`, `transactions`, `categories`            |
| `widgets`  | Крупные самостоятельные блоки UI                                                                  | `header`, `recent-transactions`                                      |
| `features` | Пользовательские сценарии. Сегменты `ui/`, `api/`, `model/`                                       | `auth-login`, `auth-register`, `auth-guard`, `logout`, `transaction-create` |
| `entities` | Бизнес-сущности и их состояние                                                                    | `session`, `transaction`, `category`                                 |
| `shared`   | Код без бизнес-логики: `ui/` (shadcn), `lib/` (`cn`, `formatMoney`, `formatDate`), `api/` (`apiFetch`, `ApiError`) | —                                                  |

Правила:

- импорты только вниз по слоям; слайсы одного слоя друг друга не импортируют;
- слайс экспортирует публичный API через `index.ts`, внутрь (`@/features/x/ui/...`) снаружи не ходим;
- алиас `@/*` → `apps/web/src/*`;
- `'use client'` — только там, где нужны хуки и обработчики; страницы `views` остаются серверными.

### Ключевые механизмы

**Сессия.** Хранится в `localStorage` (ключ `expense.session`) с запасным in-memory хранилищем. `useSession` построен на `useSyncExternalStore`: сервер и гидратация видят `null`, `ready` становится `true` после первого клиентского рендера. Синхронизация между вкладками — через событие `storage`.

**Защита роутов.** Клиентская: `RequireSession` (`features/auth-guard`) подключён в `app/(protected)/layout.tsx` вместе с `Header`; редиректит на `/login`, если сессии нет.

**HTTP-клиент.** `apiFetch<T>(path, { token })` в `shared/api` добавляет `Authorization`, превращает ошибки в `ApiError(status, message)`. Слой `shared` не знает о сессии, поэтому реакцию на `401` регистрирует `features/auth-guard` через `setUnauthorizedHandler` — разлогин и редирект при истёкшем токене.

**Формы.** react-hook-form + `zodResolver` со схемами из `@expense/shared`.

### Маршруты

| Путь            | Доступ   | Состояние                                                         |
| --------------- | -------- | ----------------------------------------------------------------- |
| `/login`        | публичный | Форма входа                                                      |
| `/register`     | публичный | Форма регистрации                                                |
| `/`             | сессия   | Последние транзакции (10 на страницу) + форма создания           |
| `/transactions` | сессия   | Заглушка                                                          |
| `/categories`   | сессия   | Заглушка (UI создания категорий пока нет)                         |

## Данные и инфраструктура

- PostgreSQL 16 в Docker Compose (`npm run db:up`), ORM — Prisma 6, схема `apps/api/prisma/schema.prisma`. См. [database.md](database.md).
- Prisma-скрипты и `dev:api` запускаются через `node --env-file=../../.env`, т. к. Prisma сама не видит корневой `.env`.
- Переменные окружения: `POSTGRES_*`, `DATABASE_URL`, `API_PORT`, `JWT_SECRET` (обязателен, API не стартует без него), `JWT_EXPIRES_IN` (по умолчанию `1h`), `NEXT_PUBLIC_API_URL`.
- Тестов и линтера пока нет.
