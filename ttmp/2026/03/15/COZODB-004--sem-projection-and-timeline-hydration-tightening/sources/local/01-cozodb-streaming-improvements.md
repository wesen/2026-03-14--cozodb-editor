---
Title: Imported proposal - CozoDB streaming improvements
Ticket: COZODB-004
Status: reference
Topics:
    - frontend
    - sem
    - streaming
    - architecture
DocType: reference
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: Imported proposal preserved inside the ticket workspace as a source artifact.
LastUpdated: 2026-03-15T12:18:00-04:00
WhatFor: Compare the original proposal text against the final local-only design doc.
WhenToUse: Use when auditing where the final COZODB-004 design follows or narrows the imported proposal.
---

Here’s the plan I’d use.

Three concrete things are broken right now:

* `DatalogPad` sends `anchorLine`, but `backend/pkg/api.HintRequest` drops it, so the backend never actually knows where the request came from.
* `frontend/src/sem/semProjection.js` groups Cozo widgets by “last hint seen” in `buildSemThreads()`, which is a streaming-only illusion.
* `DocRefPayload` has no `Anchor`, even though the frontend logic/tests assume doc refs can be placed inline.

So the fix is not “teach the frontend to be smarter.” The fix is to introduce a deterministic grouping contract and make the frontend project from that contract.

## Core decision

Do **not** ask the LLM to emit parent/child IDs.

That is bookkeeping, and stochastic text generators are not bookkeeping systems unless you enjoy debugging haunted spreadsheets.

Instead:

* one hint/diagnosis request produces one deterministic **bundle**
* every extracted Cozo item emitted from that response carries:

  * `bundleId`
  * `parentId`
  * `ordinal`
  * normalized `anchor`
  * optional `mode` (`hint` vs `diagnosis`)

The frontend then projects:

* a synthetic top-level `cozo_bundle` entity
* child entities under that bundle

Later, if you want Pinocchio durability/hydration, the exact same projected entity model can be persisted.

## Target model

I would make the canonical projected model look like this.

```js
// projected entity, not raw LLM output
{
  id: "cozo-bundle:8b0d...",
  kind: "cozo_bundle",
  status: "preview" | "complete" | "error",
  bundleId: "8b0d...",
  anchorLine: 12,
  mode: "hint",
}
```

```js
{
  id: "cozo-item:8b0d...:hint:1",
  kind: "cozo_hint",
  parentId: "cozo-bundle:8b0d...",
  bundleId: "8b0d...",
  ordinal: 1,
  status: "preview" | "complete" | "error",
  anchorLine: 12,
  data: { ...structured payload... },
  error: null,
  transient: true | false,
  mode: "hint",
}
```

```js
{
  id: "cozo-item:8b0d...:query_suggestion:2",
  kind: "cozo_query_suggestion",
  parentId: "cozo-bundle:8b0d...",
  bundleId: "8b0d...",
  ordinal: 2,
  ...
}
```

Important rules:

* `bundleId` is deterministic and backend-generated.
* `parentId` is always `cozo-bundle:${bundleId}`.
* child IDs are deterministic from `(bundleId, family, ordinal)`.
* `ordinal` is block order in the response, not per-family order.
* `anchorLine` is injected from request context unless the payload already carries one.
* grouping is **never** based on adjacency.
* grouping is **never** based only on anchor line, because two responses on the same line would collide.

## Raw SEM contract after the backend change

You do not need a new raw SEM event type for the bundle. Keep the raw transport events as child-family events, but enrich them.

Example:

```json
{
  "sem": true,
  "event": {
    "type": "cozo.query_suggestion.extracted",
    "id": "cozo-item:8b0d...:query_suggestion:2",
    "stream_id": "8b0d...",
    "data": {
      "family": "query_suggestion",
      "itemId": "cozo-item:8b0d...:query_suggestion:2",
      "bundleId": "8b0d...",
      "parentId": "cozo-bundle:8b0d...",
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

The bundle itself is projector output, not model output.

That separation matters a lot. The model emits content. The projector emits structure.

## Detailed implementation plan for CozoDB

### 1. Fix request context plumbing first

This is the first patch, because today the anchor line vanishes into the swamp.

Change these files:

* `backend/pkg/api/types.go`
* `backend/pkg/hints/types.go`
* `backend/pkg/api/websocket.go`

Add `AnchorLine` to both request structs.

```go
type HintRequest struct {
    Question   string   `json:"question"`
    History    []string `json:"history,omitempty"`
    AnchorLine *int     `json:"anchorLine,omitempty"`
}
```

and

```go
type HintRequest struct {
    Question   string
    Schema     string
    History    []string
    AnchorLine *int
}
```

Then in `handleHintRequest`, actually pass it through:

```go
hintReq := hints.HintRequest{
    Question:   req.Question,
    Schema:     schema,
    History:    req.History,
    AnchorLine: req.AnchorLine,
}
```

Right now the frontend is already sending it. The backend just shrugs and drops it on the floor.

### 2. Introduce projection defaults in the hints package

Add a new file, something like:

* `backend/pkg/hints/projection_defaults.go`

```go
type ProjectionDefaults struct {
    BundleID   string
    AnchorLine *int
    Source     string // "hint.request" or "diagnosis.request"
    Mode       string // "hint" | "diagnosis"
}

