---
Title: Geppetto/Pinocchio Streaming & Structured Extraction Architecture Analysis
Ticket: COZODB-002
Status: active
Topics:
    - streaming
    - structured-extraction
    - geppetto
    - pinocchio
    - rich-widgets
    - ai-completion
DocType: analysis
Intent: long-term
Owners: []
RelatedFiles:
    - /home/manuel/code/wesen/corporate-headquarters/geppetto/pkg/events/chat-events.go:Core event types and streaming event definitions
    - /home/manuel/code/wesen/corporate-headquarters/geppetto/pkg/events/structuredsink/filtering_sink.go:FilteringSink - intercepts streaming text and extracts structured blocks
    - /home/manuel/code/wesen/corporate-headquarters/pinocchio/pkg/webchat/sem_translator.go:EventTranslator - converts geppetto events to SEM frames for UI
    - /home/manuel/code/wesen/corporate-headquarters/pinocchio/pkg/sem/registry/registry.go:SEM registry - type-safe handler dispatch for events to SEM frames
    - /home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/internal/extractor/structured/context_extractors.go:ContextPayloadExtractor - generic YAML streaming extraction with debounced previews
    - /home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/internal/extractor/structured/context_payloads.go:Payload types (Entity, Fact, Relationship, etc.) with normalize/validate
    - /home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/internal/extractor/semtemporal/register.go:SEM registry wiring - maps extraction events to SEM frames for WebSocket delivery
    - /home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/internal/extractor/gorunner/sinks.go:Sink chain construction - FilteringSink wrapping fanout to multiple sinks
    - /home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/config/structured-event-extraction.example.yaml:Example extraction config with tagged YAML blocks and stop policy
    - /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/hints/engine.go:Current cozodb-editor hint engine - raw Anthropic SDK streaming
    - /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/websocket.go:Current cozodb-editor WebSocket handler with ad-hoc SEM-like events
ExternalSources: []
Summary: Comprehensive analysis of geppetto event system, pinocchio SEM frame protocol, FilteringSink structured extraction, and temporal-relationships reference implementation, with a migration plan for the cozodb-editor project.
LastUpdated: 2026-03-14T23:12:32.377605356-04:00
WhatFor: Architecture analysis and migration planning
WhenToUse: When integrating geppetto/pinocchio streaming and structured extraction into cozodb-editor
---

# Geppetto/Pinocchio Streaming & Structured Extraction Architecture Analysis

## 1. Executive Summary

The cozodb-editor currently uses the raw Anthropic Go SDK directly for LLM inference and streaming, with a hand-rolled WebSocket event protocol that mimics SEM (Semantic Event Model) frames. This analysis documents how to replace that with the full geppetto/pinocchio stack to gain:

1. **Multi-provider inference** via geppetto's engine abstraction (Anthropic, OpenAI, Gemini)
2. **Structured extraction during streaming** via FilteringSink + custom extractors
3. **SEM frame protocol** for type-safe, protobuf-backed UI events
4. **Rich widget support** for progressively-rendered extraction results (SEM frames as entities)
5. **YAML-tagged structured blocks** that the LLM emits inline and that are parsed/validated in real-time

The temporal-relationships project serves as the canonical reference implementation of this full pipeline.

---

## 2. Architecture Layers

