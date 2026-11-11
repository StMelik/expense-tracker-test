# Руководство разработчика

Пошаговые рецепты. Общие принципы — в [architecture.md](architecture.md), правила веток и коммитов — в корневом `CLAUDE.md`.

## Окружение и запуск

```bash
cp .env.example .env
npm install
npm run build -w packages/shared   # api и web используют собранный dist/
npm run db:up                      # PostgreSQL в Docker
npm run db:migrate                 # миграции + генерация клиента
npm run dev:api                    # http://localhost:3001 (Swagger: /docs)
npm run dev:web                    # http://localhost:3000
```

Полная проверка перед PR: `npm run build` (порядок `shared → api → web`). Тестов и линтера нет, форматирование — `npm run format`.

## Рабочий процесс (GitHub Flow)

1. `git checkout main && git pull`, затем `git checkout -b <type>/<kebab-описание>` (например `feat/budgets`).
2. Одна ветка — одна задача. Коммиты — Conventional Commits (`feat(budgets): ...`).
3. `npm run build` зелёный → push с `-u` → Pull Request в `main`.

В `main` напрямую не коммитим. Ветки, коммиты и PR создаются только по явной просьбе.

## Как добавить модуль (бэкенд)

Пример: модуль `budgets`. За образец берите `src/categories/`.

