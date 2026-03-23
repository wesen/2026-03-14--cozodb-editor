---
Title: SQLite notebook preset implementation guide
Ticket: COZODB-016
Status: active
Topics:
    - architecture
    - backend
    - frontend
    - sqlite
    - notebook
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: backend/main.go
      Note: Backend preset selector that must gain a sqlite case
    - Path: backend/pkg/notebook/current_javascript.go
      Note: Existing preset constructor to mirror structurally for SQLite
    - Path: backend/pkg/notebook/runtime.go
      Note: Shared runtime seam that the new SQLite runtime must satisfy
    - Path: frontend/src/App.tsx
      Note: Frontend preset selector that must gain sqlite routing
    - Path: frontend/src/notebook/currentJavaScript.tsx
      Note: Existing frontend preset wrapper to mirror for SQLite
    - Path: frontend/src/notebook/currentJavaScriptConfig.ts
      Note: Existing frontend preset config shape to mirror for SQLite
ExternalSources: []
Summary: Detailed intern-oriented guide for adding a SQLite backend/frontend notebook preset on top of the existing shared module and preset architecture.
LastUpdated: 2026-03-23T00:43:30.404736578-04:00
WhatFor: Explain how to add SQLite as the third notebook preset using the shared backend/frontend package seams that already support Cozo and JavaScript.
WhenToUse: Use when implementing or reviewing the SQLite preset, onboarding a new intern to the preset architecture, or planning follow-on SQL-oriented notebook capabilities.
---


# SQLite notebook preset implementation guide

## Executive Summary

The repository already supports two concrete notebook presets: Cozo and JavaScript. Both are built on the same notebook package surfaces:

- backend preset constructors around [backend/pkg/notebook/module.go](../../../../../../backend/pkg/notebook/module.go),
- a shared notebook runtime contract in [backend/pkg/notebook/runtime.go](../../../../../../backend/pkg/notebook/runtime.go),
- frontend preset wrappers around [frontend/src/notebook/NotebookApp.tsx](../../../../../../frontend/src/notebook/NotebookApp.tsx),
- preset-specific shell and experience config in files like [frontend/src/notebook/currentCozoConfig.ts](../../../../../../frontend/src/notebook/currentCozoConfig.ts) and [frontend/src/notebook/currentJavaScriptConfig.ts](../../../../../../frontend/src/notebook/currentJavaScriptConfig.ts).

SQLite should be added as preset `#3`, not as a parallel app and not as a special case hidden inside the existing Cozo preset. The backend work is to add a SQLite runtime implementation that satisfies the existing `Runtime` interface, plus a `OpenCurrentSQLiteModule(...)` constructor that creates the module with SQLite-specific starter cells and fallback copy. The frontend work is to add a `CurrentSQLiteNotebookApp`, `currentSQLiteConfig.ts`, Storybook coverage, and preset selection in [frontend/src/App.tsx](../../../../../../frontend/src/App.tsx).

The most important implementation constraint is that SQLite is not Cozo and not JavaScript. It has different query semantics:

- SQL often needs multi-statement cells,
- schema introspection comes from `sqlite_master` and `PRAGMA table_info(...)`,
- successful non-`SELECT` statements should still produce a notebook-friendly output,
- reset should replace the runtime database contents just like JavaScript reset replaces the JS VM state.

The right target is a persistent runtime-local SQLite database that survives across cell runs until reset, with an optional file path for persistence and an in-memory default for easy notebook use.

## Problem Statement

Today the codebase has a reusable notebook package and two presets, but no SQL/SQLite preset. That leaves a gap between the package architecture and the user goal of supporting multiple notebook experiences with different languages and runtimes.

The current preset picture:

```text
Preset #1: Cozo
  backend/pkg/notebook/current_cozo.go
  frontend/src/notebook/currentCozo.tsx

Preset #2: JavaScript
  backend/pkg/notebook/current_javascript.go
  frontend/src/notebook/currentJavaScript.tsx
```

There is no sibling SQLite preset yet, and there is no backend runtime that can execute SQL while satisfying the notebook runtime interface:

```go
type Runtime interface {
    DescribeRelation(name string) (*RuntimeRelationInfo, error)
    GetSchema() (string, error)
    ListRelations() ([]string, error)
    Query(script string, params map[string]any) (*RuntimeQueryResult, error)
    Reset() (int64, error)
}
```

The concrete problem is therefore:

How do we add a SQLite notebook preset that behaves like the existing JavaScript preset in architecture and composition style, while still respecting SQL-specific runtime behavior and preserving the shared notebook package?

The main risks are:

