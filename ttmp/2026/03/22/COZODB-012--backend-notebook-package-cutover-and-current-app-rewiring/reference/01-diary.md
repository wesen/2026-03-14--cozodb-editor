---
Title: Diary
Ticket: COZODB-012
Status: active
Topics:
    - architecture
    - backend
    - cozodb
    - frontend
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: backend/main.go
      Note: |-
        Main now mounts notebook HTTP routes from backend/pkg/notebook instead of backend/pkg/api (commit d7360dd)
        Main now mounts both notebook REST and WebSocket routes from backend/pkg/notebook (commit 1e13d38)
    - Path: backend/pkg/api/handlers.go
      Note: API server no longer carries notebook REST handler state (commit d7360dd)
    - Path: backend/pkg/api/types.go
      Note: |-
        Notebook-specific REST payload structs were removed from the generic API package after route cutover (commit d7360dd)
        Generic API package no longer owns notebook WebSocket payload types after transport cutover (commit 1e13d38)
    - Path: backend/pkg/notebook/config.go
      Note: ServiceConfig defines the reusable notebook service construction surface (commit f5d575b)
    - Path: backend/pkg/notebook/http.go
      Note: Notebook package now owns the REST adapter and route registration surface (commit d7360dd)
    - Path: backend/pkg/notebook/http_test.go
      Note: HTTP transport contract tests cover the notebook-owned REST routes (commit d7360dd)
    - Path: backend/pkg/notebook/runtime.go
      Note: Runtime interface isolates notebook execution dependencies from concrete Cozo manager wiring (commit f5d575b)
    - Path: backend/pkg/notebook/service.go
      Note: Notebook service now owns runtime and timeline abstractions via injected config (commit f5d575b)
    - Path: backend/pkg/notebook/service_test.go
      Note: Notebook tests exercise the config constructor path instead of concrete OpenService-only assembly (commit f5d575b)
    - Path: backend/pkg/notebook/timeline.go
      Note: TimelineStore interface isolates timeline persistence and SQLite bootstrapping (commit f5d575b)
    - Path: backend/pkg/notebook/websocket.go
      Note: Notebook package now owns WebSocket hint and diagnosis transport plus AI engine abstraction (commit 1e13d38)
    - Path: backend/pkg/notebook/websocket_test.go
      Note: Fallback WebSocket transport test validates the cutover contract on /ws/hints (commit 1e13d38)
    - Path: backend/pkg/notebook/ws_sem_sink.go
      Note: Notebook package now owns SEM event translation for WebSocket streaming (commit 1e13d38)
ExternalSources: []
Summary: Chronological diary for the backend notebook package cutover and current app rewiring work.
LastUpdated: 2026-03-22T12:38:20-04:00
WhatFor: Record implementation slices, validation commands, integration decisions, and commit checkpoints for COZODB-012.
WhenToUse: Use when continuing backend modularization work, reviewing the cutover sequence, or checking which commits landed each backend slice.
---




# Diary

## Goal

Track the backend cutover that turns the current notebook backend into a reusable package surface and rewires the current app to use it directly.

## Step 1: Create the ticket, inspect backend coupling, and define the cutover plan

I created a new backend-focused ticket because the frontend decomposition ticket is no longer the blocker. The new problem is backend ownership: the notebook domain exists, but the transport and assembly seams are still in the wrong packages.

### Prompt Context

**User prompt (verbatim):** "alright, create a new ticket for that, write a detailed implementation pan and add detailed tasks to the new ticket, and then work on them in the same way, committing as you go and keeping a diary"

**Assistant interpretation:** Create a dedicated backend modularization ticket, write a detailed implementation plan and tasks, then start landing the first backend refactor slices with commits and diary updates.

**Inferred user intent:** Do a real backend cutover, not a speculative design exercise, and keep the same documentation discipline as the frontend ticket.

**Commit (code):** Pending

### What I did
- Created ticket `COZODB-012`.
- Reviewed the current backend assembly and coupling points in:
  - `backend/main.go`
  - `backend/pkg/notebook/service.go`
  - `backend/pkg/api/notebook_handlers.go`
  - `backend/pkg/api/websocket.go`
  - `backend/pkg/api/ws_sem_sink.go`
  - `backend/pkg/notebook/service_test.go`
- Added a ticket-local backend coupling inventory script.
- Wrote the design guide, task list, and seeded this diary.

