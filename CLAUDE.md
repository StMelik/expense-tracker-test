# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Состояние проекта

Зависимости установлены, Postgres поднят через Docker Compose, миграции Prisma `init` (`Category`, `Expense`), `add_user` (`User`), `add_category_user` (`Category.userId`) и `add_transactions` (`Expense` заменена на `Transaction`) применены. Реализованы авторизация (`UsersModule`, `AuthModule`), CRUD категорий (`CategoriesModule`) и транзакции (`TransactionsModule`). Во фронтенде реализованы страницы `/login`, `/register` и главный экран `/` (шапка с меню и именем пользователя, «Выйти», последние транзакции по 10 с серверной пагинацией; shadcn/ui + Tailwind v4, react-hook-form + Zod). Сессия лежит в `localStorage` (ключ `expense.session`), защита роутов клиентская: `features/auth-guard` (`RequireSession`) подключён в `app/(protected)/layout.tsx` вместе с шапкой, редиректит на `/login` при отсутствии сессии и при 401 от API (через `setUnauthorizedHandler` в `shared/api`). Создание транзакции — форма на главном экране (`features/transaction-create`); UI создания категорий пока нет. `/transactions` и `/categories` — страницы-заглушки, полноценного UI для транзакций и категорий нет. Тестов и линтера нет (ESLint и Tailwind запланированы, но не подключены).
## Архитектура

Монорепо на **npm workspaces** (`apps/*`, `packages/*`), без Turborepo и pnpm:

- `apps/web` (`@expense/web`) — Next.js 15, App Router, React 19, порт 3000.
- `apps/api` (`@expense/api`) — NestJS 11, порт 3001 (`API_PORT`), CORS включён в `src/main.ts`.
- `packages/shared` (`@expense/shared`) — Zod-схемы и выведенные типы DTO (`createTransactionSchema`, `createCategorySchema`). Единый источник правды для контракта между фронтом и бэком. Собирается в CommonJS `dist/` через `tsc`, поэтому перед сборкой/запуском `api` и `web` его нужно собрать (`npm run build -w packages/shared`).
- БД — PostgreSQL 16 в Docker Compose; ORM — Prisma, схема в `apps/api/prisma/schema.prisma` (`User` 1—N `Category`, `User` 1—N `Transaction`, `Category` 1—N `Transaction`; у `Category` уникальна пара `(userId, name)`; `Transaction`: `amount Decimal(12,2)`, `type` enum `income|expense`).
- Авторизация: JWT (`@nestjs/jwt`, без passport), пароли хэшируются `bcryptjs`. Эндпоинты: `POST /auth/register`, `POST /auth/login`, `GET /auth/me` (под `JwtAuthGuard`). `AuthModule` экспортирует `JwtAuthGuard` и `JwtModule`, чтобы другие модули защищали эндпоинты через `@UseGuards(JwtAuthGuard)`; `userId` берётся из `req.user.id`. Модель `User` (`name`, `email` unique, `passwordHash`).
- Категории: `GET/POST /categories`, `PATCH/DELETE /categories/:id` (под `JwtAuthGuard`), каждый пользователь видит только свои. Чужая категория отдаёт 404, дубликат имени — 409, удаление категории с транзакциями — 409 (счётчик берётся через `CountTransactionsByCategoryQuery`). Владелец при создании проверяется через `GetUserByIdQuery` (CQRS). Миграции Prisma пишутся вручную и применяются через `migrate deploy`, если `migrate dev` недоступен (неинтерактивная среда).
- Транзакции: `POST/GET /transactions`, `GET/PATCH/DELETE /transactions/:id` (под `JwtAuthGuard`), у каждого пользователя свои, чужая — 404. `GET /transactions?year=&month=&page=&limit=` (`year`/`month` опциональны, без `year` — за всё время; `page` по умолчанию 1, макс. 100000; `limit` по умолчанию 10, макс. 100 — запрос без параметров отдаёт только 10 записей; порядок `date desc, createdAt desc, id desc`) возвращает `{ items, summary: { income, expense, balance }, pagination: { page, limit, total } }`; `items` — страница, `summary` — по всему периоду (UTC). Категория при создании/смене проверяется через `GetCategoryByIdQuery` (чужая/несуществующая — 404); `amount` в ответе — number.
- **Модули общаются только через CQRS** (`@nestjs/cqrs`, `CqrsModule.forRoot()` в `AppModule`). `AuthModule` и `UsersModule` не импортируют друг друга: общие команды/запросы/события лежат в `apps/api/src/contracts/` (`CreateUserCommand`, `GetUserByEmailQuery`, `GetUserByIdQuery`, `UserCreatedEvent`, `GetCategoryByIdQuery`, `CountTransactionsByCategoryQuery`), handler'ы — внутри владельца данных (`src/users/handlers`). Новые межмодульные взаимодействия добавляйте так же. Хэширует пароль `auth`, `users` хранит только `passwordHash`.
- `@nestjs/cqrs` и `@nestjs/jwt` держите на версии `^11` (12.x требует NestJS 12).
- Валидация тел запросов: Zod-схемы из `@expense/shared` + `ZodValidationPipe` (`src/common`).

