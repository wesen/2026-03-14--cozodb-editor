# Changelog

## 2026-03-22

- Initial workspace created
- Added backend cutover guide, task list, and diary

## 2026-03-22

Step 2: inverted notebook runtime and timeline dependencies and validated backend tests (commit f5d575b)

### Related Files

- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/config.go — ServiceConfig centralizes notebook backend construction defaults
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/service.go — Service constructor now accepts injected runtime and timeline dependencies
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/service_test.go — Tests cover the constructor-based assembly path
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/timeline.go — TimelineStore interface and SQLite opener moved into notebook package


## 2026-03-22

Step 3: moved notebook REST route ownership into backend/pkg/notebook and rewired main.go (commit d7360dd)

### Related Files

- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/main.go — Current app now mounts notebook HTTP routes from the notebook package
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/handlers.go — Generic API server no longer owns notebook REST state
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/http.go — Notebook package now mounts and serves the notebook REST API directly
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/http_test.go — Transport tests cover bootstrap

