---
Title: frontend decomposition architecture review and intern implementation guide
Ticket: COZODB-003
Status: active
Topics:
    - frontend
    - architecture
    - streaming
    - sem
    - rich-widgets
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.test.ts
      Note: Reference projection tests
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.test.ts:Reference projection tests to copy for the migration
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.ts
      Note: Reference projection architecture
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.ts:Reference lightweight projection model closer to this app
    - Path: ../../../../../../../corporate-headquarters/pinocchio/cmd/web-chat/web/src/sem/registry.ts
      Note: Reference frontend registry pattern
    - Path: ../../../../../../../corporate-headquarters/pinocchio/cmd/web-chat/web/src/sem/registry.ts:Reference browser-side SEM registry and projection pattern
    - Path: ../../../../../../../corporate-headquarters/pinocchio/pkg/doc/tutorials/05-building-standalone-webchat-ui.md:Reference architecture narrative for transport, projection, and rendering layers
    - Path: backend/pkg/api/handlers.go:Current HTTP query and schema endpoints
    - Path: backend/pkg/api/types.go
      Note: Current browser-facing API contracts
    - Path: backend/pkg/api/types.go:HTTP and WebSocket API contracts consumed by the frontend
    - Path: backend/pkg/api/websocket.go:Current websocket event surface the frontend consumes
    - Path: frontend/package.json
      Note: Tooling and missing test stack
    - Path: frontend/package.json:Current frontend tooling and missing test stack
    - Path: frontend/src/App.jsx
      Note: Current shell boundary
    - Path: frontend/src/App.jsx:App shell currently just delegates to DatalogPad
    - Path: frontend/src/DatalogPad.jsx
      Note: Main evidence source for the decomposition plan
    - Path: frontend/src/DatalogPad.jsx:Current 1039-line frontend monolith and main decomposition target
    - Path: frontend/src/index.css:Only global CSS reset currently present
    - Path: frontend/src/main.jsx
      Note: Frontend boot path
    - Path: frontend/src/main.jsx:Frontend boot entrypoint
    - Path: frontend/vite.config.js
      Note: Dev proxy and runtime boundary
    - Path: frontend/vite.config.js:Vite dev server and backend proxy boundary
ExternalSources: []
Summary: Detailed frontend-focused review and implementation guide for decomposing the current DatalogPad monolith into transport, projection, editor, widget, and theme modules so later geppetto/pinocchio/SEM migration work can proceed with lower risk.
LastUpdated: 2026-03-15T00:33:32.689843597-04:00
WhatFor: Prepare the JSX side of cozodb-editor for the streaming and SEM migration by documenting the current architecture, the main modularization problems, and a phased decomposition plan suitable for a new intern.
WhenToUse: Use this guide before changing the frontend for geppetto, pinocchio, SEM projection, or rich widget work.
---


# frontend decomposition architecture review and intern implementation guide

## Executive Summary

The current frontend is extremely small in file count and extremely dense in responsibility. The application boot path is only two tiny wrapper files, but nearly the entire runtime lives inside one 1039-line component, [DatalogPad.jsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx). That component currently owns transport, editor state, AI streaming state, response rendering, query execution, diagnosis flow, onboarding, and almost all visual styling. This is the main architectural bottleneck for the upcoming geppetto plus pinocchio plus SEM migration.

This ticket does not recommend a full rewrite before feature work. It recommends a staged decomposition that creates clean module boundaries first, while preserving the current user-visible behavior. The main idea is:

1. extract transport first,
2. extract projection/state shaping second,
3. extract renderers and feature components third,
4. leave the editor shell as a smaller orchestration component.

Current maturity snapshot:

- Boot layer is trivial and easy to preserve.
- Backend transport contracts are narrow and understandable.
- Frontend state layering is weak and informal.
- Styling is almost entirely inline and attached to runtime logic.
- Test coverage is absent in the current frontend package.

Highest-risk issues:

- Transport and JSX are coupled too tightly.
- Streaming state is stored in UI-oriented shapes instead of domain-oriented shapes.
- There is no projection layer between incoming events and rendered UI.
- Feature rendering is mixed with editor interaction logic.

