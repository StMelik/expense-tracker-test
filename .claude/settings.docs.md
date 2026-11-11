# Документация по `.claude/settings.json` (Claude Code)

> Список настроек зависит от версии Claude Code. Актуальный перечень: https://docs.claude.com/en/docs/claude-code/settings
> Команда `/config` и `/permissions` внутри Claude Code позволяют менять часть настроек без ручного редактирования.

## 1. Где лежат файлы настроек и кто главнее

| Файл | Область | В git? |
|---|---|---|
| `~/.claude/settings.json` | Пользовательские, для всех проектов | нет |
| `.claude/settings.json` | Проектные, общие для команды | да |
| `.claude/settings.local.json` | Личные для проекта | нет (автоматически в .gitignore) |
| Managed settings (системный каталог, напр. `C:\Program Files\ClaudeCode\managed-settings.json`) | Корпоративные, переопределить нельзя | — |

**Приоритет (от высшего к низшему):** managed → аргументы командной строки → `settings.local.json` → `settings.json` проекта → `~/.claude/settings.json`.
Скалярные значения переопределяются, массивы (например `permissions.allow`) **объединяются** из всех уровней. Правило `deny` всегда сильнее `ask`, а `ask` сильнее `allow`.

Рекомендуется добавить схему для автодополнения в редакторе:

```json
{ "$schema": "https://json.schemastore.org/claude-code-settings.json" }
```

---

## 2. `permissions` — разрешения на инструменты

```json
"permissions": {
  "allow": [],
  "ask": [],
  "deny": [],
  "additionalDirectories": [],
  "defaultMode": "default",
  "disableBypassPermissionsMode": "disable"
}
```

| Ключ | Что делает |
|---|---|
| `allow` | Правила, которые выполняются **без запроса** подтверждения. |
| `ask` | Правила, для которых **всегда спрашивать** подтверждение. |
| `deny` | Правила, которые **полностью запрещены**. Заблокированный файл/команда недоступны Claude вообще. Приоритет над allow/ask. |
| `additionalDirectories` | Дополнительные рабочие каталоги, к которым Claude получает доступ помимо текущего проекта. |
| `defaultMode` | Режим разрешений по умолчанию: `default` (спрашивать при первом использовании), `acceptEdits` (правки файлов принимаются автоматически), `plan` (только чтение и планирование), `bypassPermissions` (всё без вопросов; опасно), в новых версиях также `auto`/`dontAsk`. |
| `disableBypassPermissionsMode` | Значение `"disable"` запрещает включать режим `bypassPermissions`. |

### Синтаксис правил: `Инструмент` или `Инструмент(спецификатор)`

- `Bash` — все bash-команды; `Bash(npm test)` — точная команда; `Bash(npm run *)` — с подстановкой `*` (граница слова: `Bash(ls *)` не совпадёт с `lsof`; `Bash(ls*)` совпадёт).
- `Read(путь)`, `Edit(путь)`, `Write` — файловые операции. Шаблоны путей в стиле gitignore: `Read(.env*)`, `Read(./secrets/**)`, `Edit(src/**)`. Префиксы: `//путь` — абсолютный путь ФС, `~/путь` — домашний каталог, `/путь` — относительно корня проекта, `путь` или `./путь` — относительно текущего каталога.
- `WebFetch(domain:example.com)` — запросы только к указанному домену; `WebSearch` — веб-поиск.
- `mcp__сервер` или `mcp__сервер__инструмент` — MCP-инструменты.
- `Agent(имя)` (ранее `Task(...)`) — управление субагентами.
- `Skill(имя)` — вызов навыков.
- Отдельное имя без скобок (`Write`, `Glob`, `Grep`) разрешает/запрещает инструмент целиком.

> Важно: ограничения `Bash(...)` — это сопоставление по тексту команды, а не песочница. Составные команды (`a && b`) проверяются по частям, но обойти префиксные правила возможно. Для настоящей изоляции используйте `sandbox`.