### 2.1 The Three-Layer Stack

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND (React)                                   │
│  WebSocket client → SEM frame dispatch → Rich widgets│
│  semProjection.ts, useSemStream.ts                   │
├─────────────────────────────────────────────────────┤
│  PINOCCHIO (Go backend / webchat)                   │
│  EventTranslator → SEM registry → WebSocket send    │
│  sem_translator.go, registry.go, webchat/router.go   │
├─────────────────────────────────────────────────────┤
│  GEPPETTO (Go inference library)                    │
│  Engine → EventSink → FilteringSink → Extractors     │
│  chat-events.go, filtering_sink.go, parsehelpers/    │
└─────────────────────────────────────────────────────┘
```

### 2.2 Current cozodb-editor Architecture (what we're replacing)

```
┌──────────────────────────────────────┐
│  React Frontend (DatalogPad.jsx)     │
│  WebSocket: ws/hints                 │
│  Events: llm.start, llm.delta,      │
│          hint.result, llm.error      │
├──────────────────────────────────────┤
│  Go Backend (main.go)               │
│  WSHandler → hints.Engine            │
│  Raw anthropic-sdk-go streaming      │
│  DeltaCallback(string)               │
└──────────────────────────────────────┘
```

**Problems with current approach:**
- Locked to Anthropic SDK — no multi-provider support
- No structured extraction — entire LLM response parsed as JSON after completion
- No streaming previews — structured data only available after full response
- Ad-hoc event protocol — `{sem: true, event: {type, id, data}}` but no protobuf schema
- No FilteringSink — tagged blocks in LLM output would leak to UI text

---

## 3. Geppetto Event System (Deep Dive)

### 3.1 Event Types

Geppetto defines a comprehensive event taxonomy in `pkg/events/chat-events.go`:

| Category | Event Types | Purpose |
|----------|------------|---------|
| **Text stream** | `start`, `partial`, `final` | LLM text completion lifecycle |
| **Thinking** | `partial-thinking` | Reasoning/summary text (separate stream) |
| **Tool calls** | `tool-call`, `tool-result`, `tool-call-execute`, `tool-call-execution-result` | Tool use lifecycle |
| **Error/Control** | `error`, `interrupt`, `status` | Error handling and flow control |
| **Logging** | `log`, `info` | Structured logging during inference |
| **Web search** | `web-search-started/searching/open-page/done` | Built-in web search progress |
| **Code interpreter** | `code-interpreter-started/interpreting/done/code-delta/code-done` | Code execution events |
| **Reasoning** | `reasoning-text-delta`, `reasoning-text-done` | Non-summary reasoning text |
| **MCP** | `mcp-args-delta/done`, `mcp-in-progress/completed/failed` | MCP tool lifecycle |
| **Image gen** | `image-generation-*` | Image generation progress |
| **Custom** | `agent-mode-switch`, `debugger.pause` | Agent/debugger events |

### 3.2 Event Interface

```go
type Event interface {
    Type() EventType
    Metadata() EventMetadata
    Payload() []byte
}

type EventMetadata struct {
    LLMInferenceData  // model, temperature, usage, etc.
    ID          uuid.UUID
    SessionID   string
    InferenceID string
    TurnID      string
    Extra       map[string]interface{}
}
```

### 3.3 EventSink Interface

```go
type EventSink interface {
    PublishEvent(ev Event) error
}
```

This is the core abstraction — sinks can be chained, fanned out, and wrapped. The FilteringSink is an EventSink decorator.

### 3.4 Event Deserialization

`NewEventFromJson([]byte)` dispatches on the `type` field and returns typed events. An external decoder registry (`lookupDecoder`) allows registering custom event types — this is how application-specific events (like `context-payload-extracted`) can be deserialized.

---

## 4. FilteringSink: Structured Extraction During Streaming

### 4.1 Core Concept

The FilteringSink (`pkg/events/structuredsink/filtering_sink.go`) is the key innovation. It sits between the LLM engine and downstream sinks, intercepting `EventPartialCompletion` events and:

1. **Detecting structured tags** in the streaming text: `<package:type:version>...</package:type:version>`
2. **Filtering them out** of the user-visible completion text (so the UI never sees raw tags)
3. **Routing captured content** to registered `Extractor` sessions for typed parsing

### 4.2 Tag Format

```
<mento:entity:v1>
entity_token: ent-acme
display_name: Acme Corp
entity_type: organization
evidence: Mentioned as the contracting organization.
</mento:entity:v1>
```

Tags follow the pattern `<package:type:version>` with alphanumeric/underscore/dash/dot characters. The close tag mirrors the open tag with a `/` prefix.

### 4.3 Extractor Interface

```go
type Extractor interface {
    TagPackage() string  // e.g., "mento"
    TagType() string     // e.g., "entity", "fact", "relationship"
    TagVersion() string  // e.g., "v1"
    NewSession(ctx context.Context, meta EventMetadata, itemID string) ExtractorSession
}

