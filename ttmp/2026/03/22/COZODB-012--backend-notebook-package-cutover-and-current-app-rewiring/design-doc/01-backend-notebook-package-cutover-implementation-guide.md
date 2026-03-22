---
Title: Backend notebook package cutover implementation guide
Ticket: COZODB-012
Status: active
Topics:
    - architecture
    - backend
    - cozodb
    - frontend
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: backend/main.go
      Note: Current backend assembly root and route registration
    - Path: backend/pkg/notebook/service.go
      Note: Current notebook orchestration and concrete dependency construction
    - Path: backend/pkg/notebook/store.go
      Note: Current notebook storage ownership
    - Path: backend/pkg/api/notebook_handlers.go
      Note: Current notebook HTTP transport owned outside the notebook package
    - Path: backend/pkg/api/websocket.go
      Note: Current notebook AI/WebSocket transport owned outside the notebook package
    - Path: backend/pkg/api/ws_sem_sink.go
      Note: Current SEM-to-WebSocket adapter
    - Path: frontend/src/transport/httpClient.ts
      Note: Current frontend REST contract
    - Path: frontend/src/transport/hintsSocket.ts
      Note: Current frontend WebSocket contract
ExternalSources: []
Summary: "Detailed cutover plan for moving notebook backend ownership into backend/pkg/notebook and rewiring the current app to use that package directly without preserving old assembly paths."
LastUpdated: 2026-03-22T12:14:32-04:00
WhatFor: "Plan and guide the backend modularization work that should follow the completed frontend decomposition ticket."
WhenToUse: "Use when implementing the reusable backend notebook module, moving transport ownership into the notebook package, or rewiring the current app to the new package surface."
---

# Backend notebook package cutover implementation guide

## Executive Summary

The frontend decomposition work is done enough that the next blocking problem is backend ownership, not frontend structure. The current app already has a strong notebook domain in `backend/pkg/notebook`, but the reusable package boundary is still not real because the backend assembly root in [backend/main.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/main.go) constructs concrete collaborators directly and the notebook HTTP and WebSocket transports still live in `backend/pkg/api`.

The best strategy is a direct cutover, not a long compatibility layer:

1. move notebook dependency construction behind explicit interfaces and config,
2. move notebook REST and notebook AI/WebSocket mounting into `backend/pkg/notebook`,
3. rewire the current app to use those notebook-owned mounts,
4. delete the old notebook transport glue from `backend/pkg/api` once the app runs through the new path.

Because backward compatibility is not required, the current app should become the first consumer of the reusable backend package immediately. That avoids creating a “future” package that the real app does not actually use.

## Problem Statement

The backend already models notebooks well, but the package boundary is still porous in exactly the wrong places.

Current problems:

- [backend/pkg/notebook/service.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/service.go) constructs its own SQLite timeline store through Pinocchio `chatstore`, so the domain service still decides storage implementation details.
- [backend/pkg/notebook/service.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/service.go) depends directly on `*cozo.Manager`, so the notebook domain is tied to the current kernel implementation instead of a notebook execution contract.
- [backend/pkg/api/notebook_handlers.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/notebook_handlers.go) owns notebook CRUD/run/reset routing, so the notebook package does not own its own HTTP transport surface.
- [backend/pkg/api/websocket.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/websocket.go) owns notebook AI and diagnosis message handling, so the notebook package does not own its notebook-specific streaming surface either.
- [backend/main.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/main.go) must understand all notebook routes and collaborators directly, which makes it an app-specific assembly file instead of a thin environment preset.

That means the app is reusable in behavior, but not reusable in packaging. The frontend can now be extracted later because its boundaries were made explicit in `COZODB-011`. The backend still needs the same treatment.

## Proposed Solution

The reusable backend package should stay centered on `backend/pkg/notebook`. That package should own:

- notebook storage and service logic,
- notebook execution and runtime-hydration orchestration,
- notebook HTTP route mounting,
- notebook WebSocket/AI route mounting,
- package-level configuration and adapter interfaces.

