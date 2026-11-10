# Expense Tracker

Монорепо (npm workspaces): `apps/web` (Next.js), `apps/api` (NestJS + Prisma), `packages/shared` (типы и Zod-схемы). БД — PostgreSQL 16 в Docker.

## Запуск (после установки зависимостей)
1. `cp .env.example .env`
2. `npm install`
3. `npm run db:up`
4. `npm run db:migrate`
5. `npm run dev:api` и `npm run dev:web`

Порты: web 3000, api 3001, postgres 5432.
