---
Title: CozoDB Datalog Pad — Go Backend, AI Hints, and Frontend
Ticket: COZODB-001
Status: active
Topics:
    - cozodb
    - ai-completion
    - datalog
    - frontend
    - backend
    - websocket
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../corporate-headquarters/pinocchio:Pinocchio/Geppetto — Go LLM streaming, SEM structured extraction
    - Path: imports/query2.jsx
      Note: Frontend prototype — DatalogPad React component with AI blocks
    - Path: imports/query2.jsx:Frontend prototype JSX — DatalogPad component with AI blocks, chips, doc previews, error diagnosis
ExternalSources: []
Summary: 'Build a Datalog query UI (DatalogPad) with inline AI assistance: #?? comment triggers → streaming AI answers, clickable suggestion chips, expandable doc previews, auto error diagnosis. Go backend wraps CozoDB for query execution. Pinocchio/Geppetto provides streaming LLM completions with structured data extraction (SEM) over WebSocket.'
LastUpdated: 2026-03-14T14:50:24.288665009-04:00
WhatFor: ""
WhenToUse: ""
---


# CozoDB Datalog Pad — Go Backend, AI Hints, and Frontend

## Overview

Build an interactive Datalog query editor ("Datalog Pad") with inline AI assistance.
The core interaction: type `#??` as a comment, ask a question, press Enter, and an AI
assistant responds inline with:

- Natural language explanation
- Suggested Datalog query code (insertable)
- "Try also" suggestion chips that cascade into new `#??` threads
- Expandable documentation previews (inline, never leaving the editor)
- Automatic error diagnosis when queries fail

### Three Pillars

1. **CozoDB Backend** — Go service wrapping CozoDB (embedded datalog DB) for query
   execution, schema introspection, and error reporting
2. **AI Hint Engine** — Streaming LLM completions via pinocchio/geppetto with SEM
   (structured extraction) to produce typed hint responses (explanation, code, chips,
   doc links, warnings) over WebSocket
3. **Frontend** — React SPA (DatalogPad) with inline AI response blocks, already
   prototyped in `imports/query2.jsx`

## Key Documents

| Doc | Purpose |
|-----|---------|
| [Implementation Diary](./design-doc/01-implementation-diary.md) | Step-by-step narrative of research and decisions |
| CozoDB Backend Guide (TBD) | How to embed/wrap CozoDB in Go |
| AI Hint Engine Guide (TBD) | Pinocchio/geppetto streaming + SEM for hint generation |
| Frontend Architecture (TBD) | React component design, WebSocket integration |

## Status

Current status: **active** — Research phase

## Tasks

See [tasks.md](./tasks.md) for the current task list.

## Changelog

See [changelog.md](./changelog.md) for recent changes and decisions.

## Structure

- design/ - Architecture and design documents
- reference/ - Prompt packs, API contracts, context summaries
- playbooks/ - Command sequences and test procedures
- scripts/ - Temporary code and tooling
- various/ - Working notes and research
- archive/ - Deprecated or reference-only artifacts
