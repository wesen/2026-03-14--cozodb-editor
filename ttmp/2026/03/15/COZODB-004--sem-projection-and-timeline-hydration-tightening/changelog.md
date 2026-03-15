# Changelog

## 2026-03-15

- Implemented the backend contract slice in commit `99f18ac` (`backend(sem): stabilize bundle metadata and anchors`).
- Added request-level `anchorLine` and bundle-level `stream_id` plumbing in the websocket API so one response can be correlated as one SEM bundle.
- Added `ProjectionDefaults` and deterministic bundle/child ID helpers, then threaded those defaults through preview extraction and authoritative structured parsing.
- Extended structured events and translated `cozo.*` websocket payloads with `bundleId`, `parentId`, `ordinal`, `mode`, and backend-authoritative anchor metadata.
- Added backend coverage for deterministic child IDs, preview/final identity stability, anchor injection, and same-anchor concurrent bundle separation.
- Created COZODB-004 to tighten the local Cozo SEM projection contract and make the renderer/projector hydration-ready without introducing external geppetto or pinocchio work.
- Imported `/tmp/cozodb-streaming-improvements.md` into the ticket as a tracked local source and verified the current `docmgr import file` syntax uses `--file`, not `--tmp`.
- Cross-checked the imported proposal against the current backend request path, structured event path, and frontend SEM projection/rendering path.
- Wrote a detailed intern-facing design and implementation guide plus a granular task plan scoped to this repository.
- Validated the workspace with `docmgr doctor --ticket COZODB-004 --stale-after 30` and uploaded the bundle to `/ai/2026/03/15/COZODB-004`, verified by `remarquee cloud ls`.

## 2026-03-15

Created COZODB-004, imported the SEM streaming proposal, verified it against the current backend/frontend contract, and wrote the local-only refactor guide plus granular task plan.

### Related Files

- /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/websocket.go — Dropped anchorLine and current event plumbing
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/sem/semProjection.js — Current projector behavior that motivated the ticket