Highest-leverage cleanup actions:

- create a websocket client module,
- introduce a projection module for streaming and future SEM entities,
- split AI/render blocks into feature components,
- define a target folder layout before the migration starts,
- add a minimal test stack around projection behavior.

## Problem Statement

COZODB-002 established that the backend migration to geppetto, pinocchio, and YAML structured extraction will introduce a more sophisticated event model. The current JSX architecture is not prepared for that change.

Right now:

- [main.jsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/main.jsx) only mounts the app.
- [App.jsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/App.jsx) only returns `<DatalogPad />`.
- Almost everything else happens inside [DatalogPad.jsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx).

That makes the next migration hard for three reasons:

1. there is no place to attach a real event pipeline,
2. there is no stable internal data model between transport and presentation,
3. there is no module structure for future rich widgets.

This document answers five questions for a new intern:

1. What does the current frontend do?
2. Which parts of it are currently entangled?
3. What target module boundaries should exist before SEM migration?
4. In what order should the frontend be decomposed?
5. Which tests and review checks should prove the split is correct?

Non-goals:

- converting the frontend to TypeScript in the same change,
- replacing the visual design system from scratch,
- implementing the full SEM migration in this ticket,
- building the final rich widgets in this ticket.

This ticket is specifically about preparation and decomposition.

## Current State of Affairs

### 1. Repo topology and runtime boundaries

The frontend package is intentionally small:

```text
frontend/
  package.json
  vite.config.js
  src/
    main.jsx
    App.jsx
    DatalogPad.jsx
    index.css
```

Counts from the current repo:

- `frontend/src/App.jsx`: 7 lines
- `frontend/src/main.jsx`: 10 lines
- `frontend/src/DatalogPad.jsx`: 1039 lines
- `frontend/src/index.css`: 10 lines

That distribution matters because it means the app is not "spread across many messy files". It is concentrated in one giant runtime file. Decomposition therefore does not require a sweeping search across a deep tree. It requires pulling coherent responsibilities out of one file without breaking behavior.

### 2. Boot flow

Current boot flow:

```text
index.html
  -> src/main.jsx
      -> src/App.jsx
          -> src/DatalogPad.jsx
```

Evidence:

- [main.jsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/main.jsx) creates the React root and mounts `App`.
- [App.jsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/App.jsx) is only a pass-through wrapper for `DatalogPad`.

This is good news. The shell layer is not the problem. You can preserve this boot shape and still radically improve maintainability underneath it.

### 3. Tooling and test baseline

[package.json](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/package.json) shows:

- React 19
- Vite 8
- ESLint
- no test runner
- no React Testing Library
- no state library
- no protobuf packages

[vite.config.js](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/vite.config.js) proxies:

- `/api` -> `http://localhost:8090`
- `/ws` -> `ws://localhost:8090`

This tells us the frontend currently depends on:

1. HTTP requests for query execution,
2. websocket events for hints and diagnosis,
3. same-origin app mounting with Vite proxy in development.

### 4. Backend surface the frontend currently uses

The relevant backend contracts live in [types.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/types.go), [handlers.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/handlers.go), and [websocket.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/websocket.go).

Current HTTP request:

```json
POST /api/query
{
  "script": "...",
  "params": {}
}
```

Current HTTP response:

```json
{
  "ok": true,
  "headers": ["name", "age"],
  "rows": [["alice", 30]],
  "took": 0.003
}
```

Current websocket envelope:

```json
{
  "sem": true,
  "event": {
    "type": "llm.delta",
    "id": "hint-1",
    "data": "partial text"
  }
}
```

The backend currently emits a small set of event types:

- `hint.request`
- `diagnosis.request`
- `llm.start`
- `llm.delta`
- `llm.error`
- `hint.result`

This matters because the current frontend state model is built around exactly those events. A future SEM migration will widen that event family considerably, so a transport split should happen before the event model gets more complex.

### 5. What `DatalogPad.jsx` currently owns

`DatalogPad.jsx` currently owns at least nine distinct subsystems:

1. static AI fallback data (`MOCK_RESPONSES`, `matchResponse`)
2. websocket transport (`useWebSocket`)
3. HTTP query transport (`executeQuery`)
4. UI text formatting helpers (`formatText`)
5. small feature components (`DocPreview`, `StreamingText`, `AIBlock`, `ErrorBlock`)
6. editor document state (`lines`, `cursorLine`, editing handlers)
7. AI state (`aiBlocks`, `streamingBlocks`, `collapsedBlocks`)
8. query-result and diagnosis state (`runResult`, `errorBlock`, `diagnosing`)
9. theming and all major layout styles (inline styles plus CSS custom properties in render)

This is the core architecture problem. Even if each piece is individually understandable, the file has become the only integration point for all runtime concerns.

### 6. Current event and rendering flow

Today the browser flow is effectively:

```text
User input
  -> line parser
  -> send websocket hint request OR HTTP query request

Incoming websocket event
  -> JSON.parse in ws.onmessage
  -> string switch by event.type
  -> mutate component-local React state
  -> render blocks directly from component state
```

In code:

- `useWebSocket()` parses envelopes and dispatches by `handlersRef.current[msg.event.type]` in [DatalogPad.jsx:94-101](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx#L94).
- The main component registers handlers for `llm.start`, `llm.delta`, `hint.result`, and `llm.error` in [DatalogPad.jsx:483-539](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx#L483).
- Query execution uses `executeQuery()` and writes results directly into `runResult` in [DatalogPad.jsx:615-643](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx#L615).
- Rendering happens immediately from component state in [DatalogPad.jsx:689-1039](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx#L689).

### 7. Current styling model

The only actual CSS file used for layout setup is [index.css](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/index.css), which contains only a reset and root sizing.

All meaningful styling is inline inside `DatalogPad.jsx`, including:

- layout,
- tokens,
- colors,
- typography,
- card look,
- status bar,
- buttons,
- onboarding,
- result tables.

This means styling is currently not a separate concern. It is attached to JSX and state flow. That is manageable in a prototype, but it makes future widget extraction noisier because every moved component drags a large inline style object with it.

## Subsystem Reviews

### Subsystem A: Boot and app shell

#### Current design and flow

`main.jsx` mounts `App`, and `App` returns `DatalogPad`.

#### Findings

- The boot layer is not overengineered.
- `App.jsx` is so small that it is currently not adding value.
- There is no shared app-shell module or provider layer, but there is also no pressure for one yet.

#### Why it matters

This is the safest place to preserve behavior. You do not need to invent Redux, routing, or a new shell before the decomposition.

#### Improvement proposal

Keep the existing top-level flow, but repurpose `App.jsx` into a small composition root once new modules exist:

```text
App.jsx
  -> app theme shell
  -> transport provider / hooks bootstrap
  -> DatalogPadScreen
```

#### Migration plan

- Do nothing here in phase 1 except rename responsibilities conceptually.
- Only expand `App.jsx` once the inner modules exist.

### Subsystem B: Transport and backend boundary

#### Current design and flow

`useWebSocket()` and `executeQuery()` live in the same file as the UI. The websocket hook manages:

- socket creation,
- reconnect,
- parse,
- event dispatch,
- send.

#### Findings

- The websocket API is embedded in a UI file instead of a transport file.
- `handlersRef` stores only one handler per event type in [DatalogPad.jsx:124-129](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx#L124), which prevents multiple independent subscribers.
- Message parsing swallows errors silently in [DatalogPad.jsx:94-101](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx#L94).
- `WS_URL` hardcodes `ws://` in [DatalogPad.jsx:5](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx#L5), which will be wrong behind HTTPS.

#### Why it matters

The future SEM migration needs:

- richer event families,
- potentially multiple consumers,
- testable parsing and routing,
- a transport layer that can evolve independently from JSX.

#### Improvement proposal

Create a dedicated transport module tree:

```text
frontend/src/transport/
  httpClient.js
  hintsSocket.js
  semEnvelope.js
```

Suggested APIs:

```js
// transport/httpClient.js
export async function executeQuery(script, params = {}) {}
export async function fetchSchema() {}

// transport/hintsSocket.js
export function createHintsSocketClient({ url, onStatus }) {
  return {
    connect() {},
    disconnect() {},
    send(type, data) {},
    subscribe(type, fn) {},
    subscribeAll(fn) {},
  };
}
```

Pseudocode:

```text
client.connect():
  open socket
  onopen -> set connected
  onclose -> notify disconnected, maybe reconnect
  onmessage:
    envelope = parseSemEnvelope(raw)
    if invalid -> report parse error
    notify wildcard subscribers
    notify typed subscribers
```

#### Migration plan

1. Move `executeQuery()` out first. It is the least risky.
2. Move websocket code into a client module second.
3. Preserve the existing `send/on/off` API initially so the UI behavior stays unchanged.
4. Then improve the subscriber model to support multiple handlers.

### Subsystem C: Editor/document model

#### Current design and flow

The editor uses:

- `lines` as an array of strings,
- `cursorLine` as the active row,
- one `<input>` for the active line and static `<div>` for other lines.

Core handlers:

- `handleKeyDown`
- `handleLineChange`
- `handleLineClick`
- `handleInsert`

#### Findings

- The document model is simple enough for the current product.
- Editor state is mixed with AI orchestration and rendering concerns.
- `handleKeyDown` both edits document structure and launches AI hint requests in [DatalogPad.jsx:555-573](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx#L555).
- `handleInsert` is used by AI suggestion actions and therefore ties editor state to widget behavior in [DatalogPad.jsx:596-604](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx#L596).

#### Why it matters

As soon as widgets become more structured, editor operations need to look like commands, not like callbacks passed through arbitrary components.

#### Improvement proposal

Create an editor-domain hook:

```text
frontend/src/editor/
  usePadDocument.js
  PadEditor.jsx
  editorCommands.js
```

Suggested responsibilities:

- `usePadDocument.js`: owns `lines`, `cursorLine`, selection-like behavior
- `editorCommands.js`: `insertLines`, `appendQuestion`, `replaceSelection`-style operations
- `PadEditor.jsx`: renders line UI only

Pseudocode:

```js
export function usePadDocument(initialLines = [""]) {
  const [lines, setLines] = useState(initialLines);
  const [cursorLine, setCursorLine] = useState(0);

  function insertLines(at, inserted) { ... }
  function updateLine(index, value) { ... }
  function appendBlankAfter(index) { ... }

  return {
    lines,
    cursorLine,
    setCursorLine,
    insertLines,
    updateLine,
    appendBlankAfter,
  };
}
```

#### Migration plan

- Extract editor state and handlers before splitting widgets.
- Keep the visual line renderer close to current behavior in the first pass.

### Subsystem D: AI streaming and future SEM projection

#### Current design and flow

The current frontend stores:

- `streamingBlocks`: raw string text by request id
- `aiBlocks`: completed responses by id
- `collapsedBlocks`: UI collapse state

It treats transport payloads as render-ready state.

#### Findings

- This is the most important seam to fix before SEM migration.
- There is no intermediate projection state.
- The current code assumes completed hint responses are monolithic `HintResponse` objects.
- Streaming and final states are split across different maps with no canonical merge policy.

#### Why it matters

Pinocchio and `temporal-relationships` both follow the rule:

```text
raw event envelope
  -> projection / normalization
  -> entity state
  -> renderer
```

The pinocchio tutorial explicitly says JSX should not depend on raw websocket payloads directly, and `temporal-relationships/ui/src/ws/semProjection.ts` proves a lighter-weight version of that pattern in practice.

#### Improvement proposal

Create a projection module even before the real SEM migration. In phase 1 it can still project the current local event types:

```text
frontend/src/sem/
  semProjection.js
  semEventTypes.js
  registerDefaultSemHandlers.js
```

Phase-1 projected entities:

- `message` for `llm.delta` / `llm.final`
- `hint_response` for current `hint.result`
- later `cozo_hint`, `cozo_query_suggestion`, `cozo_doc_ref`

Pseudocode:

```js
export function createProjectionState() {
  return { byId: {}, order: [] };
}

export function applyEnvelope(state, envelope) {
  switch (envelope.event.type) {
    case "llm.delta":
      return upsert(state, envelope.event.id, {
        kind: "message",
        props: { content: cumulativeText, streaming: true },
      });
    case "llm.error":
      return upsert(state, envelope.event.id, {
        kind: "message_error",
        props: { error: envelope.event.data },
      });
    case "hint.result":
      return upsert(state, envelope.event.id, {
        kind: "hint_response",
        props: normalizeHintResponse(envelope.event.data),
      });
  }
}
```

#### Why copy the temporal projection tests

`semProjection.test.ts` in `temporal-relationships` shows the exact kind of tests this app will need:

- merging repeated delta events,
- merging preview and final entities,
- canonical id upgrades,
- hydration merge behavior.

Even if this frontend does not start with full timeline hydration, those test cases are the right mental model.

#### Migration plan

1. Introduce a local projection layer using the current event family.
2. Change the UI to render projected entities rather than `streamingBlocks` and `aiBlocks`.
3. After that, expanding to pinocchio SEM is much safer because the UI already expects projected entities.

### Subsystem E: Presentation and feature components

#### Current design and flow

`DocPreview`, `StreamingText`, `AIBlock`, and `ErrorBlock` are declared in the same file as the main screen.

#### Findings

- The extracted components are not bad; they are simply in the wrong place.
- They depend on callbacks and state assumptions defined by the parent monolith.
- Inline styling makes them harder to move without large diffs.

#### Why it matters

Future widget work will want multiple independent renderers:

- current hint cards,
- query suggestion cards,
- doc reference cards,
- error/diagnosis cards,
- result tables.

If those remain inline declarations inside the editor screen, the migration will become a merge-conflict generator.

#### Improvement proposal

Create feature folders:

```text
frontend/src/features/
  hints/
    HintResponseCard.jsx
    StreamingMessageCard.jsx
    DocPreviewChip.jsx
    hintViewModels.js
  diagnosis/
    DiagnosisCard.jsx
  query-results/
    QueryResultsTable.jsx
```

Suggested rule:

- Feature components receive normalized props.
- They do not know about raw websocket envelopes.
- They do not call transport directly.

#### Migration plan

- Extract rendering components after transport and projection.
- Keep the current visual look first; change architecture before changing design.

### Subsystem F: Styling and design tokens

#### Current design and flow

The component defines a large set of CSS variables at the root of the rendered tree and then uses inline styles everywhere.

#### Findings

- CSS variables are already being used, which is good.
- The variables are local to one component render instead of a reusable theme file.
- Inline styles are doing too much work: layout, variant logic, and token declaration are all mixed together.

#### Why it matters

The upcoming widget work will multiply the number of cards and rendering branches. Without a clearer theme boundary, each extracted component will either:

- duplicate style objects,
- re-import large prop-driven style literals,
- or immediately trigger a visual rewrite.

#### Improvement proposal

Create:

```text
frontend/src/theme/
  tokens.css
  layout.css
  cards.css
```

Recommended rule:

- Keep design tokens in CSS custom properties.
- Move stable card/table/layout styles into CSS classes.
- Leave only true one-off dynamic style decisions inline.

#### Migration plan

- Do not attempt a full CSS redesign first.
- Extract tokens and the most repeated card/table rules while moving components.

### Subsystem G: Testability

#### Current design and flow

There is no frontend test stack in the package.

#### Findings

- Today, most behavior can only be verified manually in the browser.
- This is particularly risky for the upcoming projection and widget work.

#### Why it matters

Once the frontend is decomposed, the most valuable tests will be:

1. pure projection tests,
2. small rendering tests,
3. maybe one smoke test for the screen composition.

#### Improvement proposal

Add a light test stack:

- Vitest
- Testing Library for React only if component tests are added

Prioritize pure projection tests first because they offer the best signal for the least setup cost.

## Proposed Solution

### Architectural goal

Prepare the frontend for the SEM migration by introducing stable seams between:

1. transport,
2. projection/state shaping,
3. editor-domain state,
4. feature rendering,
5. styling/theme.

### Target module map

Recommended target tree for the current JS codebase:

```text
frontend/src/
  main.jsx
  App.jsx

  app/
    DatalogPadScreen.jsx

  editor/
    PadEditor.jsx
    usePadDocument.js
    editorCommands.js

  transport/
    httpClient.js
    hintsSocket.js
    semEnvelope.js

  sem/
    semProjection.js
    semEventTypes.js
    registerDefaultSemHandlers.js

  features/
    hints/
      HintResponseCard.jsx
      StreamingMessageCard.jsx
      DocPreviewChip.jsx
      hintViewModels.js
    diagnosis/
      DiagnosisCard.jsx
    query-results/
      QueryResultsTable.jsx

  theme/
    tokens.css
    cards.css
    layout.css
```

### Why JS first and not TypeScript first

The codebase is currently all JS/JSX. Converting file-by-file to TSX during the same decomposition would widen the change for little architectural gain.

Recommended rule:

- split modules in JS/JSX first,
- add projection tests,
- migrate to TS/TSX later if still desired.

### Target runtime diagram

```text
User action
  -> editor commands
  -> transport request

Incoming event
  -> transport client
  -> projection function
  -> projected entity state
  -> feature renderer

Screen shell
  -> composes editor + entity renderers + results + status
```

### Desired responsibilities by layer

#### Transport layer

- knows URLs
- parses envelopes
- handles reconnect
- exposes subscription/send APIs

#### Projection layer

- translates envelopes into renderable entity state
- merges repeated updates
- hides transport quirks from components

#### Editor layer

- owns line array and cursor
- provides editing commands
- does not know websocket details

#### Feature layer

- renders cards/tables/widgets from normalized props
- triggers abstract actions like `onInsertCode` or `onRunSuggestion`

#### Theme layer

- owns tokens and reusable presentation rules

## Design Decisions

### Decision 1: Split by responsibility, not by screen region

Reason:

If you split by visible areas first, transport and projection logic will still leak across files. Responsibility-based modules are more stable than presentational regions.

### Decision 2: Add a projection layer before real SEM integration

Reason:

This is the single most useful preparation step. It lets the UI stop depending on raw envelopes before the event model gets more complicated.

### Decision 3: Preserve the current UX while decomposing

Reason:

The goal of this ticket is not to redesign the product. It is to lower risk for follow-on migrations.

### Decision 4: Keep `App.jsx` thin

Reason:

There is no evidence yet that the app needs a large provider or router shell. Avoid adding abstractions earlier than necessary.

### Decision 5: Move styles gradually, not all at once

Reason:

Large style migrations often hide runtime regressions. Extract the tokens and repeated component styles that naturally follow the component split.

## Alternatives Considered

### Alternative A: Integrate SEM directly into the current `DatalogPad.jsx`

Rejected because:

- it would place a more advanced event model into the least modular file,
- it would make later cleanup harder, not easier,
- it would blend transport, projection, and presentation into an even larger monolith.

### Alternative B: Full rewrite into a brand-new frontend architecture first

Rejected because:

- the app is still small enough that targeted extraction is cheaper,
- a rewrite would reset too much working behavior,
- it would delay the actual SEM feature work.

### Alternative C: Convert to TypeScript before splitting

Rejected because:

- type migration would expand the diff significantly,
- the decomposition can already be validated with JS modules and tests,
- architecture risk is currently larger than type-safety risk.

## Implementation Plan

### Phase 0: Freeze boundaries and vocabulary

Goal:

- Agree on the module map and file naming before moving code.

Actions:

1. Create the new folders under `frontend/src/`.
2. Introduce placeholder files with clear ownership comments if helpful.
3. Add task/checklist notes so follow-on tickets use the same terminology.

### Phase 1: Extract HTTP and websocket transport

Goal:

- Move networking out of the component without changing behavior.

Actions:

1. Move `executeQuery()` to `transport/httpClient.js`.
2. Move `useWebSocket()` logic to `transport/hintsSocket.js` or `hooks/useHintsSocket.js`.
3. Fix URL handling so websocket protocol can derive from `window.location.protocol`.
4. Keep the current envelope shape and event names unchanged.

Success criteria:

- `DatalogPadScreen` no longer contains raw `fetch` or `new WebSocket(...)`.

### Phase 2: Extract editor state and screen shell

Goal:

- Separate editing concerns from AI/query/result concerns.

Actions:

1. Move `lines`, `cursorLine`, and editing handlers into `usePadDocument.js`.
2. Move line rendering into `PadEditor.jsx`.
3. Keep insert/question behaviors exposed as editor commands.

Success criteria:

- Editor rendering can be read without scrolling through AI transport and result-table logic.

### Phase 3: Introduce projection state

Goal:

- Replace UI-local transport state with normalized entity state.

Actions:

1. Create `semProjection.js`.
2. Support current event types first:
   - `llm.start`
   - `llm.delta`
   - `llm.error`
   - `hint.result`
3. Render from projected entities rather than direct transport maps.

Success criteria:

- `streamingBlocks` and `aiBlocks` stop being the main render source.

### Phase 4: Extract feature renderers

Goal:

- Make cards, tables, and diagnosis UI independently maintainable.

Actions:

1. Move `StreamingText` to a feature component.
2. Move `AIBlock` to `HintResponseCard.jsx`.
3. Move `DocPreview` to a smaller reusable component.
4. Move `ErrorBlock` and result table into their own feature modules.

Success criteria:

- Screen shell mostly composes imported components rather than declaring them inline.

### Phase 5: Extract tokens and reusable CSS

Goal:

- Reduce inline style noise and make new widget work cheaper.

Actions:

1. Move root CSS variables into `theme/tokens.css`.
2. Move shared card/button/table layouts into CSS classes.
3. Keep only truly dynamic values inline.

Success criteria:

- Large style objects disappear from the screen shell and feature components.

### Phase 6: Add tests that protect the new seams

Goal:

- Ensure the decomposition creates durable architecture, not just more files.

Actions:

1. Add Vitest.
2. Add `semProjection.test.js` with cases modeled on the temporal reference:
   - merges delta updates,
   - merges preview/final style updates,
   - preserves canonical ids,
   - avoids bad alias merges.
3. Add at least one rendering test for `HintResponseCard`.

Success criteria:

- Projection changes can be validated without opening the browser.

## Intern-Oriented Walkthrough

### If you are new to this codebase, read in this order

1. [frontend/src/main.jsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/main.jsx)
2. [frontend/src/App.jsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/App.jsx)
3. [frontend/src/DatalogPad.jsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx)
4. [backend/pkg/api/types.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/types.go)
5. [backend/pkg/api/websocket.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/websocket.go)
6. [pinocchio sem registry reference](/home/manuel/code/wesen/corporate-headquarters/pinocchio/cmd/web-chat/web/src/sem/registry.ts)
7. [temporal projection reference](/home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.ts)

### How to think about the current app

Think of the current app as one screen with three mini-products hidden inside it:

1. a line-based Cozo editor,
2. an AI hint/diagnosis client,
3. a query runner and result viewer.

The monolith exists because all three were prototyped in one file. Your job in decomposition work is not to invent new behavior. Your job is to separate those mini-products so each can evolve safely.

### What not to do

- Do not introduce a global state library just because the file is large.
- Do not change transport protocol and rendering architecture in one giant commit.
- Do not mix a TS migration into the same first decomposition PR.
- Do not redesign the visuals while moving code.

### What a good first PR looks like

Example:

```text
PR 1:
  - add transport/httpClient.js
  - add transport/hintsSocket.js
  - update DatalogPad to import those modules
  - no visual behavior change
```

That is a good decomposition PR because the risk is narrow and reviewable.

## Performance and State Management Notes

- Current render frequency is manageable only because the app is small.
- Streaming text updates trigger state updates in the main screen on every delta.
- That pattern will become more expensive once richer widget entities are added.
- A projection layer can centralize update rules and make renderer invalidation easier to reason about.

You do not need Redux yet. You do need a pure state-shaping layer.

## CSS and Design System Notes

- The current CSS reset is minimal and harmless.
- CSS custom properties already exist informally inside `DatalogPad.jsx`.
- Those tokens should be promoted to shared CSS, not replaced.
- Feature cards should move toward reusable class-based styling, with tokens preserved.

## Granular Task Breakdown

This section mirrors and explains the task list in `tasks.md`.

### Stream 1: discovery and scaffolding

1. Create `frontend/src/app`, `editor`, `transport`, `sem`, `features`, and `theme`.
2. Decide whether transport hooks live under `transport/` or `hooks/`.
3. Document ownership comments at the top of each new module.

### Stream 2: transport extraction

1. Move HTTP query logic into `transport/httpClient.js`.
2. Add helper for websocket URL derivation from browser protocol.
3. Move websocket connection/reconnect logic into a dedicated module.
4. Support multiple listeners per event type.
5. Add wildcard subscription for debugging if useful.

### Stream 3: editor extraction

1. Create `usePadDocument.js`.
2. Move line insertion logic there.
3. Move cursor handling there.
4. Create `PadEditor.jsx`.
5. Keep existing `#??` behavior wired through callbacks.

### Stream 4: projection

1. Define event constants.
2. Create projection state shape.
3. Add handlers for `llm.start`.
4. Add handlers for `llm.delta`.
5. Add handlers for `llm.error`.
6. Add handlers for `hint.result`.
7. Switch rendering to projection-backed entities.

### Stream 5: feature components

1. Move `StreamingText` into `features/hints/StreamingMessageCard.jsx`.
2. Move `AIBlock` into `features/hints/HintResponseCard.jsx`.
3. Move `DocPreview` into `features/hints/DocPreviewChip.jsx`.
4. Move `ErrorBlock` into `features/diagnosis/DiagnosisCard.jsx`.
5. Move result table into `features/query-results/QueryResultsTable.jsx`.

### Stream 6: styling

1. Create `theme/tokens.css`.
2. Move root tokens from screen shell into that file.
3. Create shared card styles.
4. Create shared table styles.
5. Convert obvious repeated button/card style objects into classes.

### Stream 7: tests

1. Add Vitest config.
2. Add projection unit tests.
3. Add renderer smoke tests.
4. Add one screen composition smoke test if useful.

## Open Questions

1. Should the first decomposition introduce a minimal reducer store, or stay with composed hooks only?
2. Should the future SEM projection layer live in plain JS or be the first TypeScript boundary?
3. Does the team want to preserve inline token declaration at the screen root, or move entirely to CSS files?

## References

1. [main.jsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/main.jsx)
2. [App.jsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/App.jsx)
3. [DatalogPad.jsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx)
4. [index.css](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/index.css)
5. [package.json](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/package.json)
6. [vite.config.js](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/vite.config.js)
7. [backend API types](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/types.go)
8. [backend handlers](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/handlers.go)
9. [backend websocket handler](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/websocket.go)
10. [pinocchio standalone webchat guide](/home/manuel/code/wesen/corporate-headquarters/pinocchio/pkg/doc/tutorials/05-building-standalone-webchat-ui.md)
11. [pinocchio browser-side SEM registry](/home/manuel/code/wesen/corporate-headquarters/pinocchio/cmd/web-chat/web/src/sem/registry.ts)
12. [temporal semProjection](/home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.ts)
13. [temporal semProjection tests](/home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.test.ts)

## Proposed Solution

<!-- Describe the proposed solution in detail -->

## Design Decisions

<!-- Document key design decisions and rationale -->

## Alternatives Considered

<!-- List alternative approaches that were considered and why they were rejected -->

## Implementation Plan

<!-- Outline the steps to implement this design -->

## Open Questions

<!-- List any unresolved questions or concerns -->

## References

<!-- Link to related documents, RFCs, or external resources -->
