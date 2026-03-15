---
Title: Independent review and implementation guide for geppetto, pinocchio, and SEM extraction widgets
Ticket: COZODB-002
Status: active
Topics:
    - streaming
    - structured-extraction
    - geppetto
    - pinocchio
    - rich-widgets
    - ai-completion
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/config/structured-event-extraction.example.yaml:Tagged YAML output example
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/internal/extractor/gorunner/sinks.go:Reference sink chain wiring
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/internal/extractor/semtemporal/register.go
      Note: Reference app-owned extraction-to-SEM bridge
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/internal/extractor/semtemporal/register.go:SEM frame bridge and backend projection for extracted families
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/internal/extractor/structured/context_events.go:Preview/extracted/failed event contracts
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/internal/extractor/structured/context_extractors.go:Generic YAML preview extractor pattern
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.ts
      Note: Reference canonical-id frontend projection model
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.ts:Canonical-id frontend projection model
    - Path: ../../../../../../../corporate-headquarters/geppetto/pkg/events/chat-events.go:Geppetto event taxonomy and metadata model
    - Path: ../../../../../../../corporate-headquarters/geppetto/pkg/events/sink.go:Explicit warning that streaming events are UX/telemetry, not durable state
    - Path: ../../../../../../../corporate-headquarters/geppetto/pkg/events/structuredsink/filtering_sink.go
      Note: Reference sink for progressive extraction
    - Path: ../../../../../../../corporate-headquarters/geppetto/pkg/events/structuredsink/filtering_sink.go:FilteringSink contract and malformed handling
    - Path: ../../../../../../../corporate-headquarters/pinocchio/cmd/web-chat/thinkingmode/backend.go:Concrete app-owned translator and timeline registration example
    - Path: ../../../../../../../corporate-headquarters/pinocchio/cmd/web-chat/web/src/sem/registry.ts:Frontend SEM registry and timeline upsert pattern
    - Path: ../../../../../../../corporate-headquarters/pinocchio/pkg/sem/registry/registry.go:Type-safe SEM translation registry
    - Path: ../../../../../../../corporate-headquarters/pinocchio/pkg/webchat/sem_translator.go
      Note: Reference geppetto-to-SEM bridge
    - Path: ../../../../../../../corporate-headquarters/pinocchio/pkg/webchat/sem_translator.go:Default geppetto-to-SEM translation rules
    - Path: ../../../../../../../corporate-headquarters/pinocchio/pkg/webchat/timeline_registry.go:Backend timeline projection hook points
    - Path: backend/pkg/api/websocket.go
      Note: Current websocket lifecycle and ad-hoc event contract
    - Path: backend/pkg/api/websocket.go:Current ad-hoc websocket protocol and request lifecycle
    - Path: backend/pkg/hints/engine.go
      Note: Current Anthropic-only inference path that must be replaced
    - Path: backend/pkg/hints/engine.go:Current Anthropic-only inference path and JSON post-processing
    - Path: backend/pkg/hints/prompt.go
      Note: Current JSON-only prompt contract blocks tagged YAML extraction
    - Path: backend/pkg/hints/prompt.go:Current prompt contract forces pure JSON instead of tagged structured blocks
    - Path: ../2026/03/15/COZODB-003--frontend-decomposition-plan-for-sem-migration-and-widget-modularization/design-doc/01-frontend-decomposition-architecture-review-and-intern-implementation-guide.md
      Note: Follow-on frontend decomposition work that changed the implementation starting point for COZODB-002
    - Path: frontend/src/DatalogPad.jsx
      Note: Current orchestration shell after COZODB-003
    - Path: frontend/src/DatalogPad.jsx:Current 441-line orchestration shell that now composes transport, editor, SEM, and feature modules
    - Path: frontend/src/transport/hintsSocket.js:Current transport seam for websocket subscription, reconnect, and SEM-like envelopes
    - Path: frontend/src/editor/usePadDocument.js:Current editor-domain state seam
    - Path: frontend/src/sem/semProjection.js:Current lightweight projection seam to extend for Cozo SEM families
    - Path: frontend/src/features/hints/HintResponseCard.jsx:Current hint-card module to evolve or replace with Cozo SEM widgets
    - Path: frontend/src/theme/tokens.css:Current theme token extraction completed in COZODB-003
    - Path: frontend/src/sem/semProjection.test.js:Current frontend projection tests to extend during COZODB-002
ExternalSources: []
Summary: Independent review of the current cozodb-editor hint/streaming stack and a concrete implementation guide for replacing it with geppetto inference, FilteringSink-based structured extraction, pinocchio SEM frames, and frontend rich widgets derived from projected SEM entities, updated to reflect the COZODB-003 frontend decomposition.
LastUpdated: 2026-03-14T23:26:21.605230852-04:00
WhatFor: Decide how to migrate the current ad-hoc Anthropic websocket flow to the geppetto plus pinocchio streaming/event stack with YAML structured extraction and rich widgets.
WhenToUse: Use this document when implementing COZODB-002 or reviewing whether the current cozodb-editor architecture is ready for SEM-based streaming and extraction.
---


# Independent review and implementation guide for geppetto, pinocchio, and SEM extraction widgets

## Executive Summary