### Why
- The frontend is now sufficiently decomposed. The main remaining architectural blocker for `COZODB-010` is backend package ownership and backend transport ownership.
- The current app should be rewired to the new backend package surface as the modularization happens, not after.

### What worked
- The current backend already has a strong domain center in `backend/pkg/notebook`.
- The route and dependency seams are clear enough that the cutover can be done in phased slices without inventing a new architecture.

### What didn't work
- N/A

### What I learned
- The first backend slice should be dependency inversion inside the notebook service, not route movement first.
- Moving transports before fixing constructor ownership would only relocate the same concrete coupling into a different file.

### What was tricky to build
- The main challenge was sequencing the backend cut in a way that keeps each commit behavior-preserving while still making forward progress toward the new package boundary.

### What warrants a second pair of eyes
- Review whether the notebook package should eventually expose one top-level module type or only constructor-plus-mount helpers.

### What should be done in the future
- Start with runtime/timeline interface inversion inside `backend/pkg/notebook/service.go`, then move REST ownership, then move WebSocket ownership.

### Code review instructions
- Read the design guide first.
- Then inspect the coupling inventory source output.
- Confirm that the task order is centered on direct cutover, not on compatibility shims.

### Technical details
- Commands run:
  - `docmgr ticket create-ticket --ticket COZODB-012 --title "Backend notebook package cutover and current app rewiring" --topics architecture,backend,cozodb,frontend`
  - `docmgr doc add --ticket COZODB-012 --doc-type design-doc --title "Backend notebook package cutover implementation guide"`
  - `docmgr doc add --ticket COZODB-012 --doc-type reference --title "Diary"`

## Step 2: Invert notebook runtime and timeline dependencies inside the service

The first code slice stayed deliberately inside `backend/pkg/notebook`. I replaced the service's direct dependence on `*cozo.Manager` and the concrete Pinocchio SQLite timeline store with notebook-local interfaces and a config-based constructor, then pushed the tests onto that constructor path.

This keeps behavior unchanged while moving construction ownership into the notebook package itself. That is the prerequisite for the next phase, where the REST and WebSocket transports can be mounted by notebook-owned adapters instead of by `backend/pkg/api`.

### Prompt Context

**User prompt (verbatim):** (see Step 1)

**Assistant interpretation:** Start landing the backend modularization work in committed slices, keep the ticket updated, and capture the implementation trail in the diary.

**Inferred user intent:** Make the backend cutover real and reviewable, with each refactor step small enough to validate and continue from cleanly.

**Commit (code):** f5d575b — "backend: invert notebook service runtime and timeline deps"

### What I did
- Added `backend/pkg/notebook/config.go` with `ServiceConfig`, default session/runtime identifiers, and constructor validation.
- Added `backend/pkg/notebook/runtime.go` with a notebook-local `Runtime` interface matching the service's actual execution needs.
- Added `backend/pkg/notebook/timeline.go` with a notebook-local `TimelineStore` interface and `OpenSQLiteTimelineStore`.
- Refactored `backend/pkg/notebook/service.go` so `Service` depends on `Runtime` and `TimelineStore`, added `NewService`, and made `OpenService` a thin convenience wrapper.
- Refactored `backend/pkg/notebook/service_test.go` to build services through `NewService(ServiceConfig{...})` instead of only through `OpenService`.
- Ran `gofmt -w pkg/notebook/config.go pkg/notebook/runtime.go pkg/notebook/timeline.go pkg/notebook/service.go pkg/notebook/service_test.go`.
- Ran `go test ./pkg/notebook/...` and `go test ./...` from `backend/`.

### Why
- The notebook package cannot own its routes cleanly if it still requires outside packages to assemble its core runtime and timeline dependencies in ad hoc ways.
- Constructor inversion is the smallest useful seam: it changes ownership without changing transport behavior yet.

### What worked
- The existing `backend/pkg/notebook` API surface was already narrow enough that the runtime abstraction only needed `GetSchema`, `Query`, and `Reset`.
- Timeline persistence also fit behind a compact notebook-local interface with no behavior changes.
- The full backend test run stayed green after the refactor.

### What didn't work
- My first test refactor left one compile error in `backend/pkg/notebook/service_test.go`:
  - Command: `go test ./pkg/notebook/...`
  - Error:
    - `pkg/notebook/service_test.go:108:5: undefined: err`
    - `pkg/notebook/service_test.go:109:21: undefined: err`
    - `pkg/notebook/service_test.go:111:5: undefined: err`
    - `pkg/notebook/service_test.go:112:21: undefined: err`
