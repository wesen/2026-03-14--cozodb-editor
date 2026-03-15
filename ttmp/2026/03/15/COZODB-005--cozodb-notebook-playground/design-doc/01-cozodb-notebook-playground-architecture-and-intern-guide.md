---
Title: CozoDB Notebook Playground Architecture and Intern Guide
Ticket: COZODB-005
Status: active
Topics:
    - architecture
    - frontend
    - cozodb
    - ai-completion
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: ""
LastUpdated: 2026-03-15T20:10:00-04:00
WhatFor: Explain how to turn the current CozoDB editor into a robust notebook playground backed by a local SQLite notebook store and a shared-database Pinocchio timeline store, without modifying Pinocchio itself.
WhenToUse: Use when implementing COZODB-005, onboarding a new engineer or intern to the notebook architecture, or checking why phase 1 is intentionally narrow but still persistence-backed.
---

# CozoDB Notebook Playground Architecture and Intern Guide

## Executive Summary

The current CozoDB editor already has two strong subsystems:

- a local Cozo query runtime in the Go backend
- a structured AI and SEM rendering path in the websocket plus projector flow

What it does not have is a durable authoring model. The UI is still built around `string[]` lines in [frontend/src/editor/usePadDocument.js](../../../../../../../../frontend/src/editor/usePadDocument.js), the screen still treats the document like a padded text area in [frontend/src/DatalogPad.jsx](../../../../../../../../frontend/src/DatalogPad.jsx), and AI attachment still inherits assumptions from the line-based pad. That mismatch is now the main product and code-quality problem.

The imported proposal is correct that this should become a notebook. The important update from the latest user guidance is that phase 1 should not invent new runtime abstractions inside Pinocchio. Pinocchio is a third-party dependency for this project. We should reuse its SQLite timeline store exactly as it exists, keep all notebook-specific types in the CozoDB editor codebase, and place both systems in the same SQLite database file with separate tables.

The phase 1 target is therefore:

1. add a real notebook document model in `cozodb-editor`
2. persist notebooks and cells in SQLite
3. persist notebook runtime timeline entities through Pinocchio's existing SQLite timeline store, using the same database file
4. crosslink notebook IDs, cell IDs, run IDs, and timeline conversation IDs
5. render a functioning notebook UI with per-cell execution and AI outputs under cells

That is enough for a real notebook substrate. It is intentionally not a complete replay, hydration, collaboration, or kernel-history product.

## Problem Statement

The project has reached a structural transition point. The current app looks like a notebook in use, but it still behaves like a line editor internally.

### Verified current-state facts

The following was verified directly in the codebase:

- The main app route is still the pad UI:
  - [frontend/src/App.jsx](../../../../../../../../frontend/src/App.jsx)
  - [frontend/src/DatalogPad.jsx](../../../../../../../../frontend/src/DatalogPad.jsx)
- The authoring model is line-based:
  - [frontend/src/editor/usePadDocument.js](../../../../../../../../frontend/src/editor/usePadDocument.js)
  - [frontend/src/editor/PadEditor.jsx](../../../../../../../../frontend/src/editor/PadEditor.jsx)
- Query execution is a single ad hoc POST:
  - [frontend/src/transport/httpClient.js](../../../../../../../../frontend/src/transport/httpClient.js)
  - [backend/pkg/api/handlers.go](../../../../../../../../backend/pkg/api/handlers.go)
- AI requests still go over the hints websocket:
  - [frontend/src/transport/hintsSocket.js](../../../../../../../../frontend/src/transport/hintsSocket.js)
  - [backend/pkg/api/websocket.go](../../../../../../../../backend/pkg/api/websocket.go)
- Structured SEM rendering is already modular enough to reuse:
  - [frontend/src/sem/semProjection.js](../../../../../../../../frontend/src/sem/semProjection.js)
  - [frontend/src/features/cozo-sem/CozoSemRenderer.jsx](../../../../../../../../frontend/src/features/cozo-sem/CozoSemRenderer.jsx)
- Pinocchio is already a dependency, but only used through the SEM translation path today:
  - [backend/go.mod](../../../../../../../../backend/go.mod)
  - [backend/pkg/hints/sem_registry.go](../../../../../../../../backend/pkg/hints/sem_registry.go)
  - [backend/pkg/api/ws_sem_sink.go](../../../../../../../../backend/pkg/api/ws_sem_sink.go)

