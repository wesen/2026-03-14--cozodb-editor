# Changelog

## 2026-03-22

- Initial workspace created


## 2026-03-22

Wrote the packaging/API design guide, captured the package inventory, and uploaded the ticket bundle to reMarkable

### Related Files

- /home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/design-doc/01-notebook-packaging-api-design-and-current-app-preset-implementation-guide.md — Primary intern-facing package and API design guide
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/reference/01-diary.md — Chronological delivery and troubleshooting diary
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/scripts/01-package-surface-inventory.sh — Ticket-local package inventory script
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/sources/01-package-surface-inventory.txt — Captured package inventory evidence


## 2026-03-22

Implemented backend module API, configurable notebook base paths, and the current Cozo backend preset (commits ee21331, a9a362c)

### Related Files

- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/main.go — Current host now consumes notebook-owned backend preset entrypoint
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/current_cozo.go — Introduced current app preset factory for Cozo runtime plus optional hints engine
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/http_test.go — Custom base-path HTTP mount test covers module path configuration
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/module.go — Introduced backend module wrapper and resource ownership hooks
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/websocket_test.go — Custom base-path WebSocket mount test covers module path configuration

