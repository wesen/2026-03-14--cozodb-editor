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

