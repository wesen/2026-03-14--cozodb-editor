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

- [ ] Product 1.1: Keep phase 1 to a single notebook experience with code cells, markdown cells, per-cell run, and AI-under-cell behavior
- [ ] Product 1.2: Make the notebook path the main app path once it is functional
- [ ] Product 1.3: Defer explicit AI-only cells, replay UI, collaboration, and advanced hydration

## Backend: Shared Persistence Bootstrap

- [ ] Backend 1.1: Add notebook-owned types under `backend/pkg/notebook`
- [ ] Backend 1.2: Add SQLite notebook store bootstrap and migrations
- [ ] Backend 1.3: Define `nb_notebooks`, `nb_cells`, `nb_runs`, and `nb_link_timeline_snapshots`
- [ ] Backend 1.4: Add a backend setting for the application SQLite DB path
- [ ] Backend 1.5: Open Pinocchio `SQLiteTimelineStore` against the same DB file
- [ ] Backend 1.6: Verify that local table names do not collide with Pinocchio `timeline_*` tables

## Backend: Notebook CRUD

- [ ] Backend 2.1: Add create notebook operation
- [ ] Backend 2.2: Add get notebook with ordered cells operation
- [ ] Backend 2.3: Add update notebook title operation
- [ ] Backend 2.4: Add insert cell operation
- [ ] Backend 2.5: Add update cell source operation
- [ ] Backend 2.6: Add move cell operation
- [ ] Backend 2.7: Add delete cell operation
- [ ] Backend 2.8: Add default notebook bootstrap for first app load

## Backend: Per-Cell Runtime

- [ ] Backend 3.1: Add execution-count allocation per cell
- [ ] Backend 3.2: Add `POST /api/notebook-cells/{cellId}/run`
- [ ] Backend 3.3: Persist `nb_runs` rows for running, complete, and error states
- [ ] Backend 3.4: Translate successful run results into notebook-owned timeline entities
- [ ] Backend 3.5: Translate failed run results into notebook-owned timeline entities
- [ ] Backend 3.6: Record notebook-to-snapshot link rows after timeline upserts
- [ ] Backend 3.7: Return `notebook_id`, `cell_id`, `run_id`, `conv_id`, and `execution_count` in the run response

## Backend: AI Ownership Migration

- [ ] Backend 4.1: Extend websocket request payloads to accept `notebookId`
- [ ] Backend 4.2: Extend websocket request payloads to accept `ownerCellId`
- [ ] Backend 4.3: Extend websocket request payloads to accept `runId` when relevant
- [ ] Backend 4.4: Pass cell ownership into projection defaults instead of line ownership
- [ ] Backend 4.5: Keep diagnosis and hint flows compatible with the current engine while changing ownership fields

## Frontend: Notebook Document UI

- [ ] Frontend 1.1: Add notebook API client helpers
- [ ] Frontend 1.2: Add notebook source state hook
- [ ] Frontend 1.3: Add notebook runtime state hook
- [ ] Frontend 1.4: Add `NotebookPage`
- [ ] Frontend 1.5: Add `NotebookToolbar`
- [ ] Frontend 1.6: Add `NotebookCellList`
- [ ] Frontend 1.7: Add `NotebookCellCard`
- [ ] Frontend 1.8: Add `CodeCellEditor`
- [ ] Frontend 1.9: Add `MarkdownCellEditor`
- [ ] Frontend 1.10: Add `CellOutputArea`
- [ ] Frontend 1.11: Add add-cell-above and add-cell-below actions
- [ ] Frontend 1.12: Add move and delete actions

## Frontend: Runtime and AI Rendering

- [ ] Frontend 2.1: Replace line-owned run rendering with cell-owned run rendering
- [ ] Frontend 2.2: Reuse `QueryResultsTable` under a cell output area
- [ ] Frontend 2.3: Extend `semProjection` to group by `ownerCellId`
- [ ] Frontend 2.4: Render streaming and final AI bundles under the owning cell
- [ ] Frontend 2.5: Support fold and dismiss for AI threads in the notebook path
- [ ] Frontend 2.6: Add "insert suggestion as new code cell below" from AI query suggestions
- [ ] Frontend 2.7: Remove `#??` from the main notebook interaction path

## Frontend: App Integration

- [ ] Frontend 3.1: Switch `App.jsx` to the notebook page
- [ ] Frontend 3.2: Keep legacy pad code isolated but no longer primary
- [ ] Frontend 3.3: Preserve existing theme tokens and result card styling where reusable

## Testing

- [ ] Testing 1.1: Add backend notebook store tests for schema bootstrap and CRUD
- [ ] Testing 1.2: Add backend tests for run persistence and execution-count incrementing
- [ ] Testing 1.3: Add backend tests for notebook-to-timeline snapshot links
- [ ] Testing 1.4: Add frontend tests for notebook load and cell ordering
- [ ] Testing 1.5: Add frontend tests for cell run success and error rendering
- [ ] Testing 1.6: Add frontend tests for AI rendering under the correct cell
- [ ] Testing 1.7: Add frontend tests for inserting a suggested query as a new cell below

## Cleanup and Follow-up

- [ ] Cleanup 1.1: Decide when to retire `DatalogPad` from the main route entirely
- [ ] Cleanup 1.2: Decide when to retire `usePadDocument` from the main path entirely
- [ ] Cleanup 1.3: Decide when to retire line-anchor-only notebook assumptions from SEM projection
- [ ] Future 1.1: Add notebook snapshot browsing using recorded `nb_link_timeline_snapshots`
- [ ] Future 1.2: Add a richer notebook timeline viewer without changing Pinocchio internals
- [ ] Future 1.3: Revisit explicit AI-only cells after attached AI-under-cell flows feel solid