## Архитектура фронтенда (Feature Slice Design)

`apps/web/src` организован по FSD. Слои (сверху вниз): `app` → `views` → `widgets` → `features` → `entities` → `shared`.

- `app` — Next.js App Router: роуты, `layout.tsx`, `globals.css`, провайдеры. Файлы `page.tsx` тонкие: только `metadata` и реэкспорт страницы из `views`.
- `views` — FSD-слой «pages». Назван `views`, потому что `src/pages` Next.js воспринимает как Pages Router. Композиция виджетов и фич в целую страницу.
- `widgets` — самостоятельные крупные блоки UI: `header` (меню, профиль, выход), `recent-transactions` (список с пагинацией).
- `features` — пользовательские сценарии с бизнес-ценностью (`auth-login`, `auth-register`, `auth-guard`, `logout`, `transaction-create`). Сегменты: `ui/`, `api/`, `model/`.
- `entities` — бизнес-сущности и их состояние (`session` — `useSession` на `useSyncExternalStore`; `transaction`; `category`). Сегменты: `ui/`, `api/`, `model/`.
- `shared` — переиспользуемое без бизнес-логики: `ui/` (компоненты shadcn/ui), `lib/` (`cn`, `formatMoney`, `formatDate`), `api/` (`apiFetch`, `ApiError`).

Правила:
- Импорты только вниз по слоям; слайсы одного слоя не импортируют друг друга.
- Каждый слайс экспортирует публичный API через `index.ts`; внутрь слайса (`@/features/x/ui/...`) снаружи не ходить.
- Алиас `@/*` → `apps/web/src/*`.
- Клиентские компоненты (`'use client'`) — только там, где нужны хуки/обработчики (формы); страницы `views` остаются серверными.
- Контракты DTO и Zod-схемы берутся из `@expense/shared`, формы валидируются `zodResolver`.
- UI-компоненты — shadcn/ui (стиль `new-york`, конфиг `apps/web/components.json`, алиасы указывают в `shared/ui`). Новые добавлять через `npx shadcn@latest add <name>` из `apps/web`; Tailwind v4 (CSS-first, токены в `globals.css`, без `tailwind.config`).

Все `tsconfig` наследуют `tsconfig.base.json` (strict). `api` использует `experimentalDecorators` и `emitDecoratorMetadata`.

## Команды

Запуск из корня (после `cp .env.example .env` и `npm install`):

```
npm run db:up         # docker compose up -d postgres
npm run db:migrate    # prisma migrate dev (в apps/api)
npm run dev:api       # nest start --watch (через node --env-file=../../.env, нужен JWT_SECRET)
npm run dev:web       # next dev -p 3000
npm run build         # shared -> api -> web, строго в этом порядке
npm run format        # prettier --write .
npm run prisma:generate -w apps/api   # после изменений schema.prisma
npm run prisma:migrate -w apps/api -- --name <имя>   # новая миграция
```

Prisma-скрипты в `apps/api` запускаются через `node --env-file=../../.env`, потому что Prisma сама не видит корневой `.env`. Не заменяйте их на голый `prisma ...`, иначе `DATABASE_URL` не подхватится.

Скрипты установки Prisma (`@prisma/client`, `@prisma/engines`, `prisma`) разрешены в `allowScripts` корневого `package.json`. При обновлении версий их может понадобиться одобрить заново (`npm approve-scripts`).

Команд для lint и тестов пока нет; при их добавлении обновите этот раздел.

## Работа с ветками (GitHub Flow)

Используем [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow): `main` всегда в рабочем состоянии, вся разработка идёт в короткоживущих ветках через Pull Request.