The generic Cozo query/schema endpoints can remain in `backend/pkg/api` because they are not notebook-specific. The notebook-specific endpoints should move.

### Target package shape

```text
backend/pkg/notebook/
  types.go
  store.go
  service.go
  runtime.go          # execution/reset/schema interfaces + adapters
  timeline.go         # timeline persistence interfaces + adapters
  config.go           # service config and defaults
  http.go             # MountHTTPRoutes / notebook REST handlers
  ws.go               # MountWSRoutes / hint+diagnosis stream handlers
  sem_sink.go         # notebook-owned SEM sink adapter
```

The important point is not the exact filenames. The important point is that notebook-specific transport ownership moves into the notebook package.

### Target assembly shape

The app assembly in [backend/main.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/main.go) should become:

```text
build runtime adapter
build AI adapter
build notebook store/timeline/runtime config
build notebook app/module
mount notebook module routes
mount generic query/schema routes
mount vite proxy
```

The backend preset still uses the same routes the frontend already knows, but route registration should be performed by notebook-owned functions.

## Design Decisions

### Decision 1: No backwards compatibility shim

Rationale:

- The user explicitly does not need backwards compatibility.
- Keeping old and new notebook route ownership in parallel would slow the cutover and create dead structure.
- The current frontend is the best integration test for the new package boundary.

Consequence:

- We should change the app to use the new notebook-owned mounts immediately.
- We should delete old notebook transport glue after each cutover slice stabilizes.

### Decision 2: Invert service dependencies before moving transports

Rationale:

- If the notebook service still constructs concrete collaborators, moving HTTP handlers into the notebook package only relocates the coupling.
- Service-level interfaces give the transport layer a stable internal core to mount.

Consequence:

- The first code slice should introduce notebook-level runtime and timeline interfaces plus a constructor/config that accepts them.

### Decision 3: Move REST before WebSocket

Rationale:

- REST CRUD/run/reset is simpler and already tightly aligned with service methods.
- The WebSocket path is more coupled to hints, SEM translation, and event streaming, so it benefits from the prior constructor cleanup and route-mount pattern.

Consequence:

- Ordered slices:
  1. service dependency inversion
  2. notebook-owned REST transport
  3. notebook-owned WebSocket/AI transport
  4. main.go cutover and old glue deletion

### Decision 4: Keep generic Cozo API outside the notebook module

Rationale:

- `/api/query` and `/api/schema` are runtime-facing endpoints, not notebook-specific endpoints.
- Moving those into the notebook package would blur the package boundary.

Consequence:

- `backend/pkg/api` should remain the generic Cozo runtime HTTP package.
- Notebook-specific endpoints should leave `backend/pkg/api`.

## Alternatives Considered

### Alternative 1: Modularize the frontend package first and leave backend as-is

Rejected because:

- the frontend package would still depend on a backend whose notebook boundary is implicit,
- the next integration step would still be blocked by backend coupling,
- the repo would end up with one modular side and one monolithic side.

### Alternative 2: Create many small backend packages immediately

Rejected because:

- the user explicitly wants modularity without exploding into many packages,
- the current backend is small enough that the main problem is ownership, not file count,
- too many packages too early would hide the real integration seams.

### Alternative 3: Build a new backend package surface but leave main.go wired to old handlers until later

Rejected because:

- it would create a “shadow” package not exercised by the current app,
- it would delay real integration feedback,
- it would make cleanup harder.

## Implementation Plan

### Slice 1: Service dependency inversion

Goal:

- Make `backend/pkg/notebook/service.go` depend on notebook-local interfaces and config, not on concrete timeline/runtime construction.

Tasks:

- Add notebook-local interfaces for:
  - query execution
  - schema retrieval
  - kernel reset
  - timeline read/write lifecycle
- Add adapters for the current concrete implementations:
  - Cozo manager adapter
  - Pinocchio SQLite timeline adapter factory
- Replace `OpenService(appDBPath, runtime)` with a constructor/config path that accepts the adapters.
- Keep behavior the same.
- Update service tests to use the new constructor path.

