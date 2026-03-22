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
    - Path: backend/pkg/notebook/config.go
      Note: ServiceConfig defines the reusable notebook service construction surface (commit f5d575b)
    - Path: backend/pkg/notebook/runtime.go
      Note: Runtime interface isolates notebook execution dependencies from concrete Cozo manager wiring (commit f5d575b)
    - Path: backend/pkg/notebook/service.go
      Note: Notebook service now owns runtime and timeline abstractions via injected config (commit f5d575b)
    - Path: backend/pkg/notebook/service_test.go
      Note: Notebook tests exercise the config constructor path instead of concrete OpenService-only assembly (commit f5d575b)
    - Path: backend/pkg/notebook/timeline.go
      Note: TimelineStore interface isolates timeline persistence and SQLite bootstrapping (commit f5d575b)
ExternalSources: []
Summary: Chronological diary for the backend notebook package cutover and current app rewiring work.
LastUpdated: 2026-03-22T12:14:32-04:00
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
