---
Title: AI Hint Engine Guide
Ticket: COZODB-001
Status: active
Topics:
    - ai-completion
    - websocket
    - backend
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - "/home/manuel/code/wesen/corporate-headquarters/pinocchio/pkg/webchat/sem_translator.go:SEM event translator — converts geppetto events to SEM frames"
    - "/home/manuel/code/wesen/corporate-headquarters/pinocchio/pkg/webchat/stream_coordinator.go:Stream coordinator — subscribes to events, dispatches SEM frames"
    - "/home/manuel/code/wesen/corporate-headquarters/pinocchio/pkg/webchat/stream_backend.go:Stream backend — watermill pubsub transport"
    - "/home/manuel/code/wesen/corporate-headquarters/pinocchio/pkg/webchat/ws_publisher.go:WebSocket publisher — broadcasts to connection pool"
    - "/home/manuel/code/wesen/corporate-headquarters/geppetto/pkg/events/structuredsink/filtering_sink.go:FilteringSink — extracts structured blocks from streaming text"
    - "/home/manuel/code/wesen/corporate-headquarters/geppetto/pkg/inference/engine/engine.go:Engine interface — RunInference(Turn) -> Turn"
    - "/home/manuel/code/wesen/corporate-headquarters/geppetto/pkg/inference/engine/structured_output.go:StructuredOutputConfig — JSON schema mode for structured responses"
    - "/home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/internal/extractor/httpapi/stream_manager.go:Reference implementation — extraction stream manager with WebSocket"
    - "/home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/internal/extractor/structured/context_extractors.go:Reference implementation — structured extraction from streaming LLM output"
    - "/home/manuel/code/wesen/2026-03-14--cozodb-editor/imports/query2.jsx:Frontend prototype — defines the AIResponse shape the engine must produce"
ExternalSources: []
Summary: "How to build the AI hint engine using pinocchio/geppetto for streaming WebSocket-based LLM completions with structured data extraction (SEM) to generate Datalog Pad hint responses"
LastUpdated: 2026-03-14T15:30:00.000000000-04:00
WhatFor: "Guide for implementing the streaming AI hint generation backend"
WhenToUse: "When implementing the AI hint engine that powers #?? inline assistance"
---

# AI Hint Engine Guide

## Executive Summary

The AI Hint Engine produces structured hint responses (explanation, code, suggestion
chips, doc links, warnings) from user questions about CozoScript/Datalog. It uses:

1. **Geppetto** — inference engine abstraction (`Engine.RunInference`)
2. **Structured Output** — JSON schema mode to guarantee typed responses
3. **SEM (Structured Event Model)** — protobuf-based streaming event protocol
4. **Watermill** — in-memory pubsub for decoupled event flow
5. **WebSocket** — real-time delivery to the frontend via connection pool

The architecture follows the patterns established in `temporal-relationships` and
pinocchio's `webchat` package, adapted for the simpler hint-generation use case.

## Architecture Overview

```
Frontend (DatalogPad)                    Go Backend
┌──────────────────┐      WebSocket      ┌──────────────────────────────┐
│ User types #??   │ ──── question ────> │ /ws/hints                    │
│ question, Enter  │                     │                              │
│                  │                     │ ┌────────────────────────────┐│
│                  │ <── SEM frames ──── │ │ Stream Manager             ││
│ AIBlock renders  │    llm.start        │ │  ├─ EventSink (pubsub)    ││
│ streaming text,  │    llm.delta        │ │  ├─ StreamCoordinator     ││
│ then final       │    llm.final        │ │  ├─ ConnectionPool        ││
│ structured data  │    hint.result      │ │  └─ TimelineProjector     ││
│                  │                     │ └────────────────────────────┘│
└──────────────────┘                     │           │                   │
                                         │           ▼                   │
                                         │ ┌────────────────────────────┐│
                                         │ │ Geppetto Engine            ││
                                         │ │  ├─ System prompt          ││
                                         │ │  ├─ CozoScript context     ││
                                         │ │  ├─ Schema context         ││
                                         │ │  └─ Structured output      ││
                                         │ │     (JSON schema mode)     ││
                                         │ └────────────────────────────┘│
                                         │           │                   │
                                         │           ▼                   │
                                         │ ┌────────────────────────────┐│
                                         │ │ CozoDB                     ││
                                         │ │  (schema introspection,    ││
                                         │ │   query validation)        ││
                                         │ └────────────────────────────┘│
                                         └──────────────────────────────┘
```

