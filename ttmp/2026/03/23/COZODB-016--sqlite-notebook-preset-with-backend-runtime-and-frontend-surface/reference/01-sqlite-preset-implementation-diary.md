---
Title: SQLite preset implementation diary
Ticket: COZODB-016
Status: complete
Topics:
    - architecture
    - backend
    - frontend
    - sqlite
    - notebook
DocType: reference
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: Chronological diary for the SQLite preset implementation work.
LastUpdated: 2026-03-23T01:02:00-04:00
WhatFor: Record what was implemented for the SQLite preset, in what order, why those choices were made, and how to review the resulting code and docs.
WhenToUse: Use while implementing the ticket, when reviewing commits, or when an intern needs the chronological reasoning behind the SQLite preset.
---

# SQLite preset implementation diary

## Goal

Provide a chronological implementation diary for the SQLite preset so future reviewers can see not only the final code, but also the sequence of decisions, validations, and corrections that produced it.

## Context

The codebase already has Cozo and JavaScript presets. This ticket adds SQLite as a third preset and should follow the same structural pattern rather than inventing a new one.

## Quick Reference

### 2026-03-23 00:00 to 00:45 America/New_York

- Completed the pending merge from `origin/main` first, because the repository still had unresolved notebook conflicts and could not support clean commits for new work.
- Confirmed the current preset seam:
  - backend preset constructors in `backend/pkg/notebook/current_*.go`
  - frontend preset wrappers/configs in `frontend/src/notebook/current*.tsx` and `current*Config.ts`
- Created `COZODB-016`.
- Added the preset surface inventory script:
  - [01-sqlite-preset-surface-inventory.sh](../scripts/01-sqlite-preset-surface-inventory.sh)
- Captured its output:
  - [01-sqlite-preset-surface-inventory.txt](../sources/01-sqlite-preset-surface-inventory.txt)
- Wrote the initial design guide outlining:
  - backend SQLite runtime
  - backend preset constructor
  - frontend preset wrapper/config
  - Storybook/MSW validation
  - phased implementation plan

Next implementation slice:

1. backend `sqlite_runtime.go`
2. backend `current_sqlite.go`
3. backend tests
4. frontend preset wrapper/config
5. frontend Storybook/MSW support

### 2026-03-23 00:45 to 01:05 America/New_York

- Implemented the backend runtime in [backend/pkg/notebook/sqlite_runtime.go](../../../../../../backend/pkg/notebook/sqlite_runtime.go).
- The runtime now:
  - opens either an in-memory or file-backed SQLite database,
  - executes multi-statement SQL cells,
  - returns table-shaped results for row-returning statements,
  - returns a small summary table for non-row statements,
  - inspects schema from `sqlite_master` and `PRAGMA table_info`,
  - resets by reopening a fresh database and incrementing generation.
- Added the backend preset constructor in [backend/pkg/notebook/current_sqlite.go](../../../../../../backend/pkg/notebook/current_sqlite.go).
- Wired backend preset selection in [backend/main.go](../../../../../../backend/main.go) with `--preset sqlite` and `--sqlite-db-path`.
- Added runtime and preset tests:
  - [backend/pkg/notebook/sqlite_runtime_test.go](../../../../../../backend/pkg/notebook/sqlite_runtime_test.go)
  - [backend/pkg/notebook/current_sqlite_test.go](../../../../../../backend/pkg/notebook/current_sqlite_test.go)
- Validation:
  - `cd backend && go test ./...` passed.

Remaining work after this slice:

1. frontend SQLite preset config and wrapper
2. frontend preset selection in `App.tsx` and notebook exports
3. Storybook/MSW support for SQLite
4. full frontend validation

### 2026-03-23 01:05 to 01:20 America/New_York

- Implemented the frontend SQLite preset files:
  - [frontend/src/notebook/currentSQLiteConfig.ts](../../../../../../frontend/src/notebook/currentSQLiteConfig.ts)
  - [frontend/src/notebook/currentSQLite.tsx](../../../../../../frontend/src/notebook/currentSQLite.tsx)
  - [frontend/src/notebook/CurrentSQLiteNotebookApp.stories.tsx](../../../../../../frontend/src/notebook/CurrentSQLiteNotebookApp.stories.tsx)
