---
Title: Position integrity and mutation response implementation guide
Ticket: COZODB-007
Status: active
Topics:
    - frontend
    - backend
    - cozodb
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: backend/pkg/api/notebook_handlers.go
      Note: Current API surface for insert
    - Path: backend/pkg/notebook/service.go
      Note: Service layer shape around notebook mutations
    - Path: backend/pkg/notebook/store.go
      Note: Current unique-index and mutation implementation that this ticket changes
    - Path: frontend/src/transport/httpClient.ts
      Note: Frontend transport that must consume authoritative mutation responses
ExternalSources: []
Summary: Guide for fixing notebook cell position integrity in SQLite and returning authoritative notebook state after mutations.
LastUpdated: 2026-03-19T10:40:31.152564211-04:00
WhatFor: Implement the backend mutation fixes needed to stop insert/move/delete position failures and frontend order drift.
WhenToUse: Use when implementing COZODB-007 or reviewing the backend/API changes required before the Redux migration.
---


# Position integrity and mutation response implementation guide

## Executive Summary

This ticket isolates the backend correctness layer that must be fixed before any frontend state refactor. The current notebook schema correctly enforces unique `(notebook_id, position)` ordering, but the mutation logic updates positions in ways that can transiently violate that unique constraint in SQLite. The same ticket also fixes the API contract mismatch where the backend returns only the inserted cell while the mutation has actually changed the positions of multiple sibling cells.

The goal of this ticket is simple: all notebook mutations must be position-safe, transactional, and authoritative. When this ticket is complete, insert, move, and delete operations will preserve dense order without unique-index failures, and the frontend will receive a complete updated notebook document after each mutation.

## Problem Statement

Observed problems:

1. `Store.InsertCell()` in [backend/pkg/notebook/store.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/store.go#L274) shifts all suffix positions with a single `position = position + 1` update while a unique index exists on `(notebook_id, position)` in [backend/pkg/notebook/store.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/store.go#L77). That can produce `UNIQUE constraint failed` during insertion.
2. `Store.MoveCell()` and `Store.DeleteCell()` use similar position-shifting strategies in [backend/pkg/notebook/store.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/store.go#L357) and [backend/pkg/notebook/store.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/store.go#L424), so the bug is structural, not limited to insert suggestion.
3. The frontend currently receives only the newly inserted cell from `POST /api/notebooks/{id}/cells`, but the mutation also changes other cell positions. That contract is insufficient for a correct client.

This ticket deliberately does not attempt to solve frontend architecture. It provides the safe backend and API substrate that the next ticket can depend on.

## Scope

In scope:

- safe position rewrites for insert, move, and delete,
- tests for notebook ordering invariants,
- API responses that return authoritative notebook state,
- frontend transport updates required to consume the new response.

Out of scope:

- Redux migration,
- clear notebook,
- reset kernel,
- broader UI changes.

## Current State

Current mutation flow:

```text
frontend insert action
  -> POST /api/notebooks/{id}/cells
    -> Server.handleInsertCell
      -> notebook.Service.InsertCell
        -> Store.InsertCell
          -> nextInsertPosition()
          -> UPDATE suffix positions
          -> INSERT new cell
          -> return new cell only
```

Relevant files:

- [backend/pkg/notebook/store.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/store.go#L57)
- [backend/pkg/notebook/service.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/service.go#L88)
- [backend/pkg/api/notebook_handlers.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/notebook_handlers.go#L103)
- [frontend/src/transport/httpClient.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/transport/httpClient.ts#L117)
- [frontend/src/notebook/useNotebookDocument.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/useNotebookDocument.ts#L141)

## Proposed Solution

### 1. Introduce one position-rewrite helper

Add a single store helper that:

1. loads current ordered cells for the notebook inside the transaction,
2. computes the target order in Go,
3. assigns temporary non-conflicting positions,
4. writes final dense positions `0..n-1`,
5. updates notebook `updated_at_ms`.

Recommended signature:

```go
func (s *Store) rewriteNotebookOrderTx(
    ctx context.Context,
    tx *sql.Tx,
    notebookID string,
    orderedCellIDs []string,
    now int64,
) error
```

### 2. Return full notebook state from mutations

Change these methods to return `*NotebookDocument` instead of a partial result:

- `InsertCell`
- `UpdateCell` can stay as `NotebookCell` for now
- `MoveCell`
- `DeleteCell`

For consistency and frontend simplicity, the API handlers for insert/move/delete should return the full notebook document after mutation.

### 3. Keep order dense and authoritative

After each mutation, persisted positions should satisfy:

- no duplicates,
- no gaps,
- sorted from `0` to `len(cells)-1`,
- same ordering returned to the client.

### 4. Add regression tests before moving on

Tests should verify:

- insert in the middle of a three-cell notebook,
- repeated inserts after the same anchor,
- move up/down across edges,
- delete from the middle,
- returned document positions are dense and sorted.

## Design Decisions

### Use Go-level order computation, not SQL cleverness

Computing final order in Go is easier to reason about than an increasingly complex sequence of SQL updates.

### Return authoritative documents, not patch-shaped responses

The backend already knows the final order. Returning partial mutation fragments would force the frontend to reconstruct order and repeat the current bug class.

### Keep `UpdateCell` small for now

This ticket focuses on order-mutating operations. `UpdateCell` does not change sibling positions, so it does not need to be widened immediately unless that simplifies handler consistency.

## Alternatives Considered

### Keep bulk SQL updates and rely on transaction boundaries

Rejected. The problem is not transaction visibility to other clients; it is transient uniqueness violation inside the same mutation.

### Drop the unique index

Rejected. The unique index is a good invariant and should remain.

### Let the frontend refetch after every mutation instead of returning a document

Rejected. It adds another round-trip and still leaves mutation contracts underspecified.

## Implementation Plan

1. Add store-level helpers to list notebook cells in a transaction and rewrite final order safely.
2. Refactor `InsertCell`, `MoveCell`, and `DeleteCell` to use the helper.
3. Update notebook service methods as needed to return `NotebookDocument` after order mutations.
4. Update API handlers to serialize the full document.
5. Update frontend transport typings for insert/move/delete responses.
6. Update `useNotebookDocument` to replace local document state from server responses for these mutation paths.
7. Add/expand backend tests and relevant frontend tests.

## Validation Plan

- `go test ./backend/pkg/notebook -count=1`
- targeted frontend tests for mutation response consumption
- manual verification:
  - insert suggestion in the middle of a notebook,
  - insert multiple times in a row,
  - move cells after insertion,
  - delete a middle cell.

## Open Questions

1. Should `UpdateCell` also return `NotebookDocument` for uniformity, or should this ticket keep it unchanged?
2. Should insert/move/delete handlers return runtime state too, or only source document state?

## References

- [backend/pkg/notebook/store.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/store.go#L57)
- [backend/pkg/notebook/service.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/service.go#L88)
- [backend/pkg/api/notebook_handlers.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/notebook_handlers.go#L103)
- [frontend/src/transport/httpClient.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/transport/httpClient.ts#L117)
- [frontend/src/notebook/useNotebookDocument.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/useNotebookDocument.ts#L141)

## References

<!-- Link to related documents, RFCs, or external resources -->