1. **Модель данных.** Добавьте модель в `schema.prisma` и миграцию (см. [ниже](#как-добавить-миграцию)). Не забудьте `userId` с `onDelete: Cascade`, если данные личные.

2. **Контракт в `packages/shared/src/index.ts`:** Zod-схемы (`createBudgetSchema`, `updateBudgetSchema`), выведенные типы DTO и тип ответа (`BudgetResponse`). Пересоберите: `npm run build -w packages/shared`.

3. **Файлы модуля** `apps/api/src/budgets/`:

   ```
   budgets.module.ts
   budgets.controller.ts
   budgets.service.ts
   handlers/            # только если другие модули запрашивают ваши данные
   ```

4. **Контроллер** — тонкий: `@Controller('budgets')`, `@UseGuards(JwtAuthGuard)`, `@Req() req: AuthedRequest`, тело через `@Body(new ZodValidationPipe(schema))`. Для Swagger: `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiResponse` на классе и методах (образец — `transactions.controller.ts`). Добавьте JSDoc с `@param`/`@returns`/`@throws`.

5. **Сервис** — вся логика: каждый запрос в Prisma фильтруется по `userId`; чужая или отсутствующая запись → `NotFoundException` (404); P2002 → `ConflictException` (409); ответ маппится в тип из `shared` (`Decimal` → `number`, `Date` → ISO).

6. **Модуль:**

   ```ts
   @Module({
     imports: [CqrsModule, AuthModule],   // AuthModule даёт JwtAuthGuard
     controllers: [BudgetsController],
     providers: [BudgetsService],
   })
   export class BudgetsModule {}
   ```

7. **Подключите** `BudgetsModule` в `imports` у `AppModule` (`src/app.module.ts`).

8. **Межмодульные связи — только через CQRS.** Не импортируйте чужой модуль или сервис:
   - в `src/contracts/<module>.contracts.ts` объявите `Query`/`Command`/`Event` и тип результата;
   - handler (`@QueryHandler`/`@CommandHandler`) положите в модуль — владелец данных и зарегистрируйте в его `providers`;
   - потребитель вызывает `this.queryBus.execute(new XQuery(...))`.

9. **Документация:** обновите `.claude/docs/api.md`, раздел «Состояние» в `apps/api/CLAUDE.md` и README, если менялся список эндпоинтов.

10. `npm run build`, затем ручная проверка через Swagger (`/docs`, кнопка Authorize с JWT).

## Как добавить фичу (фронтенд)

Пример: форма создания категории. Фронт организован по FSD (`views → widgets → features → entities → shared`), импорты — только вниз.

1. **Определите слой.**
   - сценарий пользователя (создать, удалить, войти) → `features/<name>`;
   - данные и отображение сущности → `entities/<name>`;
   - самостоятельный блок страницы → `widgets/<name>`;
   - композиция страницы → `views/<name>`; роут → `app/...`.

2. **Структура слайса:**

   ```
   features/category-create/
   ├── api/create-category.ts     # apiFetch<CategoryResponse>('/categories', { method: 'POST', token, body })
   ├── ui/create-category-form.tsx
   ├── model/                     # хуки/состояние, если нужны
   └── index.ts                   # публичный API слайса
   ```

3. **Данные и контракт.** Типы и Zod-схемы берите из `@expense/shared` (`createCategorySchema`), не дублируйте. Форма: react-hook-form + `zodResolver(createCategorySchema)`. Токен — из `useSession()` (`@/entities/session`).

4. **HTTP.** Только через `apiFetch` из `@/shared/api`; ошибки приходят как `ApiError(status, message)`. `401` обрабатывает `auth-guard` централизованно.

5. **UI.** Компоненты — shadcn/ui из `@/shared/ui`. Новый компонент: `npx shadcn@latest add <name>` из `apps/web`. Стили — Tailwind v4, токены в `globals.css`.

6. **Публичный API.** Экспортируйте из `index.ts` только то, что нужно снаружи; снаружи импортируйте `@/features/category-create`, а не `@/features/category-create/ui/...`. Слайсы одного слоя друг друга не импортируют.

7. **Подключение.** Добавьте компонент во `view` (или `widget`). `'use client'` — только у компонентов с хуками/обработчиками; `view` остаётся серверным.

8. **Новый роут.** `app/(protected)/<path>/page.tsx` — только `metadata` и реэкспорт страницы из `views`. Группа `(protected)` уже оборачивает страницы в `RequireSession` и `Header`; публичные страницы кладутся вне группы (как `login`).

9. Обновите раздел «Состояние» в `apps/web/CLAUDE.md`, затем `npm run build`.

## Как добавить миграцию

1. Измените `apps/api/prisma/schema.prisma`.
2. Создайте миграцию (поднятая БД: `npm run db:up`):

   ```bash
   npm run prisma:migrate -w apps/api -- --name <имя_в_snake_case>
   ```

   Команда создаёт `prisma/migrations/<timestamp>_<имя>/migration.sql`, применяет её и перегенерирует клиент.
3. Если нужна только генерация клиента: `npm run prisma:generate -w apps/api`.
4. **Неинтерактивная среда**, где `migrate dev` недоступен: напишите `migration.sql` вручную в новой папке `<timestamp>_<имя>` и примените `migrate deploy` (через `node --env-file=../../.env ../../node_modules/prisma/build/index.js migrate deploy`).
5. Закоммитьте `schema.prisma` и миграцию **вместе**: `chore(db): add migration for <что>`.

Правила:

- Prisma-скрипты запускайте только через npm-скрипты проекта: они используют `node --env-file=../../.env`, иначе `DATABASE_URL` не подхватится. Голый `prisma ...` не используйте.
- Не правьте уже применённые миграции — создавайте новую.
- Для добавления `NOT NULL`-колонки в таблицу с данными задайте `@default` или выполните миграцию в несколько шагов (nullable → заполнение → `NOT NULL`).
- Меняя поля, обновите Zod-схемы в `packages/shared`, сервисы и `.claude/docs/database.md`.

## Чек-лист перед PR

- [ ] `npm run build` проходит (shared → api → web)
- [ ] схема `shared` обновлена и пересобрана, если менялся контракт
- [ ] `schema.prisma` и миграция в одном коммите
- [ ] JSDoc у изменённых методов, Swagger-декораторы у контроллеров и DTO
- [ ] межмодульные вызовы через `src/contracts/` (CQRS)
- [ ] FSD: импорты вниз, внутрь слайсов не ходим
- [ ] `.claude/docs/*` и `CLAUDE.md` актуализированы
- [ ] ветка `<type>/<описание>`, коммиты по Conventional Commits, описание PR по шаблону из `CLAUDE.md`
