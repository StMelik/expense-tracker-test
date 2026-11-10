# План: CRUD категорий трат

## Context
Авторизация готова, нужны пользовательские категории трат. `Category` сейчас глобальная (без `userId`, `name @unique`), `CategoriesModule` пуст. Результат: каждый пользователь управляет только своими категориями через JWT-защищённый CRUD.

Решения: валидация — **Zod** (как в проекте, не class-validator); уникальность `(userId, name)`, `userId` обязателен; межмодульное взаимодействие — только CQRS.

## Чек-лист задач

### 1. Prisma (`apps/api/prisma/schema.prisma`)
- [x] `User`: добавить `categories Category[]`
- [x] `Category`: убрать `@unique` с `name`; добавить `icon String?`, `userId String`, relation `user` (`onDelete: Cascade`), `@@unique([userId, name])`, `@@index([userId])`
- [x] Создать миграцию `npm run prisma:migrate -w apps/api -- --name add_category_user --create-only`
- [x] В SQL перед `ADD COLUMN "userId" NOT NULL` добавить `DELETE FROM "Expense"; DELETE FROM "Category";` (бизнес-данных в БД нет)
- [x] Применить миграцию и выполнить `npm run prisma:generate -w apps/api`

### 2. Shared (`packages/shared/src/index.ts`)
- [x] `createCategorySchema`: `name` (trim, min 1, max 50), `color` (regex `^#[0-9a-fA-F]{6}$`, optional), `icon` (string, max 50, optional)
- [x] `updateCategorySchema` = `createCategorySchema.partial()` + refine «хотя бы одно поле»
- [x] Типы `UpdateCategoryDto`, `CategoryResponse`
- [x] `npm run build -w packages/shared`

### 3. CQRS (связь с User-модулем)
- [x] Переиспользовать `GetUserByIdQuery` из `apps/api/src/contracts/users.contracts.ts` (handler уже есть в `users/handlers`), новых контрактов не требуется
- [x] `CategoriesModule` не импортирует `UsersModule`

### 4. Доступ к гарду
- [x] `AuthModule`: добавить `exports: [JwtModule, JwtAuthGuard]`

### 5. Модуль категорий (`apps/api/src/categories/`)
- [x] `categories.service.ts` (`PrismaService` + `QueryBus`): `create`, `findAll` (order by name), `update`, `remove`
- [x] Проверка владельца пользователя через `QueryBus.execute(new GetUserByIdQuery(userId))` при создании
- [x] Владение категорией: `findFirst({ where: { id, userId } })`, иначе `NotFoundException`
- [x] Prisma `P2002` → `ConflictException` (дубликат имени)
- [x] `remove`: при наличии связанных `Expense` → `ConflictException`
- [x] `categories.controller.ts`: `@Controller('categories')` + `@UseGuards(JwtAuthGuard)`; `POST /`, `GET /`, `PATCH /:id`, `DELETE /:id` (204); тела через `ZodValidationPipe`, `userId` из `req.user.id`
- [x] `categories.module.ts`: `imports: [CqrsModule, AuthModule]`, controller, service

### 6. Документация
- [x] Обновить `CLAUDE.md`: состояние проекта, привязка `Category` к `User`, эндпоинты `/categories`

### 7. Проверка
- [x] `npm run db:up`, миграция, `npm run build` (shared → api → web) без ошибок
- [x] `npm run dev:api`; register → login → токен
- [x] `POST /categories` → 201; тот же name → 409; невалидный `color` → 400; без токена → 401
- [x] `GET /categories` возвращает только свои; второй пользователь чужих не видит
- [x] `PATCH`/`DELETE` чужой категории → 404
- [x] `DELETE` категории с тратой → 409; без трат → 204
