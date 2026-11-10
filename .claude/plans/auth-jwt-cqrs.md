# План: авторизация (JWT) + модуль пользователя через CQRS

## Context
В `apps/api` пока пустые `ExpensesModule` и `CategoriesModule`, модели `User` нет (CLAUDE.md: «добавится отдельной миграцией»). Нужно добавить:
- модуль `users` (имя, email, хэш пароля);
- модуль `auth` (JWT, методы `register` и `login`);
- общение между модулями только через CQRS (`@nestjs/cqrs`), без прямых импортов `AuthModule` ↔ `UsersModule`.

Prisma-клиента как провайдера в Nest тоже ещё нет — его нужно завести.

## Решения (дефолты, можно поменять при ревью)
- Хэширование: `bcryptjs` (чистый JS, не требует install-скриптов/`allowScripts`).
- JWT: `@nestjs/jwt` + собственный `JwtAuthGuard` (без passport — меньше зависимостей).
- Валидация: Zod-схемы в `@expense/shared` (единый контракт фронт/бэк) + небольшой `ZodValidationPipe`.
- Хэшированием занимается **auth** (у него bcrypt), `users` хранит только готовый `passwordHash` и ничего не знает о паролях.
- Связь `Expense` → `User` в этой задаче НЕ добавляется (отдельная миграция позже).

## Как обходятся «прямые импорты»
Handler'ы CQRS привязываются к **классу** команды/запроса, поэтому нужен общий контракт. Кладём его в нейтральное место `apps/api/src/contracts/users.contracts.ts` — модули импортируют только контракты, но не друг друга:

- `CreateUserCommand(name, email, passwordHash)` → `{ id, name, email }`
- `GetUserByEmailQuery(email)` → `{ id, name, email, passwordHash } | null`
- `GetUserByIdQuery(id)` → `{ id, name, email } | null`

`AuthModule` использует `CommandBus`/`QueryBus` (из `CqrsModule`), `UsersModule` регистрирует handler'ы. Ни `auth/*` не импортирует `users/*`, ни наоборот.

## Взаимодействие через CQRS (детально)

Принцип: **auth — потребитель, users — владелец данных**. `AuthService` не знает про `UsersService`/`PrismaService.user`; он только отправляет сообщения в шины. Любой другой модуль в будущем (например, expenses) получит пользователя тем же способом.

### Контракты (`apps/api/src/contracts/users.contracts.ts`) — единственная точка связи
```ts
// Commands (меняют состояние, отправляются через CommandBus)
export class CreateUserCommand {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly passwordHash: string,
  ) {}
}

// Queries (только чтение, через QueryBus)
export class GetUserByEmailQuery { constructor(public readonly email: string) {} }
export class GetUserByIdQuery    { constructor(public readonly id: string) {} }

// Events (факт случившегося, через EventBus)
export class UserCreatedEvent {
  constructor(public readonly userId: string, public readonly email: string) {}
}

// Результаты
export type PublicUser = { id: string; name: string; email: string };
export type UserWithHash = PublicUser & { passwordHash: string };
```

### Кто что отправляет / обрабатывает
| Сообщение | Отправитель | Обработчик | Результат |
|---|---|---|---|
| `CreateUserCommand` | `AuthService.register` | `CreateUserHandler` (users) | `PublicUser`; `ConflictException` при дубликате email |
| `GetUserByEmailQuery` | `AuthService.login` | `GetUserByEmailHandler` (users) | `UserWithHash \| null` |
| `GetUserByIdQuery` | `AuthController.me` (через `AuthService`) | `GetUserByIdHandler` (users) | `PublicUser \| null` |
| `UserCreatedEvent` | `CreateUserHandler` (`EventBus.publish`) | пока без подписчиков (точка расширения: welcome-письмо, дефолтные категории) | — |

### Потоки
```
POST /auth/register
  AuthController → AuthService.register
    1. bcrypt.hash(password)
    2. commandBus.execute(new CreateUserCommand(name, email, hash))
         └─ UsersModule: CreateUserHandler → prisma.user.create → eventBus.publish(UserCreatedEvent)
    3. jwtService.signAsync({ sub: user.id }) → { accessToken, user }

POST /auth/login
  AuthController → AuthService.login
    1. queryBus.execute(new GetUserByEmailQuery(email))   // null → 401
    2. bcrypt.compare(password, user.passwordHash)        // false → 401 (то же сообщение)
    3. jwtService.signAsync({ sub: user.id }) → { accessToken, user (без passwordHash) }

GET /auth/me  (JwtAuthGuard кладёт req.user.id)
  AuthController → AuthService.me
    1. queryBus.execute(new GetUserByIdQuery(id))          // null → 401
```

### Правила изоляции
- `AuthModule` и `UsersModule` оба импортируют только `CqrsModule` (+ `contracts/`), друг друга — никогда.
- `UsersModule` не экспортирует провайдеров; handler'ы — его внутренняя деталь. Наружу виден только набор сообщений из `contracts/`.
- `passwordHash` возвращает только `GetUserByEmailQuery` (нужен для login); все остальные ответы — `PublicUser`.
- Handler'ы регистрируются автоматически: `CqrsModule.forRoot()` в `AppModule` (один раз), `@CommandHandler/@QueryHandler` на классах в `providers` соответствующего модуля.
- Контроль в проверке: grep на взаимные импорты `auth` ↔ `users` должен быть пустым.

## Изменения