- Cause: after replacing `OpenService(...)` with the helper-based constructor path, `TestServiceResetKernelSwapsRuntimeAndClearsPersistedOutputs` no longer had an in-scope `err` binding.
- Fix: changed the first assignment in that test to `_, err := svc.EnsureDefaultNotebook(context.Background())`.

### What I learned
- The notebook service already had a stable enough dependency boundary to formalize without widening the API.
- Keeping `OpenService` as a convenience wrapper is useful during the cutover because it preserves internal call sites while still moving the real ownership to `NewService`.

### What was tricky to build
- The sharp edge was separating "construction ownership" from "runtime capability." The service still needs concrete behavior like Cozo query execution and timeline storage, but the refactor had to expose only the methods the notebook domain actually consumes.
- The tests also needed to exercise the new constructor path directly. If they stayed on `OpenService`, they would miss exactly the seam this slice is supposed to establish.

### What warrants a second pair of eyes
- Review whether the `Runtime` interface should stay minimal or grow to include relation-inspection capabilities used only in tests.
- Review whether `OpenSQLiteTimelineStore` belongs permanently in `backend/pkg/notebook` or should later move into a notebook adapter subpackage when transport extraction is complete.

### What should be done in the future
- Next, move REST route ownership into `backend/pkg/notebook` while preserving the existing HTTP contract that the frontend already uses.
- After that, remove the redundant notebook REST wiring from `backend/pkg/api`.

### Code review instructions
- Start with `backend/pkg/notebook/service.go`, `backend/pkg/notebook/config.go`, `backend/pkg/notebook/runtime.go`, and `backend/pkg/notebook/timeline.go`.
- Then read `backend/pkg/notebook/service_test.go` to confirm the constructor path is now exercised directly.
- Validate with:
  - `cd backend && go test ./pkg/notebook/...`
  - `cd backend && go test ./...`

### Technical details
- Constructor shape:
  ```go
  type ServiceConfig struct {
      Runtime Runtime
      SessionID string
      RuntimeKey string
      Store *Store
      Timeline TimelineStore
  }
  ```
- Runtime seam:
  ```go
  type Runtime interface {
      GetSchema() (string, error)
      Query(script string, params map[string]any) (*cozo.QueryResult, error)
      Reset() (int64, error)
  }
  ```
- Timeline seam:
  ```go
  type TimelineStore interface {
      Close() error
      GetConversation(ctx context.Context, convID string) (TimelineConversationRecord, bool, error)
      GetSnapshot(ctx context.Context, convID string, sinceVersion uint64, limit int) (*timelinepb.TimelineSnapshotV2, error)
      ListConversations(ctx context.Context, limit int, sinceMs int64) ([]TimelineConversationRecord, error)
      Upsert(ctx context.Context, convID string, version uint64, entity *timelinepb.TimelineEntityV2) error
      UpsertConversation(ctx context.Context, record TimelineConversationRecord) error
  }
  ```

## Step 3: Move notebook REST route ownership into the notebook package

With constructor ownership in place, I moved the notebook HTTP transport itself into `backend/pkg/notebook`. The current app now mounts notebook REST routes from the notebook package directly, while `backend/pkg/api` is reduced back to the generic query/schema surface.

This is the first real app cutover in the backend ticket. The frontend contract stays the same, but the ownership boundary now matches the architecture described in `COZODB-010`: notebook-specific transport code lives with the notebook domain instead of in a shared catch-all API package.

### Prompt Context

**User prompt (verbatim):** (see Step 1)

**Assistant interpretation:** Continue the backend cutover in small committed slices, keeping the ticket docs and diary synchronized with each implementation step.

**Inferred user intent:** Shift the real app onto notebook-owned backend surfaces incrementally, so later package extraction is mostly organizational rather than architectural.

**Commit (code):** d7360dd — "backend: move notebook rest routes into notebook package"