func WithProjectionDefaults(ctx context.Context, d ProjectionDefaults) context.Context
func ProjectionDefaultsFromContext(ctx context.Context) ProjectionDefaults
func BundleEntityID(bundleID string) string
func ChildEntityID(bundleID, family string, ordinal int) string
```

In `handleHintRequest` and `handleDiagnosisRequest`:

* generate a backend bundle ID once per request
* attach defaults to the context before calling the engine

I would generate a real UUID here, not reuse the `hint-17`/`diag-3` display-ish IDs.

```go
bundleID := uuid.NewString()
reqCtx = hints.WithProjectionDefaults(reqCtx, hints.ProjectionDefaults{
    BundleID:   bundleID,
    AnchorLine: req.AnchorLine,
    Source:     "hint.request",
    Mode:       "hint",
})
```

For diagnosis:

```go
bundleID := uuid.NewString()
reqCtx = hints.WithProjectionDefaults(reqCtx, hints.ProjectionDefaults{
    BundleID: bundleID,
    Source:   "diagnosis.request",
    Mode:     "diagnosis",
})
```

That gives you deterministic grouping without asking the model to invent a family tree.

### 3. Enrich Cozo structured event types with projection metadata

Change:

* `backend/pkg/hints/structured_events.go`

Add a shared metadata block:

```go
type CozoProjectionMeta struct {
    BundleID string         `json:"bundle_id,omitempty"`
    ParentID string         `json:"parent_id,omitempty"`
    Ordinal  int            `json:"ordinal,omitempty"`
    Anchor   *AnchorPayload `json:"anchor,omitempty"`
    Mode     string         `json:"mode,omitempty"`
}
```

Then include it in preview/extracted/failed events.

```go
type EventCozoPayloadPreview struct {
    gepevents.EventImpl
    ItemID string `json:"item_id"`
    Family string `json:"family"`
    Data   any    `json:"data"`
    CozoProjectionMeta
}
```

Do the same for extracted and failed.

Update constructors so they accept projection meta.

This is where the projector-relevant metadata lives before translation to SEM JSON.

### 4. Make child IDs deterministic and stop using implicit geppetto item IDs as your domain identity

Right now preview item IDs come from `structuredsink` as `meta.ID:seq`, and final parse uses the same hidden convention.

That is okay for a prototype, but it leaks geppetto internals into your app shape.

I would switch to:

* keep the extractor/session ordinal from the structured sink
* derive the actual child entity ID from `(bundleId, family, ordinal)`

So:

* hint block 1 → `cozo-item:<bundleId>:hint:1`
* query suggestion block 2 → `cozo-item:<bundleId>:query_suggestion:2`
* doc ref block 3 → `cozo-item:<bundleId>:doc_ref:3`

That gives you stable preview/final merge keys and avoids tying UI identity to hidden message UUIDs.

### 5. Update streaming extractors to emit enriched preview events

Change:

* `backend/pkg/hints/structured_extractors.go`

Add fields to the session:

```go
type payloadExtractorSession[T any] struct {
    ...
    ordinal  int
    defaults ProjectionDefaults
}
```

When the session starts, parse the ordinal from the sink-generated `itemID` suffix once, then read defaults from the context.

You do **not** need a geppetto change for this. `structuredsink` already passes a per-item context into `NewSession()`. That is the useful seam.

When emitting preview:

* normalize payload
* validate payload
* inject default anchor if absent
* compute canonical bundle/parent/child IDs
* emit `NewCozoPayloadPreview(..., projectionMeta)`

Also update failed preview emission to carry the same bundle metadata so failures still land under the correct top-level widget.

### 6. Update final parsing to use the same deterministic IDs and defaults

Change:

* `backend/pkg/hints/structured_parser.go`

I would change the parser API to accept defaults, or simpler, have `runInference()` read defaults from `ctx` and pass them in.

Today:

```go
parsed := ParseStructuredResponse(sink.Metadata(), fullText)
```

Change to:

```go
defaults := ProjectionDefaultsFromContext(ctx)
parsed := ParseStructuredResponse(sink.Metadata(), fullText, defaults)
```

Then:

* make `structuredBlock` carry `Ordinal`
* use the same `ChildEntityID(bundleId, family, ordinal)` helper as preview extraction
* apply default anchor injection before emitting extracted events
* emit extracted and failed events with `bundleId`, `parentId`, `ordinal`, `anchor`, `mode`

The critical invariant is:

**preview and extracted must produce the same child IDs**

That is what makes status merge into one entity instead of blinking between unrelated phantoms.

### 7. Add anchor support to doc refs

Change:

* `backend/pkg/hints/structured_types.go`
* `backend/pkg/hints/extraction_config.yaml` if you want docs/examples to acknowledge it

Add:

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

Normalize it like the others.

Even if you inject anchor deterministically and do not rely on the model to emit it, the type should be able to carry it. Right now the type system and the frontend assumptions disagree.

### 8. Expand SEM JSON translation to include grouping metadata

Change:

* `backend/pkg/hints/sem_registry.go`

`wrapCozoSEMEvent()` and `wrapCozoSEMFrame()` should include the new metadata in `event.data`, and ideally set `event.stream_id` too.

For now, I’d make `stream_id == bundleId`.

Example payload shape:

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

And then in the event envelope:

```go
"event": map[string]any{
    "type":      eventType,
    "id":        id,
    "stream_id": meta.BundleID,
    "data":      payload,
}
```

That makes the raw event contract future-compatible with Pinocchio without forcing a big rewrite now.

### 9. Optionally include `stream_id` on the Cozo websocket llm/hint.result events too

This is not required for the grouping fix, but it is a very good cleanup.

Change:

* `backend/pkg/api/types.go`
* `backend/pkg/api/websocket.go`

Add `StreamID` to `WSEvent`:

```go
type WSEvent struct {
    Type     string `json:"type"`
    ID       string `json:"id,omitempty"`
    StreamID string `json:"stream_id,omitempty"`
    Data     any    `json:"data,omitempty"`
}
```

Then emit it on:

* `llm.start`
* `llm.delta`
* `llm.error`
* `hint.result`
* Cozo structured events via `WebSocketSEMSink`

This is optional for the current Cozo UI, but it gives you a clean correlation handle for later backend projection or richer debug tooling.

## Frontend refactor plan

### 10. Add a real bundle entity to `semProjection.js`

Change:

* `frontend/src/sem/semProjection.js`

Add:

```js
export const ENTITY_KIND_COZO_BUNDLE = "cozo_bundle";
```

Then split the logic:

* LLM / hint.result logic stays as-is
* Cozo structured events no longer go straight to leaf entities only
* each Cozo child event does:

  * upsert child entity
  * ensure parent bundle entity exists
  * append bundle entity to top-level order on first sighting

Do not use `buildSemThreads()` adjacency grouping anymore as the primary path.

Use explicit helpers:

```js
function extractCozoBundleId(event) { ... }
function extractCozoParentId(event) { ... }
function extractCozoOrdinal(event) { ... }
function extractCozoAnchorLine(event) { ... } // prefer event.data.anchor, fallback payload anchor
```

Child entity shape should gain:

* `parentId`
* `bundleId`
* `ordinal`
* `mode`

Bundle entity shape should at least gain:

* `bundleId`
* `anchorLine`
* `mode`
* `status`

I would keep `state.entities` and `state.order`, and simply append the bundle entity ID to `order` when first seen. That lets selectors filter bundle entities in order of first appearance without introducing a second store shape yet.

### 11. Replace adjacency grouping selectors with relation-based selectors

Still in `semProjection.js`, replace this mental model:

* “if a hint appears, subsequent items attach to it”

with this one:

* “select bundle entities”
* “load children whose `parentId === bundle.id`”
* “sort children by `ordinal`”

A useful selector pattern is:

```js
function getOrderedCozoBundles(state, predicate) {
  return state.order
    .map((id) => state.entities[id])
    .filter((e) => e?.kind === ENTITY_KIND_COZO_BUNDLE && predicate(e));
}