### 1. Зависимости (`apps/api/package.json`)
`@nestjs/cqrs`, `@nestjs/jwt`, `bcryptjs` (+ `@types/bcryptjs` при необходимости).

### 2. Prisma
- `apps/api/prisma/schema.prisma`: модель
  ```prisma
  model User {
    id           String   @id @default(cuid())
    name         String
    email        String   @unique
    passwordHash String
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt
  }
  ```
- Миграция: `npm run prisma:migrate -w apps/api -- --name add_user`, затем `prisma:generate`.
- Новый глобальный `src/prisma/prisma.module.ts` + `prisma.service.ts` (`extends PrismaClient`, `onModuleInit` → `$connect`).

### 3. Shared (`packages/shared/src/index.ts`)
Добавить по образцу существующих схем:
- `registerSchema` = `{ name: min(1), email: email(), password: min(8) }`
- `loginSchema` = `{ email: email(), password: string }`
- типы `RegisterDto`, `LoginDto`, `AuthResponse` (`{ accessToken, user: {id,name,email} }`).
Пересобрать: `npm run build -w packages/shared`.

### 4. `src/contracts/users.contracts.ts`
Команда, запросы, событие и типы результата — см. раздел «Взаимодействие через CQRS».

### 5. `src/users/` (владеет данными)
- `users.module.ts`: `imports: [CqrsModule]`, providers — handler'ы.
- `handlers/create-user.handler.ts`: `prisma.user.create`; при `P2002` (дубликат email) → `ConflictException`; после успеха `eventBus.publish(new UserCreatedEvent(...))`. Email нормализуется в lower-case (так же в `GetUserByEmailHandler`).
- `handlers/get-user-by-email.handler.ts`, `handlers/get-user-by-id.handler.ts`.
- HTTP-контроллера у users нет (по ТЗ — только модуль пользователя).

### 6. `src/auth/`
- `auth.module.ts`: `CqrsModule`, `JwtModule.registerAsync` (секрет и TTL из env).
- `auth.service.ts`:
  - `register(dto)`: `bcrypt.hash` → `commandBus.execute(CreateUserCommand)` → подписать токен.
  - `login(dto)`: `queryBus.execute(GetUserByEmailQuery)` → `bcrypt.compare`; при любой ошибке одинаковый `UnauthorizedException('Invalid credentials')` (без утечки, существует ли email).
- `auth.controller.ts`: `POST /auth/register`, `POST /auth/login` (+ `GET /auth/me` под guard'ом через `GetUserByIdQuery` — проверка, что guard и CQRS-чтение работают).
- `jwt-auth.guard.ts`: читает `Authorization: Bearer`, `jwtService.verifyAsync`, кладёт `req.user = { id }`.
- `src/common/zod-validation.pipe.ts`: `safeParse` → `BadRequestException` с `error.flatten()`.

### 7. Подключение и конфиг
- `app.module.ts`: добавить `CqrsModule.forRoot()`, `PrismaModule`, `UsersModule`, `AuthModule`.
- `.env.example`: `JWT_SECRET=change-me`, `JWT_EXPIRES_IN=1h`. При старте падать, если `JWT_SECRET` не задан.
- `CLAUDE.md`: обновить «Состояние проекта» (модули users/auth, CQRS-контракты, новые env, правило «модули общаются только через `contracts/`»).

## Критичные файлы
`apps/api/prisma/schema.prisma`, `apps/api/src/app.module.ts`, `packages/shared/src/index.ts`, новые `apps/api/src/{contracts,users,auth,prisma,common}/*`, `.env.example`, `CLAUDE.md`.

## Проверка (end-to-end)
1. `cp .env.example .env` (добавить JWT-переменные), `npm run db:up`, `npm run db:migrate`.
2. `npm run build` (shared → api → web) — проходит без ошибок типов.
3. `npm run dev:api`, затем:
   - `POST /auth/register` `{name,email,password}` → 201, `accessToken`; в БД `passwordHash` ≠ пароль.
   - Повторный register с тем же email → 409.
   - `POST /auth/login` верный пароль → 200 + токен; неверный пароль / неизвестный email → 401 с одинаковым сообщением.
   - `GET /auth/me` с токеном → данные пользователя; без токена → 401.
   - Невалидное тело (короткий пароль, плохой email) → 400.
4. Проверить отсутствие связности: `grep -r "from '../users" apps/api/src/auth` и `grep -r "from '../auth" apps/api/src/users` — пусто.

## Чек-лист выполнения
- [x] 1. Зависимости: `@nestjs/cqrs`, `@nestjs/jwt`, `bcryptjs`
- [x] 2. Prisma: модель `User`, миграция `add_user`, `generate`
- [x] 2. Prisma: глобальные `PrismaModule` + `PrismaService`
- [x] 3. Shared: `registerSchema`, `loginSchema`, типы; пересборка `packages/shared`
- [x] 4. `contracts/users.contracts.ts`
- [x] 5. `users`: модуль + 3 handler'а
- [x] 6. `auth`: модуль, сервис, контроллер, guard, `ZodValidationPipe`
- [x] 7. `app.module.ts`, `.env.example` (JWT_*), проверка `JWT_SECRET` при старте
- [x] 7. Обновить `CLAUDE.md`
- [x] Проверка: `npm run build`
- [x] Проверка: e2e сценарии register/login/me
- [x] Проверка: нет взаимных импортов `auth` ↔ `users`