### The new hard constraints

The latest user guidance changes the implementation shape in four important ways:

- New notebook and runtime types must live in `cozodb-editor`, not in Pinocchio.
- Pinocchio should remain unchanged. Treat it like third-party code.
- Notebook storage must use SQLite.
- The notebook store and the Pinocchio timeline store should share one SQLite database file, with no table-name collisions.

That means phase 1 cannot be "frontend notebook first, persistence later". Persistence is part of the core shape now.

## Goals and Non-Goals

### Goals

- Replace the line array authoring model with a notebook document model.
- Make `cellId` the durable owner for execution and AI attachments.
- Persist notebooks and cells in local SQLite tables owned by `cozodb-editor`.
- Persist timeline entities via Pinocchio's existing SQLite timeline store, in the same DB file.
- Allow crosslinks from notebook source records to timeline conversations and snapshots.
- Keep the first UI small enough to finish: code cells, markdown cells, run cell, add cell, update cell, AI under cell.

### Non-goals for phase 1

- Modifying Pinocchio source or schema.
- Building a general-purpose hydration engine.
- Multi-user synchronization.
- Staleness graph analysis beyond a conservative minimum.
- Notebook versioning, branching, or merge semantics.
- An explicit AI-only cell type.

## Architecture Overview

Phase 1 uses three layers:

1. `Notebook source store`
   - owned entirely by `cozodb-editor`
   - persists notebook metadata and cells
   - uses SQLite tables prefixed for notebook ownership

2. `Notebook runtime timeline`
   - persisted by Pinocchio's existing SQLite timeline store
   - lives in the same SQLite file as the notebook tables
   - conversation IDs are namespaced by notebook and run scope

3. `Notebook UI and projection`
   - renders cells from notebook source records
   - renders outputs from runtime state and SEM projection under cells

### Why one SQLite file is the right cut

One file gives the project a durable local workspace artifact that can be copied, backed up, inspected, and evolved. It also keeps notebook-to-timeline crosslinks straightforward because they can be stored in notebook-owned tables without having to coordinate two databases.

This does not mean Cozo itself must use the same SQLite file. Cozo's own engine path should remain separate. The shared database in this ticket is the application persistence database for notebook source plus Pinocchio timeline entities.

## Shared SQLite Database Design

### Table ownership

The most important rule is table ownership by prefix:

- notebook source and metadata tables: `nb_*`
- notebook-to-runtime link tables: `nb_link_*`
- Pinocchio timeline tables: whatever Pinocchio already creates

Verified Pinocchio SQLite timeline tables:

- `timeline_versions`
- `timeline_entities`
- `timeline_conversations`

Source:

- [pinocchio/pkg/persistence/chatstore/timeline_store_sqlite.go](../../../../../../../../../../corporate-headquarters/pinocchio/pkg/persistence/chatstore/timeline_store_sqlite.go)

Because Pinocchio already uses `timeline_*`, the local app should avoid that namespace entirely.

### Recommended local tables

```sql
CREATE TABLE nb_notebooks (
  notebook_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'cozoscript',
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE nb_cells (
  cell_id TEXT PRIMARY KEY,
  notebook_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  kind TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  FOREIGN KEY(notebook_id) REFERENCES nb_notebooks(notebook_id) ON DELETE CASCADE
);

CREATE TABLE nb_runs (
  run_id TEXT PRIMARY KEY,
  notebook_id TEXT NOT NULL,
  cell_id TEXT NOT NULL,
  conv_id TEXT NOT NULL,
  execution_count INTEGER NOT NULL,
  status TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  started_at_ms INTEGER NOT NULL,
  finished_at_ms INTEGER,
  FOREIGN KEY(notebook_id) REFERENCES nb_notebooks(notebook_id) ON DELETE CASCADE
);

CREATE TABLE nb_link_timeline_snapshots (
  notebook_id TEXT NOT NULL,
  cell_id TEXT,
  run_id TEXT,
  conv_id TEXT NOT NULL,
  snapshot_version INTEGER NOT NULL,
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (conv_id, snapshot_version)
);
```

