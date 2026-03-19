---
Title: Diary
Ticket: COZODB-009
Status: active
Topics:
    - frontend
    - backend
    - cozodb
DocType: reference
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Diary for clear-notebook and reset-kernel work."
LastUpdated: 2026-03-19T11:18:06-04:00
WhatFor: "Record planning and implementation steps for COZODB-009."
WhenToUse: "Use when implementing or reviewing clear-notebook and reset-kernel features."
---

# Diary

## Goal

Track the implementation of explicit source-reset and runtime-reset notebook commands.

## Step 1: Define the reset-actions slice

I created this ticket as the third slice in the notebook refactor sequence. It depends on both the backend mutation safety work and the frontend Redux migration so that clear/reset commands can land on stable backend APIs and a coherent frontend state container.

### Prompt Context

**User prompt (verbatim):** (same as COZODB-007 Step 1)

**Assistant interpretation:** Create a dedicated ticket for clear-notebook and reset-kernel work with its own design guide and tasks.

**Inferred user intent:** Keep destructive or state-resetting features isolated and reviewable.

**Commit (code):** N/A

### What I did
- Created ticket `COZODB-009`.
- Added the implementation guide for clear-notebook and reset-kernel.
- Added a granular task list covering backend runtime-manager work, APIs, frontend integration, and tests.

### Why
- Clearing notebook source and resetting the runtime are different actions with different semantics and should be implemented deliberately.

### What worked
- The umbrella design doc already identified the correct separation between source reset and runtime reset.

### What didn't work
- N/A

### What I learned
- This slice is best implemented last because it depends on both stable mutation contracts and a better frontend state model.

### What was tricky to build
- The main challenge was making sure this ticket did not accidentally absorb the Redux migration or backend mutation-fix work instead of depending on them.

### What warrants a second pair of eyes
- Review the proposed runtime-manager seam carefully before implementation starts because it will affect HTTP and websocket paths.

### What should be done in the future
- Start implementation only after COZODB-007 and COZODB-008 are complete.

### Code review instructions
- Start with the design doc, then inspect current runtime ownership in `backend/main.go` and notebook UI actions in `NotebookPage.tsx`.

### Technical details
- Design doc: `design-doc/01-notebook-clear-and-reset-kernel-implementation-guide.md`
- Tasks: `tasks.md`

## Step 2: Implement clear-notebook and reset-kernel end to end

I implemented the reset features across both backend and frontend, with the backend owning the actual reset semantics and the Redux slice owning the frontend state transition semantics. The important distinction stayed intact: notebook clear replaces source state with starter cells, while kernel reset preserves source and only invalidates runtime-derived state.

### Prompt Context

**User prompt (verbatim):** "ok, split this out into appropriate tickets, each with a detailed implementation guide document and a set of granular detailed tasks.

then, work on each ticket in sequence, working task by task, committing at appropriate intervals, keeping a detailed diary."

**Assistant interpretation:** Finish the third ticket after the backend mutation and Redux migration tickets are complete.

**Inferred user intent:** Add explicit recovery/reset operations without collapsing source reset and runtime reset into one ambiguous destructive command.

**Commit (code):** Pending at the time of this diary entry

### What I did
- Added `backend/pkg/cozo/manager.go` so the live Cozo runtime is process-owned through a resettable manager rather than a fixed `*cozo.DB`.
- Refactored `backend/main.go`, `backend/pkg/api/handlers.go`, `backend/pkg/api/websocket.go`, and `backend/pkg/notebook/service.go` to consume that manager.
- Added notebook-store methods for:
  - clearing one notebook back to starter cells,
  - clearing persisted runtime metadata globally after kernel reset.
- Added backend notebook-service methods for:
  - `ClearNotebook`,
  - `ResetKernel`.
- Added API support for:
  - `POST /api/notebooks/{id}/clear`,
  - `POST /api/runtime/reset-kernel`.
