---
Title: SEM Projection and Timeline Hydration Refactor Guide
Ticket: COZODB-004
Status: active
Topics:
    - frontend
    - sem
    - streaming
    - architecture
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../../../../../tmp/cozodb-streaming-improvements.md
      Note: Imported proposal that motivated the ticket
    - Path: backend/pkg/api/websocket.go
      Note: Verified request plumbing and dropped anchorLine
    - Path: backend/pkg/hints/structured_parser.go
      Note: Verified authoritative parse IDs and visible text normalization
    - Path: frontend/src/DatalogPad.jsx
      Note: Verified request emission and shell rendering path
    - Path: frontend/src/sem/semProjection.js
      Note: Verified adjacency-based grouping and target projector seam
ExternalSources:
    - local:01-cozodb-streaming-improvements.md
Summary: Evidence-backed refactor guide for replacing adjacency-based Cozo SEM grouping with deterministic bundle-based projection and for making the local projector hydration-ready without changing geppetto or pinocchio.
LastUpdated: 2026-03-15T12:10:00-04:00
WhatFor: Help implementers tighten the local SEM projection and rendering contract, remove accidental grouping behavior, and prepare the UI model for later timeline hydration.
WhenToUse: Use when implementing or reviewing Cozo SEM projection, request-anchor plumbing, bundle grouping, rendering cleanup, or future hydration preparation in this repo.
---


# SEM Projection and Timeline Hydration Refactor Guide

## Executive Summary

The imported proposal is correct about the main bug: the current Cozo SEM UI is grouped by incidental event order, not by an explicit backend contract. That is visible in three places. `DatalogPad.jsx` sends `anchorLine` in `hint.request`, but the API and hints request structs do not carry it, so the backend drops it before inference. The structured event types only carry `item_id`, `family`, and payload data, so there is no explicit grouping or ordering metadata. The frontend then compensates by building threads from “last hint seen,” which works only while the stream happens to arrive in the expected order.

The imported proposal is not fully accurate about the local codebase in one important way: this repository does not currently contain a real timeline store or hydration runtime to tighten. There is no local reducer, persistence layer, or replay path. The right interpretation of “timeline hydration” for this ticket is therefore narrower and more practical: make the raw event contract and frontend projector deterministic enough that a future hydration layer could reuse the same entity model instead of forcing another projector rewrite later.

The recommended implementation is:

1. Fix request-anchor plumbing.
2. Introduce backend-generated bundle metadata for every Cozo structured item.
3. Make preview and final parsing produce the same canonical child IDs.
4. Add a synthetic `cozo_bundle` projector entity in the frontend.
5. Replace adjacency grouping with explicit parent/child selectors.
6. Keep one temporary compatibility fallback for old events during rollout.

That solves the current rendering bug and puts the repo in a much better position for future replay or hydration without requiring any geppetto or pinocchio changes.

## Problem Statement And Scope

This ticket is about tightening the local Cozo SEM event contract and the projector/rendering logic inside `cozodb-editor`. It is not about redesigning geppetto, pinocchio, or external timeline infrastructure. The imported proposal explicitly mentions possible external follow-ups, but the user asked to focus only on this project, so the design here is constrained to code under `backend/` and `frontend/src/`.

The concrete problems are:

1. Request anchor information is emitted by the frontend but is not carried through the local backend request types.
2. Structured Cozo events do not contain enough metadata for deterministic grouping.
3. Frontend SEM grouping currently depends on adjacency and hint-first arrival order.
4. The `DocRefPayload` type cannot carry anchor data even though the frontend projector already assumes structured payloads may contain anchors.
5. The current event and projector model is not stable enough to reuse for later replay or hydration.

Out of scope:

1. Any change to geppetto extractor APIs.
2. Any change to pinocchio protobufs or timeline runtime.
3. A full notebook/document-model rewrite.
4. Persisting hydrated timeline state in this repo now.

## Proposal Audit

This section compares the imported proposal against the actual codebase.

### Verified As Correct

The following proposal claims are directly supported by the code:

1. `DatalogPad.jsx` sends `anchorLine` in `hint.request`.
   Evidence: `frontend/src/DatalogPad.jsx:156-164`.