### What I did
- Added `backend/pkg/notebook/http.go` with a notebook-owned REST adapter and `MountHTTPRoutes`.
- Moved notebook-specific request decoding and JSON response writing into the notebook package.
- Added `backend/pkg/notebook/http_test.go` with route-level tests for bootstrap, title mutation, cell insertion, cell run, and kernel reset.
- Rewired `backend/main.go` to call `notebook.MountHTTPRoutes(mux, notebookSvc)`.
- Removed notebook REST ownership from `backend/pkg/api`:
  - deleted `backend/pkg/api/notebook_handlers.go`
  - removed notebook state from `backend/pkg/api/handlers.go`
  - removed notebook-specific REST payload structs from `backend/pkg/api/types.go`
- Ran `gofmt -w main.go pkg/api/handlers.go pkg/api/types.go pkg/notebook/http.go pkg/notebook/http_test.go`.
- Ran `go test ./...` from `backend/`.

### Why
- Route ownership is the clearest architectural signal for where a module boundary actually lives.
- Keeping notebook HTTP handling in `backend/pkg/api` would force future reusable packaging to either import the old monolithic API package or duplicate transport logic.

### What worked
- The existing frontend contract did not need to change; the extraction preserved the same paths and JSON shapes.
- The route parsing logic transferred cleanly into notebook-owned code.
- The new transport tests give us a direct guardrail for future refactors in this package boundary.

### What didn't work
- N/A

### What I learned
- The HTTP side is substantially easier to modularize than the WebSocket/AI side because it depends almost entirely on the notebook service and not on cross-package event streaming.
- Adding transport tests at the time of extraction is more valuable than trying to prove equivalence by inspection alone.

### What was tricky to build
- The main risk was accidental contract drift while moving handlers. The routes are simple, but they rely on path-suffix dispatch such as `/cells`, `/clear`, `/move`, and `/run`; a small trimming mistake would break the frontend immediately.
- I kept the public extraction surface small by exporting only `MountHTTPRoutes` and keeping the HTTP adapter/request structs internal to the notebook package. That preserves modular ownership without growing the package API unnecessarily.

### What warrants a second pair of eyes
- Review whether the notebook HTTP adapter should eventually support configurable base paths or continue to hardcode the current `/api/...` routes.
- Review whether `writeJSON` should stay local to notebook and api packages independently or move into a small shared internal helper later.

### What should be done in the future
- Move the notebook hint/diagnosis WebSocket adapter and SEM sink into the notebook package next.
- After the WebSocket cutover, run the frontend build/test suite against the backend changes and reassess readiness for the broader package extraction ticket.

### Code review instructions
- Start with `backend/pkg/notebook/http.go` and `backend/pkg/notebook/http_test.go`.
- Then inspect `backend/main.go` to confirm route mounting moved to the notebook package.
- Finally inspect `backend/pkg/api/handlers.go` and `backend/pkg/api/types.go` to confirm notebook REST ownership really left the generic API package.
- Validate with:
  - `cd backend && go test ./...`

### Technical details
- Notebook route registration now happens through:
  ```go
  func MountHTTPRoutes(mux *http.ServeMux, service *Service)
  ```
- Routes preserved by the cutover:
  - `GET /api/notebooks/bootstrap`
  - `POST /api/notebooks`
  - `GET /api/notebooks/:notebookId`
  - `PATCH /api/notebooks/:notebookId`
  - `POST /api/notebooks/:notebookId/cells`
  - `POST /api/notebooks/:notebookId/clear`
  - `PATCH /api/notebook-cells/:cellId`
  - `DELETE /api/notebook-cells/:cellId`
  - `POST /api/notebook-cells/:cellId/move`
  - `POST /api/notebook-cells/:cellId/run`
  - `POST /api/runtime/reset-kernel`

## Step 4: Move notebook WebSocket transport into the notebook package and validate the app

The last backend transport slice was the AI hint and diagnosis WebSocket path. I moved the `/ws/hints` adapter and SEM event sink into `backend/pkg/notebook`, kept the message contract stable, then ran both backend and frontend validation suites to make sure the current app still sits cleanly on the new notebook-owned backend boundary.

At this point the backend cutover described in this ticket is complete. The current app no longer depends on `backend/pkg/api` for notebook-specific HTTP or WebSocket behavior, which means `COZODB-010` can now focus on extracting reusable packaging and environment presets instead of untangling transport ownership first.

### Prompt Context

**User prompt (verbatim):** (see Step 1)

**Assistant interpretation:** Finish the backend cutover end to end, keep committing in slices, and document enough detail that the next phase can proceed from a stable modular boundary.

