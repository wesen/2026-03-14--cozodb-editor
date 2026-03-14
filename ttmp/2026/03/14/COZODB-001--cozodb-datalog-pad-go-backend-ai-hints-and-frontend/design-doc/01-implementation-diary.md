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

*Research results will be added below as agents complete their work.*