type ExtractorSession interface {
    OnStart(ctx context.Context) []events.Event
    OnRaw(ctx context.Context, chunk []byte) []events.Event
    OnCompleted(ctx context.Context, raw []byte, success bool, err error) []events.Event
}
```

**Key design points:**
- Each `<tag>...</tag>` occurrence gets its own `ExtractorSession`
- `OnRaw` is called with streaming chunks as they arrive (for progressive parsing)
- `OnCompleted` is called when the close tag is found (with the full raw content)
- Sessions return `[]events.Event` — typed events that are published downstream
- **Transient vs. authoritative**: FilteringSink previews are transient (UX only); durable persistence should happen at `RunInference` boundaries

### 4.4 The Lag Buffer

The FilteringSink uses a lag buffer to avoid leaking partial close-tag bytes to the extractor payload. It holds `len(closeTag) - 1` bytes and only releases them to the payload buffer once it's confirmed they're not the start of a close tag. This is critical for correct byte-level streaming extraction.

### 4.5 Malformed Block Handling

Three policies for unclosed/malformed structured blocks:
- `MalformedErrorEvents` (default): calls `OnCompleted(false)`, does not reinsert text
- `MalformedReconstructText`: reinserts reconstructed block into filtered text
- `MalformedIgnore`: drops captured payload silently

---

## 5. The temporal-relationships Reference Implementation

### 5.1 Extraction Pipeline

The temporal-relationships project demonstrates the complete pipeline:

```
User input → Prompt template → LLM inference
    ↓
EventSink chain:
    ↓
FilteringSink (wrapping fanoutSink)
    ├── Registered extractors: session_arc, entity, fact, pattern, language_marker, commitment, relationship
    ├── Each uses ContextPayloadExtractor[T] with debounced YAML parsing
    ├── OnRaw: progressive YAML parse → SHA-deduped preview events
    └── OnCompleted: (intentionally empty — previews are transient)
    ↓
fanoutSink → [timeline printer, websocket forwarder, persistence sink]
    ↓
SEM registry handlers → wrapSEMEvent() → WebSocket → React UI
```

### 5.2 ContextPayloadExtractor[T] — Generic YAML Streaming Extractor

```go
type ContextPayloadExtractor[T any] struct {
    pkg       string        // "mento"
    typ       string        // "entity", "fact", etc.
    ver       string        // "v1"
    normalize func(*T)      // field normalization
    validate  func(*T) bool // field validation
}
```

This is a **generic, reusable extractor** parameterized by the payload type. It:

1. Creates a `contextSession[T]` per tag occurrence
2. Uses `parsehelpers.NewDebouncedYAML[T]` for incremental YAML parsing
3. On each `OnRaw` call, feeds bytes and checks for a new valid snapshot
4. SHA-dedupes previews to avoid spamming the UI with identical frames
5. Emits `EventContextPayloadPreview` with the parsed typed payload

**Debounce config:**
```go
parsehelpers.DebounceConfig{
    SnapshotEveryBytes: 256,
    SnapshotOnNewline:  true,
    MaxBytes:           64 << 10,
}
```

### 5.3 Payload Types

Each extraction type has a Go struct with YAML/JSON tags, `Normalize()`, and `IsValid()`:

| Type | Key Fields | Stable ID |
|------|-----------|-----------|
| `SessionArcPayload` | opening_state, key_shift, closing_state, breakthrough_indicator | — |
| `EntityPayload` | entity_token, display_name, entity_type, relationship_to_member | `stableID("ent", display_name, entity_type)` |
| `FactPayload` | fact_id, fact_text, fact_date, confidence, source_type, entity_tokens | `stableID("fact", op, kind, key, text, date)` |
| `PatternPayload` | pattern_id, pattern_name, pattern_type, status | `stableID("pattern", type, name)` |
| `LanguageMarkerPayload` | marker_id, quote, significance, category, polarity | `stableID("marker", quote, category, polarity)` |
| `CommitmentPayload` | commitment_id, commitment_text, status | `stableID("commit", text)` |
| `ContextRelationshipPayload` | relationship_id, source_kind/id, target_kind/id, rel_type | `stableID("rel", source_kind, source_id, rel_type, target_kind, target_id)` |

### 5.4 SEM Event Registration (semtemporal/register.go)

The bridge between geppetto's event system and the SEM WebSocket protocol:

```go
semregistry.RegisterByType[*EventContextPayloadPreview](func(ev *EventContextPayloadPreview) ([][]byte, error) {
    frame, err := wrapSEMEvent("context."+family+".preview", id, payload)
    return [][]byte{frame}, nil
})