**Inferred user intent:** Reach a point where the current product already consumes notebook-owned backend surfaces, so later package extraction work is lower risk and mostly structural.

**Commit (code):** 1e13d38 — "backend: move notebook websocket routes into notebook package"

### What I did
- Added `backend/pkg/notebook/websocket.go` with a notebook-owned WebSocket adapter and `MountWebSocketRoutes`.
- Added a notebook-local `AIEngine` interface so the WebSocket adapter no longer depends on a concrete `*hints.Engine`.
- Moved SEM event translation into `backend/pkg/notebook/ws_sem_sink.go`.
- Added `backend/pkg/notebook/websocket_test.go` to validate the fallback `/ws/hints` path when no AI engine is configured.
- Rewired `backend/main.go` to call `notebook.MountWebSocketRoutes(mux, runtime, hintEngine)`.
- Removed the old notebook WebSocket adapter and SEM sink from `backend/pkg/api`.
- Removed notebook WebSocket payload types from `backend/pkg/api/types.go`.
- Ran backend validation:
  - `cd backend && go test ./...`
- Ran frontend validation:
  - `cd frontend && npm test`
  - `cd frontend && npm run lint`
  - `cd frontend && npm run build`
  - `cd frontend && npx tsc --noEmit`
- Reassessed readiness for `COZODB-010`.

### Why
- A reusable notebook backend package is not real if the current app still reaches into a separate API package for notebook-specific streaming behavior.
- The frontend validation pass matters here because the whole point of this ticket is not just to reorganize code, but to prove the current app runs through the new ownership boundary without contract drift.

### What worked
- The WebSocket cutover preserved the existing `/ws/hints` endpoint and event vocabulary.
- The fallback path is easy to validate in tests because it does not require live AI credentials.
- Backend tests and frontend tests/builds all passed after the transport move.
- The readiness question for `COZODB-010` now has a clear answer: backend cutover is no longer the blocker.

### What didn't work
- N/A

### What I learned
- The backend transport split was most effective when done as two vertical cuts: REST first, then WebSocket/AI.
- The remaining work for reusable packaging is now mostly about package API shape, composition presets, and theming/environment targeting rather than about dependency untangling inside the current app.

### What was tricky to build
- The subtle part was keeping the streaming message contract stable while replacing both the handler location and the SEM sink location. Unlike REST, the WebSocket path coordinates message decoding, request-scoped projection defaults, optional AI fallback behavior, structured SEM fanout, and incremental delta events.
- I kept the public surface small again by exporting only `MountWebSocketRoutes` plus the `AIEngine` interface. The message structs remain notebook-internal so the package boundary stays focused on behavior rather than on exposing extra transport internals.

### What warrants a second pair of eyes
- Review whether the WebSocket adapter should eventually accept a more narrowly scoped schema provider interface instead of the broader `Runtime` interface.
- Review whether the notebook package should eventually expose an aggregated module constructor that mounts both REST and WebSocket adapters together.

### What should be done in the future
- Start the broader package extraction work in `COZODB-010` from the new notebook-owned backend surface.
- Decide how to package environment presets for the current app versus future notebook hosts without reintroducing transport ownership into the app shell.

### Code review instructions
- Start with `backend/pkg/notebook/websocket.go`, `backend/pkg/notebook/ws_sem_sink.go`, and `backend/pkg/notebook/websocket_test.go`.
- Then inspect `backend/main.go` to confirm both notebook HTTP and notebook WebSocket routes are mounted from `backend/pkg/notebook`.
- Finally inspect `backend/pkg/api/types.go` to confirm the generic API package no longer owns notebook WebSocket payloads.
- Validate with:
  - `cd backend && go test ./...`
  - `cd frontend && npm test`
  - `cd frontend && npm run lint`
  - `cd frontend && npm run build`
  - `cd frontend && npx tsc --noEmit`

### Technical details
- Notebook WebSocket registration now happens through:
  ```go
  func MountWebSocketRoutes(mux *http.ServeMux, runtime Runtime, engine AIEngine)
  ```
- Readiness assessment for `COZODB-010`:
  - `backend/pkg/notebook` now owns notebook service construction.
  - `backend/pkg/notebook` now owns notebook REST transport.
  - `backend/pkg/notebook` now owns notebook WebSocket and SEM transport.
  - `backend/main.go` consumes notebook-owned adapters directly.
  - That means package extraction can proceed without first restructuring app-only transport glue.