function getBundleChildren(state, bundleId) {
  return Object.values(state.entities)
    .filter((e) => e?.parentId === bundleId && isCozoLeafKind(e.kind))
    .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
}

function buildBundleThread(state, bundle) {
  const children = getBundleChildren(state, bundle.id);
  const hint = children.find((e) => e.kind === ENTITY_KIND_COZO_HINT) ?? null;
  return {
    id: bundle.id,
    bundle,
    hint,
    children: hint ? children.filter((e) => e.id !== hint.id) : children,
    anchorLine: bundle.anchorLine ?? null,
  };
}
```

Then `getInlineSemThreads()` and `getTrailingSemThreads()` can keep their current names and return shape, so `DatalogPad.jsx` barely changes.

### 12. Keep a temporary backward-compatible fallback

For one deploy cycle, I would make the frontend projector understand both:

* the new explicit `parentId` / `bundleId` path
* the old adjacency path if that metadata is missing

That lets you ship backend and frontend in either order without a synchronized kabuki dance.

The fallback should be clearly marked temporary. Otherwise it will fossilize and become your next swamp monster.

### 13. Update `CozoSemRenderer` to treat the top-level thing as a bundle, not a hint-thread accident

Change:

* `frontend/src/features/cozo-sem/CozoSemRenderer.jsx`

Right now the renderer mostly works already, but conceptually it thinks it received a thread built from adjacency.

After the refactor:

* `thread.id` should be the bundle ID
* collapse/dismiss state keys should use the bundle ID
* summary should prefer:

  * hint text
  * else first child label/title
  * else fallback text
* line label should come from `thread.anchorLine`, which now belongs to the bundle

You may also want to expose bundle status or mode later, but that is optional.

### 14. Keep `DatalogPad.jsx` changes minimal

Change:

* `frontend/src/DatalogPad.jsx`

Most of the component can stay as it is.

The only important behavioral change is that the collapsed/dismissed maps now key off bundle IDs rather than hint IDs or inferred thread IDs.

That is good. It means dismissing the top-level widget dismisses the whole grouped result, not just whichever child happened to become thread root.

## Prompt and extraction config changes

I would keep prompt changes small.

The big thing is: **do not add parent/child fields to the model output**.

The backend can infer all of that deterministically.

### What I would change

Change:

* `backend/pkg/hints/extraction_config.yaml`
* `backend/pkg/hints/prompt.go`

I would do two cleanups.

First, stop making the model do fake-ID labor unless you actually use those fields. Right now `hint_id`, `suggestion_id`, and `doc_ref_id` are in the examples, but the validators do not require them and the frontend does not use them.

So either:

* remove them from the examples entirely, or
* leave them accepted but mark them as optional and stop foregrounding them in the prompt examples

That reduces structured-output burden for no loss.

Second, do not rely on the model for `anchor`. The backend already knows the request anchor line. Inject it. You can still accept an `anchor` field if one appears, but it should not be authoritative.

### What I would not change

I would keep:

* exactly one primary hint block
* 2–4 query suggestions when useful
* 1–2 doc refs when useful

That gives you one natural top-level bundle per response, which is exactly what you want here.

## Tests to add before calling this done

### Backend

Update or add tests in:

* `backend/pkg/hints/structured_parser_test.go`
* new `backend/pkg/hints/structured_projection_test.go`
* maybe `backend/pkg/api/websocket_test.go`

Must-have cases:

1. **request anchor is preserved**

   * request with `anchorLine=4`
   * extracted hint/query/doc events all carry normalized anchor line 4

2. **preview and extracted use the same child IDs**

   * preview hint arrives
   * final extracted hint arrives
   * IDs match exactly

3. **all children from one response share one bundle**

   * hint + 2 suggestions + 1 doc ref
   * same `bundleId`
   * same `parentId`
   * increasing `ordinal`

4. **doc refs carry anchor after injection**

   * even if the YAML does not include anchor

5. **failed items still carry bundle metadata**

   * malformed query suggestion still renders under the correct bundle

6. **two concurrent responses on the same anchor line do not collide**

   * same `anchorLine`
   * different `bundleId`
   * no cross-group contamination

### Frontend

Update:

* `frontend/src/sem/semProjection.test.js`
* `frontend/src/features/cozo-sem/CozoSemRenderer.test.jsx`

Must-have cases:

1. **children group by `parentId`, not adjacency**
2. **interleaved events from two bundles stay separate**
3. **child-before-hint still lands in the right bundle**
4. **bundle anchor decides inline vs trailing placement**
5. **preview-to-extracted updates same child entity**
6. **collapse/dismiss uses bundle ID**
7. **old payloads without parent metadata still use temporary fallback**

That last one is only for the rollout window.

## Rollout order

I would ship this in four slices.

### Slice 1: backend metadata contract

Add:

* request anchor plumbing
* projection defaults context
* bundle/parent/ordinal metadata
* deterministic child IDs
* optional `stream_id`

Frontend still works with old grouping.

### Slice 2: frontend explicit grouping

Switch `semProjection.js` to bundle/child projection with fallback compatibility.

At this point Cozo stops depending on adjacency. This is the actual fix.

### Slice 3: prompt/config cleanup

Remove or de-emphasize LLM-generated IDs, keep parent/child deterministic.

### Slice 4: shared projector extraction

Only after the event contract stabilizes, extract the pure projection logic into a shareable JS module.

Do not start by sharing the whole current frontend projector. Share the **event-to-entity logic**, not the UI shell.

## Potential Pinocchio changes

For this Cozo fix, Pinocchio does **not** need transport changes.

`TimelineEntityV2` is already open enough to represent:

* `kind = "cozo_bundle"`
* `kind = "cozo_hint"`
* `kind = "cozo_query_suggestion"`
* `kind = "cozo_doc_ref"`

with props like:

* `parentId`
* `bundleId`
* `ordinal`
* `anchorLine`
* `mode`
* `status`

So no protobuf surgery needed. That beast is already dead.

What I would do later in cozodb backend:

1. Use a reducer that turns raw `cozo.*` SEM frames into:

   * one `cozo_bundle` upsert
   * one child upsert

2. Persist those via the existing projector/timeline store.

3. Render from the same grouped entity model on hydration.

Optional Pinocchio improvement that would help shared JS reducers:

* in `pkg/webchat/timeline_js_runtime.go`, add more context to the reducer `ctx` object:

  * `conv_id`
  * maybe `event_type`
  * maybe `stream_id`

You do not strictly need that for Cozo if the reducer is pure and event-driven, but it makes the backend runtime friendlier.

A small helper API in the JS runtime would also be nice later, something like:

```js
timeline.entity({ id, kind, props, meta })
```

Not necessary, just tidier.

## Potential Geppetto changes

You can implement the Cozo fix without changing Geppetto.

`structuredsink.NewFilteringSinkWithContext()` already gives you the crucial seam: per-item extractor sessions receive a context. That is enough to inject deterministic bundle defaults.

The only optional Geppetto change I’d consider later is a tiny convenience so extractors do not need to parse ordinal from the sink-generated `itemID` string suffix. Something like exposing item sequence directly would be cleaner.

But I would not block Cozo on that. It is polish, not architecture.

## The short verdict

The clean fix is:

* backend-generated `bundleId`
* deterministic child IDs from `(bundleId, family, ordinal)`
* backend-injected anchor from request context
* synthetic `cozo_bundle` projected entity
* frontend grouping by `parentId`, never by adjacency

And I would very explicitly **not** put parent/child responsibility into the LLM output. The model should write Cozo help, not maintain your filing system.
