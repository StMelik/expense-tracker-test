# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Детали по подпроектам лежат рядом с кодом и подхватываются при работе в соответствующих каталогах:

- [apps/api/CLAUDE.md](apps/api/CLAUDE.md) — бэкенд (NestJS, Prisma, CQRS, эндпоинты).
- [apps/web/CLAUDE.md](apps/web/CLAUDE.md) — фронтенд (Next.js, Feature Slice Design, shadcn/ui).

## Состояние проекта

Зависимости установлены, Postgres поднят через Docker Compose, миграции Prisma `init`, `add_user`, `add_category_user` и `add_transactions` применены. Бэкенд: авторизация, CRUD категорий, транзакции. Фронтенд: `/login`, `/register`, главный экран `/` с последними транзакциями и формой создания; `/transactions` и `/categories` — заглушки. Тестов и линтера нет (ESLint и Tailwind запланированы, но не подключены).

## Архитектура

Монорепо на **npm workspaces** (`apps/*`, `packages/*`), без Turborepo и pnpm:

- `apps/web` (`@expense/web`) — Next.js 15, App Router, React 19, порт 3000.
- `apps/api` (`@expense/api`) — NestJS 11, порт 3001 (`API_PORT`), CORS включён в `src/main.ts`.
- `packages/shared` (`@expense/shared`) — Zod-схемы и выведенные типы DTO (`createTransactionSchema`, `createCategorySchema`). Единый источник правды для контракта между фронтом и бэком. Собирается в CommonJS `dist/` через `tsc`, поэтому перед сборкой/запуском `api` и `web` его нужно собрать (`npm run build -w packages/shared`).
- БД — PostgreSQL 16 в Docker Compose; ORM — Prisma, схема в `apps/api/prisma/schema.prisma`.

Все `tsconfig` наследуют `tsconfig.base.json` (strict).

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

Шаблон — `.env.example`: `POSTGRES_*`, `DATABASE_URL` (читает Prisma), `API_PORT`, `JWT_SECRET` (обязателен, API не стартует без него), `JWT_EXPIRES_IN` (по умолчанию `1h`), `NEXT_PUBLIC_API_URL` (адрес API для фронта). Подробности по API-переменным — в `apps/api/CLAUDE.md`.
