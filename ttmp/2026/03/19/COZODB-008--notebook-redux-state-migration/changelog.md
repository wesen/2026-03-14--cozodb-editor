# Changelog

## 2026-03-19

- Initial workspace created
- Added Redux Toolkit store wiring for the frontend app
- Replaced hook-owned notebook orchestration with a normalized notebook slice and thunks
- Moved notebook-wide UI state and SEM projection updates into store-managed actions
- Refactored notebook page and cell components onto selectors and dispatch
- Removed `useNotebookDocument` and replaced it with slice-focused tests