### Namespacing rules

Use explicit namespacing in IDs so notebook and runtime records stay easy to debug:

- notebook IDs: `nbk_<uuid>`
- cell IDs: `cell_<uuid>`
- run IDs: `run_<uuid>`
- timeline conversation IDs: `notebook:<notebookId>:cell:<cellId>`
- timeline entity IDs: notebook-owned runtime entity IDs such as:
  - `run:<runId>`
  - `query-result:<runId>`
  - `error-result:<runId>`
  - `ai-bundle:<requestId>`

That convention is not required by SQLite, but it makes support and future migration much easier.

## Data Model

### Source model

The source model is what the user authored.

```go
type Notebook struct {
	ID          string
	Title       string
	Language    string
	CreatedAtMs int64
	UpdatedAtMs int64
}

type NotebookCell struct {
	ID          string
	NotebookID  string
	Position    int
	Kind        string // "code" | "markdown"
	Source      string
	CreatedAtMs int64
	UpdatedAtMs int64
}
```

### Runtime model in `cozodb-editor`

The runtime types also live locally even when timeline persistence is delegated to Pinocchio.

```go
type CellRun struct {
	ID             string
	NotebookID     string
	CellID         string
	ConvID         string
	ExecutionCount int
	Status         string
	SourceHash     string
	StartedAtMs    int64
	FinishedAtMs   *int64
}

type NotebookTimelineLink struct {
	NotebookID      string
	CellID          string
	RunID           string
	ConvID          string
	SnapshotVersion uint64
	CreatedAtMs     int64
}
```

### Runtime entities persisted into Pinocchio

Pinocchio stores protobuf `TimelineEntityV2` records. The CozoDB editor should define local translators that turn notebook run results into timeline entities, but it should not modify Pinocchio itself.

Examples:

- a successful query run becomes:
  - one `notebook_run` timeline entity
  - one `query_result` timeline entity
- a failed run becomes:
  - one `notebook_run` entity
  - one `error_result` entity
- an AI request becomes:
  - one `ai_bundle` entity
  - child entities for `cozo_hint`, `cozo_query_suggestion`, `cozo_doc_ref`

## Backend Service Layout

The cleanest phase 1 backend split is:

- `backend/pkg/notebook/store.go`
  - notebook SQLite schema and CRUD
- `backend/pkg/notebook/types.go`
  - notebook and run types owned by this project
- `backend/pkg/notebook/runtime.go`
  - run orchestration, execution count allocation, timeline persistence
- `backend/pkg/notebook/api.go`
  - HTTP handlers for notebook CRUD and run actions
- `backend/pkg/notebook/timeline.go`
  - local translation helpers from notebook runtime events to Pinocchio timeline entities

### Runtime orchestration flow

Pseudocode:

```go
func RunCell(ctx, notebookID, cellID string) (*RunResultEnvelope, error) {
	cell := notebookStore.GetCell(ctx, notebookID, cellID)
	convID := "notebook:" + notebookID + ":cell:" + cellID
	runID := newRunID()
	execCount := notebookStore.NextExecutionCount(ctx, notebookID, cellID)

	run := notebookStore.InsertRun(ctx, CellRun{
		ID: runID,
		NotebookID: notebookID,
		CellID: cellID,
		ConvID: convID,
		ExecutionCount: execCount,
		Status: "running",
		SourceHash: hash(cell.Source),
	})

	result, err := cozoDB.Query(cell.Source, nil)

	if err != nil || !result.OK {
		entity := buildErrorTimelineEntity(run, result, err)
		version := timelineVersionAllocator.Next(convID)
		timelineStore.Upsert(ctx, convID, version, entity)
		notebookStore.FinishRun(ctx, run.ID, "error")
		notebookStore.RecordSnapshotLink(ctx, notebookID, cellID, runID, convID, version)
		return buildErrorEnvelope(run, result, err), nil
	}

	entity := buildQueryResultTimelineEntity(run, result)
	version := timelineVersionAllocator.Next(convID)
	timelineStore.Upsert(ctx, convID, version, entity)
	notebookStore.FinishRun(ctx, run.ID, "complete")
	notebookStore.RecordSnapshotLink(ctx, notebookID, cellID, runID, convID, version)
	return buildSuccessEnvelope(run, result), nil
}
```

