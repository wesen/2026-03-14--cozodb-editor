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


## 2026-03-22

Implemented the frontend notebook transport seam, the current Cozo frontend preset, and package-level Storybook/test smoke coverage (commits 3b69ec1, 073ba4e, 9f657e1)

### Related Files

- /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/app/store.ts — Redux store now accepts injected notebook services through thunk extra arguments
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/transport/httpClient.ts — HTTP notebook transport now supports explicit API base configuration
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookApp.tsx — Package-level app entrypoint now composes Provider plus notebook page container
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentCozo.tsx — Current frontend preset now owns theme imports, socket defaults, and preset assembly
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookApp.stories.tsx — Embedded host Storybook story exercises the reusable notebook package directly
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/transport/httpClient.test.ts — Transport test verifies API-base prefixing on notebook requests


## 2026-03-22

Moved Cozo-specific notebook experience into preset-owned config on both frontend and backend, and documented the JavaScript preset plus compatibility plan (commit 2d7fe22)

### Related Files

- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/profile.go — Backend notebook defaults now flow through profile objects instead of Cozo-specific globals
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/ws_config.go — Backend websocket fallback copy and SEM-sink ownership now flow through preset config
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/current_cozo_ws.go — Current Cozo preset now owns Cozo-specific websocket fallback copy and SEM translation
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/experienceConfig.ts — Frontend notebook experience config now owns renderer/code-fence defaults
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentCozoConfig.ts — Current Cozo frontend preset now owns Cozo-specific notebook experience settings
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/design-doc/02-javascript-surface-and-preset-compatibility-plan.md — Finalized JavaScript preset and compatibility strategy