### Разбор вашего текущего файла

```json
"allow": ["Bash(npm test)", "Bash(get *)", "Write", "LS", "Glob", "Grep", "MultiEdit", "WebFetch(domain:api.github.com)"],
"deny":  ["Bash(git push *)", "Read(.env*)"],
"ask":   ["Bash(get commit *)"]
```

| Правило | Эффект |
|---|---|
| `Bash(npm test)` | `npm test` выполняется без вопросов. |
| `Bash(get *)` | Любая команда, начинающаяся с `get `, без вопросов. **Вероятная опечатка: должно быть `git`.** Сейчас оно не относится к git. |
| `Write` | Создание/перезапись любых файлов без вопросов (широкое разрешение!). |
| `LS`, `Glob`, `Grep` | Просмотр каталогов и поиск без вопросов (`LS` в новых версиях — часть `Read`/Bash). |
| `MultiEdit` | Пакетное редактирование без вопросов (в новых версиях покрывается `Edit`). |
| `WebFetch(domain:api.github.com)` | Запросы к api.github.com без вопросов. |
| `Bash(git push *)` (deny) | `git push` запрещён полностью. |
| `Read(.env*)` (deny) | Чтение `.env`, `.env.local` и т. п. запрещено. |
| `Bash(get commit *)` (ask) | **Опечатка (`get` вместо `git`)**: правило не сработает на `git commit`. Если вы хотите подтверждение коммитов, исправьте на `Bash(git commit *)`. Кроме того, `Bash(get *)` в allow конфликтует с ним: побеждает ask, но только для `get commit ...`. |

---

## 3. `env` — переменные окружения

```json
"env": { "NODE_ENV": "development", "BASH_DEFAULT_TIMEOUT_MS": "60000" }
```
Переменные применяются к каждой сессии Claude Code и к запускаемым им командам. Часто используемые:

| Переменная | Эффект |
|---|---|
| `ANTHROPIC_API_KEY` | Ключ API (не храните в git-версии файла!). |
| `ANTHROPIC_MODEL` | Модель по умолчанию. |
| `ANTHROPIC_BASE_URL` | Свой адрес API / прокси. |
| `BASH_DEFAULT_TIMEOUT_MS`, `BASH_MAX_TIMEOUT_MS` | Таймаут bash-команд по умолчанию / максимальный. |
| `BASH_MAX_OUTPUT_LENGTH` | Максимум символов вывода bash до обрезки. |
| `MAX_THINKING_TOKENS` | Бюджет «размышлений». |
| `MAX_MCP_OUTPUT_TOKENS` | Лимит вывода MCP-инструментов. |
| `MCP_TIMEOUT`, `MCP_TOOL_TIMEOUT` | Таймауты запуска MCP-сервера и вызова инструмента. |
| `DISABLE_TELEMETRY`, `DISABLE_ERROR_REPORTING`, `DISABLE_AUTOUPDATER`, `DISABLE_COST_WARNINGS` | Отключают соответствующие функции. |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Выключает всё необязательное сетевое взаимодействие. |
| `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX` | Работа через Amazon Bedrock / Google Vertex. |
| `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` | Настройки прокси. |
| `CLAUDE_CODE_ENABLE_TELEMETRY` и `OTEL_*` | Экспорт метрик OpenTelemetry. |

---

## 4. `hooks` — автоматические действия на события

Хуки исполняет сам Claude Code (а не модель), поэтому они гарантированно срабатывают.

```json
"hooks": {
  "PostToolUse": [
    {
      "matcher": "Edit|Write",
      "hooks": [
        { "type": "command", "command": "npx prettier --write \"$CLAUDE_FILE_PATHS\"", "timeout": 30 }
      ]
    }
  ]
}
```

