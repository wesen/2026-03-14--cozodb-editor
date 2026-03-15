# Tasks

## Done

- [x] Create COZODB-005 ticket workspace
- [x] Import `/tmp/cozodb-notebook.md` into the ticket sources
- [x] Cross-check the imported proposal against the current editor, projector, and backend code
- [x] Write an intern-facing design and implementation guide
- [x] Write an investigation diary for the ticket
- [x] Produce an initial migration task list
- [x] Re-scope the ticket around a SQLite notebook store plus a shared-database Pinocchio timeline store

## Phase 1 Scope

- [x] Product 1.1: Keep phase 1 to a single notebook experience with code cells, markdown cells, per-cell run, and AI-under-cell behavior
- [x] Product 1.2: Make the notebook path the main app path once it is functional
- [x] Product 1.3: Defer explicit AI-only cells, replay UI, collaboration, and advanced hydration

## Backend: Shared Persistence Bootstrap

- [x] Backend 1.1: Add notebook-owned types under `backend/pkg/notebook`
- [x] Backend 1.2: Add SQLite notebook store bootstrap and migrations
- [x] Backend 1.3: Define `nb_notebooks`, `nb_cells`, `nb_runs`, and `nb_link_timeline_snapshots`
- [x] Backend 1.4: Add a backend setting for the application SQLite DB path
- [x] Backend 1.5: Open Pinocchio `SQLiteTimelineStore` against the same DB file
- [x] Backend 1.6: Verify that local table names do not collide with Pinocchio `timeline_*` tables

## Backend: Notebook CRUD

- [x] Backend 2.1: Add create notebook operation
- [x] Backend 2.2: Add get notebook with ordered cells operation
- [x] Backend 2.3: Add update notebook title operation
- [x] Backend 2.4: Add insert cell operation
- [x] Backend 2.5: Add update cell source operation
- [x] Backend 2.6: Add move cell operation
- [x] Backend 2.7: Add delete cell operation
- [x] Backend 2.8: Add default notebook bootstrap for first app load

## Backend: Per-Cell Runtime

- [x] Backend 3.1: Add execution-count allocation per cell
- [x] Backend 3.2: Add `POST /api/notebook-cells/{cellId}/run`
- [x] Backend 3.3: Persist `nb_runs` rows for running, complete, and error states
- [x] Backend 3.4: Translate successful run results into notebook-owned timeline entities
- [x] Backend 3.5: Translate failed run results into notebook-owned timeline entities
- [x] Backend 3.6: Record notebook-to-snapshot link rows after timeline upserts
- [x] Backend 3.7: Return `notebook_id`, `cell_id`, `run_id`, `conv_id`, and `execution_count` in the run response

## Backend: AI Ownership Migration

- [x] Backend 4.1: Extend websocket request payloads to accept `notebookId`
- [x] Backend 4.2: Extend websocket request payloads to accept `ownerCellId`
- [x] Backend 4.3: Extend websocket request payloads to accept `runId` when relevant
- [x] Backend 4.4: Pass cell ownership into projection defaults instead of line ownership
- [x] Backend 4.5: Keep diagnosis and hint flows compatible with the current engine while changing ownership fields

## Frontend: Notebook Document UI

- [x] Frontend 1.1: Add notebook API client helpers
- [x] Frontend 1.2: Add notebook source state hook
- [x] Frontend 1.3: Add notebook runtime state hook
- [x] Frontend 1.4: Add `NotebookPage`
- [x] Frontend 1.5: Add `NotebookToolbar`
- [x] Frontend 1.6: Add `NotebookCellList`
- [x] Frontend 1.7: Add `NotebookCellCard`
- [x] Frontend 1.8: Add `CodeCellEditor`
- [x] Frontend 1.9: Add `MarkdownCellEditor`
- [x] Frontend 1.10: Add `CellOutputArea`
- [x] Frontend 1.11: Add add-cell-above and add-cell-below actions
- [x] Frontend 1.12: Add move and delete actions

## Frontend: Runtime and AI Rendering

- [x] Frontend 2.1: Replace line-owned run rendering with cell-owned run rendering
- [x] Frontend 2.2: Reuse `QueryResultsTable` under a cell output area
- [x] Frontend 2.3: Extend `semProjection` to group by `ownerCellId`
- [x] Frontend 2.4: Render streaming and final AI bundles under the owning cell
- [x] Frontend 2.5: Support fold and dismiss for AI threads in the notebook path
- [x] Frontend 2.6: Add "insert suggestion as new code cell below" from AI query suggestions
- [x] Frontend 2.7: Remove `#??` from the main notebook interaction path

## Frontend: App Integration

- [x] Frontend 3.1: Switch `App.jsx` to the notebook page
- [x] Frontend 3.2: Keep legacy pad code isolated but no longer primary
- [x] Frontend 3.3: Preserve existing theme tokens and result card styling where reusable

## Testing

- [x] Testing 1.1: Add backend notebook store tests for schema bootstrap and CRUD
- [x] Testing 1.2: Add backend tests for run persistence and execution-count incrementing
- [ ] Testing 1.3: Add backend tests for notebook-to-timeline snapshot links
- [ ] Testing 1.4: Add frontend tests for notebook load and cell ordering
- [ ] Testing 1.5: Add frontend tests for cell run success and error rendering
- [x] Testing 1.6: Add frontend tests for AI rendering under the correct cell
- [ ] Testing 1.7: Add frontend tests for inserting a suggested query as a new cell below

## Cleanup and Follow-up

- [ ] Cleanup 1.1: Decide when to retire `DatalogPad` from the main route entirely
- [ ] Cleanup 1.2: Decide when to retire `usePadDocument` from the main path entirely
- [ ] Cleanup 1.3: Decide when to retire line-anchor-only notebook assumptions from SEM projection
- [ ] Future 1.1: Add notebook snapshot browsing using recorded `nb_link_timeline_snapshots`
- [ ] Future 1.2: Add a richer notebook timeline viewer without changing Pinocchio internals
- [ ] Future 1.3: Revisit explicit AI-only cells after attached AI-under-cell flows feel solid
