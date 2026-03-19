---
Title: Notebook state refactor and QOL implementation guide
Ticket: COZODB-006
Status: active
Topics:
    - frontend
    - cozodb
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: backend/main.go
      Note: Current process lifetime and Cozo runtime ownership relevant to reset-kernel design
    - Path: backend/pkg/notebook/store.go
      Note: Unique index and positional mutation logic that causes insert failures
    - Path: frontend/src/notebook/NotebookCellCard.tsx
      Note: Per-cell insertion command sources and local editor behavior
    - Path: frontend/src/notebook/NotebookPage.tsx
      Note: Notebook-wide UI and keyboard orchestration currently split across local state
    - Path: frontend/src/notebook/useNotebookDocument.ts
      Note: Current hook-owned notebook orchestration that should move into Redux state
    - Path: frontend/src/sem/semProjection.ts
      Note: Current cell-owned AI and SEM projection model
    - Path: frontend/src/transport/httpClient.ts
      Note: Current notebook HTTP contract surface
ExternalSources: []
Summary: Detailed intern-facing guide for fixing notebook insertion bugs, adding clear/reset actions, and refactoring notebook state into a Redux slice.
LastUpdated: 2026-03-19T15:05:00-04:00
WhatFor: Explain the current notebook architecture, diagnose the current insert-state failure modes, and provide a phased implementation plan for the next notebook quality-of-life slice.
WhenToUse: Use when implementing the next notebook refactor, onboarding a new engineer to the notebook stack, or reviewing how clear notebook, reset kernel, and Redux state management should be introduced.
---


# Notebook State Refactor and QOL Implementation Guide

## Executive Summary

The notebook is now large enough that the current state shape is beginning to work against the product. The system already has a real backend notebook store, a real per-cell execution model, and a real SEM/AI attachment pipeline, but the frontend still coordinates those concerns through a mix of local component state, hook-owned document state, optimistic array surgery, and ad hoc websocket projection updates. That arrangement was acceptable for the first vertical slice. It is no longer a good fit for the next set of features.

The immediate trigger is a real correctness bug. Inserting a suggestion under a cell can hit `UNIQUE constraint failed: nb_cells.notebook_id, nb_cells.position` because the backend currently shifts cell positions with bulk `UPDATE` statements while a unique index exists on `(notebook_id, position)` in SQLite. The frontend also has a separate consistency issue: on successful insert it only appends the new cell locally and does not reconcile the reindexed sibling cells, so even successful inserts can leave local positions stale. Those two facts make insertion fragile both server-side and client-side.

The next implementation slice should do four things together, in this order:

1. document the current system and the required refactor,
2. fix cell-position mutation semantics in the backend,
3. move notebook document/runtime/UI orchestration into a Redux Toolkit slice,
4. add explicit `clear notebook` and `reset kernel` functionality with clear semantics.

This document is written for a new intern. It explains what the notebook system is, how the current code is wired, where the correctness risks are, what APIs should change, how Redux should be introduced, how `clear notebook` differs from `reset kernel`, and how to implement the work safely in phases.

## Problem Statement and Scope

The user asked for three concrete product changes:

1. fix the insertion path that currently fails with a unique-position constraint,
2. add `clear notebook` and `reset kernel`,
3. move notebook state into a Redux slice because the current React-local state is starting to get messy.

The user also explicitly asked for this implementation guide before code changes are built. That means this document is not a speculative future-ideas memo. It is the working design and onboarding guide for the next implementation pass.

### In scope

- notebook source state in the frontend,
- notebook runtime state in the frontend,
- insert/move/delete position management in the backend notebook store,
- notebook-related HTTP API additions,
- kernel reset design,
- Redux Toolkit slice design,
- tests and migration plan.

### Out of scope for this specific slice

- replacing the websocket/SEM system wholesale,
- redesigning the visual style,
- collaborative editing,
- multi-notebook routing,
- kernel history playback or durable Cozo snapshots,
- RTK Query adoption.

RTK Query is intentionally out of scope because the notebook flows here are command-oriented and sequence-sensitive. The state problem is not “cache server JSON better”; it is “coordinate a local-first notebook model, optimistic mutations, runtime metadata, and websocket-owned cell attachments coherently.” Redux Toolkit slices and thunks are the better fit.

## What This System Is

At a high level, the product is now a domain-specific notebook for CozoScript, not a generic editor and not a generic Jupyter clone.

The current stack has these layers:

```text
+-----------------------------+
| React notebook UI           |
| NotebookPage                |
| NotebookCellCard            |
+-------------+---------------+
              |
              v
+-----------------------------+
| Frontend state orchestration|
| useNotebookDocument         |
| runtimeState                |
| local UI state in page/card |
+-------------+---------------+
              |
              v
+-----------------------------+
| HTTP + WebSocket transport  |
| httpClient.ts               |
| hintsSocket.ts              |
+------+------+---------------+
       |      |
       |      v
       |  +-------------------+
       |  | SEM projection    |
       |  | semProjection.ts  |
       |  +-------------------+
       |
       v
+-----------------------------+
| Go backend API              |
| notebook_handlers.go        |
+-------------+---------------+
              |
              v
+-----------------------------+
| Notebook service            |
| service.go                  |
| store.go                    |
+------+------+---------------+
       |      |
       |      v
       |  +-------------------+
       |  | Pinocchio timeline|
       |  | hydrated runtime  |
       |  +-------------------+
       |
       v
+-----------------------------+
| Cozo runtime                |
| cozo.DB                     |
+-----------------------------+
```