| Событие | Когда срабатывает |
|---|---|
| `PreToolUse` | Перед вызовом инструмента; может заблокировать или изменить вызов. |
| `PostToolUse` | После успешного вызова инструмента. |
| `UserPromptSubmit` | При отправке пользователем сообщения, до обработки. |
| `Notification` | Когда Claude отправляет уведомление (ждёт ввода/разрешения). |
| `Stop` | Когда Claude закончил ответ; может заставить продолжить работу. |
| `SubagentStop` | Когда завершился субагент. |
| `PreCompact` | Перед сжатием контекста. |
| `SessionStart` / `SessionEnd` | Начало / конец сессии. |

- `matcher` — имя инструмента, список через `|` или regex (`Bash`, `Edit|Write`, `mcp__.*`); `*` или пусто — все. Для событий без инструментов matcher не нужен.
- `type`: `command` (shell-команда; на stdin получает JSON с описанием события) или `prompt` (запрос к LLM для решения).
- Код выхода команды: `0` — успех; `2` — блокирующая ошибка (stderr показывается Claude); прочие — неблокирующая ошибка. Хук также может вернуть JSON (`decision`, `reason`, `continue`, `systemMessage`).
- `timeout` — лимит времени в секундах.
- `disableAllHooks: true` — отключает все хуки.
- `allowManagedHooksOnly` (managed) — разрешает только корпоративные хуки.

---

## 5. Модель и поведение

| Ключ | Пример | Эффект |
|---|---|---|
| `model` | `"claude-sonnet-5-5"` | Модель по умолчанию (или алиас: `sonnet`, `opus`, `haiku`). |
| `availableModels` | `["sonnet","haiku"]` | Ограничивает список моделей, доступных для выбора. |
| `alwaysThinkingEnabled` | `true` | Расширенное «мышление» включено по умолчанию. |
| `outputStyle` | `"Explanatory"` | Стиль вывода (меняет системный промпт). |
| `language` | `"russian"` | Язык ответов Claude. |
| `statusLine` | `{"type":"command","command":"~/.claude/statusline.sh"}` | Своя строка состояния: команда получает JSON сессии, её stdout отображается. |
| `spinnerTipsEnabled` | `false` | Подсказки во время ожидания. |
| `spinnerVerbs` / `spinnerTipsOverride` | — | Свои тексты индикатора (в новых версиях). |
| `fileSuggestion` | `{"type":"command","command":"..."}` | Своя команда для автодополнения `@путь`. |
| `respectGitignore` | `true` | Учитывать `.gitignore` в подсказках файлов `@`. |
| `autoUpdatesChannel` | `"stable"` / `"latest"` | Канал автообновлений. |
| `cleanupPeriodDays` | `30` | Через сколько дней удалять локальную историю сессий (по умолчанию 30). |
| `companyAnnouncements` | `["Привет, команда!"]` | Сообщения, показываемые при запуске (случайное). |
| `teammateMode`, `showThinkingSummaries` и др. | — | Новые параметры; смотрите официальную документацию вашей версии. |

---

## 6. Git и атрибуция

| Ключ | Эффект |
|---|---|
| `attribution` | `{"commit": "текст", "pr": "текст"}` — текст, добавляемый в коммиты и описания PR. Пустая строка `""` убирает атрибуцию. |
| `includeCoAuthoredBy` | (устарело, заменено `attribution`) `false` — не добавлять строку `Co-Authored-By: Claude`. |

---

## 7. Аутентификация и облако

| Ключ | Эффект |
|---|---|
| `apiKeyHelper` | Путь к скрипту, который выводит ключ API/токен (подставляется в заголовки `X-Api-Key` и `Authorization`). |
| `forceLoginMethod` | `"claudeai"` или `"console"` — ограничить способ входа. |
| `forceLoginOrgUUID` | Требовать вход в конкретную организацию. |
| `awsAuthRefresh` | Скрипт обновления AWS-учётных данных (например `aws sso login`). |
| `awsCredentialExport` | Скрипт, выводящий JSON с учётными данными AWS. |
| `otelHeadersHelper` | Скрипт, генерирующий заголовки для OpenTelemetry. |