## Key Concepts from Pinocchio/Geppetto

### 1. Engine Interface (geppetto)

The core abstraction is simple:

```go
// pkg/inference/engine/engine.go
type Engine interface {
    RunInference(ctx context.Context, t *turns.Turn) (*turns.Turn, error)
}
```

A `Turn` contains the conversation messages. The engine calls the LLM provider and
returns the response turn. Provider-specific engines (Anthropic, OpenAI, etc.) all
implement this.

### 2. Structured Output Config

Geppetto supports JSON schema mode for structured responses:

```go
// pkg/inference/engine/structured_output.go
type StructuredOutputConfig struct {
    Mode         StructuredOutputMode // "json_schema"
    Name         string               // Schema name
    Schema       map[string]any       // JSON Schema
    Strict       *bool                // Strict validation
    RequireValid bool
}
```

This is how we'll ensure the LLM returns properly typed hint responses.

### 3. EventSink → Watermill Pubsub → SEM Frames → WebSocket

The streaming pipeline:

```
Engine.RunInference
  → emits events to EventSink (partial completions, final, tool calls)
    → EventSink publishes to Watermill topic (in-memory gochannel)
      → StreamCoordinator subscribes, converts to SEM frames
        → SEM frames broadcast to ConnectionPool (WebSocket clients)
```

**Key types from `temporal-relationships/stream_manager.go`:**

```go
// In-memory pubsub channel (per conversation)
pubsub := gochannel.NewGoChannel(gochannel.Config{
    OutputChannelBuffer:            512,
    BlockPublishUntilSubscriberAck: true,
}, watermill.NopLogger{})

// EventSink that publishes geppetto events as SEM frames
sink := &semPublishingSink{
    publisher: pubsub,
    topic:     "chat:" + convID,
}

// Connection pool for WebSocket broadcast
pool := webchat.NewConnectionPool(convID, 0, nil)

// Stream coordinator: subscribe → translate → broadcast
coordinator := webchat.NewStreamCoordinator(
    convID,
    pubsub,
    nil, // onEvent callback (optional)
    func(_ events.Event, cursor webchat.StreamCursor, frame []byte) {
        pool.Broadcast(frame) // Send SEM frame to all WebSocket clients
    },
)
```

### 4. SEM Frame Format

SEM frames are JSON envelopes sent over WebSocket:

```json
{
  "sem": true,
  "event": {
    "type": "llm.delta",
    "id": "msg-abc123",
    "seq": 42,
    "data": {
      "id": "msg-abc123",
      "delta": "Use :where clauses with a ",
      "cumulative": "Use :where clauses with a "
    }
  }
}
```

**Event types for hint streaming:**
| Type | When | Data |
|------|------|------|
| `llm.start` | Inference begins | `{id, role: "assistant"}` |
| `llm.delta` | Each text chunk | `{id, delta, cumulative}` |
| `llm.final` | Inference complete | `{id, text}` |
| `hint.result` | Parsed hint | `{id, ...HintResponse}` (custom) |

### 5. FilteringSink for Structured Extraction

For progressive extraction during streaming, geppetto provides `FilteringSink`:

```go
// pkg/events/structuredsink/filtering_sink.go
type FilteringSink struct { ... }

// Wraps a downstream sink, intercepts streaming text, extracts structured
// blocks tagged with <package:type:version> markers, and emits typed events
// via registered Extractors.

type Extractor interface {
    TagPackage() string
    TagType() string
    TagVersion() string
    NewSession(ctx, meta, itemID) ExtractorSession
}

type ExtractorSession interface {
    OnStart(ctx) []events.Event
    OnRaw(ctx, chunk []byte) []events.Event
    OnCompleted(ctx, raw []byte, success bool, err error) []events.Event
}
```

This is used in `temporal-relationships` for progressive YAML extraction from streaming
LLM output. For our hint engine, we have two options:

**Option A: Structured Output (JSON Schema mode)** — simpler, preferred for hints
- Configure the engine with `StructuredOutputConfig` to force JSON output
- Parse the final JSON response into `HintResponse`
- Stream the raw text deltas to the frontend for progressive rendering

**Option B: FilteringSink with tagged blocks** — more complex, better for mixed content
- LLM outputs free text mixed with `<mento:hint:v1>...</mento:hint:v1>` blocks
- FilteringSink extracts and parses the structured data while streaming
- Better for streaming partial hints, but more complexity

**Recommendation: Use Option A** (Structured Output) for the initial implementation.
The entire response is structured, so JSON schema mode is natural.

## Hint Response Schema

Based on the frontend prototype (`imports/query2.jsx` MOCK_RESPONSES), the LLM must
produce responses matching this JSON schema:

```json
{
  "type": "object",
  "properties": {
    "text": {
      "type": "string",
      "description": "Natural language explanation. Use **bold** for emphasis."
    },
    "code": {
      "type": ["string", "null"],
      "description": "Suggested CozoScript query code, or null if not applicable"
    },
    "chips": {
      "type": "array",
      "items": { "type": "string" },
      "description": "2-4 'Try also' suggestion chips for follow-up questions"
    },
    "docs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "section": { "type": "string" },
          "body": { "type": "string" }
        },
        "required": ["title", "section", "body"]
      },
      "description": "1-3 relevant documentation references with preview text"
    },
    "warning": {
      "type": ["string", "null"],
      "description": "Optional warning about engine-specific features or gotchas"
    }
  },
  "required": ["text", "chips", "docs"]
}
```

Go types:

```go
type HintResponse struct {
    Text    string       `json:"text"`
    Code    *string      `json:"code"`
    Chips   []string     `json:"chips"`
    Docs    []DocPreview `json:"docs"`
    Warning *string      `json:"warning,omitempty"`
}

type DocPreview struct {
    Title   string `json:"title"`
    Section string `json:"section"`
    Body    string `json:"body"`
}
```

## System Prompt Design

The system prompt is crucial for hint quality. It must provide:

1. **CozoScript reference** — syntax, operators, rule types, common patterns
2. **Current schema context** — what stored relations exist, their columns
3. **Conversation context** — previous queries and questions in this session
4. **Instruction** — produce structured hint responses

```go
func buildSystemPrompt(schema SchemaContext, history []HintExchange) string {
    return fmt.Sprintf(`You are a CozoScript assistant embedded in the Datalog Pad editor.
You help users write CozoScript queries for CozoDB v0.7.

## CozoScript Quick Reference

### Rule Types
- Inline rules: ?[vars] := body  (logic/joins)
- Constant rules: ?[vars] <- [[data]]  (inline data)
- Fixed rules: ?[vars] <~ Algorithm(...)  (graph algorithms)

### Stored Relations
- Access: *relation_name{col1, col2} or *relation_name[col1, col2]
- Create: :create name {key_col: Type => val_col: Type}
- Insert: ?[cols] <- [[data]] :put name {cols}
- System: ::relations, ::columns name

### Current Database Schema
%s

### Previous Context
%s

## Response Format
Respond with a JSON object containing:
- text: explanation (use **bold** for CozoScript keywords)
- code: suggested CozoScript query (or null)
- chips: 2-4 follow-up suggestion strings
- docs: 1-3 doc references with title, section, and preview body
- warning: optional caveat about engine-specific features

