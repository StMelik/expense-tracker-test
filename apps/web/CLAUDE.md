# CLAUDE.md (apps/web)

Руководство по фронтенду `@expense/web`. Общее описание монорепо, команды, ветки и коммиты — в корневом [CLAUDE.md](../../CLAUDE.md).

## Состояние

Реализованы страницы `/login`, `/register` и главный экран `/` (шапка с меню и именем пользователя, «Выйти», последние транзакции по 10 с серверной пагинацией). Стек UI: shadcn/ui + Tailwind v4, react-hook-form + Zod.

- Сессия лежит в `localStorage` (ключ `expense.session`).
- Защита роутов клиентская: `features/auth-guard` (`RequireSession`) подключён в `app/(protected)/layout.tsx` вместе с шапкой, редиректит на `/login` при отсутствии сессии и при 401 от API (через `setUnauthorizedHandler` в `shared/api`).
- Создание транзакции — форма на главном экране (`features/transaction-create`); UI создания категорий пока нет.
- `/transactions` и `/categories` — страницы-заглушки, полноценного UI для транзакций и категорий нет.
- Тестов и линтера нет (ESLint запланирован, но не подключён).

## Стек

Next.js 15, App Router, React 19, порт 3000. Адрес API — `NEXT_PUBLIC_API_URL`. Контракты DTO и Zod-схемы берутся из `@expense/shared`, формы валидируются `zodResolver`.

## Архитектура (Feature Slice Design)

`src/` организован по FSD. Слои (сверху вниз): `app` → `views` → `widgets` → `features` → `entities` → `shared`.

- `app` — Next.js App Router: роуты, `layout.tsx`, `globals.css`, провайдеры. Файлы `page.tsx` тонкие: только `metadata` и реэкспорт страницы из `views`.
- `views` — FSD-слой «pages». Назван `views`, потому что `src/pages` Next.js воспринимает как Pages Router. Композиция виджетов и фич в целую страницу.
- `widgets` — самостоятельные крупные блоки UI: `header` (меню, профиль, выход), `recent-transactions` (список с пагинацией).
- `features` — пользовательские сценарии с бизнес-ценностью (`auth-login`, `auth-register`, `auth-guard`, `logout`, `transaction-create`). Сегменты: `ui/`, `api/`, `model/`.
- `entities` — бизнес-сущности и их состояние (`session` — `useSession` на `useSyncExternalStore`; `transaction`; `category`). Сегменты: `ui/`, `api/`, `model/`.
- `shared` — переиспользуемое без бизнес-логики: `ui/` (компоненты shadcn/ui), `lib/` (`cn`, `formatMoney`, `formatDate`), `api/` (`apiFetch`, `ApiError`).

## Правила

- Импорты только вниз по слоям; слайсы одного слоя не импортируют друг друга.
- Каждый слайс экспортирует публичный API через `index.ts`; внутрь слайса (`@/features/x/ui/...`) снаружи не ходить.
- Алиас `@/*` → `apps/web/src/*`.
- Клиентские компоненты (`'use client'`) — только там, где нужны хуки/обработчики (формы); страницы `views` остаются серверными.
- UI-компоненты — shadcn/ui (стиль `new-york`, конфиг `components.json`, алиасы указывают в `shared/ui`). Новые добавлять через `npx shadcn@latest add <name>` из `apps/web`.
- Tailwind v4: CSS-first, токены в `globals.css`, без `tailwind.config`.
- Перед сборкой `web` нужно собрать `@expense/shared` (`npm run build -w packages/shared`).

## Команды

Из корня: `npm run dev:web` (`next dev -p 3000`).
