---
Title: Backend cleanup implementation diary
Ticket: COZODB-018
Status: active
Topics:
    - architecture
    - backend
    - notebook
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: backend/pkg/notebook/store.go
      Note: Primary backend cleanup target
    - Path: backend/main.go
      Note: Host preset selection target
    - Path: backend/pkg/notebook/current_cozo.go
      Note: Cozo preset construction reference
    - Path: backend/pkg/notebook/current_javascript.go
      Note: JavaScript preset construction reference
    - Path: backend/pkg/notebook/current_sqlite.go
      Note: SQLite preset construction reference
ExternalSources: []
Summary: Chronological diary for the backend cleanup work covering the store split and backend preset registry refactor.
LastUpdated: 2026-03-23T11:46:00-04:00
WhatFor: Record the actual implementation sequence, validation commands, mistakes, and review guidance while the backend cleanup is in progress.
WhenToUse: Use when continuing the ticket, reviewing commits, or onboarding an engineer to the rationale behind the cleanup.
---

# Backend cleanup implementation diary

## Goal

Capture the actual implementation path for the backend cleanup so a reviewer can understand not just the final diff but the order of operations, the validation steps, and the reasoning behind each slice.

## Context

This ticket follows the backend modularization, JavaScript preset, SQLite preset, and editor-highlighting work. The architecture is now strong enough that the remaining backend pain points are code-shape problems rather than missing capabilities. The main targets are the large `store.go` file and the hardcoded preset switch in `main.go`.

## Quick Reference

### User prompt

**User prompt (verbatim):** "commit ticket. add tasks to the ticket, and then work on them one by one, committing as you go at appropriate intervals, keeping a diary."

**Assistant interpretation:** Commit the current `COZODB-018` ticket docs first, refine the ticket backlog into implementation-order tasks, then implement the backend cleanup in slices with validation and diary updates after each slice.

**Inferred user intent:** Keep the backend cleanup disciplined and reviewable the same way the earlier notebook/preset work was handled.

### Planned execution order

1. Commit initial `COZODB-018` ticket docs
2. Record baseline backend validation and inventory
3. Split `store.go` into responsibility-oriented files without behavior changes
4. Validate and commit the store split
5. Add preset registry types and default registrations
6. Rewire `main.go` to the registry
7. Validate and commit registry integration
8. Update ticket docs and close out

## Step 1: Record baseline backend validation before refactoring

Before moving any code, I established a simple baseline for the backend cleanup. This step is intentionally small, but it matters because the upcoming work is mostly structural. Without a clean pre-refactor baseline, it becomes too easy to confuse “I moved code” with “I changed behavior.”

The baseline confirmed two things: the backend test suite already passes, and the main target file really is large enough to justify the split. That gives the next slice a clear success condition: preserve green tests while changing the file layout.

### Prompt Context

**User prompt (verbatim):** "commit ticket. add tasks to the ticket, and then work on them one by one, committing as you go at appropriate intervals, keeping a diary."

**Assistant interpretation:** Commit the ticket scaffold, turn the work into ordered tasks, then start executing the cleanup in small validated slices with diary updates.

**Inferred user intent:** Make the cleanup auditable and incremental, not a large untracked refactor.

**Commit (docs baseline):** `6066e39` — `docs: add COZODB-018 backend cleanup ticket`

### What I did

- Confirmed the initial ticket docs were committed as the starting point.
- Ran `cd backend && go test ./...`.
- Measured the current size of [backend/pkg/notebook/store.go](../../../../../../backend/pkg/notebook/store.go).
- Recorded the result in ticket tasks and changelog.

### Why

- Structural refactors need a stable pre-change checkpoint.
- The file size check gives a concrete justification for the split instead of relying on vague impressions.

### What worked

- Backend tests passed cleanly before any code movement.
- `store.go` measured at 810 lines, which supports the cleanup rationale.

### What didn't work

- Nothing failed in this step.

### What I learned

- The cleanup is starting from a healthy backend state, which makes movement-only refactors safer.

### What was tricky to build

- Nothing technically tricky happened yet; this was a control step designed to reduce risk in the real refactor.

### What warrants a second pair of eyes

- No special review concern yet beyond confirming the baseline commands stay the same after the split.

### What should be done in the future

- Preserve this baseline discipline for the registry refactor too.

### Code review instructions

- Verify the baseline commands:
  - `cd backend && go test ./...`
- Check the current target file:
  - [backend/pkg/notebook/store.go](../../../../../../backend/pkg/notebook/store.go)

### Technical details

```text
Baseline:
  HEAD      = 6066e39
  store.go  = 810 lines
  backend tests = passing
```

## Step 2: Split the store by responsibility while preserving the `Store` API

The first real code slice was intentionally conservative. I did not change store semantics, persistence queries, or service behavior. I only changed the physical organization of the store implementation so that notebook bootstrap, notebook CRUD, cell ordering, and run persistence no longer live in one 800-line file.