2. The backend drops `anchorLine`.
   Evidence:
   - `backend/pkg/api/types.go:52-56` defines `api.HintRequest` with only `question` and `history`.
   - `backend/pkg/hints/types.go:19-24` defines `hints.HintRequest` with only `question`, `schema`, and `history`.
   - `backend/pkg/api/websocket.go:97-101` builds `hints.HintRequest` without any anchor field.

3. The current frontend thread builder groups by “last hint seen.”
   Evidence: `frontend/src/sem/semProjection.js:156-185`.

4. `DocRefPayload` cannot carry anchor metadata.
   Evidence: `backend/pkg/hints/structured_types.go:94-121`.

5. The current structured event types do not carry bundle or parent metadata.
   Evidence: `backend/pkg/hints/structured_events.go:11-67`.

6. The current authoritative parse IDs are derived from geppetto metadata ID plus sequence.
   Evidence: `backend/pkg/hints/structured_parser.go:198-205`.

7. The current translated SEM payload includes only `family`, `itemId`, `data`, and `transient`.
   Evidence: `backend/pkg/hints/sem_registry.go:36-43`.

### Correct In Spirit But Needs Scoping Changes

Some proposal points are good architecture guidance but need to be reframed for this repo:

1. “Timeline hydration tightening” should be read as “make the projector contract hydration-ready.”
   Why: there is no local timeline store, reducer, or replay runtime. A repository-wide search found no local implementation outside ticket docs and imported source notes.

2. The synthetic `cozo_bundle` entity is the right frontend abstraction even without a persisted timeline.
   Why: the bundle entity solves grouping today and can later become the natural hydration root if persistence is added.

3. Temporary frontend fallback is worth keeping for one rollout window.
   Why: the local app is deployed as one repo, but backend and frontend may still be tested independently. A short compatibility window reduces coordination risk.

### Not A Good Fit For This Ticket

The following items should be explicitly deferred:

1. Pinocchio timeline runtime helper APIs.
2. Geppetto extractor API cleanup around ordinal exposure.
3. Persisting projected bundle entities to a local timeline store.

They are not needed to fix the local bug and would blur the ticket scope.

## Current-State Architecture

This section explains the relevant runtime for a new engineer.

### End-To-End Flow Today

```text
PadEditor / DatalogPad
  -> useHintsSocket.send("hint.request", { question, anchorLine })
  -> backend websocket handler
  -> hints.Engine.GenerateHintWithSinks(...)
  -> geppetto streaming + local structured extractors
  -> SEM websocket frames
  -> semProjection.applySemEvent(...)
  -> DatalogPad selectors
  -> CozoSemRenderer
```

### Frontend Request And Rendering Flow

`DatalogPad.jsx` is the shell component that:

1. sends `hint.request` and `diagnosis.request`,
2. subscribes to projected events,
3. stores shell-only UI state such as collapse/dismiss maps,
4. renders line-anchored widgets with `PadEditor.renderAfterLine(...)`,
5. renders trailing widgets under the editor.

Relevant evidence:

1. Request emission:
   - `frontend/src/DatalogPad.jsx:156-164`
   - `frontend/src/DatalogPad.jsx:234-253`

2. Inline/trailing rendering:
   - `frontend/src/DatalogPad.jsx:393-433`

3. Shell-only collapse/dismiss state:
   - `frontend/src/DatalogPad.jsx:191-203`

The editor itself is still a line-array editor. `PadEditor.jsx` iterates `lines.map(...)` and renders an input only for the active line. `renderAfterLine(...)` is the stable seam for attaching non-text UI after a line. `usePadDocument.js` mutates the document as a plain `lines[]` array and treats `#?? ...` as a special command line.

Relevant evidence:

1. `frontend/src/editor/PadEditor.jsx:47-117`
2. `frontend/src/editor/usePadDocument.js:14-71`

This matters because it means the current UI can support notebook-style widgets under a line very cheaply, but a true heterogeneous document model would require a deeper editor rewrite.

### Frontend SEM Projection Flow

`frontend/src/sem/semProjection.js` is the local projector. It currently:

1. normalizes raw websocket events into entities in `state.entities`,
2. preserves first-seen order in `state.order`,
3. maps `cozo.*` event types to leaf entity kinds,
4. routes structured items to inline or trailing selectors by `anchorLine`,
5. groups rendered threads by adjacency using `buildSemThreads(...)`.

Key implementation points:

1. canonical ID extraction for `cozo.*` events is `event.data.itemId || event.id`.
   Evidence: `frontend/src/sem/semProjection.js:45-55`

