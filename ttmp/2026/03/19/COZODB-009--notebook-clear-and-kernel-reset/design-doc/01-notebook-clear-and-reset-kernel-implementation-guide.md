---
Title: Notebook clear and reset-kernel implementation guide
Ticket: COZODB-009
Status: active
Topics:
    - frontend
    - backend
    - cozodb
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: backend/main.go
      Note: Current process-owned Cozo runtime that reset-kernel must refactor
    - Path: backend/pkg/cozo/db.go
      Note: Current Cozo DB wrapper used by the runtime manager design
    - Path: backend/pkg/notebook/service.go
      Note: Notebook service that will orchestrate clear-notebook behavior
    - Path: frontend/src/notebook/NotebookPage.tsx
      Note: UI location for clear/reset actions
ExternalSources: []
Summary: Guide for adding clear-notebook and reset-kernel actions with separate source and runtime semantics.
LastUpdated: 2026-03-19T10:40:39.886588957-04:00
WhatFor: Implement explicit notebook source reset and runtime reset flows after backend mutation safety and frontend Redux migration are in place.
WhenToUse: Use when implementing COZODB-009 after COZODB-007 and COZODB-008.
---


# Notebook clear and reset-kernel implementation guide

## Executive Summary

This ticket adds two user-facing reset operations that must remain conceptually separate: `clear notebook` and `reset kernel`. The first resets notebook source content back to starter cells. The second resets the live Cozo execution runtime while leaving notebook source untouched.

## Problem Statement

The current system has no explicit recovery action for either source state or runtime state. Users can accumulate cells, outputs, and mutated database state but cannot intentionally return to a known baseline without restarting or manually editing the notebook. The feature request is valid, but it only stays maintainable if the two reset planes are distinct.

## Scope

In scope:

- add backend API for clear notebook,
- add backend runtime manager seam for reset kernel,
- add frontend transport and store integration,
- add UI controls and confirmation flow,
- clear runtime/SEM state correctly on kernel reset.

Out of scope:

- Redux migration itself,
- advanced snapshot restore,
- file-backed runtime wipe semantics beyond an explicit guard.

## Proposed Solution

### Clear notebook

Behavior:

- delete all cells for the notebook,
- clear notebook-owned runtime rows/links for that notebook,
- recreate starter cells,
- return the fresh notebook document.

Suggested endpoint:

```http
POST /api/notebooks/{notebookId}/clear
```

### Reset kernel

Behavior:

- replace the active `cozo.DB` runtime instance,
- increment a `kernel_generation`,
- invalidate current runtime outputs and SEM state in the frontend,
- keep notebook cells unchanged.

Suggested endpoint:

```http
POST /api/runtime/reset-kernel
```

Suggested response:

```json
{ "ok": true, "kernel_generation": 2 }
```

### Backend runtime manager

Introduce a process-owned runtime manager so the backend no longer passes a fixed `*cozo.DB` around forever.

## Design Decisions

### Separate source reset from runtime reset

These actions affect different planes of state and should not be collapsed into one “reset everything” command.

### Guard sqlite-engine reset if needed

The current app defaults to in-memory Cozo. File-backed runtime reset semantics should be explicit rather than guessed.

### Clear SEM projection on kernel reset

AI attachments tied to old runs should not be treated as current after runtime reset.

## Alternatives Considered

### One combined “factory reset” action

Rejected. It is too destructive and semantically ambiguous.

### Frontend-only reset kernel

Rejected. The actual runtime lives in the backend process.

## Implementation Plan

1. Add backend notebook service/store methods for clear-notebook.
2. Add API handler and types for `POST /api/notebooks/{id}/clear`.
3. Introduce backend runtime manager abstraction.
4. Refactor API server, websocket handler, and notebook service to read Cozo runtime through that abstraction.
5. Add `POST /api/runtime/reset-kernel`.
6. Add frontend transport methods.
7. Add Redux thunks/actions to integrate both reset flows.
8. Add toolbar/menu UI actions with confirmation.
9. Add tests for both reset paths.

## Validation Plan

- backend tests for clear-notebook and reset-kernel behavior,
- frontend tests for state clearing and retained notebook source after kernel reset,
- manual verification of:
  - clear notebook restores starter cells,
  - reset kernel preserves cells but removes runtime trust,
  - rerunning cells after reset recreates outputs from a fresh runtime.

## Open Questions

1. Should clear-notebook preserve notebook title? The recommendation is yes.
2. Should reset-kernel be disabled or return a clear error for sqlite-engine mode in the first version?

## References

- [backend/main.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/main.go#L17)
- [backend/pkg/cozo/db.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/cozo/db.go#L52)
- [backend/pkg/notebook/service.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/service.go#L64)
- [backend/pkg/api/notebook_handlers.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/notebook_handlers.go#L12)
- [frontend/src/transport/httpClient.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/transport/httpClient.ts#L99)
- [frontend/src/notebook/NotebookPage.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookPage.tsx#L265)

## References

<!-- Link to related documents, RFCs, or external resources -->
