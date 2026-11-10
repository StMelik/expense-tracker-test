# Новая функциональность  - Создать модуль транзакций

## Контекст
Проект: Nest.js + Next + PostgreSQL + Prisma
Что уже есть: User, авторизация JWT, модуль категорий + frontend авторизации

## Задача
Центральный модуль учёта доходов и расходов.

## Модель данных
Транзакция: id, amount, type (income/expense), description, date, categoryId, userId

## Контроллер и эндпоинты
- POST /transactions,
- GET /transactions (агрегация по month/year),
- GET /transactions/:id,
- PATCH /transactions/:id,
- DELETE /transactions/:id

## Паттерн
- Следуй структуре модуля из src/modules/categories/
- Взаимодействие через CQRS

## Ограничения
- Не добавлять зависимости если не указано в задаче
- Используй zod для DTO
- После реализации собирай проект