### Shared DB bootstrap

The backend needs one app database bootstrap path:

1. open SQLite DB file for notebook tables
2. run local `nb_*` migrations
3. derive Pinocchio DSN for the same file using `chatstore.SQLiteTimelineDSNForFile(...)`
4. open `chatstore.NewSQLiteTimelineStore(dsn)`

That satisfies the "same DB, no Pinocchio changes" requirement cleanly.

## API Shape

Phase 1 should use ordinary JSON HTTP endpoints for notebook CRUD and per-cell execution. The existing websocket can continue to handle AI streaming.

### Suggested HTTP endpoints

- `POST /api/notebooks`
  - create notebook
- `GET /api/notebooks/{id}`
  - load notebook with ordered cells
- `PATCH /api/notebooks/{id}`
  - update notebook title
- `POST /api/notebooks/{id}/cells`
  - insert cell
- `PATCH /api/notebook-cells/{cellId}`
  - update cell source or kind
- `POST /api/notebook-cells/{cellId}/move`
  - reorder cell
- `DELETE /api/notebook-cells/{cellId}`
  - delete cell
- `POST /api/notebook-cells/{cellId}/run`
  - run one code cell and return run envelope

### Run response shape

```json
{
  "ok": true,
  "notebook_id": "nbk_123",
  "cell_id": "cell_123",
  "run_id": "run_123",
  "conv_id": "notebook:nbk_123:cell:cell_123",
  "execution_count": 4,
  "status": "complete",
  "result": {
    "headers": ["name", "age"],
    "rows": [["Ana", 32]],
    "took": 0.001
  }
}
```

### Websocket request ownership

The websocket request payload should move from:

- `anchorLine`

to:

- `ownerCellId`
- `notebookId`
- `runId` when the request is attached to a specific run

That keeps the current hint and diagnosis engine usable while changing the ownership contract.

## Frontend Architecture

### State domains

The frontend needs three separate state domains:

1. `Notebook source state`
   - notebook metadata
   - cell order
   - cell source text

2. `Notebook runtime state`
   - latest run per cell
   - run status per cell
   - query result or error output per cell

3. `SEM and AI projection state`
   - AI bundle threads per cell
   - streaming text per request
   - child widgets such as query suggestions and doc refs

### Recommended component split

- `frontend/src/notebook/NotebookPage.jsx`
- `frontend/src/notebook/useNotebookDocument.js`
- `frontend/src/notebook/useNotebookRuntime.js`
- `frontend/src/notebook/NotebookToolbar.jsx`
- `frontend/src/notebook/NotebookCellList.jsx`
- `frontend/src/notebook/NotebookCellCard.jsx`
- `frontend/src/notebook/CodeCellEditor.jsx`
- `frontend/src/notebook/MarkdownCellEditor.jsx`
- `frontend/src/notebook/CellOutputArea.jsx`

### Rendering model

Each cell card should render in this order:

1. cell header and actions
2. cell editor
3. runtime output area
4. AI thread area
5. add-cell affordance

That order makes AI an attached capability, not a separate global feed.

### Current-to-target mapping

Existing reusable pieces:

- `QueryResultsTable` can be reused under cells:
  - [frontend/src/features/query-results/QueryResultsTable.jsx](../../../../../../../../frontend/src/features/query-results/QueryResultsTable.jsx)
- `CozoSemRenderer` can be reused under cells:
  - [frontend/src/features/cozo-sem/CozoSemRenderer.jsx](../../../../../../../../frontend/src/features/cozo-sem/CozoSemRenderer.jsx)
- `useHintsSocket` can be reused with a richer payload:
  - [frontend/src/transport/hintsSocket.js](../../../../../../../../frontend/src/transport/hintsSocket.js)

Things that should stop owning the main path:

- `DatalogPad`
- `PadEditor`
- `usePadDocument`

They can survive temporarily as the legacy route, but they should not remain the main product once the notebook path works.

## Diagram: Phase 1 Runtime

