---
name: save-memories-per-project
description: "Все «запомни» сохраняем в память проекта (каталог memory этого проекта), а не в CLAUDE.md и не в глобальную память"
metadata:
  node_type: memory
  type: feedback
  originSessionId: ac6c14e3-08d2-45c5-995b-781edde4683b
  modified: 2026-11-11T08:16:12.853Z
---

Когда пользователь просит что-то запомнить, сохранять это в файловую память этого проекта (`~/.claude/projects/K--dev-expence-traker-claude-test/memory/`), а не дописывать в `CLAUDE.md`.

**Why:** пользователь явно поправил: сначала я добавил раздел в `CLAUDE.md`, он попросил убрать его и сохранить именно в память.

**How to apply:** на любую просьбу «запомни ...» создавать или обновлять memory-файл с индексом в `MEMORY.md`; `CLAUDE.md` менять только если пользователь прямо просит. Память — в рамках проекта, не глобальная. См. также [[frontend-uses-fsd]].
