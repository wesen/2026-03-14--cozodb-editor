# Changelog

## 2026-03-15

- Added an explicit phase 3 plan to COZODB-005.
- Scoped phase 3 around notebook ergonomics and lightweight runtime UX rather than new backend persistence or hydration complexity.
- Expanded the design doc, tasks, and diary to reflect the next implementation phase after the cell-ownership pivot.

## 2026-03-15

- Tightened notebook AI ownership for phase 2.
- Updated the SEM projector so cell-owned events no longer leak into line/global selectors.
- Added cell-owned fallback rendering for non-structured hint responses and diagnosis results in the notebook UI.
- Updated SEM thread chrome to present notebook attachment semantics instead of line/global labels when `ownerCellId` is present.
- Added projector coverage for cell-owned fallback hints and diagnosis entities.

## 2026-03-15

- Implemented notebook phase 1 in the application code.
- Added a notebook-owned SQLite store, run tracking, snapshot links, and a shared-database Pinocchio timeline store bootstrap.
- Added notebook CRUD endpoints and a per-cell run endpoint.
- Added a notebook UI with code cells, markdown cells, per-cell outputs, per-cell AI prompts, and cell-owned SEM widget rendering.
- Moved websocket ownership payloads and SEM projection metadata from line-only assumptions toward `ownerCellId`.
- Added backend notebook tests and frontend SEM cell-grouping coverage.

## 2026-03-15

- Revised COZODB-005 to use a local SQLite notebook store plus Pinocchio's existing SQLite timeline store in the same database file.
- Recorded the explicit constraint that notebook-specific types live in `cozodb-editor` while Pinocchio remains unchanged.
- Rewrote the design guide around shared-database storage, runtime crosslinks, and a narrower but persistence-backed notebook phase 1.
- Replaced the original task list with a more granular implementation plan covering shared persistence bootstrap, notebook CRUD, per-cell runtime, and cell-owned AI rendering.

## 2026-03-15

- Created COZODB-005 to plan the transition from the current CozoDB editor into a cell-based notebook playground.
- Imported `/tmp/cozodb-notebook.md` into the ticket as a tracked local source.
- Cross-checked the notebook proposal against the current line-oriented editor, bundle-based SEM projector, and backend query/AI pipeline.
- Wrote a detailed intern-facing design and implementation guide that intentionally narrows the first notebook implementation to a robust cell model plus cell-owned AI outputs rather than broader hydration complexity.
- Produced a granular task list covering notebook document state, runtime ownership, backend APIs, frontend migration, persistence, testing, and cleanup.

## 2026-03-15

- Initial workspace created