2. anchor extraction currently reads only `event.data.data.anchor.line`.
   Evidence: `frontend/src/sem/semProjection.js:57-65`

3. thread construction depends on the last hint encountered.
   Evidence: `frontend/src/sem/semProjection.js:156-185`

4. selectors are still thread-by-adjacency wrappers.
   Evidence: `frontend/src/sem/semProjection.js:291-309`

This is the core bug. The projector has no explicit relation metadata, so it infers grouping from arrival order and hint presence.

### Backend Request And Inference Flow

The websocket handler accepts `hint.request` and `diagnosis.request` messages, unmarshals them into API request structs, generates a sequential request ID like `hint-1`, then starts the hints engine and forwards:

1. `llm.start`
2. `llm.delta`
3. translated `cozo.*` SEM frames
4. final compatibility `hint.result`

Relevant evidence:

1. websocket request loop:
   - `backend/pkg/api/websocket.go:52-77`

2. hint request parsing and engine call:
   - `backend/pkg/api/websocket.go:80-150`

3. current websocket event shape:
   - `backend/pkg/api/types.go:39-56`

The important weakness here is that the handler receives `anchorLine` from the frontend payload, but there is no field to retain it.

### Backend Structured Extraction Flow

The local hints engine builds a `FilteringSink` and passes it custom Cozo extractors. Preview extraction happens in streaming extractor sessions; authoritative extraction happens after full text is available and `ParseStructuredResponse(...)` scans the final response.

Relevant evidence:

1. engine run and filtering sink creation:
   - `backend/pkg/hints/engine.go:91-157`

2. preview extractor session shape:
   - `backend/pkg/hints/structured_extractors.go:32-101`

3. authoritative parse and derived event emission:
   - `backend/pkg/hints/structured_parser.go:66-119`

4. current structured item ID generation:
   - `backend/pkg/hints/structured_parser.go:198-205`

Current weakness:

1. preview sessions retain only `meta` and `itemID`, not projection defaults.
2. final parse uses `structuredItemID(meta, seq)`, which bakes geppetto metadata IDs into app-facing identity.
3. extracted and failed events carry no bundle or parent metadata.

### Current SEM Translation

`backend/pkg/hints/sem_registry.go` registers handlers that translate local structured events into websocket SEM frames. The payload does not include `bundleId`, `parentId`, `ordinal`, `mode`, or `stream_id`.

Relevant evidence:

1. preview/extracted translation:
   - `backend/pkg/hints/sem_registry.go:15-22`
   - `backend/pkg/hints/sem_registry.go:36-43`

2. failure translation:
   - `backend/pkg/hints/sem_registry.go:23-31`

This means the frontend has no explicit relation information to project from.

## Gap Analysis

The gap between the proposal and the current code can be summarized as a contract problem.

### Observed Gaps

1. Request context gap
   - frontend sends anchor line
   - backend request structs cannot carry it

2. Event metadata gap
   - structured events have only `item_id` and `family`
   - no grouping, ordering, or request-mode metadata

3. Payload schema gap
   - hints and query suggestions can carry `Anchor`
   - doc refs cannot

4. Projector gap
   - projector has only leaf entities
   - no bundle parent entity
   - grouping depends on adjacency

5. Hydration-readiness gap
   - no stable parent/child contract
   - no stable event metadata for replay into the same grouped UI

### Failure Modes Caused By The Current Design

1. Two responses on the same anchor line can be visually grouped by accident if the frontend only sees adjacency.
2. Child items that arrive before a hint or after interleaved events can be attached to the wrong thread.
3. Doc refs cannot be inline-anchored by type even if the backend wanted to inject a request anchor.
4. Preview-to-final merge is stable only at the leaf item level, not at the grouped-thread level.
5. Any future hydration path would need to recreate accidental adjacency rules rather than replay a deterministic entity graph.

## Recommended Architecture

### Core Decision

The local backend should generate deterministic projection metadata. The frontend should project from explicit relation metadata, not from adjacency.

The canonical grouping unit should be a synthetic frontend bundle entity:

```js
{
  id: "cozo-bundle:<bundleId>",
  kind: "cozo_bundle",
  bundleId: "<bundleId>",
  anchorLine: 12,
  mode: "hint",
  status: "preview" | "complete" | "error",
}
```

