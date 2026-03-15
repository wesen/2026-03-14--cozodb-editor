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

## Phase 2: TypeScript Port

### TS Infrastructure

- [x] TS 1.1: Add `tsconfig.json` with strict mode
- [x] TS 1.2: Install `typescript` and `typescript-eslint`
- [x] TS 1.3: Update `vite.config` for TypeScript
- [x] TS 1.4: Update ESLint config for `.ts` and `.tsx` files
- [x] TS 1.5: Update `index.html` entry point to `.tsx`

### TS Pure Logic Files

- [x] TS 2.1: Port `sem/semEventTypes` to `.ts`
- [x] TS 2.2: Port `features/hints/hintViewModel` to `.ts`
- [x] TS 2.3: Port `features/cozo-sem/view-models/*` to `.ts` (toHintViewModel, toQuerySuggestionViewModel, toDocRefViewModel)
- [x] TS 2.4: Port `transport/httpClient` to `.ts`
- [x] TS 2.5: Port `transport/hintsSocket` to `.ts`
- [x] TS 2.6: Port `sem/semProjection` to `.ts` with full entity types
- [x] TS 2.7: Port `sem/registerDefaultSemHandlers` and `registerCozoSemHandlers` to `.ts`

### TS Components

- [x] TS 3.1: Port feature widget components to `.tsx` (QueryResultsTable, StreamingMessageCard, HintResponseCard, DocPreviewChip, DiagnosisCard, HintCard, QuerySuggestionCard, DocRefCard, CozoSemRenderer)
- [x] TS 3.2: Port notebook components to `.tsx` (useNotebookDocument, NotebookCellCard, NotebookPage)
- [x] TS 3.3: Port `App` and `main` entry to `.tsx`

### TS Tests

- [x] TS 4.1: Port test files to `.test.ts` / `.test.tsx`

## Phase 2: UI Improvements

- [x] UI 2.1: Add keyboard shortcuts (Shift+Enter to run cell)
- [ ] UI 2.2: Render markdown cells as formatted output when not editing
- [x] UI 2.3: Improve cell card chrome and visual hierarchy (System 7 window chrome)
- [x] UI 2.4: Improve header/toolbar design (System 7 menu bar)
- [ ] UI 2.5: Add cell focus management and active cell indicator
- [x] UI 2.6: Better empty state when notebook has no cells

## Phase 2: AI Ownership

- [x] AI 2.1: Keep cell-owned AI events out of line/global SEM selectors
- [x] AI 2.2: Render fallback non-structured `hint.result` responses under the owning cell
- [x] AI 2.3: Render diagnosis results under the owning cell instead of leaving them orphaned in projection state
- [x] AI 2.4: Update SEM thread chrome to present notebook attachment semantics rather than line/global semantics when `ownerCellId` is present
- [x] AI 2.5: Add projector coverage for cell-owned fallback hints and diagnosis entities

## Phase 3: Notebook Ergonomics

- [x] UX 3.1: Render markdown cells as formatted output when not actively editing
- [x] UX 3.2: Add explicit active-cell state with stronger visual indication
- [x] UX 3.3: Add notebook keyboard navigation between cells (j/k, Ctrl+Shift+arrows, Enter to edit)
- [x] UX 3.4: Add command-style insertion shortcuts for code and markdown cells (a/m/x keys, Ctrl+Enter run+advance)
- [x] UX 3.5: Add per-cell edit/preview mode for markdown cells (click to edit, Esc to preview)
- [x] UX 3.6: Add per-cell output collapse for large result or AI sections
- [x] UX 3.7: Add stable focus behavior after inserting cells from toolbar and AI suggestions
- [x] UX 3.8: Add notebook-level “run next code cell” / “insert below and focus” convenience flow (Shift+Enter / Ctrl+Enter run+advance)
- [ ] UX 3.9: Add frontend tests covering active-cell movement, markdown preview, and insert-below focus retention

## Phase 3: Runtime UX

- [x] Runtime 3.1: Surface latest run timestamp per cell
- [x] Runtime 3.2: Add a lightweight “dirty since last run” indicator for edited code cells
- [x] Runtime 3.3: Add a lightweight “AI attached to this run” indicator when a cell has bundles or fallback responses
- [ ] Runtime 3.4: Decide whether latest-output-only remains sufficient or whether a small per-cell run history affordance is needed next
- [x] Runtime 3.5: Add conservative downstream staleness derived from notebook order, upstream dirty state, and risky earlier reruns
- [x] Runtime 3.6: Add frontend tests for conservative dirty and stale state derivation

## Cleanup and Follow-up

- [ ] Cleanup 1.1: Decide when to retire `DatalogPad` from the main route entirely
- [ ] Cleanup 1.2: Decide when to retire `usePadDocument` from the main path entirely
- [x] Cleanup 1.3: Retire line-anchor-only notebook assumptions from the notebook SEM path
- [ ] Future 1.1: Add notebook snapshot browsing using recorded `nb_link_timeline_snapshots`
- [ ] Future 1.2: Add a richer notebook timeline viewer without changing Pinocchio internals
- [ ] Future 1.3: Revisit explicit AI-only cells after attached AI-under-cell flows feel solid