The current `cozodb-editor` is not ready to "just swap in" geppetto and pinocchio. The backend still treats inference as a direct Anthropic stream with a JSON-only final payload. The frontend was previously one 1039-line monolith, but COZODB-003 has now completed the decomposition precondition into transport, editor, projection, feature, theme, and test seams. That means the remaining COZODB-002 frontend work is no longer "split the JSX first". It is now "extend the new seams to real pinocchio/SEM families without regressing the editor shell". The backend/frontend architecture still blocks the three things COZODB-002 actually needs:

1. provider-independent inference and streaming,
2. progressive extraction from tagged YAML blocks during streaming, and
3. stable SEM-backed rich widgets that can survive replay and hydration.

The strongest implementation path is not to invent a new local protocol. It is to copy the reference layering already proven in `temporal-relationships`:

1. geppetto emits typed events,
2. `FilteringSink` strips tagged YAML from visible assistant text and emits typed preview events,
3. pinocchio translates those events to SEM frames and optionally projects them to timeline entities,
4. the frontend projects SEM frames into canonical entity state and renders widgets by entity kind.

Independent review verdict:

- The current backend/frontend code quality is adequate for a narrow prototype but too ad-hoc for extensible streaming widgets.
- The reference repos already contain the right abstractions and tests. Their targeted packages passed local validation during this investigation.
- The migration should be staged. Do not attempt a one-shot rewrite of inference, websocket transport, frontend state, and widget rendering at the same time.

## Problem Statement

COZODB-002 asks for a richer inference and UI pipeline:

1. use geppetto rather than a raw Anthropic SDK wrapper,
2. use pinocchio SEM events rather than local pseudo-SEM JSON,
3. extract structured data from streaming model output using tagged YAML blocks, and
4. render rich widgets for extracted SEM families in the editor UI.

The current codebase cannot do that cleanly because its main contracts are mismatched with the desired runtime:

- The prompt contract requires the assistant to emit one final JSON object, which conflicts with inline tagged block extraction.
- The websocket transport exposes only local string deltas and one final `hint.result` object.
- The frontend has no projection layer, no canonical entity ID handling, and no feature-oriented SEM registry.

Scope of this document:

1. review the existing `cozodb-editor` code quality and integration gaps,
2. analyze how geppetto, pinocchio, and `temporal-relationships` solve the same problem,
3. define a concrete architecture for Cozo-specific hint/query/doc widgets,
4. describe an implementation plan and validation strategy.

Out of scope:

1. shipping the full implementation in this turn,
2. choosing final widget visuals beyond the required entity shape and rendering slots,
3. solving unrelated backend product concerns such as auth or multi-user persistence.

## Independent Review Findings

### Finding 1: Inference lifetime is detached from websocket lifetime

Severity: high

Evidence:

- `handleHintRequest` starts a goroutine per request and then calls `h.Engine.GenerateHint(context.Background(), ...)` in that goroutine, so cancellation is disconnected from the request or socket lifecycle (`backend/pkg/api/websocket.go:67-70`, `backend/pkg/api/websocket.go:77-143`).
- `handleDiagnosisRequest` has the same issue (`backend/pkg/api/websocket.go:145-200`).

Why it matters:

- A client disconnect does not stop the LLM call.
- The architecture has no clean hook for per-stream cancellation or backpressure.
- This becomes more dangerous once streams carry richer event fanout and extraction sessions.

Required change:

- Move inference onto a request-scoped or stream-scoped context derived from websocket lifecycle.
- When migrating to geppetto, treat `EventMetadata` plus sink context as the authoritative stream boundary.

### Finding 2: The current prompt/output contract is fundamentally incompatible with inline structured extraction

Severity: high

Evidence:

- Both prompts require "valid JSON matching this schema" (`backend/pkg/hints/prompt.go:55-70`, `backend/pkg/hints/prompt.go:81-95`).
- `parseHintResponse` only understands whole-response JSON and silently falls back to plain text if parsing fails (`backend/pkg/hints/engine.go:74-85`).

Why it matters:

- Tagged YAML extraction requires the model to interleave human-readable text with hidden structured blocks.
- A strict single-JSON-object contract prevents that entirely.
- Silent JSON fallback hides prompt regressions and makes failures hard to detect in tests.

Required change:

- Replace JSON-only response contracts with normal assistant prose plus `<cozo:*:v1>` tagged YAML blocks.
- Treat extracted YAML families as the structured contract, not a monolithic JSON blob.

### Finding 3: The original frontend state model was too monolithic and too weak for SEM-driven widgets

Severity: high

Evidence:

- `frontend/src/DatalogPad.jsx` is 1039 lines long and contains websocket management, editor state, streaming state, error handling, rendering, and visual styles in one file (`wc -l frontend/src/DatalogPad.jsx`).
- `useWebSocket` stores a single handler per event type, so later registrations overwrite earlier ones (`frontend/src/DatalogPad.jsx:124-129`).
- Websocket-completed hint blocks are rendered only at the bottom of the editor rather than attached to projected entities (`frontend/src/DatalogPad.jsx:496-520`, `frontend/src/DatalogPad.jsx:936-946`).

Why it matters:

- SEM/widget work needs modular registration, not one global handler slot.
- Rich widgets need stable entity state, not raw envelope handling directly in JSX.
- Timeline replay or canonical ID merging cannot be bolted onto the current file without making it worse.

Required change:

- Introduce a dedicated SEM projection module, then render widgets from projected entities.
- Split websocket transport, projection, and widget renderers into separate files.

Update after COZODB-003:

- This finding has been addressed as a preparatory frontend change.
- The repo now has:
  - `frontend/src/transport/hintsSocket.js`
  - `frontend/src/editor/usePadDocument.js`
  - `frontend/src/editor/PadEditor.jsx`
  - `frontend/src/sem/semProjection.js`
  - `frontend/src/features/...`
  - `frontend/src/theme/...`
- `frontend/src/DatalogPad.jsx` is now the orchestration shell rather than the only runtime location.
- For COZODB-002, the frontend blocker is no longer decomposition. It is extending the new projection and feature seams from the temporary `hint.result` model to real Cozo SEM families.

### Finding 4: The current websocket protocol only imitates SEM at the envelope level

Severity: medium-high

Evidence:

- The local backend sends `{sem: true, event: {type, id, data}}` envelopes (`backend/pkg/api/websocket.go:99-142`, `backend/pkg/api/websocket.go:165-199`).
- The frontend only checks `msg.sem && msg.event` and then dispatches by string type, with no protobuf decoding, timeline upsert path, or event version handling (`frontend/src/DatalogPad.jsx:94-101`).

Why it matters:

- The current format looks like SEM but lacks the translation registry, typed payloads, and projection hooks that make pinocchio useful.
- That creates false confidence: the envelope shape is compatible, but the runtime semantics are not.

Required change:

- Use pinocchio's SEM registry and event translator instead of hand-authoring local event names.
- Promote application-specific extracted families through app-owned handlers, not through raw `hint.result`.

### Finding 5: The local repo has no automated coverage around the feature seam that is about to change the most

Severity: medium

Evidence:

- `go test ./...` in `/backend` succeeded only because every package reported `[no test files]`.
- By contrast, the reference repos have package-level tests around the relevant pieces:
  - `go test ./pkg/events/structuredsink` in `geppetto` passed,
  - `go test ./pkg/webchat ./cmd/web-chat/thinkingmode` in `pinocchio` passed,
  - `go test ./internal/extractor/structured ./internal/extractor/semtemporal ./internal/extractor/gorunner` in `temporal-relationships` passed.

Why it matters:

- COZODB-002 is largely an integration ticket.
- Without tests, regressions will be discovered only in the browser.

Required change:

- Add backend tests for extractor registration and SEM translation.
- Add frontend projection tests for Cozo payload families, modeled after `ui/src/ws/semProjection.test.ts` in `temporal-relationships`.

## Current-State Architecture

### Current local stack

Today the runtime is:

```text
React DatalogPad
  -> websocket /ws/hints
  -> string event types: llm.start, llm.delta, llm.error, hint.result
  -> final HintResponse object

Go WS handler
  -> direct Anthropic SDK stream
  -> callback(string delta)
  -> parse final JSON
```

Key local evidence:

- `Engine` is a thin Anthropic wrapper with `DeltaCallback` and manual `content_block_delta` handling (`backend/pkg/hints/engine.go:13-71`).
- `GenerateHint` and `DiagnoseError` only build prompts and parse the final full-text JSON result (`backend/pkg/hints/engine.go:87-115`).
- The websocket handler emits only four event types and never passes through a generic event sink chain (`backend/pkg/api/websocket.go:115-142`, `backend/pkg/api/websocket.go:176-200`).

### Reference stack in geppetto plus pinocchio plus temporal-relationships

The validated reference runtime is:

```text
Geppetto engine
  -> typed events with EventMetadata
  -> sink chain
  -> FilteringSink extracts tagged YAML during streaming

Pinocchio SEM bridge
  -> semregistry.RegisterByType[T]
  -> SEM frames
  -> optional timeline projection handlers

Frontend projection
  -> SEM handlers / projection state
  -> canonical entity IDs
  -> widget renderers by entity kind
```

Key evidence:

- geppetto defines a broad typed event taxonomy and per-event metadata in `chat-events.go` (`geppetto/pkg/events/chat-events.go:13-94`, `geppetto/pkg/events/chat-events.go:324-437`).
- `EventSink` explicitly warns that streaming events are for UX/telemetry, not durable state (`geppetto/pkg/events/sink.go:3-18`).
- `FilteringSink` decorates a downstream sink and converts tagged blocks into extractor session callbacks while stripping them from visible text (`geppetto/pkg/events/structuredsink/filtering_sink.go:48-85`, `geppetto/pkg/events/structuredsink/filtering_sink.go:251-466`).
- pinocchio translates geppetto events to SEM via `semregistry.Handle(e)` and default handlers for `llm.start`, `llm.delta`, `llm.final`, tools, and other families (`pinocchio/pkg/sem/registry/registry.go:10-63`, `pinocchio/pkg/webchat/sem_translator.go:138-170`, `pinocchio/pkg/webchat/sem_translator.go:268-319`).
- `temporal-relationships` wires `FilteringSink` in front of a fanout sink and keeps authoritative extracted events separate from streaming preview events (`internal/extractor/gorunner/sinks.go:27-63`).
- `ContextPayloadExtractor[T]` in `temporal-relationships` provides a reusable YAML preview extraction pattern with normalization, validation, debounce, and SHA dedupe (`internal/extractor/structured/context_extractors.go:27-113`).
- `semtemporal.Register()` bridges structured events into SEM frames and backend timeline projection (`internal/extractor/semtemporal/register.go:30-149`).
- The frontend `semProjection.ts` canonicalizes IDs and merges preview/extracted updates into one entity stream (`ui/src/ws/semProjection.ts:368-415`, `ui/src/ws/semProjection.ts:480-494`).