---

## 8. MCP-серверы

| Ключ | Эффект |
|---|---|
| `enableAllProjectMcpServers` | `true` — автоматически одобрять все серверы из проектного `.mcp.json`. |
| `enabledMcpjsonServers` | Список серверов из `.mcp.json`, которые одобрены. |
| `disabledMcpjsonServers` | Список серверов из `.mcp.json`, которые отклонены. |
| `allowedMcpServers` / `deniedMcpServers` | (managed) белый/чёрный список MCP-серверов организации. |

---

## 9. Плагины

| Ключ | Эффект |
|---|---|
| `enabledPlugins` | `{"имя@маркетплейс": true}` — включение/выключение плагинов. |
| `extraKnownMarketplaces` | Дополнительные маркетплейсы плагинов (источник: GitHub-репозиторий, git URL, локальный путь); удобно для командных настроек. |
| `strictKnownMarketplaces` | (managed) Разрешает добавлять плагины только из перечисленных маркетплейсов. |

---

## 10. `sandbox` — изоляция Bash

```json
"sandbox": {
  "enabled": true,
  "autoAllowBashIfSandboxed": true,
  "excludedCommands": ["docker"],
  "allowUnsandboxedCommands": false,
  "network": {
    "allowedDomains": ["github.com"],
    "allowUnixSockets": [],
    "allowLocalBinding": false
  }
}
```

| Ключ | Эффект |
|---|---|
| `enabled` | Запускать bash-команды в песочнице ОС (ограничение файловой системы и сети). Поддерживается на macOS/Linux/WSL2; нативная Windows может не поддерживаться. |
| `autoAllowBashIfSandboxed` | Команды в песочнице выполняются без запроса подтверждения. |
| `excludedCommands` | Команды, которые запускаются вне песочницы. |
| `allowUnsandboxedCommands` | `false` — запретить запуск вне песочницы через `dangerouslyDisableSandbox`. |
| `network.*` | Ограничения сети: разрешённые домены, unix-сокеты, локальные порты, прокси. |

---

## 11. Прочее

| Ключ | Эффект |
|---|---|
| `skipWebFetchPreflight` | Пропускает предварительную проверку домена перед WebFetch. |
| `apiKeyHelper` вместе с `env.CLAUDE_CODE_API_KEY_HELPER_TTL_MS` | Как часто обновлять ключ из скрипта. |
| `$schema` | Ссылка на JSON-схему для подсказок в редакторе. |

---

## 12. Пример полной конфигурации

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": ["Bash(npm test)", "Bash(git status)", "Bash(git diff *)", "Grep", "Glob"],
    "ask": ["Bash(git commit *)"],
    "deny": ["Bash(git push *)", "Read(.env*)", "Read(./secrets/**)"],
    "additionalDirectories": ["../shared"],
    "defaultMode": "acceptEdits"
  },
  "env": { "BASH_DEFAULT_TIMEOUT_MS": "60000" },
  "model": "sonnet",
  "language": "russian",
  "attribution": { "commit": "", "pr": "" },
  "cleanupPeriodDays": 14,
  "hooks": {
    "PostToolUse": [
      { "matcher": "Edit|Write", "hooks": [ { "type": "command", "command": "npx prettier --write ." } ] }
    ]
  }
}
```

## 13. Рекомендации

1. Исправьте опечатки `get` → `git` в ваших правилах `allow` и `ask`.
2. Секреты и личные предпочтения держите в `settings.local.json` или `~/.claude/settings.json`, а не в общем файле.
3. Для строгой защиты секретов используйте `deny` для `Read(...)`, а для реальной изоляции команд — `sandbox`.
4. После изменения настроек перезапустите сессию (хуки и часть параметров читаются при старте); проверить правила можно командой `/permissions`.