IMPORTANT: code must be valid CozoScript (NOT Datomic/DataScript syntax).
CozoScript uses := not [:find :where]. Relations use *name{} not [?e :attr ?val].`,
        formatSchema(schema),
        formatHistory(history))
}
```

### Schema Context Injection

Before generating hints, query CozoDB for the current schema:

```go
func (e *HintEngine) getSchemaContext() (SchemaContext, error) {
    // Get all relations
    relations, _ := e.db.Query("::relations", nil)

    // For each relation, get columns
    var schema SchemaContext
    for _, row := range relations.Rows {
        name := row[0].(string)
        cols, _ := e.db.Query("::columns "+name, nil)
        schema.Relations = append(schema.Relations, RelationSchema{
            Name:    name,
            Columns: parseColumns(cols),
        })
    }
    return schema, nil
}
```

## Error Diagnosis Flow

When a query fails, the AI should auto-diagnose. The error diagnosis uses the same
hint engine but with a different prompt:

```go
type DiagnosisRequest struct {
    Query    string `json:"query"`       // The failed CozoScript
    ErrorCode string `json:"error_code"` // e.g. "eval::unbound_symb_in_head"
    Message   string `json:"message"`    // Error message
    Help      string `json:"help"`       // CozoDB help text
}

type DiagnosisResponse struct {
    Text string  `json:"text"`    // Explanation of the error
    Code *string `json:"code"`    // Fixed query (or null)
    Docs []DocPreview `json:"docs"`
}
```

CozoDB error codes we've observed:
- `eval::unbound_symb_in_head` — unbound variable in rule head
- `query::relation_not_found` — unknown stored relation
- `eval::throw` — type mismatch or runtime error
- Syntax errors (bracket mismatch, etc.)

## Implementation: Hint Stream Manager

Adapting the `temporal-relationships` stream manager pattern:

```go
package hints

import (
    "context"
    "encoding/json"
    "sync"
    "time"

    "github.com/ThreeDotsLabs/watermill"
    "github.com/ThreeDotsLabs/watermill/message"
    "github.com/ThreeDotsLabs/watermill/pubsub/gochannel"
    "github.com/go-go-golems/geppetto/pkg/events"
    "github.com/go-go-golems/pinocchio/pkg/webchat"
    "github.com/google/uuid"
    "github.com/gorilla/websocket"
)

type HintStreamManager struct {
    baseCtx context.Context
    engine  *HintEngine
    db      *CozoDB

    mu       sync.Mutex
    sessions map[string]*hintSession
}

type hintSession struct {
    sessionID string
    pubsub    *gochannel.GoChannel
    sink      events.EventSink
    pool      *webchat.ConnectionPool
    coord     *webchat.StreamCoordinator
}

func (m *HintStreamManager) AttachWebSocket(sessionID string, conn *websocket.Conn) error {
    session, err := m.ensureSession(sessionID)
    if err != nil {
        return err
    }
    session.pool.Add(conn)

    // Send hello
    session.pool.SendToOne(conn, buildControlFrame("ws.hello", map[string]any{
        "sessionId":    sessionID,
        "serverTimeMs": time.Now().UnixMilli(),
    }))

    // Read loop (for ping/pong and hint requests)
    go func() {
        defer session.pool.Remove(conn)
        for {
            _, data, err := conn.ReadMessage()
            if err != nil {
                return
            }
            m.handleIncoming(session, data)
        }
    }()
    return nil
}

func (m *HintStreamManager) handleIncoming(session *hintSession, data []byte) {
    var msg struct {
        Type string `json:"type"`
    }
    if err := json.Unmarshal(data, &msg); err != nil {
        return
    }

    switch msg.Type {
    case "hint.request":
        var req HintRequest
        if err := json.Unmarshal(data, &req); err != nil {
            return
        }
        go m.runHint(session, req)

    case "diagnosis.request":
        var req DiagnosisRequest
        if err := json.Unmarshal(data, &req); err != nil {
            return
        }
        go m.runDiagnosis(session, req)

    case "ws.ping":
        session.pool.Broadcast(buildControlFrame("ws.pong", map[string]any{
            "serverTimeMs": time.Now().UnixMilli(),
        }))
    }
}

func (m *HintStreamManager) runHint(session *hintSession, req HintRequest) {
    ctx := m.baseCtx
    schema, _ := m.db.GetSchemaContext()

    // Build the engine with structured output
    result, err := m.engine.GenerateHint(ctx, session.sink, HintInput{
        Question: req.Question,
        Schema:   schema,
        History:  req.History,
    })
    if err != nil {
        // Publish error frame
        session.pool.Broadcast(buildErrorFrame(req.RequestID, err))
        return
    }

    // Publish final structured result as custom SEM event
    session.pool.Broadcast(buildHintResultFrame(req.RequestID, result))
}

func (m *HintStreamManager) ensureSession(id string) (*hintSession, error) {
    m.mu.Lock()
    defer m.mu.Unlock()

    if existing, ok := m.sessions[id]; ok {
        return existing, nil
    }

    pubsub := gochannel.NewGoChannel(gochannel.Config{
        OutputChannelBuffer: 256,
    }, watermill.NopLogger{})

    pool := webchat.NewConnectionPool(id, 0, nil)
    sink := &semPublishingSink{publisher: pubsub, topic: "hints:" + id}

    session := &hintSession{
        sessionID: id,
        pubsub:    pubsub,
        sink:      sink,
        pool:      pool,
    }

    session.coord = webchat.NewStreamCoordinator(
        id, pubsub, nil,
        func(_ events.Event, _ webchat.StreamCursor, frame []byte) {
            pool.Broadcast(frame)
        },
    )
    session.coord.Start(m.baseCtx)

    m.sessions[id] = session
    return session, nil
}
```

