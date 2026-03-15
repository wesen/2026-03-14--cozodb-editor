# Tasks

## Done

- [x] Add tasks here
- [x] Independently validate current cozodb-editor inference and websocket code against actual repository state
- [x] Independently validate geppetto, pinocchio, and temporal-relationships reference paths against actual repository state
- [x] Write a primary design doc with review findings, migration architecture, and phased implementation plan
- [x] Create an investigation diary for COZODB-002
- [x] Add geppetto Go module dependency and align the backend toolchain in `backend/go.mod`
- [x] Replace hints.Engine with geppetto engine builder + step controller
- [x] Propagate websocket request context into hint and diagnosis inference runs
- [x] Finish pinocchio Go module dependency wiring in backend/go.mod when the SEM translation sink is introduced
- [x] Define CozoScript extraction payload types (HintPayload, DocRefPayload, QuerySuggestionPayload)
- [x] Implement extractors using ContextPayloadExtractor[T] pattern from temporal-relationships
- [x] Wire FilteringSink with CozoScript extractors in sink chain
- [x] Register SEM handlers for custom extraction events (cozo.hint/query/docref)
- [x] Implement WebSocketSEMSink using pinocchio EventTranslator
- [x] Update system prompts to emit tagged YAML blocks for structured extraction
- [x] Create extraction config YAML for cozodb-editor hint engine
- [x] Add backend tests for Cozo extractor families and SEM translation
- [x] UI 1.1: Keep `frontend/src/transport/hintsSocket.js` as the websocket seam and adapt envelope parsing only if pinocchio transport details differ
- [x] UI 1.2: Add `frontend/src/sem/registerDefaultSemHandlers.js` for `llm.start`, `llm.delta`, `llm.final`, and `llm.error`
- [x] UI 1.3: Add `frontend/src/sem/registerCozoSemHandlers.js` for `cozo.hint.*`, `cozo.query_suggestion.*`, and `cozo.doc_ref.*`
- [x] UI 1.4: Extend `frontend/src/sem/semProjection.js` to support canonical entity kinds `llm_text_stream`, `cozo_hint`, `cozo_query_suggestion`, and `cozo_doc_ref`
- [x] UI 1.5: Add selectors for anchored per-line entities versus trailing stream entities
- [x] UI 1.6: Carry anchor metadata in projected entities so widgets can render inline after the triggering editor line when available
- [x] UI 2.1: Create `frontend/src/features/cozo-sem/CozoSemRenderer.jsx`
- [x] UI 2.2: Create `frontend/src/features/cozo-sem/widgets/HintCard.jsx`
- [x] UI 2.3: Create `frontend/src/features/cozo-sem/widgets/QuerySuggestionCard.jsx`
- [x] UI 2.4: Create `frontend/src/features/cozo-sem/widgets/DocRefCard.jsx`
- [x] UI 2.5: Create Cozo widget view-model helpers under `frontend/src/features/cozo-sem/view-models/`
- [x] UI 2.6: Route query-suggestion insertion through `usePadDocument.insertCodeBelowCursor(...)`
- [x] UI 2.7: Keep `frontend/src/features/hints/HintResponseCard.jsx` as a compatibility renderer only until the new SEM widgets cover the same UX
- [x] UI 3.1: Update `frontend/src/DatalogPad.jsx` to render projected Cozo entities via `CozoSemRenderer`
- [x] UI 3.2: Preserve `PadEditor` as the editor shell and do not reintroduce raw line-array mutations inside widget components
- [x] UI 3.3: Keep `DiagnosisCard.jsx` separate from Cozo extraction widgets
- [x] UI 3.4: Remove the legacy `hint.result` render path once SEM widgets and final text flow are complete
- [x] UI 4.1: Extend `frontend/src/sem/semProjection.test.js` for preview-to-final merge behavior per Cozo family
- [x] UI 4.2: Add projection tests for canonical-id fallback and rekeying
- [x] UI 4.3: Add projection tests for anchor routing between inline and trailing widget placement
- [x] UI 4.4: Add component tests or stories for `HintCard`, `QuerySuggestionCard`, and `DocRefCard`

## TODO

- [ ] UI 4.5: Remove or replace `frontend/src/features/hints/HintResponseCard.test.jsx` when the compatibility path is retired
- [x] Upload the final COZODB-002 bundle to reMarkable and verify the remote listing
