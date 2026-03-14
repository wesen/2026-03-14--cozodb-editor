---
Title: Implementation Diary
Ticket: COZODB-001
Status: active
Topics:
    - cozodb
    - ai-completion
    - datalog
    - frontend
    - backend
    - websocket
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - "/home/manuel/code/wesen/2026-03-14--cozodb-editor/imports/query2.jsx:Frontend prototype JSX"
ExternalSources: []
Summary: "Step-by-step diary of research, experiments, decisions, and implementation for the CozoDB Datalog Pad project"
LastUpdated: 2026-03-14T15:00:00.000000000-04:00
WhatFor: "Track implementation progress and decisions"
WhenToUse: "Review to understand what was tried, what worked, what failed"
---

# Implementation Diary — CozoDB Datalog Pad

## 2026-03-14 — Project Kickoff

### Context

The goal is to build a "Datalog Pad" — an interactive query editor where typing `#??`
followed by a question triggers inline AI assistance with:
- Explanations in natural language
- Suggested datalog queries (insertable into the editor)
- "Try also" suggestion chips that cascade into new threads
- Expandable doc previews inline
- Auto error diagnosis on query failures

### Starting Materials

- **Frontend prototype**: `imports/query2.jsx` — a fully functional React component
  (DatalogPad) with mock responses. Uses inline styles, IBM Plex Mono font, dark theme
  with gold accent (#d4af37). Components: AIBlock, DocPreview, ErrorBlock. Mock response
  matching by keyword.

- **ASCII prototypes** from the original prompt showing 5 states:
  - A: Core loop (ask → answer → suggest)
  - B: Doc link expanded inline
  - C: Cascading refinement from chip clicks
  - D: Empty state / onboarding
  - E: Error state with auto-diagnosis

### Research Phase — Launched

Three parallel research tracks:

1. **Pinocchio/Geppetto** — How to use the Go LLM framework for streaming WebSocket
   completions with SEM (Structured Extraction Model) to produce typed hint responses
2. **CozoDB** — How to embed/run CozoDB, its query language (CozoScript), Go bindings
   or HTTP API options
3. **Frontend architecture** — How to wire the existing prototype to a real WebSocket
   backend, replacing mock responses

### Observations from the JSX prototype

The `MOCK_RESPONSES` object in query2.jsx defines the exact shape we need from the AI:
```typescript
interface AIResponse {
  text: string;        // Natural language explanation (supports **bold**)
  code: string | null; // Suggested datalog code
  chips: string[];     // "Try also" suggestions
  docs: Array<{
    title: string;     // Doc topic name
    section: string;   // Section reference (e.g. "§2.1")
    body: string;      // Preview text
  }>;
  warning?: string;    // Optional warning about engine-specific features
}
```

This is exactly what the SEM structured extraction should produce from the LLM.

---

---

## 2026-03-14 — Research Completed, Guides Written

### CozoDB Research

**What worked:**
- Downloaded CozoDB v0.7.6 binary, REPL works perfectly
- Tested all major features: stored relations, queries, aggregation, recursion, graph algorithms
- Documented the full CozoScript syntax (very different from Datomic Datalog!)
- Captured structured error messages — they include error codes, messages, and help text

**What didn't work:**
- CozoDB standalone server binary has a **bug**: it hardcodes port 3000 for its internal
  web UI, so `cozo server` fails if port 3000 is already in use (even with `-P` flag).
  Confirmed via strace: the `bind()` syscall always targets port 3000 regardless of the
  `-P` argument.
- **Workaround**: Use the Go bindings (`cozo-lib-go`) which embed CozoDB directly,
  bypassing the HTTP server entirely. This is actually better architecture anyway.

**Key insight:** CozoScript is NOT Datomic Datalog. The frontend prototype's mock
responses use Datomic syntax (`[:find ?name :where [?e :user/name ?name]]`) but
CozoScript uses a completely different syntax (`?[name] := *users{name}`). The AI
hint engine MUST generate CozoScript, not Datomic Datalog.

### Pinocchio/Geppetto Research

**Architecture understood:**
1. `Engine.RunInference(ctx, Turn) -> Turn` — core LLM abstraction
2. `EventSink` — receives streaming events (partial completions, finals, tool calls)
3. `semPublishingSink` — converts geppetto events to SEM frames, publishes to watermill
4. `StreamCoordinator` — subscribes to watermill topic, dispatches SEM frames
5. `ConnectionPool` — broadcasts SEM frames to WebSocket clients
6. `StructuredOutputConfig` — JSON schema mode for typed responses
7. `FilteringSink` — extracts structured blocks from streaming text (for progressive extraction)

**Reference implementation studied:** `temporal-relationships/internal/extractor/httpapi/stream_manager.go`
shows the exact pattern: per-conversation state with pubsub → sink → coordinator → pool.

### Documents Produced

1. **CozoDB Backend Guide** — embedding via Go bindings, CozoScript reference,
   schema management, error parsing, HTTP/WS API design
2. **AI Hint Engine Guide** — streaming pipeline architecture, SEM protocol,
   system prompt design, structured output, WebSocket protocol spec
3. **Frontend Architecture Guide** — component breakdown of query2.jsx into modular
   sub-components, custom hooks (useWebSocket, useHintStream, useEditorState),
   theme extraction, SEM frame integration

### Experiment Scripts

Created in `scripts/`:
- `01-start-cozo.sh` — start CozoDB server
- `02-test-queries.sh` — test basic queries via HTTP
- `03-test-errors.sh` — test error messages (for AI diagnosis)
- `04-repl-experiments.sh` — REPL-based experiments (works around server bug)

### Next Steps

- Set up Go module with cozo-lib-go
- Implement CozoDB wrapper
- Set up Vite + React + TypeScript project
- Split query2.jsx into modular components
- Wire up WebSocket streaming with pinocchio webchat primitives
