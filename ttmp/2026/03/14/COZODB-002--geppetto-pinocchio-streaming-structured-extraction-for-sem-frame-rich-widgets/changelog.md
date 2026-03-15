# Changelog

## 2026-03-15

- Implemented semantic thread UX refinements in commit `3fd038b` (`frontend(sem): fold and trim semantic threads`).
- Trimmed trailing streaming/final display whitespace, grouped semantic hint follow-ups into foldable thread render units, added dismiss controls in the pad shell, and expanded projection plus renderer tests.
- Validated the refinement slice with `npm test`, `npm run lint`, and `npm run build`.
- Implemented the frontend SEM migration slice in commits `77bcd3a` (`frontend(sem): render cozo extraction widgets`) and `fb16ae0` (`frontend(testing): cover cozo projection families`).
- Added the frontend semantic projection handlers, canonical Cozo entity projection, inline/trailing selectors, the new Cozo widget renderer stack, and the initial widget tests plus expanded projection tests.
- Validated the frontend slice with `npm test`, `npm run lint`, and `npm run build`.
- Implemented the structured extraction backend slice for COZODB-002 in commit `9ef88f6` (`backend(sem): add structured extraction event pipeline`).
- Added Cozo YAML payload schemas, preview extractors, authoritative final parsing, pinocchio SEM handler registration, a websocket SEM sink, prompt/config updates, and backend tests covering extraction and translation.
- Validated the backend slice with `env GOTOOLCHAIN=auto go mod tidy` and `env GOTOOLCHAIN=auto go test ./...`.
- Implemented the first backend migration slice for COZODB-002 in commit `9af6a58` (`backend(hints): switch streaming inference to geppetto`).
- Replaced the direct Anthropic SDK hint path with a geppetto session plus event-sink bridge, preserved the existing websocket delta/result contract, and made websocket-driven inference cancel with the connection context.
- Updated `backend/go.mod` for the geppetto toolchain requirements and validated the backend with `env GOTOOLCHAIN=auto go mod tidy` and `env GOTOOLCHAIN=auto go test ./...`.
- Updated the COZODB-002 design doc and task list after COZODB-003 landed.
- Added a detailed UI section describing the current decomposed frontend seams, the target SEM widget architecture, the concrete file plan, and granular frontend migration tasks aligned with the actual codebase.

## 2026-03-14

- Initial workspace created
- Added a primary design doc with an independent review of the current `cozodb-editor` streaming stack, concrete review findings, and a phased implementation guide for geppetto, pinocchio, and Cozo-specific SEM widget families.
- Added an investigation diary and updated ticket bookkeeping to reflect the validated evidence set and remaining implementation tasks.
- Validated the ticket cleanly with `docmgr doctor --ticket COZODB-002 --stale-after 30`, dry-ran the bundle upload, uploaded the final PDF to reMarkable at `/ai/2026/03/14/COZODB-002`, and verified the remote listing.

## 2026-03-14

Independently re-validated the local code and reference repos, replaced the stub with a primary design doc, and recorded the investigation diary for the geppetto/pinocchio/SEM migration.

### Related Files

- /home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/14/COZODB-002--geppetto-pinocchio-streaming-structured-extraction-for-sem-frame-rich-widgets/design-doc/01-independent-review-and-implementation-guide-for-geppetto-pinocchio-and-sem-extraction-widgets.md — Primary deliverable
- /home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/14/COZODB-002--geppetto-pinocchio-streaming-structured-extraction-for-sem-frame-rich-widgets/reference/01-investigation-diary.md — Chronological investigation record
