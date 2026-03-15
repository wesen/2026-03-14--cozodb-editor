# Changelog

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