- hardcoding SQLite behavior into the generic notebook service instead of the preset/runtime layer,
- implementing SQL execution only for single statements and then discovering that starter cells and normal notebook usage need multi-statement support,
- accidentally coupling the frontend too tightly to a Cozo-specific editor or renderer path,
- skipping Storybook and ending up with a preset that only works in the live app.

## Proposed Solution

Add SQLite as a sibling preset on both backend and frontend.

### Backend shape

Add a SQLite runtime implementation plus a preset constructor:

- [backend/pkg/notebook/sqlite_runtime.go](../../../../../../backend/pkg/notebook/sqlite_runtime.go)
- [backend/pkg/notebook/current_sqlite.go](../../../../../../backend/pkg/notebook/current_sqlite.go)
- tests in [backend/pkg/notebook/sqlite_runtime_test.go](../../../../../../backend/pkg/notebook/sqlite_runtime_test.go) and [backend/pkg/notebook/current_sqlite_test.go](../../../../../../backend/pkg/notebook/current_sqlite_test.go)

Recommended backend composition:

```text
OpenCurrentSQLiteModule(config)
  -> OpenSQLiteRuntime(runtimeConfig)
  -> OpenStoreWithConfig(StoreConfig{ Profile: currentSQLiteNotebookProfile() })
  -> OpenSQLiteTimelineStore(store.DBPath())
  -> NewModule(ModuleConfig{ ServiceConfig, BasePaths, WebSocketConfig })
```

### Frontend shape

Add a SQLite frontend preset beside Cozo and JavaScript:

- [frontend/src/notebook/currentSQLiteConfig.ts](../../../../../../frontend/src/notebook/currentSQLiteConfig.ts)
- [frontend/src/notebook/currentSQLite.tsx](../../../../../../frontend/src/notebook/currentSQLite.tsx)
- [frontend/src/notebook/CurrentSQLiteNotebookApp.stories.tsx](../../../../../../frontend/src/notebook/CurrentSQLiteNotebookApp.stories.tsx)

Update preset exports and app selection:

- [frontend/src/notebook/index.ts](../../../../../../frontend/src/notebook/index.ts)
- [frontend/src/App.tsx](../../../../../../frontend/src/App.tsx)

### Runtime execution model

The SQLite runtime should own one database instance per notebook runtime session. That instance survives across cell execution and is replaced on reset.

Recommended runtime behavior:

```pseudocode
class SQLiteRuntime:
    generation = 1
    db = openRuntimeDatabase(config)

    Query(script):
        statements = splitSQLScript(script)
        if statements empty:
            return empty query result

        execute every statement before the last with Exec

        if last statement returns rows:
            rows = query last statement
            return tabular result

        exec last statement
        return summary result such as rows_affected / status

    ListRelations():
        query sqlite_master for tables and views

    DescribeRelation(name):
        query PRAGMA table_info(name)
        shape into RuntimeRelationInfo

    GetSchema():
        list relations
        describe each one
        render one summary line per relation

    Reset():
        close db
        reopen fresh db
        generation += 1
```

### System diagram

```text
                       shared notebook package
         ┌─────────────────────────────────────────────────┐
         │ backend/pkg/notebook       frontend/src/notebook│
         │ - Module                   - NotebookApp        │
         │ - Service                  - NotebookPage       │
         │ - Runtime interface        - state slice        │
         │ - HTTP / WS mounts         - experience config  │
         └──────────────┬──────────────────────┬───────────┘
                        │                      │
                  currentCozo            currentJavaScript
                        │                      │
                    currentSQLite (new sibling preset)
                        │
       backend/pkg/notebook/current_sqlite.go
       frontend/src/notebook/currentSQLite.tsx
```

## Backend Design

### Runtime storage model

The SQLite preset should use a runtime-local database for notebook code execution, not the existing application database used for notebook metadata and timeline state.

That means there are two distinct SQLite concerns:

1. notebook metadata store:
   - already handled by [backend/pkg/notebook/store.go](../../../../../../backend/pkg/notebook/store.go)
   - persists notebooks, cells, runs, and snapshots
2. SQLite language runtime:
   - new work in `sqlite_runtime.go`
   - executes SQL code cells and owns the language state visible to the user

These must remain separate so that resetting the SQLite kernel does not wipe notebook metadata.

### Runtime configuration

Recommended backend config:

```go
type SQLiteRuntimeConfig struct {
    DBPath string
}

type CurrentSQLiteModuleConfig struct {
    RuntimeDBPath string
    AppDBPath     string
    EnableAI      bool
    BasePaths     BasePaths
    Logf          func(format string, args ...any)
}
```

Rules:

- if `RuntimeDBPath` is empty, open an in-memory runtime database,
- if `RuntimeDBPath` is set, open a file-backed runtime database,
- on reset:
  - in-memory mode: close and reopen a fresh in-memory database,
  - file-backed mode: close, remove the file, reopen a fresh database at the same path.