- Added frontend transport calls for both endpoints.
- Added Redux slice integration so:
  - clear notebook intentionally drops local drafts, runtime state, and SEM state,
  - reset kernel preserves source cells and local drafts but clears runtime and SEM state.
- Added confirmed toolbar actions in `frontend/src/notebook/NotebookPage.tsx`.
- Added backend service tests and frontend slice tests covering both flows.

### Why
- A frontend-only reset would have been fake because the real kernel lives in the backend process.
- A backend-only reset would still have looked broken if the Redux slice kept stale runtime/SEM state alive locally.
- Persisted run metadata had to be cleared on kernel reset; otherwise a fresh page bootstrap would resurrect old outputs even after the live kernel had been replaced.

### What worked
- The runtime-manager seam was small and sufficient: query/schema handlers, websocket hint handlers, and notebook execution all only needed runtime operations, not direct DB ownership.
- Clearing `nb_runs` and `nb_link_timeline_snapshots` after kernel reset kept backend bootstrap hydration honest.
- The Redux migration from `COZODB-008` made the frontend reset behavior easy to express as explicit reducer paths instead of ad hoc component updates.

### What didn't work
- The first backend test pass failed because one test reused the name `runtime` for both the runtime manager and a cell runtime result.
- The first frontend test pass failed because the new reset thunk was added but not imported in the test file, and an unused import remained after that change.
- The first store patch for starter cells accidentally referenced lowercase field names from a previous anonymous struct instead of `NotebookCell` fields.

### What I learned
- Reset-kernel is not just "swap the live engine". It also needs to invalidate persisted runtime hydration state or the reset stops being true across reloads.
- The cleanest reset UX comes from treating notebook source state, runtime state, and SEM/UI state as three separate planes with explicit reset rules.

### What was tricky to build
- The trickiest backend design point was the partial-failure boundary between swapping the live runtime and clearing persisted runtime metadata, since those cannot be wrapped in one transaction.
- The trickiest frontend design point was making notebook clear discard local drafts intentionally while kernel reset preserves them.

### What warrants a second pair of eyes
- Review the sqlite-engine guard in `cozo.Manager.Reset()` and confirm that explicitly rejecting non-`mem` reset is the right first-version behavior.
- Review whether future work should add timeline-store cleanup beyond `nb_link_timeline_snapshots`, since old timeline rows become unreachable but remain in the chatstore backing DB.

### What should be done in the future
- If sqlite-backed runtime reset becomes a requirement, add an explicit supported semantics document before implementing it.
- Consider whether a future “reset all” command is still unnecessary once clear notebook and reset kernel are both available separately.

### Code review instructions
- Start with `backend/pkg/cozo/manager.go` to see the new runtime ownership seam.
- Review `backend/pkg/notebook/service.go` and `backend/pkg/notebook/store.go` next to see how clear/reset semantics are persisted.
- Then review `backend/pkg/api/notebook_handlers.go` and `frontend/src/transport/httpClient.ts` for the new contracts.
- Finish with `frontend/src/notebook/state/notebookSlice.ts` and `frontend/src/notebook/NotebookPage.tsx` to verify the frontend state transitions and confirmation UX.

### Technical details
- Backend validation command: `go test ./pkg/notebook ./pkg/api ./pkg/cozo -count=1`
- Broader backend validation command: `go test ./... -count=1`
- Frontend validation command: `npx vitest run src/notebook/state/notebookSlice.test.ts src/notebook/NotebookCellCard.test.tsx src/notebook/runtimeState.test.ts`
- Frontend lint command: `npx eslint src/main.tsx src/app/store.ts src/app/hooks.ts src/notebook/NotebookPage.tsx src/notebook/NotebookCellCard.tsx src/notebook/state/notebookSlice.ts src/notebook/state/notebookSlice.test.ts src/notebook/NotebookCellCard.test.tsx src/transport/httpClient.ts`
- Frontend type-check command: `npx tsc --noEmit`