- Прямые коммиты и пуши в `main` запрещены. Любое изменение (фича, фикс, доки, конфиги) делается в отдельной ветке от актуального `main`.
- Имя ветки: `<type>/<kebab-case-описание>`, где `type` совпадает с типами Conventional Commits (`feat`, `fix`, `refactor`, `docs`, `chore`, ...), описание — на английском, коротко: `feat/main-screen`, `fix/jwt-expiry`, `docs/branch-rules`. Допустим опциональный номер задачи: `feat/123-main-screen`.
- Одна ветка — одна фича/задача. Не смешивать несвязанные изменения; ветка живёт дни, а не недели.
- Перед созданием ветки: `git checkout main && git pull`, затем `git checkout -b <имя>`.
- Коммиты в ветке следуют соглашению о коммитах (см. ниже); в ветку регулярно подтягивается `main` (`git merge main` или `git rebase main`), конфликты решаются в ветке, а не в `main`.
- Ветка пушится с `-u` и открывается как Pull Request в `main`. Слияние — только после ревью и успешной сборки (`npm run build`).
- После слияния ветка удаляется (локально и на remote).
- Создание веток, коммиты, пуши и PR выполняются только по явной просьбе пользователя.

### Pull Request

PR создаётся через GitHub CLI (`gh`). В Windows он может отсутствовать в `PATH` bash — тогда вызывайте `C:\Program Files\GitHub CLI\gh.exe` из PowerShell. Перед созданием проверьте `gh auth status`.

Подготовка:
- Сборка зелёная (`npm run build`), в ветке нет незакоммиченных изменений, `main` подтянут в ветку.
- Перед написанием описания изучите `git log main..HEAD` и `git diff main` (а не только последний коммит): описание должно покрывать всю ветку.

Title — по Conventional Commits, как у коммита: `<type>(<scope>): <описание>`, английский, до ~72 символов, повелительное наклонение, без точки. Если в ветке один коммит — title совпадает с его заголовком; если несколько — отражает суть всей ветки. Breaking change помечается `!`.

Описание (body) — на русском, по шаблону:

```
## Что сделано
<краткий список реализованного по областям: api, shared, web>

## Endpoints
<добавленные/изменённые эндпоинты: метод, путь, параметры, формат ответа; если API не менялся — «Без изменений»>

## Зачем
<мотивация и принятые решения, особенно неочевидные>

## Breaking changes
<что ломает обратную совместимость и как мигрировать; если нет — «Нет»>

## Как проверить
<шаги ручной проверки; результат сборки/тестов>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Команда: `gh pr create --base main --title "<title>" --body-file <файл>` (тело передаётся из файла, чтобы не терять переносы строк и кавычки). Изменение самой инструкции по PR — отдельный коммит `docs: ...` в ту же ветку до создания PR. После создания сообщите пользователю ссылку на PR.

## Соглашение о коммитах

Используем [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <описание>`.

- `type`: `feat` (новая функциональность), `fix` (исправление бага), `refactor`, `perf`, `docs`, `style` (форматирование без смены логики), `test`, `build` (сборка, зависимости), `ci`, `chore` (прочее, в т. ч. миграции и конфиги).
- `scope` — опциональная область изменения: `api`, `web`, `shared`, `db`, а при необходимости модуль или слайс (`auth`, `categories`, `transactions`, `auth-login`). Для изменений, затрагивающих несколько областей, scope опускается.
- Описание — в повелительном наклонении, со строчной буквы, без точки в конце, до ~72 символов. Язык — английский (тело коммита при необходимости можно писать на русском).
- Тело коммита (после пустой строки) объясняет, **почему** сделано изменение, а не что именно изменено.
- Breaking change помечается `!` после типа/scope (`feat(api)!: ...`) и/или футером `BREAKING CHANGE: ...`.
- Один коммит — одно логическое изменение. Изменения `schema.prisma` и соответствующая миграция коммитятся вместе; изменения `packages/shared` вместе с зависимыми правками `api`/`web`, если контракт ломается.
- Не коммитить `.env`, `node_modules`, `dist`, `.next` и прочие артефакты сборки.
- Коммиты и пуши делаются только по явной просьбе пользователя.

Примеры:

```
feat(transactions): add monthly summary to GET /transactions
fix(auth): return 401 for expired JWT
chore(db): add migration for Transaction table
docs: add commit conventions to CLAUDE.md
```

## Переменные окружения

Шаблон — `.env.example`: `POSTGRES_*`, `DATABASE_URL` (читает Prisma), `API_PORT`, `JWT_SECRET` (обязателен, API не стартует без него), `JWT_EXPIRES_IN` (по умолчанию `1h`), `NEXT_PUBLIC_API_URL` (адрес API для фронта).