```text
+--------------------+        HTTP         +---------------------------+
| NotebookPage.jsx   | -----------------> | notebook API handlers     |
| cells + outputs    |                    | CRUD + run cell           |
+---------+----------+                    +-------------+-------------+
          |                                                   |
          | websocket AI                                       | Cozo query
          v                                                   v
+--------------------+                             +-------------------+
| useHintsSocket     |                             | cozo.DB           |
| cell-owned payload |                             | execute script    |
+---------+----------+                             +-------------------+
          |
          v
+--------------------+     Upsert entities      +----------------------------+
| semProjection.js   | <----------------------- | Pinocchio SQLite timeline  |
| ownerCellId aware  |                          | store in same DB file      |
+--------------------+                          +----------------------------+
          ^
          |
          +-------- notebook runtime state from local nb_* tables
```

## Implementation Plan

### Slice 1: update docs and lock scope

- Rewrite the ticket to reflect the SQLite plus shared-timeline-store architecture.
- Record that Pinocchio stays unchanged.
- Define table namespaces and ID conventions.

### Slice 2: backend notebook store

- Add notebook-owned SQLite schema and migrations.
- Add CRUD for notebooks and cells.
- Add run tracking tables and execution count allocation.
- Open Pinocchio timeline store against the same DB file.

### Slice 3: backend run-cell path

- Add `POST /api/notebook-cells/{cellId}/run`.
- Persist run metadata locally.
- Persist runtime entities into Pinocchio timeline store.
- Return a direct run envelope for the frontend.

### Slice 4: frontend notebook page

- Replace the app root with a notebook page.
- Load or create one working notebook on startup.
- Render code and markdown cells.
- Support add, edit, move, and delete actions.

### Slice 5: per-cell AI under outputs

- Extend websocket payloads to include notebook and cell ownership.
- Extend SEM projection from `anchorLine` to `ownerCellId`.
- Render AI bundles and children under the owning cell.

### Slice 6: basic crosslinking and tests

- Persist notebook-to-snapshot links.
- Add backend store tests and frontend notebook tests.
- Leave advanced hydration for a later ticket.

## What the intern should understand before coding

1. The notebook document and the runtime timeline are different stores.
2. The notebook store belongs to this repo.
3. The timeline store belongs to Pinocchio and should be used, not edited.
4. Cells own outputs. Lines do not.
5. A functioning phase 1 is better than a half-built replay system.

## Open Questions

- Should the first notebook route fully replace `DatalogPad` immediately, or should we keep a short-lived fallback route during migration?
- Should markdown cells ship in the first vertical slice or in the second frontend commit once code cells already run?
- Do we want one conversation ID per cell or one per notebook plus cell-scoped entities? The simpler phase 1 choice is one conversation per cell.
- Should run history be visible immediately, or is latest-output-per-cell enough for the first UI?

## References

- Imported proposal:
  - [sources/local/01-cozodb-notebook.md](../sources/local/01-cozodb-notebook.md)
- Current app shell:
  - [frontend/src/App.jsx](../../../../../../../../frontend/src/App.jsx)
  - [frontend/src/DatalogPad.jsx](../../../../../../../../frontend/src/DatalogPad.jsx)
- Current line editor:
  - [frontend/src/editor/usePadDocument.js](../../../../../../../../frontend/src/editor/usePadDocument.js)
  - [frontend/src/editor/PadEditor.jsx](../../../../../../../../frontend/src/editor/PadEditor.jsx)
- Current websocket and API:
  - [backend/pkg/api/handlers.go](../../../../../../../../backend/pkg/api/handlers.go)
  - [backend/pkg/api/websocket.go](../../../../../../../../backend/pkg/api/websocket.go)
  - [backend/pkg/api/types.go](../../../../../../../../backend/pkg/api/types.go)
- Current SEM projection:
  - [frontend/src/sem/semProjection.js](../../../../../../../../frontend/src/sem/semProjection.js)
  - [frontend/src/features/cozo-sem/CozoSemRenderer.jsx](../../../../../../../../frontend/src/features/cozo-sem/CozoSemRenderer.jsx)
- Pinocchio SQLite timeline store:
  - [pinocchio/pkg/persistence/chatstore/timeline_store_sqlite.go](../../../../../../../../../../corporate-headquarters/pinocchio/pkg/persistence/chatstore/timeline_store_sqlite.go)