### SQL execution semantics

The critical backend question is multi-statement support. SQLite notebook users will reasonably expect cells like:

```sql
create table users (name text, age integer);
insert into users values ('Ada', 31), ('Grace', 42);
select * from users order by age desc;
```

That means `Query` cannot assume one statement per cell.

Recommended approach:

- split the script into SQL statements with a small scanner that respects:
  - single-quoted strings,
  - double-quoted identifiers/strings,
  - bracket identifiers,
  - `--` line comments,
  - `/* ... */` block comments.
- execute all but the last statement using `Exec`,
- inspect the last statement with a lightweight classifier:
  - `SELECT`
  - `WITH`
  - `PRAGMA`
  - `EXPLAIN`
  These should be treated as row-returning statements.
- if the last statement is row-returning, use `QueryContext`,
- otherwise use `ExecContext` and return a small summary table.

Suggested summary result for non-row statements:

```text
headers: ["status", "rows_affected"]
rows: [["ok", 3]]
```

This keeps notebook output consistent and visible to the user.

### Schema and relation introspection

The schema endpoints in [backend/pkg/api/handlers.go](../../../../../../backend/pkg/api/handlers.go) already rely on the runtime seam, so the SQLite runtime should implement relation introspection in a notebook-generic way.

Suggested queries:

```sql
select name, type
from sqlite_master
where type in ('table', 'view')
  and name not like 'sqlite_%'
order by name;
```

For detail:

```sql
pragma table_info("<name>");
```

Map each `PRAGMA table_info` row into:

```go
RuntimeColumnInfo{
    Name:       columnName,
    Type:       declaredType,
    HasDefault: defaultValue != nil,
}
```

Tables and views can both be represented by `RuntimeRelationInfo`. SQLite does not need a separate relation type in the current runtime contract.

## Frontend Design

The frontend SQLite preset should be much lighter than the backend runtime. The shared notebook package already handles page structure, state, transport, and output rendering.

### Frontend preset files

The SQLite preset should mirror the existing JavaScript preset:

```text
frontend/src/notebook/currentSQLiteConfig.ts
frontend/src/notebook/currentSQLite.tsx
frontend/src/notebook/CurrentSQLiteNotebookApp.stories.tsx
```

Suggested config:

```ts
export const currentSQLiteNotebookShellConfig = {
  ...defaultNotebookShellConfig,
  appName: "SQLite Notebook",
};

export const currentSQLiteNotebookExperienceConfig = {
  ...defaultNotebookExperienceConfig,
  codeCellPlaceholder: "-- Enter SQL... (Shift+Enter run, Alt/Ctrl+Enter run+new)",
  codeFenceLanguage: "sql",
};
```

For the first version, SQLite can use the default textarea code editor. The experience-config change made during the merge lets Cozo inject its custom editor while JavaScript and SQLite stay on the simpler shared path.

### Storybook and MSW

The SQLite preset should be validated the same way JavaScript was:

- add a `CurrentSQLiteNotebookApp` full-page story,
- add MSW handlers that simulate:
  - starter notebook bootstrap,
  - successful `CREATE TABLE` / `INSERT` / `SELECT`,
  - SQL error output,
  - kernel reset.

This is important because the preset goal is reusability, not just live-app functionality.

## Design Decisions

### Decision 1: SQLite is a preset, not a mode inside Cozo

Rationale:

- SQLite has different language semantics and UI copy,
- it should be selectable directly from backend/frontend preset switches,
- this preserves the preset-based package design already proven by JavaScript.

### Decision 2: Use the existing notebook `Runtime` interface

Rationale:

- the runtime seam is already generic enough,
- adding SQLite should validate the existing abstraction instead of bypassing it,
- this keeps HTTP and notebook service code unchanged.

### Decision 3: Use a persistent runtime-local SQLite database with reset

Rationale:

- notebook users expect state to persist across cells,
- JavaScript already behaves this way with globals,
- reset should mean "fresh language runtime state" rather than "restart the whole app."

### Decision 4: Support multi-statement cells

Rationale:

- SQL notebooks without multi-statement support are awkward,
- starter cells almost certainly want `CREATE TABLE` plus `INSERT` plus `SELECT`,
- the implementation cost is justified by basic usability.

### Decision 5: Keep the frontend on the default textarea editor for now

Rationale:

- the task is to add a SQLite preset, not a SQL editor system,
- the existing generic textarea path is already valid for JavaScript and future presets,
- syntax-highlighting/editor work can be a follow-up ticket if needed.

## Alternatives Considered

### Alternative A: Reuse Cozo with `engine=sqlite`