semregistry.RegisterByType[*EventContextPayloadExtracted](func(ev *EventContextPayloadExtracted) ([][]byte, error) {
    frame, err := wrapSEMEvent("context."+family+".extracted", id, payload)
    return [][]byte{frame}, nil
})
```

This produces SEM frames like:
```json
{
  "sem": true,
  "event": {
    "type": "context.entity.preview",
    "id": "ent-acme",
    "data": {
      "family": "entity",
      "itemId": "...",
      "data": { "entity_token": "ent-acme", "display_name": "Acme Corp", ... },
      "transient": true,
      "status": "in_progress"
    }
  }
}
```

### 5.5 Timeline Projection (Frontend)

The temporal-relationships frontend (`ui/src/ws/semProjection.ts`) maintains a projected state:

```typescript
type ProjectedTimelineEntity = {
  id: string;
  kind: string;       // "context_entity", "context_fact", etc.
  createdAtMs: number;
  updatedAtMs: number;
  version?: number;
  props: Record<string, unknown>;
};
```

SEM events are dispatched by type to handlers that upsert entities in a `byId` map. Preview events (transient) update the same entities as extracted events, giving a live-updating UI.

---

## 6. Pinocchio SEM Protocol

### 6.1 SEM Frame Format

Every SEM frame is a JSON object:
```json
{
  "sem": true,
  "event": {
    "type": "llm.delta",
    "id": "message-uuid",
    "data": { ... },        // protobuf-backed payload
    "metadata": { ... }     // optional LLM inference metadata
  }
}
```

### 6.2 Standard SEM Event Types

| Type | Purpose | Protobuf |
|------|---------|----------|
| `llm.start` | LLM completion begins | `LlmStart` |
| `llm.delta` | Text chunk | `LlmDelta` (delta + cumulative) |
| `llm.final` | Completion done | `LlmFinal` (full text) |
| `llm.thinking.start/delta/final/summary` | Reasoning text | Same protos |
| `tool.start` | Tool call initiated | `ToolStart` (name + input) |
| `tool.delta` | Tool execution progress | `ToolDelta` |
| `tool.result` | Tool result received | `ToolResult` |
| `tool.done` | Tool lifecycle complete | `ToolDone` |
| `log` | Structured log | `LogV1` |
| `agent.mode` | Agent mode switch | `AgentModeV1` |
| `debugger.pause` | Debugger pause | `DebuggerPauseV1` |
| `context.{family}.preview` | Streaming extraction preview | Custom JSON |
| `context.{family}.extracted` | Final extracted entity | Custom JSON |
| `context.{family}.failed` | Extraction failure | Custom JSON |

### 6.3 SEM Registry (`pinocchio/pkg/sem/registry`)

Type-safe handler dispatch using Go generics:

```go
func RegisterByType[T any](fn func(T) ([][]byte, error))
func Handle(e events.Event) ([][]byte, bool, error)
```

Handlers are registered by concrete event type (via `reflect.Type`). When `Handle` is called, it looks up handlers by the runtime type of the event and invokes the first one that returns non-nil frames.

### 6.4 EventTranslator (`pinocchio/pkg/webchat`)

The `EventTranslator` provides:
- Stable message ID resolution across streaming events (using inferenceID/turnID/sessionID)
- Default handler registration for all core geppetto event types
- Tool call caching for name/input correlation with results

---

## 7. Code Quality Assessment

### 7.1 Current cozodb-editor Code

**Positives:**
- Clean separation: `pkg/hints` (inference), `pkg/api` (HTTP/WS), `pkg/cozo` (database)
- WebSocket messages already follow a SEM-like envelope (`{sem: true, event: {...}}`)
- Streaming works via `DeltaCallback` pattern

**Issues:**
- **Direct Anthropic SDK coupling** (`anthropic-sdk-go`): No abstraction layer; switching providers requires rewriting engine.go
- **JSON-only extraction** (`parseHintResponse`): Entire response must complete before structured data is available; no streaming extraction
- **No event type system**: `DeltaCallback func(delta string)` loses all metadata (model, usage, session correlation)
- **No FilteringSink**: If prompts evolve to emit tagged structured blocks, raw tags will leak to the UI
- **Hardcoded model**: `anthropic.ModelClaudeSonnet4_20250514` — no profile/config system

### 7.2 Geppetto Code Quality

**Strengths:**
- Mature event system with 30+ event types covering all LLM interaction patterns
- Generic `ToTypedEvent[T]` deserialization with external decoder registry
- Clean EventSink interface enabling composable sink chains
- FilteringSink has excellent edge-case handling (lag buffer, split tags across deltas, malformed policies)
- Comprehensive test coverage (filtering_sink_test.go, fuzz tests)

**Concerns:**
- Large switch statement in `NewEventFromJson` (700+ lines) — could use registry pattern
- Some TODO comments dating to 2024 about tool call handling
- The event type hierarchy is flat (no grouping/namespacing beyond string prefixes)

### 7.3 Pinocchio Code Quality

**Strengths:**
- Registry pattern for SEM handlers — extensible without modifying core code
- Protobuf-backed SEM frames provide schema evolution and cross-language compatibility
- `EventTranslator` manages complex state (message ID correlation, tool call caching) cleanly
- Separation of concerns: inference runtime, webchat, SEM translation, persistence

**Concerns:**
- `RegisterByType` uses `reflect.Type` which can be fragile with pointer/value receiver confusion
- Default handlers registered in `init()` — could cause issues in tests if not `Clear()`ed

### 7.4 temporal-relationships Code Quality

**Strengths:**
- Clean generic `ContextPayloadExtractor[T]` pattern — highly reusable for any YAML-tagged extraction
- SHA-deduped previews prevent UI spam
- Explicit separation of transient (preview) vs. authoritative (extracted) events
- Stable ID generation via deterministic hashing
- Well-structured normalize/validate on every payload type

**Concerns:**
- `OnCompleted` is intentionally empty (extraction happens at RunInference boundary) — this design choice is correct but could confuse newcomers
- The `register.go` in semtemporal has some repetitive handler registration

---

## 8. Migration Plan for cozodb-editor

### 8.1 Phase 1: Add Geppetto/Pinocchio Dependencies

**Goal:** Replace `anthropic-sdk-go` with geppetto's inference engine.

1. Add `go-go-golems/geppetto` and `go-go-golems/pinocchio` to `go.mod`
2. Create a geppetto engine configuration (YAML-based, like temporal-relationships)
3. Replace `hints.Engine` with geppetto's engine builder + step controller
4. Wire `EventSink` chain instead of `DeltaCallback`

**Key files to modify:**
- `backend/go.mod` — add dependencies
- `backend/pkg/hints/engine.go` — rewrite to use geppetto engine
- `backend/pkg/api/websocket.go` — rewrite to use EventSink → SEM translator

### 8.2 Phase 2: Implement SEM Frame Protocol

**Goal:** Replace ad-hoc WebSocket events with proper SEM frames.

1. Import pinocchio's `webchat.EventTranslator` and `sem/registry`
2. Register default SEM handlers (llm.start/delta/final, tool events)
3. Forward SEM frames over WebSocket instead of ad-hoc JSON
4. Update frontend to consume SEM frame format

**Current → New event mapping:**
| Current | SEM |
|---------|-----|
| `llm.start` | `llm.start` (with protobuf data) |
| `llm.delta` | `llm.delta` (with delta + cumulative) |
| `hint.result` | `llm.final` + custom extraction events |
| `llm.error` | `llm.error` (or geppetto error event) |

### 8.3 Phase 3: Add Structured Extraction via FilteringSink

**Goal:** Extract structured hints (code, docs, chips) progressively during streaming.

1. Define CozoScript-specific payload types (analogous to temporal-relationships payloads):

```go
// Tag format: <cozo:hint:v1>
type HintPayload struct {
    Text    string   `yaml:"text"`
    Code    string   `yaml:"code,omitempty"`
    Chips   []string `yaml:"chips,omitempty"`
    Warning string   `yaml:"warning,omitempty"`
}