Each leaf entity should carry:

```js
{
  id: "cozo-item:<bundleId>:<family>:<ordinal>",
  kind: "cozo_hint" | "cozo_query_suggestion" | "cozo_doc_ref",
  parentId: "cozo-bundle:<bundleId>",
  bundleId: "<bundleId>",
  ordinal: 1,
  mode: "hint" | "diagnosis",
  anchorLine: 12,
  status: "preview" | "complete" | "error",
  data: { ... },
  transient: true | false,
  error: null,
}
```

### Why Bundle-Based Projection Is The Right Fix

1. It fixes the current rendering bug immediately.
2. It does not require any model-generated IDs.
3. It works with the current transport.
4. It gives the frontend a stable root object for collapse, dismiss, and summary decisions.
5. It makes future hydration possible because replay can reconstruct the same graph without relying on event adjacency.

### Minimal Raw Event Contract

The backend does not need a new transport event family for bundles. The raw websocket SEM frames can remain leaf-family events and carry enough metadata to let the projector synthesize bundles.

Recommended raw event payload:

```json
{
  "sem": true,
  "event": {
    "type": "cozo.query_suggestion.extracted",
    "id": "cozo-item:<bundleId>:query_suggestion:2",
    "stream_id": "<bundleId>",
    "data": {
      "family": "query_suggestion",
      "itemId": "cozo-item:<bundleId>:query_suggestion:2",
      "bundleId": "<bundleId>",
      "parentId": "cozo-bundle:<bundleId>",
      "ordinal": 2,
      "mode": "hint",
      "anchor": { "line": 12, "source": "hint.request" },
      "transient": false,
      "data": {
        "label": "Add a filter",
        "code": "?[name] := *users{name}, age > 30",
        "reason": "Narrow the result set."
      }
    }
  }
}
```

### Important Invariants

1. `bundleId` is backend-generated once per request.
2. `parentId` is always `cozo-bundle:<bundleId>`.
3. `ordinal` is block order across the whole response, not per family.
4. preview and extracted events for the same logical item must produce the same child ID.
5. anchor defaults come from request context if the payload lacks one.

## Detailed Backend Plan

### Phase 1: Request Anchor Plumbing

Add `AnchorLine *int` to:

1. `backend/pkg/api.HintRequest`
2. `backend/pkg/hints.HintRequest`

Then carry it through `handleHintRequest(...)` into `hints.Engine.GenerateHintWithSinks(...)`.

Pseudocode:

```go
type HintRequest struct {
    Question   string
    History    []string
    AnchorLine *int
}

hintReq := hints.HintRequest{
    Question:   req.Question,
    Schema:     schema,
    History:    req.History,
    AnchorLine: req.AnchorLine,
}
```

This is required before any bundle defaults can inject anchors.

### Phase 2: Projection Defaults Context

Create a new local helper file such as `backend/pkg/hints/projection_defaults.go`.

Recommended API:

```go
type ProjectionDefaults struct {
    BundleID   string
    AnchorLine *int
    Source     string
    Mode       string
}

func WithProjectionDefaults(ctx context.Context, d ProjectionDefaults) context.Context
func ProjectionDefaultsFromContext(ctx context.Context) ProjectionDefaults
func BundleEntityID(bundleID string) string
func ChildEntityID(bundleID, family string, ordinal int) string
```

Use it in:

1. `handleHintRequest(...)`
2. `handleDiagnosisRequest(...)`

The backend should generate a real bundle UUID once per request. Do not reuse the display ID like `hint-7`.

### Phase 3: Enrich Structured Event Types

Extend `backend/pkg/hints/structured_events.go` with a shared metadata block.

Recommended shape:

```go
type CozoProjectionMeta struct {
    BundleID string         `json:"bundle_id,omitempty"`
    ParentID string         `json:"parent_id,omitempty"`
    Ordinal  int            `json:"ordinal,omitempty"`
    Anchor   *AnchorPayload `json:"anchor,omitempty"`
    Mode     string         `json:"mode,omitempty"`
}
```

Then embed it into preview, extracted, and failed events.

This is the boundary where projector-relevant metadata becomes part of the local domain event, before SEM translation.

### Phase 4: Deterministic Child IDs

Replace the current app-facing identity rule:

```text
<geppetto-metadata-uuid>:<seq>
```

with:

```text
cozo-item:<bundleId>:<family>:<ordinal>
```