## WebSocket Protocol

### Client → Server Messages

```json
// Request a hint
{
    "type": "hint.request",
    "request_id": "req-123",
    "question": "how do I find all users older than 30?",
    "history": [
        {"question": "what does a basic query look like?", "answer_text": "..."}
    ]
}

// Request error diagnosis
{
    "type": "diagnosis.request",
    "request_id": "req-456",
    "query": "?[name, x] := *users{name}",
    "error_code": "eval::unbound_symb_in_head",
    "message": "Symbol 'x' in rule head is unbound",
    "help": "Note that symbols occurring only in negated positions..."
}

// Ping
{ "type": "ws.ping" }
```

### Server → Client Messages (SEM Frames)

```json
// Streaming text delta
{
    "sem": true,
    "event": {
        "type": "llm.delta",
        "id": "req-123",
        "seq": 1,
        "data": { "id": "req-123", "delta": "Use ", "cumulative": "Use " }
    }
}

// Final structured hint result
{
    "sem": true,
    "event": {
        "type": "hint.result",
        "id": "req-123",
        "seq": 15,
        "data": {
            "request_id": "req-123",
            "text": "Use **:where** clauses with a predicate...",
            "code": "?[name] := *users{name, age}, age > 30",
            "chips": ["+ with sorting", "+ count results"],
            "docs": [
                {"title": "predicates", "section": "§3.4", "body": "..."}
            ],
            "warning": null
        }
    }
}

// Error
{
    "sem": true,
    "event": {
        "type": "hint.error",
        "id": "req-123",
        "data": { "request_id": "req-123", "error": "inference failed: ..." }
    }
}
```

## Streaming UX Strategy

The frontend receives two kinds of data during hint generation:

1. **Progressive text** (`llm.delta`) — rendered as the explanation text, streaming
2. **Final structured result** (`hint.result`) — replaces the streaming text with
   the full structured response (code block, chips, docs)