## Proposed Solution

### Decision summary

Use the reference stack with Cozo-specific families instead of preserving the existing JSON-only `HintResponse` contract.

That means:

1. geppetto becomes the inference/event producer,
2. `FilteringSink` performs progressive extraction from `<cozo:*:v1>` tagged YAML,
3. pinocchio SEM translation produces standard `llm.*` frames plus Cozo-specific extraction frames,
4. the frontend projects SEM envelopes into entities and renders rich widgets from those entities,
5. final persistence or authoritative interpretation happens at the end of inference, not on preview frames.

### Cozo extraction families

The existing task list already points at the right first families. I recommend exactly three initial YAML families:

1. `hint`
2. `query_suggestion`
3. `doc_ref`

Suggested tag format:

```text
<cozo:hint:v1>
hint_id: hint-users-filter
title: Filter users older than 30
summary: Add the predicate directly in the body.
severity: info
evidence: The users relation exposes name and age columns.
</cozo:hint:v1>

<cozo:query_suggestion:v1>
suggestion_id: qs-users-filter
title: Users older than 30
script: |-
  ?[name, age] := *users{name, age}, age > 30
chips:
  - sort by age descending
  - count matching users
evidence: Uses stored relation scan plus scalar predicate.
</cozo:query_suggestion:v1>

<cozo:doc_ref:v1>
doc_ref_id: doc-stored-relations
title: Stored relations
section: "§3.1"
body: Keys appear before => and values after.
evidence: Applies when creating or querying persistent relations.
</cozo:doc_ref:v1>
```

Why this shape:

- IDs allow canonical entity merges across preview and final frames.
- `script` belongs only on `query_suggestion`, not the generic hint card.
- `chips` are suggestion-specific UI affordances.
- `evidence` is useful both for auditability and for future debugging.

### Backend architecture

The Cozo backend should adopt this runtime:

```text
request / websocket message
  -> geppetto engine / step runner
  -> EventSink chain
      -> FilteringSink(
           next = fanoutSink(
             websocket SEM sink,
             logger / debug sink,
             optional authoritative collector
           ),
           extractors = Cozo extractors
         )
  -> final assistant text emitted as llm.final
  -> authoritative extraction/finalization step
```

Concrete mapping:

1. Replace `hints.Engine` with a geppetto-backed builder that emits geppetto events rather than raw Anthropic deltas.
2. Register custom extractors using the same pattern as `ContextPayloadExtractor[T]`.
3. Register custom event decoders only if you need to deserialize those custom events back from JSON; for pure in-process event flow, typed Go events are sufficient.
4. Bridge custom events to SEM with `semregistry.RegisterByType[...]` in an app-owned backend package.
5. If timeline replay is needed, register timeline handlers with `webchat.RegisterTimelineHandler(...)`.

### Cozo backend pseudocode

```go
type HintPayload struct {
    HintID   string `json:"hint_id" yaml:"hint_id"`
    Title    string `json:"title" yaml:"title"`
    Summary  string `json:"summary" yaml:"summary"`
    Severity string `json:"severity" yaml:"severity"`
    Evidence string `json:"evidence,omitempty" yaml:"evidence,omitempty"`
}

type QuerySuggestionPayload struct {
    SuggestionID string   `json:"suggestion_id" yaml:"suggestion_id"`
    Title        string   `json:"title" yaml:"title"`
    Script       string   `json:"script" yaml:"script"`
    Chips        []string `json:"chips,omitempty" yaml:"chips,omitempty"`
    Evidence     string   `json:"evidence,omitempty" yaml:"evidence,omitempty"`
}

type DocRefPayload struct {
    DocRefID  string `json:"doc_ref_id" yaml:"doc_ref_id"`
    Title     string `json:"title" yaml:"title"`
    Section   string `json:"section" yaml:"section"`
    Body      string `json:"body" yaml:"body"`
    Evidence  string `json:"evidence,omitempty" yaml:"evidence,omitempty"`
}
```

```go
func buildHintSink(ws events.EventSink) events.EventSink {
    base := &fanoutSink{sinks: []events.EventSink{ws}}
    return structuredsink.NewFilteringSink(
        base,
        structuredsink.Options{Malformed: structuredsink.MalformedErrorEvents},
        NewHintExtractor(),
        NewQuerySuggestionExtractor(),
        NewDocRefExtractor(),
    )
}
```

```go
func registerCozoSemHandlers() {
    semregistry.RegisterByType[*EventHintPreview](func(ev *EventHintPreview) ([][]byte, error) {
        return [][]byte{wrapSEM("cozo.hint.preview", ev.HintID, map[string]any{
            "itemId": ev.ItemID,
            "data": ev.Data,
            "transient": true,
            "status": "in_progress",
        })}, nil
    })

    semregistry.RegisterByType[*EventHintExtracted](func(ev *EventHintExtracted) ([][]byte, error) {
        return [][]byte{wrapSEM("cozo.hint.extracted", ev.HintID, map[string]any{
            "itemId": ev.ItemID,
            "data": ev.Data,
            "transient": false,
            "status": "extracted",
        })}, nil
    })
}
```

### Why not emit durable state directly from `FilteringSink`

Because geppetto and `temporal-relationships` both explicitly treat streaming extraction as transient:

- `EventSink` warns against durable state on partial events (`geppetto/pkg/events/sink.go:10-15`).
- `EventContextPayloadPreview` is documented as transient (`internal/extractor/structured/context_events.go:34-55`).
- `ContextPayloadExtractor[T].OnCompleted(...)` intentionally does nothing because authoritative parsing/persistence belongs at the final inference boundary (`internal/extractor/structured/context_extractors.go:104-113`).

The same rule should apply here. Preview widgets are fine. Durable history should come from final, validated extracted payloads.

### Frontend architecture

The local frontend should not consume websocket payloads directly in JSX anymore. That recommendation remains correct, but the starting point has changed because COZODB-003 already landed the structural split. The UI work for COZODB-002 should therefore extend the new seams rather than re-open the decomposition problem.

The current browser pipeline is now:

```text
ws / http transport
  -> transport/hintsSocket.js + transport/httpClient.js
  -> DatalogPad orchestration shell
  -> sem/applySemEvent(...)
  -> feature cards + editor shell
```

The target COZODB-002 browser pipeline should be:

```text
pinocchio SEM websocket envelope
  -> transport/hintsSocket.js
  -> sem/semProjection.js
      -> default llm handlers
      -> Cozo family handlers
      -> canonical entity ids
  -> feature render registry by entity kind
      -> cozo_hint
      -> cozo_query_suggestion
      -> cozo_doc_ref
  -> DatalogPad orchestration shell + PadEditor insertion callbacks
```

### UI update after COZODB-003

The frontend decomposition work already created the exact seams COZODB-002 needs:

1. transport:
   - `frontend/src/transport/hintsSocket.js`
   - `frontend/src/transport/httpClient.js`
2. editor:
   - `frontend/src/editor/usePadDocument.js`
   - `frontend/src/editor/documentCommands.js`
   - `frontend/src/editor/PadEditor.jsx`
3. projection:
   - `frontend/src/sem/semEventTypes.js`
   - `frontend/src/sem/semProjection.js`
   - `frontend/src/sem/semProjection.test.js`
4. feature rendering:
   - `frontend/src/features/hints/HintResponseCard.jsx`
   - `frontend/src/features/hints/StreamingMessageCard.jsx`
   - `frontend/src/features/diagnosis/DiagnosisCard.jsx`
   - `frontend/src/features/query-results/QueryResultsTable.jsx`
5. theme:
   - `frontend/src/theme/tokens.css`
   - `frontend/src/theme/cards.css`
   - `frontend/src/theme/layout.css`

That means the remaining UI work is no longer "invent modules". It is:

1. replace the temporary `hint.result` projection rules with proper Cozo SEM family rules,
2. add a renderer dispatch layer so the shell renders by entity kind instead of by one legacy card type,
3. preserve the editor insertion affordances through `usePadDocument` and `PadEditor`,
4. keep the shell thin and avoid pushing widget-specific semantics back into `DatalogPad.jsx`.

### Detailed UI design for COZODB-002

#### 1. Keep the current shell boundaries

Do not collapse the frontend back into `DatalogPad.jsx`. The file should remain the orchestration screen that composes:

1. the websocket transport,
2. the editor document hook,
3. the projection state,
4. feature renderers,
5. run-query and diagnosis side effects.

In practice that means `DatalogPad.jsx` should continue to own:

1. wiring `useHintsSocket()` to the projection,
2. wiring `usePadDocument()` callbacks for insertions and example prompts,
3. laying out the editor region, results region, and status bar,
4. choosing which projected entities render after lines versus after the editor.

It should stop owning:

1. Cozo-family-specific SEM decoding,
2. raw event-to-view-model mapping,
3. widget-specific rendering branches beyond a small dispatch table.

#### 2. Extend the projection instead of bypassing it

`frontend/src/sem/semProjection.js` is currently a small transitional reducer that understands:

1. `llm.start`
2. `llm.delta`
3. `hint.result`
4. `llm.error`

For COZODB-002, this file should become the application-owned event folding layer for:

1. pinocchio-translated default LLM stream entities,
2. `cozo.hint.preview`
3. `cozo.hint.extracted`
4. `cozo.query_suggestion.preview`
5. `cozo.query_suggestion.extracted`
6. `cozo.doc_ref.preview`
7. `cozo.doc_ref.extracted`
8. the corresponding `.failed` families if the backend emits them.

The minimum structural upgrade is to stop treating every entity as just `"hint"` or `"diagnosis"`. The projection state should move toward:

```ts
type UiEntity =
  | { id: string; kind: "llm_text_stream"; props: { text: string; status: "streaming" | "complete" | "error"; anchor?: string } }
  | { id: string; kind: "cozo_hint"; props: { title: string; summary: string; severity: string; evidence?: string; status: "preview" | "extracted" | "failed"; anchor?: string } }
  | { id: string; kind: "cozo_query_suggestion"; props: { title: string; script: string; chips: string[]; evidence?: string; status: "preview" | "extracted" | "failed"; anchor?: string } }
  | { id: string; kind: "cozo_doc_ref"; props: { title: string; section: string; body: string; evidence?: string; status: "preview" | "extracted" | "failed"; anchor?: string } };
```

The important rule is the same one proven in `temporal-relationships`: the projection owns merge behavior, alias handling, and canonical IDs. Widget components should receive projected entities or derived view models, not raw websocket envelopes.

#### 3. Add a small UI-oriented handler registry inside `sem/`

The current `semProjection.js` can stay lightweight, but COZODB-002 needs a clearer separation between:

1. event-type-specific fold logic,
2. the projection state container,
3. selector functions used by the screen.

Recommended files:

1. `frontend/src/sem/registerDefaultSemHandlers.js`
2. `frontend/src/sem/registerCozoSemHandlers.js`
3. `frontend/src/sem/semProjection.js`
4. `frontend/src/sem/selectors.js`

Suggested runtime shape:

```text
applySemEnvelope(envelope)
  -> resolve event.type
  -> handler registry returns state mutation description
  -> semProjection applies upsert / merge / delete / alias-rekey
  -> selectors expose ordered entities for the screen
```

Pseudocode:

```js
const registry = new Map();

registry.set("cozo.query_suggestion.preview", (state, event) => {
  return upsertEntity(state, {
    id: canonicalId(event),
    kind: "cozo_query_suggestion",
    props: {
      title: event.data.title || "",
      script: event.data.script || "",
      chips: Array.isArray(event.data.chips) ? event.data.chips : [],
      status: "preview",
      anchor: event.data.anchor || event.id,
    },
  });
});
```

This does not need the full pinocchio browser registry implementation. It does need the same discipline: event handlers live outside component render functions.

#### 4. Build Cozo widget modules under `features/`

The current hint card modules should be treated as transitional UI, not the final COZODB-002 widget set. The recommended Cozo widget structure is:

1. `frontend/src/features/cozo-sem/CozoSemRenderer.jsx`
2. `frontend/src/features/cozo-sem/widgets/HintCard.jsx`
3. `frontend/src/features/cozo-sem/widgets/QuerySuggestionCard.jsx`
4. `frontend/src/features/cozo-sem/widgets/DocRefCard.jsx`
5. `frontend/src/features/cozo-sem/view-models/*.js`

Widget responsibilities:

1. `HintCard`
   - render title, summary, severity, and evidence
   - no insertion action
2. `QuerySuggestionCard`
   - render title, code block, chips, evidence
   - expose "insert code" callback back to `DatalogPad.jsx`
3. `DocRefCard`
   - render title, section, collapsible body
   - optionally link to future docs/help surfaces

The existing `HintResponseCard.jsx` can either:

1. become a compatibility card for the old `hint.result` flow during the cutover, or
2. be retired once the SEM widget set covers the same UX.

The safer migration path is option 1 first, option 2 later.

#### 5. Preserve editor insertions through the existing editor seam

The right insertion point already exists in `usePadDocument.js`. Do not let widgets manipulate the line array directly.

Widget-to-editor interaction should flow like this:

```text
QuerySuggestionCard
  -> onInsert(script)
  -> DatalogPad shell callback
  -> usePadDocument.insertCodeBelowCursor(script)
  -> PadEditor re-renders document
```

If anchor-aware insertion is needed later, add that to `usePadDocument` or a sibling editor helper, not to widget components.

#### 6. Use anchors deliberately

Rich widgets for SEM families can be shown in two places:

1. inline after the line that triggered the request,
2. in a global stream below the editor.

The current shell already supports both patterns:

1. `PadEditor` exposes `renderAfterLine`
2. `DatalogPad.jsx` can render trailing content below the editor

For COZODB-002, I recommend this rule:

1. query suggestions and hint summaries: anchor to the triggering request line when known,
2. streaming text and backend-global diagnosis events: allow trailing rendering,
3. doc refs: either anchor to the triggering line or nest under the owning hint/query suggestion card as a composed sub-view.

This means the projection should carry enough metadata to support anchoring:

```js
props: {
  anchor: "line:7",
  requestId: "hint-7",
  status: "preview",
}
```

#### 7. Keep diagnosis separate from Cozo extraction widgets

`DiagnosisCard.jsx` is already a separate feature module. Keep it that way. Diagnosis is still an error-recovery feature, not a Cozo structured extraction family. It can share transport and projection infrastructure, but it should not be forced into the same widget taxonomy as hints, query suggestions, and doc refs.

### Detailed UI file plan

The concrete COZODB-002 frontend file plan should be:

| Current file | Action for COZODB-002 | Why |
| --- | --- | --- |
| `frontend/src/transport/hintsSocket.js` | keep, but update envelope decoding as needed for pinocchio-emitted SEM payloads | transport seam already exists |
| `frontend/src/editor/usePadDocument.js` | keep, maybe add anchor-aware insertion helpers later | editor seam already exists |
| `frontend/src/sem/semProjection.js` | extend substantially | this is now the canonical event-folding seam |
| `frontend/src/sem/semProjection.test.js` | expand heavily | projection correctness is the main UI risk |
| `frontend/src/features/hints/HintResponseCard.jsx` | keep temporarily as legacy renderer | useful during cutover from `hint.result` |
| `frontend/src/features/cozo-sem/*` | create | final SEM widget home |
| `frontend/src/DatalogPad.jsx` | keep thin and orchestration-only | avoid reintroducing the monolith |

### UI migration order

Because COZODB-003 already did the decomposition, the safest COZODB-002 UI order is now:

1. extend `transport/hintsSocket.js` only if the envelope contract changes,
2. add new Cozo SEM event handlers to the projection,
3. add projection selectors for `cozo_hint`, `cozo_query_suggestion`, and `cozo_doc_ref`,
4. introduce the new widget modules under `features/cozo-sem/`,
5. render projected Cozo entities in `DatalogPad.jsx`,
6. keep the legacy `HintResponseCard` path only until the new widgets cover the same UX,
7. then remove `hint.result` as a primary render contract.

