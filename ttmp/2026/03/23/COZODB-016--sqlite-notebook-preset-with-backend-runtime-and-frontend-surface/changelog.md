# Changelog

## 2026-03-23

- Initial workspace created
- Added the SQLite preset implementation guide and implementation diary
- Added a ticket-local preset surface inventory script and captured its output
- Recorded the first implementation plan and ordered task list
- Implemented the backend SQLite runtime, backend current SQLite preset constructor, backend preset selection, and backend tests
- Implemented the frontend current SQLite preset, preset exports and app selection, and SQLite Storybook/MSW coverage
- Fixed shared app-db bootstrap leakage by making preset default notebook IDs and seeded default cell IDs preset-aware in the shared backend store/profile layer
- Added regression coverage for multiple preset bootstraps against one app database
- Validated with backend tests, frontend test/lint/typecheck/build/Storybook build, and a live Cozo-then-SQLite shared-database smoke pass