The backend may still read the extractor/session suffix to discover ordinal, but the emitted child ID should be deterministic from local projection defaults, family, and ordinal.

This should be implemented in one shared helper and reused by preview extractors and authoritative parsing. That shared helper is what guarantees preview/final merge correctness.

### Phase 5: Preview Extractor Enrichment

Update `backend/pkg/hints/structured_extractors.go` so each session stores:

1. parsed ordinal
2. projection defaults from context

Recommended session additions:

```go
type payloadExtractorSession[T any] struct {
    ...
    ordinal  int
    defaults ProjectionDefaults
}
```

During preview emission:

1. normalize payload
2. validate payload
3. inject default anchor if absent
4. compute `bundleId`, `parentId`, `itemId`
5. emit preview or failed event with `CozoProjectionMeta`

### Phase 6: Authoritative Parse Enrichment

Update `backend/pkg/hints/structured_parser.go` so `ParseStructuredResponse(...)` also receives projection defaults and emits the same canonical child IDs as preview extraction.

Recommended direction:

```go
parsed := ParseStructuredResponse(meta, fullText, defaults)
```

and:

```go
type structuredBlock struct {
    Family  string
    Raw     string
    ItemID  string
    Ordinal int
}
```

Then:

1. use `ChildEntityID(...)`
2. inject default anchor if absent
3. include `bundleId`, `parentId`, `ordinal`, `mode`, and `anchor` in extracted/failed events

### Phase 7: Add Anchor To DocRefPayload

Extend `backend/pkg/hints/structured_types.go`:

```go
type DocRefPayload struct {
    DocRefID string         `json:"doc_ref_id,omitempty" yaml:"doc_ref_id,omitempty"`
    Title    string         `json:"title" yaml:"title"`
    Section  string         `json:"section,omitempty" yaml:"section,omitempty"`
    Body     string         `json:"body" yaml:"body"`
    URL      string         `json:"url,omitempty" yaml:"url,omitempty"`
    Anchor   *AnchorPayload `json:"anchor,omitempty" yaml:"anchor,omitempty"`
}
```

Normalization should treat `Anchor` the same way as other payload families.

### Phase 8: Expand SEM Translation Payload

Update `backend/pkg/hints/sem_registry.go` so translated `cozo.*` websocket payloads include:

1. `bundleId`
2. `parentId`
3. `ordinal`
4. `mode`
5. `anchor`
6. optional `stream_id`

Recommended envelope direction:

```go
payload := map[string]any{
    "family":    family,
    "itemId":    itemID,
    "bundleId":  meta.BundleID,
    "parentId":  meta.ParentID,
    "ordinal":   meta.Ordinal,
    "mode":      meta.Mode,
    "anchor":    meta.Anchor,
    "data":      data,
    "transient": transient,
}
```

Optional but useful:

```go
type WSEvent struct {
    Type     string `json:"type"`
    ID       string `json:"id,omitempty"`
    StreamID string `json:"stream_id,omitempty"`
    Data     any    `json:"data,omitempty"`
}
```

This is not required to fix the frontend bug, but it is good cleanup for future correlation and replay tooling.

## Detailed Frontend Plan

### Phase 9: Add `cozo_bundle` To The Projector

Update `frontend/src/sem/semProjection.js` to create explicit bundle entities.

Recommended additional kind:

```js
export const ENTITY_KIND_COZO_BUNDLE = "cozo_bundle";
```

Projector behavior for each incoming `cozo.*` leaf event:

1. extract `bundleId`, `parentId`, `ordinal`, `anchorLine`, `mode`
2. upsert the child entity
3. ensure parent bundle entity exists
4. append the bundle ID to top-level `order` only on first sighting

Suggested helper sketch:

```js
function ensureBundleEntity(state, event) {
  const bundleId = extractCozoBundleId(event);
  if (!bundleId) return state;

  const bundleEntityId = `cozo-bundle:${bundleId}`;
  const bundle = state.entities[bundleEntityId] || {
    id: bundleEntityId,
    kind: ENTITY_KIND_COZO_BUNDLE,
    bundleId,
    anchorLine: extractCozoAnchorLine(event),
    mode: extractCozoMode(event),
    status: "preview",
  };

  return {
    ...state,
    entities: { ...state.entities, [bundleEntityId]: nextBundle(bundle, event) },
    order: appendOrder(state.order, bundleEntityId),
  };
}
```