Critical design rules:

1. do not let widget JSX depend on raw websocket event envelopes,
2. do not let widget components mutate editor line state directly,
3. do not put Cozo-family-specific merge logic back into `DatalogPad.jsx`,
4. do not remove the temporary legacy card path until insertion, chips, and doc refs are covered in the SEM widgets.

The `temporal-relationships` projection code remains the right local model because it already solves:

1. canonical ID selection (`semanticContextId` / `canonicalContextId`),
2. preview-to-final merging,
3. alias rekeying when a better semantic ID arrives later,
4. hydration merge from timeline snapshots.

Key evidence for that pattern is in `ui/src/ws/semProjection.ts:181-206`, `ui/src/ws/semProjection.ts:368-415`, and `ui/src/ws/semProjection.ts:480-494`, with dedicated tests in `ui/src/ws/semProjection.test.ts:48-239`.

### Proposed entity kinds and props

| SEM event type | Entity kind | Core props |
| --- | --- | --- |
| `cozo.hint.preview` / `cozo.hint.extracted` | `cozo_hint` | `title`, `summary`, `severity`, `status`, `transient` |
| `cozo.query_suggestion.preview` / `cozo.query_suggestion.extracted` | `cozo_query_suggestion` | `title`, `script`, `chips`, `status`, `transient` |
| `cozo.doc_ref.preview` / `cozo.doc_ref.extracted` | `cozo_doc_ref` | `title`, `section`, `body`, `status`, `transient` |

Suggested projection rule:

```ts
registerSem('cozo.query_suggestion.preview', (ev, dispatch) => {
  const payload = ev.data as any;
  const data = payload?.data ?? {};
  dispatch(timelineSlice.actions.upsertEntity({
    id: data.suggestion_id || ev.id,
    kind: 'cozo_query_suggestion',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    props: {
      title: data.title ?? '',
      script: data.script ?? '',
      chips: Array.isArray(data.chips) ? data.chips : [],
      status: 'in_progress',
      transient: true,
    },
  }));
});
```

### Widget behavior requirements

#### Hint card

- Render short summary, severity, and evidence.
- Never own insertion behavior directly.
- Good for explanatory context.

#### Query suggestion card

- Render title, formatted CozoScript block, chips, and one-click insert action.
- This is the main replacement for the current `hint.result.code` flow.

#### Doc ref card

- Render section label plus expandable reference body.
- This is the SEM replacement for the current inline docs array.

## Design Decisions

### Decision 1: Keep `llm.*` text stream separate from extracted widget entities

Rationale:

- pinocchio already has stable handlers for `llm.start`, `llm.delta`, and `llm.final` (`pinocchio/pkg/webchat/sem_translator.go:268-319`).
- Mixed text and widgets should be represented as separate entities, not a single huge result object.

### Decision 2: Use Cozo-specific event families rather than overloading generic `context.*`

Rationale:

- `temporal-relationships` uses `context.*` because its domain is context graph extraction.
- `cozodb-editor` is not extracting a generic entity graph first; it is extracting editor guidance widgets.
- Application-owned namespaces such as `cozo.query_suggestion.extracted` are easier to reason about and less likely to collide with future generic modules.

### Decision 3: Reuse the generic extractor pattern, not the exact temporal payload families

Rationale:

- The extractor/session/debounce/dedupe machinery is solid and tested.
- The payload families should be domain-specific to Cozo editor UX.

### Decision 4: Introduce a projection layer before renderer work

Rationale:

- Without a projection layer, widget behavior will keep leaking into transport code.
- The single-handler websocket hook in `DatalogPad.jsx` is already a warning sign.

## Alternatives Considered

### Alternative A: Keep the current Anthropic wrapper and only add YAML parsing after the final response

Rejected because:

- it does not provide provider abstraction,
- it loses progressive extraction and preview widgets,
- it preserves the weakest part of the current architecture.

### Alternative B: Preserve `hint.result` as the main frontend contract and attach extracted widgets as optional extras

Rejected because:

- it duplicates state between result-object rendering and SEM widget rendering,
- it delays the necessary move to projected entity state,
- it invites a half-migrated frontend with two competing sources of truth.

### Alternative C: Use pinocchio's full webchat UI directly

Rejected for now because:

- `cozodb-editor` is not a chat product and does not need the entire webchat surface,
- the local UI can adopt the SEM/projection ideas without importing the whole app shell.

### Alternative D: Persist preview entities directly

Rejected because:

- both geppetto and the temporal reference explicitly treat preview extraction as transient.

## Implementation Plan

### Phase 1: Replace the backend inference abstraction

1. Add geppetto and pinocchio dependencies to `backend/go.mod`.
2. Replace the raw Anthropic client wrapper with a geppetto-backed inference path.
3. Ensure websocket lifecycle produces a cancellable context for each stream.

Deliverable:

- backend emits geppetto `llm.start`, `llm.delta`, and `llm.final` events through an `EventSink`.

### Phase 2: Introduce Cozo structured extraction

1. Define `HintPayload`, `QuerySuggestionPayload`, and `DocRefPayload`.
2. Implement `Normalize()` and `IsValid()` methods for each payload.
3. Create generic extractor wrappers following `ContextPayloadExtractor[T]`.
4. Rewrite prompt templates so the model emits user-facing prose plus `<cozo:*:v1>` blocks.