This matters because it is the kind of refactor that is safest when done before another feature lands. Once more behavior gets added, the same split becomes harder to isolate.

### Prompt Context

**User prompt (verbatim):** (see Step 1)

**Assistant interpretation:** Begin the cleanup implementation in small slices, starting with the store split because it is the least behaviorally risky part.

**Inferred user intent:** Improve backend maintainability without destabilizing the current presets.

**Commit (code):** `8a9f2c2` — `backend: split notebook store by responsibility`

### What I did

- Deleted the old monolithic [backend/pkg/notebook/store.go](../../../../../../backend/pkg/notebook/store.go).
- Added the new responsibility-oriented files:
  - [backend/pkg/notebook/store_open.go](../../../../../../backend/pkg/notebook/store_open.go)
  - [backend/pkg/notebook/store_migrate.go](../../../../../../backend/pkg/notebook/store_migrate.go)
  - [backend/pkg/notebook/store_bootstrap.go](../../../../../../backend/pkg/notebook/store_bootstrap.go)
  - [backend/pkg/notebook/store_notebooks.go](../../../../../../backend/pkg/notebook/store_notebooks.go)
  - [backend/pkg/notebook/store_cells.go](../../../../../../backend/pkg/notebook/store_cells.go)
  - [backend/pkg/notebook/store_runs.go](../../../../../../backend/pkg/notebook/store_runs.go)
- Kept the `Store` type and its public method signatures stable.
- Ran:
  - `gofmt -w backend/pkg/notebook/store_open.go backend/pkg/notebook/store_migrate.go backend/pkg/notebook/store_bootstrap.go backend/pkg/notebook/store_notebooks.go backend/pkg/notebook/store_cells.go backend/pkg/notebook/store_runs.go`
  - `cd backend && go test ./...`

### Why

- The store implementation had become hard to navigate because unrelated concerns were physically adjacent.
- A file split improves reviewability and future edits without forcing an API change.

### What worked

- The split compiled cleanly once the helper imports were adjusted.
- Backend tests passed after the movement-only refactor.
- The `Store` type remained intact, so no service or module code had to be rewritten.

### What didn't work

- During the move, one small helper behavior almost drifted: `nextInsertPosition` initially lost its `strings.TrimSpace` normalization when it moved into the cell file.
- I caught that before finishing the slice and restored it before running the final tests.

### What I learned

- The existing store organization was already separable along clear responsibility lines; the code did not need conceptual redesign first.
- The biggest risk in this kind of refactor is not SQL logic. It is forgetting a small normalization or helper dependency while moving methods between files.

### What was tricky to build

- The subtle part was preserving helper behavior while rehoming methods.
- The helpers for starter cell IDs, dense ordering, and default bootstrap semantics are easy to classify conceptually, but small string/time/UUID dependencies are easy to lose when the imports change.

### What warrants a second pair of eyes

- Reviewers should confirm that the moved helper functions still sit in sensible files and that no public API method disappeared accidentally.
- It is also worth checking whether the deleted `store.go` path should later be replaced by a small overview file or whether the new file layout is clear enough as-is.

### What should be done in the future

- Now that the store split is done, the next cleanup should focus on preset registration rather than more persistence reshaping.

### Code review instructions

- Start with [backend/pkg/notebook/store_open.go](../../../../../../backend/pkg/notebook/store_open.go) to see the new top-level `Store` definition.
- Then review:
  - [backend/pkg/notebook/store_bootstrap.go](../../../../../../backend/pkg/notebook/store_bootstrap.go)
  - [backend/pkg/notebook/store_notebooks.go](../../../../../../backend/pkg/notebook/store_notebooks.go)
  - [backend/pkg/notebook/store_cells.go](../../../../../../backend/pkg/notebook/store_cells.go)
  - [backend/pkg/notebook/store_runs.go](../../../../../../backend/pkg/notebook/store_runs.go)
- Re-run:
  - `cd backend && go test ./...`

### Technical details

```text
Old shape:
  store.go = 810 lines, all concerns mixed

New shape:
  store_open.go
  store_migrate.go
  store_bootstrap.go
  store_notebooks.go
  store_cells.go
  store_runs.go
```

## Usage Examples

### Read the design guide

```bash
sed -n '1,260p' \
  /home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/23/COZODB-018--split-notebook-store-layer-and-introduce-backend-preset-registry/design-doc/01-notebook-store-split-and-backend-preset-registry-implementation-guide.md
```

### Re-run the backend surface inventory

```bash
cd /home/manuel/code/wesen/2026-03-14--cozodb-editor
ttmp/2026/03/23/COZODB-018--split-notebook-store-layer-and-introduce-backend-preset-registry/scripts/01-backend-store-and-preset-surface-inventory.sh
```

## Related

- [../design-doc/01-notebook-store-split-and-backend-preset-registry-implementation-guide.md](../design-doc/01-notebook-store-split-and-backend-preset-registry-implementation-guide.md)
- [01-notebook-store-and-preset-registry-inventory.md](./01-notebook-store-and-preset-registry-inventory.md)