// Tag format: <cozo:docref:v1>
type DocRefPayload struct {
    Title   string `yaml:"title"`
    Section string `yaml:"section"`
    Body    string `yaml:"body"`
}

// Tag format: <cozo:query:v1>
type QuerySuggestionPayload struct {
    Script      string `yaml:"script"`
    Description string `yaml:"description"`
    Confidence  string `yaml:"confidence"`
}
```

2. Create extractors using the generic `ContextPayloadExtractor[T]` pattern
3. Wire FilteringSink with these extractors in the sink chain
4. Register SEM handlers for the custom extraction events

**Sink chain:**
```
geppetto Engine
    → FilteringSink (with cozo extractors)
        → fanoutSink
            → WebSocket SEM forwarder
            → (optional) persistence sink
```

### 8.4 Phase 4: Rich Widget Frontend

**Goal:** Render extracted structured data as live-updating widgets during streaming.

1. Create a SEM projection layer (like temporal-relationships' `semProjection.ts`)
2. Create React components for each entity type:
   - `HintCard` — renders hint text with progressive updates
   - `CodeBlock` — syntax-highlighted CozoScript suggestion (builds as tokens arrive)
   - `DocRefPanel` — collapsible documentation reference
   - `QuerySuggestion` — runnable query suggestion with confidence badge
3. The projection layer maintains a `byId` map of entities
4. Preview events update entities with `transient: true` styling (e.g., pulsing border)
5. Extracted events update entities with `transient: false` (solid, finalized)

### 8.5 Phase 5: Prompt Engineering for Tagged Output

**Goal:** Update system prompts to instruct the LLM to emit tagged YAML blocks.

Update the system prompt to instruct the model:
```
When providing a CozoScript suggestion, emit it in this format:

<cozo:query:v1>
script: |
  ?[name, age] := *people{name, age}, age > 30
description: Find all people older than 30
confidence: high
</cozo:query:v1>

When providing documentation references, emit:

<cozo:docref:v1>
title: CozoScript Joins
section: §3.2
body: Use comma-separated atoms in the rule body to express joins.
</cozo:docref:v1>
```

The FilteringSink will automatically strip these tags from the visible text and route them to extractors.

---

## 9. Key Integration Points

### 9.1 Geppetto Engine Setup

```go
import (
    "github.com/go-go-golems/geppetto/pkg/inference/engine"
    "github.com/go-go-golems/geppetto/pkg/inference/toolloop/enginebuilder"
)

// Build engine from config/profile
eng, err := enginebuilder.NewEngineFromConfig(ctx, config, profile)
```

### 9.2 Sink Chain Construction

```go
import (
    "github.com/go-go-golems/geppetto/pkg/events/structuredsink"
)

// Build extractors
extractors := []structuredsink.Extractor{
    NewHintExtractor(),
    NewDocRefExtractor(),
    NewQuerySuggestionExtractor(),
}

// Build sink chain
wsSink := &WebSocketSEMSink{conn: wsConn}  // forwards SEM frames
filteringSink := structuredsink.NewFilteringSink(
    wsSink,
    structuredsink.Options{Malformed: structuredsink.MalformedErrorEvents},
    extractors...,
)

// Use filteringSink as the engine's event sink
```

### 9.3 SEM Registration

```go
import semregistry "github.com/go-go-golems/pinocchio/pkg/sem/registry"

// Register custom extraction event → SEM frame mapping
semregistry.RegisterByType[*EventHintPreview](func(ev *EventHintPreview) ([][]byte, error) {
    frame, _ := json.Marshal(map[string]any{
        "sem": true,
        "event": map[string]any{
            "type": "cozo.hint.preview",
            "id":   ev.ItemID,
            "data": map[string]any{
                "text":      ev.Data.Text,
                "code":      ev.Data.Code,
                "chips":     ev.Data.Chips,
                "transient": true,
            },
        },
    })
    return [][]byte{frame}, nil
})
```

### 9.4 WebSocket SEM Sink

```go
type WebSocketSEMSink struct {
    conn    *websocket.Conn
    writeMu sync.Mutex
    translator *webchat.EventTranslator
}