- Updated exports and app selection:
  - [frontend/src/notebook/index.ts](../../../../../../frontend/src/notebook/index.ts)
  - [frontend/src/App.tsx](../../../../../../frontend/src/App.tsx)
- Extended Storybook/MSW support:
  - [frontend/src/storybook/notebookApiHandlers.ts](../../../../../../frontend/src/storybook/notebookApiHandlers.ts)
  - [frontend/src/notebook/NotebookApp.stories.tsx](../../../../../../frontend/src/notebook/NotebookApp.stories.tsx)
- Validation passed:
  - `cd frontend && npx tsc --noEmit`
  - `cd frontend && npm test`
  - `cd frontend && npm run lint`
  - `cd frontend && npm run build`
  - `cd frontend && npm run build-storybook`

Remaining work after this slice:

1. final end-to-end validation summary
2. optional manual sqlite preset smoke pass
3. closeout doc updates and final commit

### 2026-03-23 01:20 to 01:55 America/New_York

- Started a live smoke pass for the SQLite preset against the shared persisted app database.
- The first live check looked wrong at first:
  - booting SQLite against the existing application database returned a notebook with old starter content instead of the SQLite starter cells,
  - but a clean temporary app database returned the correct SQLite notebook immediately.
- That narrowed the problem to persisted bootstrap identity rather than the SQLite runtime itself.
- Root cause:
  - the store used a single fixed default notebook ID, `nbk_default`, for every preset,
  - and it also used fixed starter cell IDs, `cell_intro` and `cell_query`,
  - so once one preset had bootstrapped the app database, later presets reused the same default notebook row and cell rows.
- Implemented the fix in the shared backend notebook layer:
  - extended [backend/pkg/notebook/profile.go](../../../../../../backend/pkg/notebook/profile.go) so each preset can define its own `DefaultNotebookID`,
  - added store/service accessors in [backend/pkg/notebook/store.go](../../../../../../backend/pkg/notebook/store.go) and [backend/pkg/notebook/service.go](../../../../../../backend/pkg/notebook/service.go),
  - assigned preset-specific default notebook IDs in:
    - [backend/pkg/notebook/current_cozo.go](../../../../../../backend/pkg/notebook/current_cozo.go)
    - [backend/pkg/notebook/current_javascript.go](../../../../../../backend/pkg/notebook/current_javascript.go)
    - [backend/pkg/notebook/current_sqlite.go](../../../../../../backend/pkg/notebook/current_sqlite.go)
  - made seeded default cell IDs notebook-specific for preset-owned default notebooks in [backend/pkg/notebook/store.go](../../../../../../backend/pkg/notebook/store.go),
  - updated HTTP, websocket, store, and service tests to stop assuming a global `cell_query` ID where the preset profile can now vary.
- Added a regression test in [backend/pkg/notebook/store_test.go](../../../../../../backend/pkg/notebook/store_test.go) that boots Cozo and SQLite stores against the same app database and verifies they get distinct default notebooks.
- Validation after the fix:
  - `cd backend && go test ./...`
  - live manual smoke:
    - boot Cozo against a temporary shared app DB,
    - boot SQLite against the same app DB,
    - confirm bootstrap returns `nbk_default_cozo` for Cozo and `nbk_default_sqlite` for SQLite with the correct starter cells.
- Result:
  - the SQLite preset works cleanly,
  - preset switching no longer reuses the wrong bootstrap notebook,
  - and the isolation rule now matches the package/preset architecture much better.

## Usage Examples

### Review the current ticket state

```bash
sed -n '1,240p' \
  /home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/23/COZODB-016--sqlite-notebook-preset-with-backend-runtime-and-frontend-surface/reference/01-sqlite-preset-implementation-diary.md
```

### Re-run the preset surface inventory

```bash
cd /home/manuel/code/wesen/2026-03-14--cozodb-editor
ttmp/2026/03/23/COZODB-016--sqlite-notebook-preset-with-backend-runtime-and-frontend-surface/scripts/01-sqlite-preset-surface-inventory.sh
```

## Related

- [../design-doc/01-sqlite-notebook-preset-implementation-guide.md](../design-doc/01-sqlite-notebook-preset-implementation-guide.md)
- [../sources/01-sqlite-preset-surface-inventory.txt](../sources/01-sqlite-preset-surface-inventory.txt)