### Entrypoints

The React app boots directly into the notebook page in [frontend/src/App.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/App.tsx#L1) and [frontend/src/main.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/main.tsx#L1). There is no Redux store yet, and there is no application-level state container other than React component state and hooks.

The backend opens a Cozo database, then opens the notebook service against a separate application SQLite database in [backend/main.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/main.go#L17). The API server holds both the Cozo runtime and the notebook service in memory for the process lifetime.

## Current-State Architecture

This section is evidence-based. Every major claim below is grounded in current files.

### 1. Frontend document state currently lives in one hook

The main notebook document and runtime state are currently owned by `useNotebookDocument()` in [frontend/src/notebook/useNotebookDocument.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/useNotebookDocument.ts#L48).

Observed responsibilities in that hook:

- bootstrap the notebook from the backend,
- hold `document`,
- hold `runtimeByCell`,
- hold `localDirtyCellIds`,
- expose CRUD commands,
- expose `runCell`,
- compute `executionStateByCell`.

This is already more than one concern. It mixes:

- server-backed source state,
- server-backed runtime state,
- derived execution metadata,
- optimistic mutation behavior,
- request/error lifecycle.

That is the first reason the current model is getting hard to evolve.

### 2. Notebook page owns additional cross-cutting UI state

`NotebookPage` in [frontend/src/notebook/NotebookPage.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookPage.tsx#L15) owns more state on top of the hook:

- `semProjection`,
- `collapsedThreads`,
- `dismissedThreads`,
- `aiPrompts`,
- `rawActiveCellIndex`.

Those are not trivial local widget concerns. They are notebook-level orchestration state. Some of them influence rendering across many cells. Some depend on runtime events. Some need to survive multiple action flows. That is another strong signal that a centralized store is now justified.

### 3. Each cell card still owns additional UI flow state

`NotebookCellCard` in [frontend/src/notebook/NotebookCellCard.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookCellCard.tsx#L75) owns:

- `showAIForm`,
- `editing`,
- `outputCollapsed`.

Those are appropriate as local UI state because they are card-local and transient. This distinction matters later: the Redux refactor should not blindly move every `useState` into the store. The store should own notebook domain state and notebook-wide UI coordination, not every local toggle.

### 4. The transport layer is intentionally thin

`httpClient.ts` in [frontend/src/transport/httpClient.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/transport/httpClient.ts#L1) exposes one function per notebook API endpoint:

- `bootstrapNotebook`,
- `updateNotebookTitle`,
- `insertNotebookCell`,
- `updateNotebookCell`,
- `moveNotebookCell`,
- `deleteNotebookCell`,
- `runNotebookCell`.

The transport layer is not the source of notebook complexity. It is small and appropriate. The problem is state coordination above it.

### 5. Execution-state derivation is already a separate concept

`runtimeState.ts` in [frontend/src/notebook/runtimeState.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/runtimeState.ts#L1) computes:

- `dirty`,
- `stale`,
- `mutationRisk`,
- `hasRun`.

This is already a domain-level derived-state module. That is another hint that a selector-based Redux model will be a better long-term home than component-local recomputation.

### 6. AI/SEM attachments are cell-owned but projected separately

The websocket client in [frontend/src/transport/hintsSocket.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/transport/hintsSocket.ts#L38) is generic. The actual semantic projection happens in [frontend/src/sem/semProjection.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/sem/semProjection.ts#L403). That projection extracts:

- `ownerCellId`,
- `notebookId`,
- `runId`,
- bundle/thread relationships,
- structured hint/query/doc-ref entities.

Then `NotebookCellCard` filters projected threads by `cell.id` and renders them under the owning cell in [frontend/src/notebook/NotebookCellCard.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookCellCard.tsx#L107) and [frontend/src/features/cozo-sem/CozoSemRenderer.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/features/cozo-sem/CozoSemRenderer.tsx#L70).

This separation is good architecture, but today the projection state sits beside notebook state instead of being coordinated with it by one store.

### 7. The backend notebook store uses positional ordering with a unique index

The current SQLite schema creates a unique index on `(notebook_id, position)` in [backend/pkg/notebook/store.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/store.go#L57).

That is correct as a data invariant. Each notebook cell should have a unique position. The problem is how the code mutates that invariant.

The current insert path in [backend/pkg/notebook/store.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/store.go#L274):

1. computes `insertPosition`,
2. runs one bulk `UPDATE nb_cells SET position = position + 1 WHERE notebook_id = ? AND position >= ?`,
3. inserts the new row at the target position.

The same general pattern exists in move and delete operations in [backend/pkg/notebook/store.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/store.go#L357) and [backend/pkg/notebook/store.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/store.go#L424).

### 8. The notebook service delegates almost all state transitions to the store

The service in [backend/pkg/notebook/service.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/service.go#L64) is mostly orchestration:

- CRUD delegates to store methods,
- `RunCell()` reads the stored source,
- runtime hydration loads latest outputs from the timeline store.

This is important for the refactor: the store is the right place to fix positional integrity, while the service is the right place to add notebook-level commands like clear/reset orchestration.

## Current Behavior and Failure Analysis

This section explains the actual bugs and architectural pain points that motivate the refactor.

### A. Why “insert suggestion” can fail with `UNIQUE constraint failed`

The likely failure path is:

1. a query suggestion or fix button calls `onInsertCodeBelow(cell.id, code)` from [frontend/src/notebook/NotebookCellCard.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookCellCard.tsx#L298),
2. `NotebookPage` forwards that to `handleInsertCodeBelow()` in [frontend/src/notebook/NotebookPage.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookPage.tsx#L212),
3. the hook calls `insertNotebookCell()` in [frontend/src/notebook/useNotebookDocument.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/useNotebookDocument.ts#L141),
4. the backend executes `Store.InsertCell()` in [backend/pkg/notebook/store.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/store.go#L274).

The store currently shifts existing rows with this shape:

```sql
UPDATE nb_cells
SET position = position + 1
WHERE notebook_id = ? AND position >= ?;
```

Under SQLite, that can violate the unique index transiently as rows are updated. A simple example:

```text
Before:
  cell A -> 0
  cell B -> 1
  cell C -> 2

Insert after A:
  target insert position = 1

Bulk update tries to produce:
  cell B -> 2
  cell C -> 3

But if SQLite updates cell B first while cell C is still at 2,
the unique index (notebook_id, position) sees two rows at position 2.
```

That is the backend correctness bug.

### B. Why successful insert can still leave the frontend wrong

Even if the backend insert succeeds, the frontend currently only appends the new cell and sorts by `position` in [frontend/src/notebook/useNotebookDocument.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/useNotebookDocument.ts#L148).

It does **not** reconcile the positions of existing sibling cells that were shifted in the backend transaction.

That means the local document can drift from the backend in two ways:

- two existing cells can still have stale positions locally,
- stable ordering can become ambiguous if the new cell and an old sibling both show the same `position` locally.

This is a frontend data-model bug distinct from the backend unique-index bug.

### C. Why local React state is starting to feel messy

The notebook behavior now spans multiple dimensions:

- source authoring,
- runtime outputs,
- dirty/stale derivation,
- selection/focus,
- AI threads,
- per-cell prompts,
- collapsed/dismissed UI state,
- keyboard command routing.

Today that state lives across:

- `useNotebookDocument`,
- `NotebookPage`,
- `NotebookCellCard`,
- `semProjection`,
- websocket subscriptions.

That makes multi-step flows hard to reason about. For example, `Alt+Enter` now involves:

```text
textarea keydown
  -> page-level callback
  -> hook-level run persistence
  -> transport call
  -> local runtime merge
  -> insert call
  -> local document append/sort
  -> active-cell adjustment
```

That sequence crosses too many local state boundaries.

### D. Why `clear notebook` and `reset kernel` cannot be the same action

These are different planes of state:

- **Clear notebook** is a source/document action.
  It changes notebook cells and notebook-owned runtime metadata.
- **Reset kernel** is an execution/runtime action.
  It resets the active Cozo database state used for future runs.

If they are conflated, the UI becomes ambiguous and future maintenance becomes worse. They should be separate user actions, separate backend commands, and separate reducers/thunks.

### E. Why Redux Toolkit is the right next step

There is currently no Redux dependency in [frontend/package.json](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/package.json#L1). That is fine historically. It is now the missing piece.

Redux Toolkit is justified here because:

- notebook actions are global and cross-component,
- many flows are multi-step and async,
- state is already partly normalized by cell ID and runtime-by-cell,
- selectors can own derived `dirty`/`stale` state,
- websocket events need a coherent place to land.

RTK Query is still the wrong abstraction here because the hard problem is not stale HTTP cache. The hard problem is notebook command orchestration and runtime attachment semantics.

## Existing API Surface

The current notebook-related HTTP endpoints are:

| Method | Path | Current behavior | Evidence |
| --- | --- | --- | --- |
| `GET` | `/api/notebooks/bootstrap` | returns default notebook document + hydrated runtime | [backend/pkg/api/notebook_handlers.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/notebook_handlers.go#L12) |
| `PATCH` | `/api/notebooks/{id}` | updates notebook title | [backend/pkg/api/notebook_handlers.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/notebook_handlers.go#L82) |
| `POST` | `/api/notebooks/{id}/cells` | inserts a cell after a given cell | [backend/pkg/api/notebook_handlers.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/notebook_handlers.go#L103) |
| `PATCH` | `/api/notebook-cells/{id}` | updates cell kind/source | [backend/pkg/api/notebook_handlers.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/notebook_handlers.go#L145) |
| `DELETE` | `/api/notebook-cells/{id}` | deletes a cell | [backend/pkg/api/notebook_handlers.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/notebook_handlers.go#L159) |
| `POST` | `/api/notebook-cells/{id}/move` | moves a cell to a target index | [backend/pkg/api/notebook_handlers.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/notebook_handlers.go#L170) |
| `POST` | `/api/notebook-cells/{id}/run` | runs a cell and returns latest runtime state | [backend/pkg/api/notebook_handlers.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/notebook_handlers.go#L187) |

What is missing:

- notebook clear endpoint,
- kernel reset endpoint,
- endpoint that returns authoritative reordered cells after insert/move/delete,
- explicit runtime-reset response contract.

## Proposed Solution

The proposal has three coordinated parts:

1. make backend cell-order mutations safe and authoritative,
2. move notebook orchestration into a Redux Toolkit slice,
3. add explicit source reset and runtime reset commands.

### Part 1: Make backend notebook ordering safe

Do **not** keep the current bulk-update position logic.

Introduce one canonical store helper that rewrites affected positions in two phases inside a transaction:

1. assign temporary gap positions that cannot collide,
2. write final contiguous positions,
3. return the authoritative cell list.

There are a few ways to do this safely. The simplest intern-friendly approach is:

```text
reindex affected rows using temporary negative positions
then write final positive positions
```

For example:

```sql
-- phase A: move affected suffix into a non-conflicting temporary range
UPDATE nb_cells
SET position = -position - 1, updated_at_ms = ?
WHERE notebook_id = ? AND position >= ?;

-- phase B: write final target positions row by row
UPDATE nb_cells SET position = ?, updated_at_ms = ? WHERE cell_id = ?;
```

A more maintainable Go-level pattern is to query affected rows, compute final positions in memory, then update them one row at a time using temporary positions first. That trades a bit of SQL cleverness for easier reasoning.

#### Recommendation

Create one helper like:

```go
func (s *Store) rewriteNotebookPositionsTx(
    ctx context.Context,
    tx *sql.Tx,
    notebookID string,
    nextOrder []string,
    now int64,
) error
```

and make `InsertCell`, `MoveCell`, `DeleteCell`, and future `ClearNotebook` all rely on it.

That gives us one source of truth for notebook order semantics.

### Part 2: Change notebook mutations to return authoritative state

The current insert endpoint returns only the new cell. That is not enough once sibling positions can shift.

For the next slice, change the backend mutation APIs to return either:

- the full `NotebookDocument`, or
- a structured mutation response containing `cells`, `runtime`, and any affected metadata.

For intern clarity and frontend simplicity, returning the full `NotebookDocument` is the better first move. The documents are small, and the simpler contract reduces state bugs.

#### Recommended mutation response shape

```ts
interface NotebookMutationResponse {
  notebook: Notebook;
  cells: NotebookCell[];
  runtime?: Record<string, CellRuntime>;
}
```

or reuse the existing `NotebookDocument`.

### Part 3: Introduce a Redux Toolkit notebook feature store

Use Redux Toolkit, not raw Redux.

#### Store boundary

Create a notebook feature store with three conceptual buckets:

1. **document state**
2. **runtime state**
3. **notebook-wide UI state**

Keep truly local per-card UI state local.

#### Suggested state shape

```ts
type RequestState = "idle" | "loading" | "succeeded" | "failed";

interface NotebookUiState {
  activeCellId: string | null;
  aiPromptsByCell: Record<string, string>;
  collapsedThreadIds: Record<string, boolean>;
  dismissedThreadIds: Record<string, boolean>;
  errorBanner: string | null;
}

interface NotebookAsyncState {
  bootstrap: RequestState;
  mutationByCell: Record<string, RequestState>;
  runByCell: Record<string, RequestState>;
  clearNotebook: RequestState;
  resetKernel: RequestState;
}

interface NotebookFeatureState {
  notebook: Notebook | null;
  cellsById: Record<string, NotebookCell>;
  orderedCellIds: string[];
  runtimeByCellId: Record<string, CellRuntime>;
  localDirtyByCellId: Record<string, true>;
  semProjection: SemProjectionState;
  ui: NotebookUiState;
  requests: NotebookAsyncState;
  kernelGeneration: number;
  loaded: boolean;
}
```

#### Why normalized state

The current hook already uses `runtimeByCell`. The natural next step is to normalize cells by ID and keep order separately. That makes:

- insert,
- delete,
- move,
- replace-from-server,
- selector computation,
- active-cell maintenance

much simpler and less fragile than mutating arrays in component state.

#### What should stay local

These can stay in `NotebookCellCard` local state:

- `editing`,
- `showAIForm`,
- `outputCollapsed`.

Why: they are ephemeral, card-local, and not required by any other subtree.

#### What should move into the slice

These should move to Redux:

- notebook document,
- ordered cell IDs,
- runtime by cell,
- local dirty tracking,
- active cell ID,
- per-cell AI draft prompts,
- SEM projection,
- dismissed/collapsed thread maps,
- request lifecycle flags,
- notebook-level error banner,
- kernel generation.

### Part 4: Separate clear notebook from reset kernel

#### Clear notebook

Definition:

- remove all current notebook cells,
- clear notebook-owned runtime records for this notebook,
- recreate the default starter cells,
- preserve the notebook record itself unless the product later asks otherwise.

This is a source-plane reset.

Suggested backend endpoint:

```http
POST /api/notebooks/{notebookId}/clear
```

Suggested response:

```json
{
  "notebook": { "...": "..." },
  "cells": [ ...default cells... ],
  "runtime": {}
}
```

#### Reset kernel

Definition:

- discard the active Cozo runtime state,
- create a fresh empty Cozo runtime,
- clear frontend runtime trust markers because old outputs are no longer trustworthy,
- keep notebook source cells intact.

This is an execution-plane reset.

Suggested backend endpoint:

```http
POST /api/runtime/reset-kernel
```

Suggested response:

```json
{
  "ok": true,
  "kernel_generation": 2
}
```

#### Why `kernel_generation` matters

The frontend needs a monotonic way to know that previously attached runtime outputs and SEM entities belong to an old kernel. `kernel_generation` gives selectors and reducers a simple invalidation boundary.

### Part 5: Introduce a backend runtime manager for kernel reset

Right now the Cozo runtime is opened once in [backend/main.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/main.go#L25) and shared directly with:

- `api.Server`,
- `WSHandler`,
- `notebook.Service`.

That shape has no kernel-reset seam.

#### Proposed abstraction

Introduce a `RuntimeManager` or `KernelManager` owned by the backend process:

```go
type KernelManager struct {
    mu         sync.RWMutex
    engine     string
    dbPath     string
    generation int64
    db         *cozo.DB
}
```

Responsibilities:

- expose current `*cozo.DB`,
- rebuild it on reset,
- increment generation,
- let HTTP handlers and websocket handlers read generation and current DB safely.

`notebook.Service` should depend on the manager or a narrow interface, not a fixed `*cozo.DB`.

#### Important scope note

For the first implementation, support `reset kernel` only for the default `mem` engine cleanly. The current code accepts `sqlite` engine in [backend/main.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/main.go#L18), but resetting a file-backed Cozo runtime has different semantics and should either:

- be explicitly unsupported initially, or
- require a deliberate “wipe runtime DB” implementation.

Document that choice in the API response and UI copy.

## Proposed API Reference

### Existing frontend transport additions

Add the following to [frontend/src/transport/httpClient.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/transport/httpClient.ts#L99):

```ts
export async function clearNotebook(notebookId: string) {
  return requestJSON<NotebookDocument>(`/api/notebooks/${notebookId}/clear`, {
    method: "POST",
  });
}

export interface ResetKernelResponse {
  ok: boolean;
  kernel_generation: number;
}

export async function resetKernel() {
  return requestJSON<ResetKernelResponse>("/api/runtime/reset-kernel", {
    method: "POST",
  });
}
```

### Suggested backend request/response types

Add to [backend/pkg/api/types.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/types.go#L72):

```go
type ResetKernelResponse struct {
    OK              bool  `json:"ok"`
    KernelGeneration int64 `json:"kernel_generation"`
}
```

No request body is needed for either command in the first version.

## Proposed Redux Structure

### Recommended file layout

Add a new notebook state area:

```text
frontend/src/notebook/state/
  notebookSlice.ts
  notebookThunks.ts
  notebookSelectors.ts
  notebookStore.ts         # or app/store.ts if shared app store
  semReducers.ts           # optional if kept in same feature
```

If the repo later grows beyond the notebook page, move to a shared app store:

```text
frontend/src/app/store.ts
frontend/src/app/hooks.ts
frontend/src/notebook/state/notebookSlice.ts
```

### Recommended action taxonomy

Use actions grouped by intent:

- bootstrap:
  - `bootstrapNotebook.pending/fulfilled/rejected`
- source editing:
  - `cellSourceChanged`
  - `titleDraftChanged` if needed later
- notebook mutations:
  - `insertCellAfterThunk`
  - `moveCellThunk`
  - `deleteCellThunk`
  - `persistCellThunk`
  - `clearNotebookThunk`
- runtime:
  - `runCellThunk`
  - `resetKernelThunk`
  - `runtimeClearedForKernelReset`
- UI:
  - `activeCellChanged`
  - `aiPromptChanged`
  - `threadCollapsedToggled`
  - `threadDismissed`
- SEM:
  - `semEventProjected`
  - `semProjectionCleared`

### Selector design

Move `buildNotebookExecutionState()` into selectors rather than calling it inside a hook return path.

Recommended selectors:

- `selectNotebook`
- `selectOrderedCells`
- `selectCellById`
- `selectRuntimeByCellId`
- `selectExecutionStateByCellId`
- `selectActiveCellId`
- `selectVisibleSemThreadsForCell(cellId)`
- `selectAiPromptForCell(cellId)`

That gives components a simpler, more declarative shape.

## Sequence Diagrams

### Current insert suggestion flow

```text
QuerySuggestionCard
  -> CozoSemRenderer.onInsertCode
    -> NotebookCellCard.onInsertCodeBelow
      -> NotebookPage.handleInsertCodeBelow
        -> useNotebookDocument.insertCellAfter
          -> httpClient.insertNotebookCell
            -> POST /api/notebooks/{id}/cells
              -> Store.InsertCell
                -> bulk position update
                -> unique index collision possible
```

### Proposed insert suggestion flow

```text
QuerySuggestionCard
  -> dispatch(insertCellAfterThunk({ afterCellId, kind: "code", source }))
    -> POST /api/notebooks/{id}/cells
      -> Store.InsertCellSafe
        -> rewriteNotebookPositionsTx(...)
        -> return authoritative NotebookDocument
    -> reducer replaces notebook cells from server response
    -> reducer sets activeCellId to inserted cell
```

### Proposed reset kernel flow

```text
Toolbar "Reset Kernel"
  -> dispatch(resetKernelThunk())
    -> POST /api/runtime/reset-kernel
      -> KernelManager.Reset()
      -> response { ok, kernel_generation }
    -> reducer clears runtimeByCellId
    -> reducer clears semProjection
    -> reducer stores new kernelGeneration
    -> selectors mark cells dirty/unrun until rerun
```

## Pseudocode

### Backend: safe insert path

```go
func (s *Store) InsertCell(ctx context.Context, notebookID, afterCellID, kind, source string) (*NotebookDocument, error) {
    tx := beginTx()
    insertPos := nextInsertPosition(ctx, tx, notebookID, afterCellID)
    cells := listCellsForNotebookTx(ctx, tx, notebookID)

    nextOrder := make([]NotebookCell, 0, len(cells)+1)
    for _, cell := range cells {
        nextOrder = append(nextOrder, cell)
        if cell.ID == afterCellID {
            nextOrder = append(nextOrder, newCell)
        }
    }
    if afterCellID == "" || afterCellID == cells[len(cells)-1].ID {
        // append semantics
    }

    rewriteNotebookPositionsTx(ctx, tx, notebookID, nextOrderIDs(nextOrder), now)
    insertCellRowTx(ctx, tx, newCell)
    touchNotebookTx(ctx, tx, notebookID, now)
    tx.Commit()
    return s.GetNotebook(ctx, notebookID)
}
```

### Frontend: run cell thunk

```ts
export const runCellThunk = createAsyncThunk(
  "notebook/runCell",
  async (cellId: string, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const cell = selectCellById(state, cellId);
    if (!cell) return rejectWithValue("Cell not found");

    if (selectIsCellLocallyDirty(state, cellId)) {
      await api.updateNotebookCell(cellId, { kind: cell.kind, source: cell.source });
    }

    const runtime = await api.runNotebookCell(cellId);
    return { cellId, runtime };
  }
);
```

### Frontend: clear notebook thunk

```ts
export const clearNotebookThunk = createAsyncThunk(
  "notebook/clearNotebook",
  async (_, { getState }) => {
    const notebookId = selectNotebookId(getState() as RootState);
    return await api.clearNotebook(notebookId);
  }
);
```

### Frontend: reducer shape

```ts
const notebookSlice = createSlice({
  name: "notebook",
  initialState,
  reducers: {
    cellSourceChanged(state, action) {
      const { cellId, source } = action.payload;
      state.cellsById[cellId].source = source;
      state.localDirtyByCellId[cellId] = true;
    },
    activeCellChanged(state, action) {
      state.ui.activeCellId = action.payload;
    },
    semEventProjected(state, action) {
      state.semProjection = applySemEvent(state.semProjection, action.payload);
    },
    runtimeClearedForKernelReset(state, action) {
      state.runtimeByCellId = {};
      state.semProjection = createSemProjectionState();
      state.kernelGeneration = action.payload.kernelGeneration;
    },
  },
  extraReducers(builder) {
    builder.addCase(bootstrapNotebookThunk.fulfilled, replaceDocumentFromServer);
    builder.addCase(insertCellAfterThunk.fulfilled, replaceDocumentFromServer);
    builder.addCase(moveCellThunk.fulfilled, replaceDocumentFromServer);
    builder.addCase(deleteCellThunk.fulfilled, replaceDocumentFromServer);
    builder.addCase(clearNotebookThunk.fulfilled, replaceDocumentFromServer);
    builder.addCase(runCellThunk.fulfilled, mergeRuntimeForCell);
  },
});
```

## Clear Notebook vs Reset Kernel Semantics

This distinction needs to be explicit in both code and UI copy.

### Clear notebook should do this

- remove existing notebook cells,
- remove notebook-owned runtime rows for that notebook,
- clear notebook-linked timeline snapshot links for that notebook,
- return a fresh notebook document with starter cells,
- preserve notebook title unless product asks otherwise.

### Reset kernel should do this

- create a fresh Cozo runtime,
- invalidate existing runtime outputs as trustworthy execution state,
- clear or mark stale any cell-owned runtime result in the frontend,
- clear SEM projection that was attached to old runs,
- leave notebook source cells unchanged.

### UI copy recommendation

Use explicit language:

- `Clear Notebook`
  - subtitle: `Remove cells and outputs, then restore starter cells`
- `Reset Kernel`
  - subtitle: `Keep notebook cells, but clear the live Cozo runtime`

That avoids the very common notebook-user confusion where “reset” can mean either source reset or runtime reset.

## Phased Implementation Plan

### Phase 0: establish the store boundary

Files:

- [frontend/src/App.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/App.tsx#L1)
- [frontend/src/main.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/main.tsx#L1)
- new app/notebook state files

Tasks:

1. Add `@reduxjs/toolkit` and `react-redux`.
2. Create the store.
3. Wrap the app in `<Provider>`.
4. Introduce typed hooks for dispatch/selectors.

Deliverable:

- no behavior change yet,
- store wired and ready.

### Phase 1: normalize notebook document state

Files:

- [frontend/src/notebook/useNotebookDocument.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/useNotebookDocument.ts#L48)
- new `notebookSlice.ts`
- [frontend/src/notebook/runtimeState.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/runtimeState.ts#L49)

Tasks:

1. Move bootstrapping into a thunk.
2. Replace hook-owned `document` and `runtimeByCell` with normalized store state.
3. Convert dirty tracking into store state.
4. Reimplement current execution selectors from normalized state.

Deliverable:

- notebook still behaves the same,
- components read from selectors instead of hook return values.

### Phase 2: fix backend positional integrity

Files:

- [backend/pkg/notebook/store.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/store.go#L274)
- [backend/pkg/notebook/service.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/service.go#L88)
- [backend/pkg/api/notebook_handlers.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/notebook_handlers.go#L103)

Tasks:

1. Add safe position rewrite helper.
2. Update insert/move/delete to use it.
3. Change mutation endpoints to return authoritative notebook state.
4. Add store-level tests for insert/move/delete around the unique index.

Deliverable:

- no more unique-position insert failures,
- frontend can trust server-returned order.

### Phase 3: migrate notebook mutations to Redux thunks

Files:

- [frontend/src/notebook/NotebookPage.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookPage.tsx#L15)
- [frontend/src/notebook/NotebookCellCard.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookCellCard.tsx#L75)
- new thunks/selectors

Tasks:

1. Replace hook callbacks with `dispatch(...)`.
2. Remove optimistic array surgery from the old hook.
3. Move active-cell handling and AI prompts into the slice.
4. Keep local-only card UI state local.

Deliverable:

- cleaner command flow,
- fewer cross-component prop chains,
- easier future features.

### Phase 4: add clear notebook

Files:

- backend notebook service/store/api
- frontend transport
- notebook toolbar UI
- notebook slice

Tasks:

1. add `POST /api/notebooks/{id}/clear`,
2. implement source/runtime reset semantics for the notebook,
3. add a visible toolbar action with confirmation,
4. update reducers to replace document state from server response.

Deliverable:

- notebook can be reset to starter cells without restarting backend.

### Phase 5: add reset kernel

Files:

- [backend/main.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/main.go#L17)
- new kernel manager
- websocket handler wiring
- API server wiring
- frontend transport + slice

Tasks:

1. introduce `KernelManager`,
2. refactor handlers/services to use the manager,
3. add `POST /api/runtime/reset-kernel`,
4. clear frontend runtime and SEM projection on success,
5. show kernel reset status to the user.

Deliverable:

- runtime can be reset independently from notebook source.

## Testing and Validation Strategy

### Backend tests to add

- `InsertCell` inserts between two existing cells without unique-index failure.
- `MoveCell` preserves a dense contiguous order.
- `DeleteCell` compacts positions correctly.
- `ClearNotebook` restores starter cells and clears runtime rows.
- `ResetKernel` increments generation and swaps to a fresh Cozo runtime.

### Frontend tests to add

- selector tests for normalized ordered cells and `dirty/stale`.
- thunk tests for `insertCellAfterThunk`, `runCellThunk`, `clearNotebookThunk`, `resetKernelThunk`.
- component tests for toolbar actions and active-cell behavior after server-authoritative insert.
- projection invalidation test: old SEM entities disappear after kernel reset.

### Manual validation checklist

1. Insert suggestion under the middle of a notebook with multiple cells.
2. Insert multiple suggestions in succession.
3. Move cells after insertions.
4. Clear notebook and confirm starter cells return.
5. Reset kernel and confirm:
   - notebook cells remain,
   - outputs clear or show invalid,
   - rerunning recreates runtime state from scratch.

## Risks, Alternatives, and Open Questions

### Risk: over-centralizing UI state

If every local toggle moves to Redux, the store becomes noisy and harder to reason about. Keep only notebook-wide or domain-wide state in the store.

### Risk: backend API churn

Changing mutation responses to return `NotebookDocument` is a contract change. That is acceptable now because the frontend and backend live in one repo and are versioned together.

### Risk: kernel reset semantics for sqlite engine

This is the biggest backend open question. The current app defaults to `mem`, but `sqlite` is accepted as an engine flag. For this slice, explicitly support reset only for `mem` unless there is time to define safe wipe semantics for file-backed runtime.

### Alternative considered: keep the custom hook, just clean it up

Rejected because the current complexity is no longer local to one hook. The problems cross:

- page state,
- hook state,
- websocket projection state,
- async mutation orchestration,
- runtime invalidation semantics.

That is exactly what a Redux feature store is for.

### Alternative considered: RTK Query

Rejected for this slice because:

- notebook operations are command-heavy rather than read-cache-heavy,
- websocket SEM events do not fit neatly into RTK Query cache lifecycles,
- local dirty state and active-cell semantics still need a slice.

### Alternative considered: only fix the SQL bug

Rejected because the frontend local-order drift would remain, and the next requested features (`clear notebook`, `reset kernel`) would make the current state shape even more tangled.

## Recommended First Coding Pass for the Intern

If a new intern were starting implementation tomorrow, the best order would be:

1. read this document,
2. read [backend/pkg/notebook/store.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/store.go#L57),
3. read [frontend/src/notebook/useNotebookDocument.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/useNotebookDocument.ts#L48),
4. read [frontend/src/notebook/NotebookPage.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookPage.tsx#L15),
5. implement the backend position rewrite helper and tests first,
6. then add the Redux store boundary,
7. then migrate insert/move/delete to authoritative document replacement,
8. then add clear notebook,
9. then add reset kernel.

That sequence minimizes the chance of debugging frontend state around a backend mutation bug that still exists.

## File-by-File Reference List

### Frontend

- [frontend/src/App.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/App.tsx#L1)
  Why it matters: confirms the notebook page is the app entrypoint.
- [frontend/src/main.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/main.tsx#L1)
  Why it matters: where Redux `Provider` will be added.
- [frontend/src/transport/httpClient.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/transport/httpClient.ts#L99)
  Why it matters: current notebook HTTP contract surface.
- [frontend/src/transport/hintsSocket.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/transport/hintsSocket.ts#L38)
  Why it matters: websocket entrypoint for AI/SEM events.
- [frontend/src/notebook/useNotebookDocument.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/useNotebookDocument.ts#L48)
  Why it matters: current hook-owned notebook orchestration.
- [frontend/src/notebook/NotebookPage.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookPage.tsx#L15)
  Why it matters: page-level state and keyboard orchestration.
- [frontend/src/notebook/NotebookCellCard.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookCellCard.tsx#L75)
  Why it matters: per-cell rendering and insertion command sources.
- [frontend/src/notebook/runtimeState.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/runtimeState.ts#L49)
  Why it matters: current derived execution-state logic.
- [frontend/src/sem/semProjection.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/sem/semProjection.ts#L403)
  Why it matters: cell-owned AI/SEM projection model.
- [frontend/src/features/cozo-sem/CozoSemRenderer.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/features/cozo-sem/CozoSemRenderer.tsx#L70)
  Why it matters: structured suggestion rendering and insert hooks.
- [frontend/src/notebook/NotebookCellCard.test.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookCellCard.test.tsx#L57)
  Why it matters: current coverage for keyboard behavior.
- [frontend/src/notebook/useNotebookDocument.test.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/useNotebookDocument.test.tsx#L47)
  Why it matters: current coverage for save-before-run behavior.
- [frontend/package.json](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/package.json#L1)
  Why it matters: proves Redux Toolkit is not yet installed.

### Backend

- [backend/main.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/main.go#L17)
  Why it matters: current process lifetime of Cozo runtime and notebook service.
- [backend/pkg/api/types.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/types.go#L72)
  Why it matters: notebook API request/response type home.
- [backend/pkg/api/notebook_handlers.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/notebook_handlers.go#L12)
  Why it matters: current notebook HTTP route surface.
- [backend/pkg/notebook/store.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/store.go#L57)
  Why it matters: schema, unique index, and mutation implementation.
- [backend/pkg/notebook/service.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/service.go#L64)
  Why it matters: notebook orchestration and runtime hydration.
- [backend/pkg/cozo/db.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/cozo/db.go#L52)
  Why it matters: current Cozo runtime abstraction that reset-kernel must wrap or replace.

## Bottom Line

The next notebook slice should not be “add two buttons and patch one SQL query.” The current failure is exposing a deeper boundary problem: notebook source state, notebook runtime state, and notebook-wide UI orchestration have outgrown the current hook-plus-local-state model.

The correct move is:

1. fix server-side positional integrity,
2. stop relying on partial frontend optimistic insert reconciliation,
3. introduce a Redux Toolkit notebook slice with normalized state,
4. add `clear notebook` and `reset kernel` as separate commands with separate semantics.

If the work is done in that order, the codebase gets both a bug fix and a cleaner foundation for the next notebook features. If only the bug is patched and the state model is left as-is, the next round of notebook features will be harder to reason about than this one.