Rejected because:

- that still exposes CozoScript as the language, not SQLite SQL,
- it does not create a real frontend/backend sibling preset,
- it would not validate the package architecture for a genuine SQL runtime.

### Alternative B: Build the SQLite preset only on the frontend with mocked results

Rejected because:

- the user explicitly asked for frontend and backend,
- the point of the preset architecture is real runtime composition,
- a frontend-only mock would not exercise the notebook module seam.

### Alternative C: Add a custom SQL editor in the same ticket

Rejected because:

- it would combine runtime work and editor-product work,
- the SQLite preset does not require a custom editor to be useful,
- the recent Cozo editor merge already increased frontend surface area enough.

## Implementation Plan

### Phase 1: Documentation and inventory

1. Create the ticket docs.
2. Capture the current preset surface with [01-sqlite-preset-surface-inventory.sh](../scripts/01-sqlite-preset-surface-inventory.sh).
3. Upload the guide bundle to reMarkable before implementation starts.

### Phase 2: Backend SQLite runtime

1. Add `sqlite_runtime.go`.
2. Implement:
   - runtime opening,
   - statement splitting,
   - query execution,
   - result shaping,
   - schema inspection,
   - reset.
3. Add `sqlite_runtime_test.go` covering:
   - multi-statement success,
   - row-returning queries,
   - schema listing,
   - reset clearing runtime state.

### Phase 3: Backend SQLite preset

1. Add `current_sqlite.go`.
2. Define SQLite starter cells and WebSocket fallback copy.
3. Add `current_sqlite_test.go`.
4. Wire preset selection into [backend/main.go](../../../../../../backend/main.go).

### Phase 4: Frontend SQLite preset

1. Add `currentSQLiteConfig.ts`.
2. Add `currentSQLite.tsx`.
3. Export the preset from [frontend/src/notebook/index.ts](../../../../../../frontend/src/notebook/index.ts).
4. Wire [frontend/src/App.tsx](../../../../../../frontend/src/App.tsx) to `VITE_NOTEBOOK_PRESET=sqlite`.

### Phase 5: Storybook and MSW

1. Add a SQLite notebook fixture/runtime handler in [frontend/src/storybook/notebookApiHandlers.ts](../../../../../../frontend/src/storybook/notebookApiHandlers.ts).
2. Add [frontend/src/notebook/CurrentSQLiteNotebookApp.stories.tsx](../../../../../../frontend/src/notebook/CurrentSQLiteNotebookApp.stories.tsx).
3. Optionally add an embedded SQLite variant in [frontend/src/notebook/NotebookApp.stories.tsx](../../../../../../frontend/src/notebook/NotebookApp.stories.tsx).

### Phase 6: Validation

Backend:

```bash
cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend
go test ./...
```

Frontend:

```bash
cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run build-storybook
```

Manual smoke:

```bash
cd backend
go run . --preset sqlite

cd frontend
VITE_NOTEBOOK_PRESET=sqlite npm run dev
```

Check:

1. starter notebook loads,
2. create/insert/select multi-statement cell works,
3. schema endpoint lists created tables,
4. reset clears SQLite runtime state,
5. SQL errors display cleanly,
6. Storybook SQLite interactive story behaves correctly under MSW.

## Open Questions

- Should the first SQLite preset support named parameters, or is `params map[string]any` acceptable as an unused seam for now?
- Should the runtime expose views and tables together, or distinguish them in schema strings later?
- Do we want a file-backed runtime mode in the initial preset UI, or just in backend configuration?

## References

- [backend/pkg/notebook/runtime.go](../../../../../../backend/pkg/notebook/runtime.go)
- [backend/pkg/notebook/current_cozo.go](../../../../../../backend/pkg/notebook/current_cozo.go)
- [backend/pkg/notebook/current_javascript.go](../../../../../../backend/pkg/notebook/current_javascript.go)
- [frontend/src/notebook/currentCozoConfig.ts](../../../../../../frontend/src/notebook/currentCozoConfig.ts)
- [frontend/src/notebook/currentJavaScriptConfig.ts](../../../../../../frontend/src/notebook/currentJavaScriptConfig.ts)
- [frontend/src/App.tsx](../../../../../../frontend/src/App.tsx)
- [01-sqlite-preset-surface-inventory.txt](../sources/01-sqlite-preset-surface-inventory.txt)

## Design Decisions

<!-- Document key design decisions and rationale -->

## Alternatives Considered

<!-- List alternative approaches that were considered and why they were rejected -->

## Implementation Plan

<!-- Outline the steps to implement this design -->

## Open Questions

<!-- List any unresolved questions or concerns -->

## References

<!-- Link to related documents, RFCs, or external resources -->