Deliverable:

- tagged YAML is stripped from visible assistant text and preview events are emitted during streaming.

### Phase 3: Add Cozo SEM translation and optional backend projection

1. Register Cozo preview/extracted/failed event handlers with `semregistry.RegisterByType[...]`.
2. Decide whether `cozodb-editor` needs timeline hydration. If yes, also register timeline handlers with `webchat.RegisterTimelineHandler(...)`.
3. Keep the local websocket transport at the SEM envelope level, but stop hand-authoring event payload semantics.

Deliverable:

- websocket frames are proper SEM-style app-owned events instead of raw local ad-hoc contracts.

### Phase 4: Build the frontend SEM projection layer

This phase is now an extension phase, not a decomposition phase.

1. Keep `frontend/src/transport/hintsSocket.js` as the websocket boundary.
2. Extend `frontend/src/sem/semProjection.js` from its temporary `llm.*` plus `hint.result` reducer into a real application projection for Cozo SEM families.
3. Add event handler registration files under `frontend/src/sem/` for:
   - default LLM families,
   - Cozo preview/extracted/failed families.
4. Add selectors for:
   - anchored per-line entities,
   - trailing stream entities,
   - query-suggestion insertion affordances,
   - document-reference subviews.
5. Preserve `DatalogPad.jsx` as the orchestration shell and keep merge logic out of it.

Deliverable:

- the UI has one canonical state pipeline for streaming text and extracted widgets.

### Phase 5: Build rich widgets

1. Add `frontend/src/features/cozo-sem/CozoSemRenderer.jsx`.
2. Implement `frontend/src/features/cozo-sem/widgets/HintCard.jsx`.
3. Implement `frontend/src/features/cozo-sem/widgets/QuerySuggestionCard.jsx`.
4. Implement `frontend/src/features/cozo-sem/widgets/DocRefCard.jsx`.
5. Add renderer dispatch keyed by entity kind.
6. Route query-suggestion insertion through `usePadDocument.insertCodeBelowCursor(...)`.
7. Keep `HintResponseCard.jsx` as the legacy compatibility path during the cutover if needed.

Deliverable:

- widgets render from projected entities and no longer depend on `hint.result`.

### Phase 6: Remove or shrink the old ad-hoc path

1. Remove the JSON-only parser contract.
2. Remove `hint.result` once the new widgets and final text flow cover the same UX.
3. Remove the temporary projection branches in `semProjection.js` that only exist for the legacy hint-result path.
4. Keep `DatalogPad.jsx` thin; do not reopen the monolithic layout problem that COZODB-003 already solved.

Deliverable:

- the old prototype path stops being the primary runtime.

## Test Strategy

### Backend

1. Add extractor tests for each Cozo payload family.
2. Add SEM translation tests that call `semregistry.Handle(ev)` and assert event type plus payload shape.
3. Add websocket integration tests that verify tagged YAML does not leak into `llm.delta` text frames.

### Frontend

1. Extend `frontend/src/sem/semProjection.test.js` rather than creating a second projection test location.
2. Test preview-to-final merge behavior for each Cozo family.
3. Test canonical ID fallback and rekey behavior when preview IDs differ from final semantic IDs.
4. Test anchor routing for inline-versus-trailing widget placement.
5. Add component tests or Storybook stories for:
   - `HintCard`
   - `QuerySuggestionCard`
   - `DocRefCard`
6. Keep the current `HintResponseCard.test.jsx` until the legacy card is removed, then delete or replace it.

### Validation commands

```bash
cd backend && go test ./...
cd /home/manuel/code/wesen/corporate-headquarters/geppetto && go test ./pkg/events/structuredsink
cd /home/manuel/code/wesen/corporate-headquarters/pinocchio && go test ./pkg/webchat ./cmd/web-chat/thinkingmode
cd /home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships && go test ./internal/extractor/structured ./internal/extractor/semtemporal ./internal/extractor/gorunner
```

## Open Questions

1. Does `cozodb-editor` need durable timeline hydration, or is live-only projection enough for the first pass?
2. Should final extracted families remain editor-local, or should they later be persisted for session history?
3. Do we want protobuf schemas for the Cozo families immediately, or is JSON payload data inside SEM envelopes acceptable for the first implementation pass?

## References

1. Existing draft analysis: `analysis/01-geppetto-pinocchio-streaming-structured-extraction-architecture-analysis.md`
2. Geppetto events: `/home/manuel/code/wesen/corporate-headquarters/geppetto/pkg/events/chat-events.go`
3. Geppetto FilteringSink: `/home/manuel/code/wesen/corporate-headquarters/geppetto/pkg/events/structuredsink/filtering_sink.go`
4. Pinocchio SEM registry: `/home/manuel/code/wesen/corporate-headquarters/pinocchio/pkg/sem/registry/registry.go`
5. Pinocchio event translator: `/home/manuel/code/wesen/corporate-headquarters/pinocchio/pkg/webchat/sem_translator.go`
6. Pinocchio thinking-mode example: `/home/manuel/code/wesen/corporate-headquarters/pinocchio/cmd/web-chat/thinkingmode/backend.go`
7. Temporal extractor pattern: `/home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/internal/extractor/structured/context_extractors.go`
8. Temporal SEM bridge: `/home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/internal/extractor/semtemporal/register.go`
9. Temporal frontend projection: `/home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.ts`

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