Expected commit boundary:

- one commit containing only constructor/interface changes and test updates.

### Slice 2: Notebook-owned REST transport

Goal:

- Move notebook CRUD/run/reset route ownership from `backend/pkg/api` into `backend/pkg/notebook`.

Tasks:

- Add a notebook route-mounting function, for example `MountHTTPRoutes(mux, prefix, app)`.
- Move request/response structs that are notebook-specific into notebook-owned transport files if needed.
- Keep route paths unchanged:
  - `/api/notebooks`
  - `/api/notebooks/bootstrap`
  - `/api/notebooks/{id}`
  - `/api/notebooks/{id}/cells`
  - `/api/notebooks/{id}/clear`
  - `/api/notebook-cells/{id}`
  - `/api/notebook-cells/{id}/move`
  - `/api/notebook-cells/{id}/run`
  - `/api/runtime/reset-kernel`
- Delete or stop using notebook handlers from `backend/pkg/api`.

Expected commit boundary:

- one commit containing REST mount and main.go rewiring for REST only.

### Slice 3: Notebook-owned WebSocket and AI transport

Goal:

- Move hint/diagnosis streaming transport ownership from `backend/pkg/api` into `backend/pkg/notebook`.

Tasks:

- Define notebook-local interfaces for AI hint generation and diagnosis generation.
- Move the WebSocket handler and SEM sink into the notebook package.
- Preserve the frontend-visible event protocol:
  - `hint.request`
  - `diagnosis.request`
  - `llm.start`
  - `llm.delta`
  - `llm.error`
  - `hint.result`
  - the existing SEM projection frames
- Rewire main.go to mount `/ws/hints` from the notebook package.
- Delete or stop using `backend/pkg/api/websocket.go` and `backend/pkg/api/ws_sem_sink.go`.

Expected commit boundary:

- one commit containing the streaming transport cutover.

### Slice 4: App cutover cleanup

Goal:

- Make `backend/main.go` a thin environment preset.

Tasks:

- Keep only:
  - flag parsing
  - concrete adapter construction
  - query/schema mount
  - notebook package mount
  - vite proxy
  - cors wrapper
- Remove remaining notebook transport or dependency-construction logic from generic API code where obsolete.
- Run the frontend against the rewritten backend and confirm the current app still works.

Expected commit boundary:

- one cleanup commit after tests and manual smoke validation.

## Detailed Task Backlog

The ticket backlog should be tracked in this order:

- create ticket docs and backend coupling inventory
- add ticket-local coupling inventory script and evidence output
- introduce notebook runtime and timeline interfaces plus config-based service constructor
- adapt service tests to new constructor path
- add notebook-owned REST route mounting
- rewire main.go to notebook-owned REST mounting
- remove old notebook REST handler usage from `backend/pkg/api`
- add notebook-owned AI/WebSocket interfaces and SEM sink
- add notebook-owned WebSocket route mounting
- rewire main.go to notebook-owned WebSocket mounting
- remove old notebook WebSocket handler usage from `backend/pkg/api`
- run backend tests
- run frontend tests/build against the cutover
- reassess readiness for `COZODB-010` extraction work

## Open Questions

- Should the notebook package expose one high-level `App`/`Module` type, or just constructors plus mount helpers?
- Should generic query/schema endpoints remain on the same runtime adapter the notebook package uses, or be assembled independently forever?
- Should the notebook package own request/response DTOs that mirror current JSON exactly, or should transport DTOs stay in a dedicated transport file to avoid mixing them with domain types?

## References

- [COZODB-010 design guide](/home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/22/COZODB-010--reusable-notebook-package-architecture-for-multi-environment-targets/design-doc/01-reusable-notebook-package-architecture-and-intern-implementation-guide.md)
- [COZODB-011 design guide](/home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/22/COZODB-011--react-and-redux-granular-component-refactor-with-storybook-isolation/design-doc/01-react-and-redux-granular-refactor-primitive-widget-extraction-and-storybook-guide.md)