Frontend behavior:
1. On `llm.start` → show skeleton/spinner in AIBlock
2. On `llm.delta` → render streaming text in the explanation area
3. On `hint.result` → replace with full structured response (code, chips, docs)
4. On `hint.error` → show error state

This gives immediate feedback (streaming text appears fast) while still delivering
the structured data needed for interactive elements.

## Design Decisions

### 1. Structured Output over FilteringSink

**Decision:** Use JSON schema mode (`StructuredOutputConfig`) not `FilteringSink`.

**Why:** The entire hint response is structured. FilteringSink is designed for
extracting structured blocks from mixed free-text output. Our use case is simpler:
the whole response is a JSON object. JSON schema mode is more reliable and easier
to implement.

**Trade-off:** With structured output, we can't stream partial structured data
(e.g. show chips before the full response). The `llm.delta` frames show raw JSON
tokens. We can:
- Stream the `text` field content progressively by parsing partial JSON
- Wait for `llm.final` and parse the complete JSON for code/chips/docs
- Or use `FilteringSink` later if we want progressive chip rendering

### 2. Per-session pubsub (not shared)

**Decision:** Each hint session gets its own watermill gochannel.

**Why:** Hint sessions are lightweight and independent. No need for Redis or shared
pubsub. In-memory channels give us the event-driven architecture without network
overhead.

### 3. Schema context in system prompt

**Decision:** Inject the current CozoDB schema into the system prompt.

**Why:** The LLM needs to know what relations exist to suggest valid queries.
Querying `::relations` and `::columns` at hint-generation time ensures the context
is always fresh.

### 4. Reuse pinocchio webchat primitives

**Decision:** Import `webchat.ConnectionPool`, `webchat.StreamCoordinator`,
`webchat.SemanticEventsFromEvent` directly from pinocchio.

**Why:** These are battle-tested abstractions for exactly this use case.
No need to reinvent WebSocket management, SEM frame construction, or event
coordination.

## Implementation Plan

1. **Define Go types** for HintRequest, HintResponse, DiagnosisRequest, etc.
2. **Build HintEngine** that wraps geppetto `Engine` with structured output config
3. **Build system prompt** with CozoScript reference and dynamic schema injection
4. **Implement HintStreamManager** following the stream_manager.go pattern
5. **Wire WebSocket endpoint** at `/ws/hints` with gorilla/websocket
6. **Add REST fallback** at `POST /api/hints` for non-streaming use
7. **Add error diagnosis** mode with specialized prompt
8. **Test with frontend** — replace mock responses with WebSocket integration

## Open Questions

1. **Which LLM provider?** — Claude (Anthropic) is preferred for structured output
   quality. Need to configure geppetto's step settings for the right model.
2. **Cost optimization** — hint requests could be frequent. Consider caching common
   questions, or using a smaller/faster model for simple lookups.
3. **Streaming partial JSON parsing** — can we parse the `text` field from partial
   JSON to show progressive text while the full schema renders? Libraries like
   `github.com/valyala/fastjson` could help.
4. **Rate limiting** — need to throttle hint requests per session to avoid abuse.
5. **CozoDB documentation corpus** — should we embed the full CozoDB docs in the
   system prompt, or use RAG to retrieve relevant sections?

## References

- [Pinocchio webchat package](~/code/wesen/corporate-headquarters/pinocchio/pkg/webchat/)
- [Geppetto engine interface](~/code/wesen/corporate-headquarters/geppetto/pkg/inference/engine/engine.go)
- [Geppetto FilteringSink](~/code/wesen/corporate-headquarters/geppetto/pkg/events/structuredsink/)
- [Temporal-relationships stream manager](~/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/internal/extractor/httpapi/stream_manager.go)
- [SEM protobuf definitions](~/code/wesen/corporate-headquarters/pinocchio/pkg/sem/pb/proto/sem/base/)
- [Watermill pubsub](https://github.com/ThreeDotsLabs/watermill)
- [Gorilla WebSocket](https://github.com/gorilla/websocket)