func (s *WebSocketSEMSink) PublishEvent(ev events.Event) error {
    frames := s.translator.Translate(ev)
    s.writeMu.Lock()
    defer s.writeMu.Unlock()
    for _, frame := range frames {
        if err := s.conn.WriteMessage(websocket.TextMessage, frame); err != nil {
            return err
        }
    }
    return nil
}
```

---

## 10. Extraction Config Format

Based on the temporal-relationships example, the extraction config for cozodb-editor would look like:

```yaml
engine:
  mode: anthropic  # or openai, gemini — resolved by profile

prompt:
  systemPrompt_file: prompts/cozo-hint-system.txt.tmpl
  userPrompt_file: prompts/cozo-hint-user.txt.tmpl

profiles:
  registrySources:
    - profile-registry.yaml

loop:
  maxIterations: 1  # hints are single-turn
  timeoutMs: 30000
  tags:
    app: cozodb-editor
    mode: hint

stopPolicy:
  acceptedStopReasons:
    - end_turn
    - max_tokens
```

---

## 11. Frontend SEM Consumption Pattern

```typescript
// types.ts
type SemEnvelope = {
  sem: true;
  event: {
    type: string;
    id: string;
    data?: unknown;
  };
};

// dispatch based on event type
function handleSemEvent(envelope: SemEnvelope) {
  const { type, id, data } = envelope.event;

  switch (type) {
    case 'llm.start':
      // Show streaming indicator
      break;
    case 'llm.delta':
      // Append text delta to chat bubble
      break;
    case 'llm.final':
      // Finalize chat bubble
      break;
    case 'cozo.hint.preview':
      // Update hint widget (transient styling)
      upsertEntity(id, 'hint', data, { transient: true });
      break;
    case 'cozo.query.preview':
      // Update query suggestion widget (building...)
      upsertEntity(id, 'query_suggestion', data, { transient: true });
      break;
    case 'cozo.query.extracted':
      // Finalize query suggestion widget
      upsertEntity(id, 'query_suggestion', data, { transient: false });
      break;
    case 'cozo.docref.extracted':
      // Show documentation reference card
      upsertEntity(id, 'doc_ref', data, { transient: false });
      break;
  }
}
```

---

## 12. Dependencies and Module Paths

| Module | Import Path | Purpose |
|--------|------------|---------|
| geppetto | `github.com/go-go-golems/geppetto` | Events, inference, FilteringSink |
| pinocchio | `github.com/go-go-golems/pinocchio` | SEM registry, webchat, EventTranslator |
| glazed | `github.com/go-go-golems/glazed` | CLI framework (for extract commands) |

**Note:** The cozodb-editor currently depends only on `anthropic-sdk-go` and `gorilla/websocket`. Adding geppetto/pinocchio will bring in a significant dependency tree (watermill, zerolog, protobuf, etc.). This is an acceptable trade-off for the functionality gained.

---

## 13. Risk Analysis

| Risk | Mitigation |
|------|-----------|
| Large dependency tree from geppetto/pinocchio | Start with a thin wrapper; import only needed packages |
| FilteringSink complexity (lag buffer, split tags) | Well-tested in production (temporal-relationships); use as-is |
| Prompt engineering for tagged output | Can iterate; tags only affect extraction, text still streams normally |
| Frontend complexity increase | SEM projection layer is proven pattern; copy from temporal-relationships |
| Breaking existing WebSocket protocol | Phase 2 can maintain backward compatibility during transition |

---

## 14. Recommended Implementation Order

1. **Week 1:** Add geppetto dependency, create engine wrapper, replace direct Anthropic calls
2. **Week 2:** Wire FilteringSink with basic extractors, test structured extraction
3. **Week 3:** Implement SEM protocol on WebSocket, update frontend to consume SEM frames
4. **Week 4:** Build rich widgets for progressive extraction display
5. **Week 5:** Prompt engineering, polish, and integration testing
