# Tasks

## Done

- [x] Create COZODB-003 ticket workspace
- [x] Read the current frontend entrypoints and backend browser-facing contracts
- [x] Review reference frontend architecture patterns from pinocchio and temporal-relationships
- [x] Write a detailed intern-facing architecture review and decomposition guide
- [x] Create an investigation diary

## TODO

- [x] Phase 0.1: Create target folders under `frontend/src/` for `app`, `editor`, `transport`, `sem`, `features`, and `theme`
- [x] Phase 0.2: Add placeholder modules or README comments describing ownership of each new folder
- [x] Phase 0.3: Decide whether websocket hooks live under `transport/` or `hooks/` and document the rule

- [x] Phase 1.1: Move `executeQuery()` out of `DatalogPad.jsx` into `transport/httpClient.js`
- [x] Phase 1.2: Add `fetchSchema()` or equivalent helper to the HTTP client module if schema fetches are needed soon
- [x] Phase 1.3: Move websocket connect/reconnect logic out of `DatalogPad.jsx` into a dedicated socket client module
- [x] Phase 1.4: Replace the single-handler-per-event map with multi-subscriber support
- [x] Phase 1.5: Derive websocket protocol from `window.location.protocol` instead of hardcoding `ws://`
- [x] Phase 1.6: Add explicit parse-failure handling for malformed websocket payloads

- [ ] Phase 2.1: Create `editor/usePadDocument.js`
- [ ] Phase 2.2: Move `lines` state into `usePadDocument.js`
- [ ] Phase 2.3: Move `cursorLine` state into `usePadDocument.js`
- [ ] Phase 2.4: Move line update, insert, and append-blank commands into editor-domain helpers
- [ ] Phase 2.5: Create `editor/PadEditor.jsx`
- [ ] Phase 2.6: Move line rendering and active-line input handling into `PadEditor.jsx`
- [ ] Phase 2.7: Keep `#??` question-trigger behavior working through callbacks exposed by the editor layer

- [ ] Phase 3.1: Create `sem/semEventTypes.js`
- [ ] Phase 3.2: Create `sem/semProjection.js`
- [ ] Phase 3.3: Add projection support for `llm.start`
- [ ] Phase 3.4: Add projection support for `llm.delta`
- [ ] Phase 3.5: Add projection support for `llm.error`
- [ ] Phase 3.6: Add projection support for `hint.result`
- [ ] Phase 3.7: Replace `streamingBlocks` as the primary render source with projected entities
- [ ] Phase 3.8: Replace `aiBlocks` as the primary render source with projected entities

- [ ] Phase 4.1: Create `features/hints/StreamingMessageCard.jsx`
- [ ] Phase 4.2: Create `features/hints/HintResponseCard.jsx`
- [ ] Phase 4.3: Create `features/hints/DocPreviewChip.jsx`
- [ ] Phase 4.4: Create `features/diagnosis/DiagnosisCard.jsx`
- [ ] Phase 4.5: Create `features/query-results/QueryResultsTable.jsx`
- [ ] Phase 4.6: Move the corresponding JSX and callbacks out of `DatalogPad.jsx`
- [ ] Phase 4.7: Introduce normalized view-model helpers where feature props are repetitive or transport-shaped

- [ ] Phase 5.1: Create `theme/tokens.css`
- [ ] Phase 5.2: Move root CSS variables from `DatalogPad.jsx` into `theme/tokens.css`
- [ ] Phase 5.3: Create reusable card styles in `theme/cards.css`
- [ ] Phase 5.4: Create reusable table or layout styles in `theme/layout.css`
- [ ] Phase 5.5: Replace repeated inline button/card/table styles with classes where practical

- [ ] Phase 6.1: Add Vitest to the frontend package
- [ ] Phase 6.2: Add a frontend test script to `package.json`
- [ ] Phase 6.3: Create `sem/semProjection.test.js`
- [ ] Phase 6.4: Add tests for coalescing repeated `llm.delta` events
- [ ] Phase 6.5: Add tests for preserving canonical ids across updates
- [ ] Phase 6.6: Add tests for future preview/final-style merging rules
- [ ] Phase 6.7: Add at least one smoke test for `HintResponseCard`

- [ ] Phase 7.1: Shrink `DatalogPad.jsx` into a smaller orchestration screen
- [ ] Phase 7.2: Decide whether `App.jsx` should remain trivial or become a slightly richer composition root
- [ ] Phase 7.3: Re-run lint and manual smoke checks after each extraction phase
- [ ] Phase 7.4: Update COZODB-003 docs with implementation progress and re-upload to reMarkable when the split lands
- [x] Upload the final COZODB-003 bundle to reMarkable and verify the remote listing