### Phase 10: Replace Adjacency Grouping With Relation-Based Selectors

The projector should stop treating “hint followed by children” as a primary grouping rule.

Recommended selector pattern:

```js
function getOrderedCozoBundles(state, predicate) {
  return state.order
    .map((id) => state.entities[id])
    .filter((entity) => entity?.kind === ENTITY_KIND_COZO_BUNDLE && predicate(entity));
}

function getBundleChildren(state, bundleEntityId) {
  return Object.values(state.entities)
    .filter((entity) => entity?.parentId === bundleEntityId && isCozoLeafKind(entity.kind))
    .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
}

function buildBundleThread(state, bundle) {
  const children = getBundleChildren(state, bundle.id);
  const hint = children.find((entity) => entity.kind === ENTITY_KIND_COZO_HINT) ?? null;

  return {
    id: bundle.id,
    bundle,
    hint,
    children: hint ? children.filter((entity) => entity.id !== hint.id) : children,
    anchorLine: bundle.anchorLine ?? null,
  };
}
```

The public selectors can keep their current names:

1. `getInlineSemThreads(...)`
2. `getTrailingSemThreads(...)`
3. `getAllSemThreads(...)`

That minimizes `DatalogPad.jsx` churn.

### Phase 11: Temporary Compatibility Fallback

For one rollout window, the projector should support:

1. explicit `bundleId` / `parentId` grouping when present
2. old adjacency grouping when metadata is absent

This should be clearly marked temporary in the code. The cleanup ticket should remove it after backend rollout completes.

### Phase 12: Update `CozoSemRenderer`

`frontend/src/features/cozo-sem/CozoSemRenderer.jsx` already has the right shape for a bundle renderer, but it still conceptually thinks in terms of an inferred thread.

Refine it so:

1. `thread.id` is the bundle entity ID
2. summary derives from:
   - hint text first
   - otherwise first child label/title
   - otherwise fallback
3. line label comes from bundle anchor
4. optional mode/status badges can be added later without renderer redesign

### Phase 13: Keep `DatalogPad.jsx` Thin

`DatalogPad.jsx` should not become a second projector. It should keep doing only shell concerns:

1. websocket subscriptions
2. shell-level collapse/dismiss maps keyed by bundle ID
3. passing threads to `CozoSemRenderer`

The current structure already supports that. Only the thread IDs and selectors need to change.

## Timeline And Hydration Guidance

This repo does not currently have a local timeline store to hydrate from. That matters for ticket scope.

### What “Hydration-Ready” Means Here

For this ticket, hydration-ready means:

1. raw events include deterministic relation metadata
2. projector output is based on that relation metadata
3. replaying the same event stream would produce the same entity graph

It does not mean:

1. add persistence now
2. add replay APIs now
3. add a second local store now

### Why This Still Matters Now

If the projector keeps adjacency grouping, any later hydration work would need to preserve event arrival quirks to reconstruct the UI. That is the wrong dependency. Fixing the relation contract now keeps future hydration small and predictable.

## Testing Strategy

### Backend Tests To Add Or Expand

Primary files:

1. `backend/pkg/hints/structured_parser_test.go`
2. new `backend/pkg/hints/structured_projection_test.go`
3. optional `backend/pkg/api/websocket_test.go`

Must-have cases:

1. request anchor survives websocket and hints request conversion
2. preview and extracted events use identical child IDs
3. all child items from one response share one `bundleId` and `parentId`
4. `ordinal` increases in block order across families
5. doc refs receive injected anchor defaults
6. failed items still include bundle metadata
7. two responses on the same anchor line do not collide

### Frontend Tests To Add Or Expand

Primary files:

1. `frontend/src/sem/semProjection.test.js`
2. `frontend/src/features/cozo-sem/CozoSemRenderer.test.jsx`

Must-have cases:

1. children group by `parentId`, not adjacency
2. interleaved bundles remain separate
3. child-before-hint still lands in the correct bundle
4. bundle anchor decides inline vs trailing placement
5. preview-to-extracted updates the same child entity
6. collapse/dismiss state keys use bundle ID
7. temporary fallback still handles old payloads

## Phased Implementation Plan

### Slice 1: Backend Metadata Contract

Files:

1. `backend/pkg/api/types.go`
2. `backend/pkg/api/websocket.go`
3. `backend/pkg/hints/types.go`
4. `backend/pkg/hints/projection_defaults.go` (new)
5. `backend/pkg/hints/structured_events.go`
6. `backend/pkg/hints/structured_extractors.go`
7. `backend/pkg/hints/structured_parser.go`
8. `backend/pkg/hints/structured_types.go`
9. `backend/pkg/hints/sem_registry.go`

Outcome:

1. backend emits deterministic bundle-aware child metadata
2. preview/final IDs align
3. doc refs can carry anchors

### Slice 2: Frontend Explicit Grouping

Files:

1. `frontend/src/sem/semProjection.js`
2. `frontend/src/sem/semProjection.test.js`
3. `frontend/src/features/cozo-sem/CozoSemRenderer.jsx`
4. `frontend/src/features/cozo-sem/CozoSemRenderer.test.jsx`
5. small touch-up in `frontend/src/DatalogPad.jsx`

Outcome:

1. projector groups by relation metadata
2. bundle entity becomes top-level UI root
3. shell state keys by bundle ID

### Slice 3: Prompt And Extraction Cleanup

Files:

1. `backend/pkg/hints/prompt.go`
2. `backend/pkg/hints/extraction_config.yaml`

Outcome:

1. prompt stops foregrounding LLM-generated bookkeeping IDs
2. anchor remains backend-authoritative

### Slice 4: Compatibility Cleanup

Files:

1. `frontend/src/sem/semProjection.js`
2. `frontend/src/sem/semProjection.test.js`
3. any compatibility-only legacy tests

Outcome:

1. remove adjacency fallback once backend rollout is complete
2. keep only deterministic bundle/child grouping

## Risks And Tradeoffs

### Main Risks

1. Temporary dual projector logic can become permanent if not removed quickly.
2. If bundle IDs are generated incorrectly or inconsistently between preview and final paths, the UI will still flicker or duplicate.
3. Adding too much future hydration machinery now would slow the real bug fix.

### Tradeoffs

1. Synthetic bundles slightly increase projector complexity, but they remove much larger UI ambiguity.
2. Backend-generated metadata adds contract surface area, but it keeps the LLM output simpler and less error-prone.
3. Keeping a short compatibility fallback increases rollout safety at the cost of some temporary code complexity.

## Alternatives Considered

### Alternative 1: Keep Adjacency Grouping And Improve Frontend Heuristics

Rejected because:

1. it still fails under interleaving
2. it is not hydration-ready
3. it would move more accidental logic into the frontend

### Alternative 2: Ask The LLM To Emit Parent/Child IDs

Rejected because:

1. grouping and ordering are deterministic system concerns
2. model-generated bookkeeping increases prompt burden
3. invalid or inconsistent IDs would be hard to debug

### Alternative 3: Add A Local Timeline Store First

Rejected because:

1. this repo does not have one now
2. it is not necessary to fix the grouping bug
3. contract cleanup should come before persistence

## Open Questions

1. Should diagnosis responses reuse the same bundle entity kind with `mode: "diagnosis"`, or should diagnosis later get a separate bundle kind for UI styling?
2. Should `stream_id` be added only to `cozo.*` websocket events, or also to `llm.*` and `hint.result` now for better debugging?
3. How long should the adjacency fallback live after backend rollout completes?

## References

### Imported Proposal

1. `ttmp/2026/03/15/COZODB-004--sem-projection-and-timeline-hydration-tightening/sources/local/01-cozodb-streaming-improvements.md`

### Backend

1. `backend/pkg/api/types.go`
2. `backend/pkg/api/websocket.go`
3. `backend/pkg/hints/types.go`
4. `backend/pkg/hints/engine.go`
5. `backend/pkg/hints/structured_types.go`
6. `backend/pkg/hints/structured_events.go`
7. `backend/pkg/hints/structured_extractors.go`
8. `backend/pkg/hints/structured_parser.go`
9. `backend/pkg/hints/sem_registry.go`
10. `backend/pkg/api/ws_sem_sink.go`

### Frontend

1. `frontend/src/DatalogPad.jsx`
2. `frontend/src/sem/semProjection.js`
3. `frontend/src/features/cozo-sem/CozoSemRenderer.jsx`
4. `frontend/src/editor/PadEditor.jsx`
5. `frontend/src/editor/usePadDocument.js`
