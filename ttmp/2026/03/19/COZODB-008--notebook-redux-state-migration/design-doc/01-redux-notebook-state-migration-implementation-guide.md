---
Title: Redux notebook state migration implementation guide
Ticket: COZODB-008
Status: active
Topics:
    - frontend
    - cozodb
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: frontend/src/notebook/NotebookCellCard.tsx
      Note: Cell rendering boundary and local-vs-global state split
    - Path: frontend/src/notebook/NotebookPage.tsx
      Note: Notebook page state and keyboard coordination to migrate
    - Path: frontend/src/notebook/useNotebookDocument.ts
      Note: Current hook-owned notebook orchestration to be replaced
    - Path: frontend/src/sem/semProjection.ts
      Note: Current SEM projection state that may move into store management
ExternalSources: []
Summary: Guide for moving notebook orchestration into a Redux Toolkit feature slice after backend mutation responses become authoritative.
LastUpdated: 2026-03-19T10:40:31.219108517-04:00
WhatFor: Implement the frontend notebook state refactor so source state, runtime state, and notebook-wide UI coordination have one coherent store.
WhenToUse: Use when implementing COZODB-008 after COZODB-007 has landed.
---


# Redux notebook state migration implementation guide

## Executive Summary

This ticket moves notebook orchestration out of the current hook-plus-page-local-state model and into a Redux Toolkit feature slice. The backend fixes in `COZODB-007` are a prerequisite because the Redux migration should be built on authoritative mutation responses rather than preserving the existing optimistic array surgery.

## Problem Statement

The current frontend splits notebook state across:

- `useNotebookDocument`,
- `NotebookPage`,
- `NotebookCellCard`,
- local `semProjection` state,
- local AI prompt and thread state.

That makes multi-step notebook commands harder to reason about and harder to test. The goal of this ticket is to centralize notebook domain state and notebook-wide UI coordination without moving truly local widget state into the store.

## Scope

In scope:

- add Redux Toolkit and react-redux,
- create app store and typed hooks,
- normalize notebook document/runtime state,
- move notebook-wide UI coordination into slice state,
- move SEM projection updates into store actions,
- replace `useNotebookDocument` with selectors and thunks.

Out of scope:

- backend mutation semantics,
- clear notebook,
- reset kernel backend implementation,
- restyling the UI.

## Proposed Solution

### Store shape

Use one `notebook` feature slice with:

- `cellsById`,
- `orderedCellIds`,
- `runtimeByCellId`,
- `localDirtyByCellId`,
- `semProjection`,
- notebook-wide UI state,
- async request status state.

### Keep local-only UI local

Do not move these into Redux:

- `editing`,
- `showAIForm`,
- `outputCollapsed`.

Those are card-local and ephemeral.

### Replace hook callbacks with thunks

Introduce thunks for:

- bootstrap,
- persist cell,
- insert cell,
- move cell,
- delete cell,
- run cell,
- persist title.

### Move derived execution state into selectors

`buildNotebookExecutionState()` should be used by selectors rather than being called from a hook-owned state bundle.

## Design Decisions

### Use Redux Toolkit rather than raw Redux

The notebook needs modern slice/thunk ergonomics, not boilerplate reducers and action constants.

### Use normalized cells plus ordered IDs

This matches the domain and simplifies inserts, deletes, and selection updates.

### Keep transport layer thin

The existing `httpClient.ts` remains the API boundary. This ticket is a state-management change, not a transport rewrite.

## Alternatives Considered

### Keep the custom hook and “clean it up”

Rejected. The state is no longer local to one hook.

### Adopt RTK Query

Rejected for this ticket because notebook commands and websocket updates still require a feature slice.

## Implementation Plan

1. Add `@reduxjs/toolkit` and `react-redux` to the frontend.
2. Create `frontend/src/app/store.ts` and typed hooks.
3. Create `frontend/src/notebook/state/notebookSlice.ts`, thunks, and selectors.
4. Move notebook bootstrap into the store.
5. Move document/runtime/dirty state into normalized slice state.
6. Move notebook-wide UI state (`activeCellId`, `aiPrompts`, collapsed/dismissed threads, sem projection) into the slice.
7. Refactor `NotebookPage` to dispatch actions and read selectors.
8. Reduce `NotebookCellCard` props to view data plus local callbacks.
9. Remove or retire `useNotebookDocument`.
10. Add selector/thunk tests and update component tests.

## Validation Plan

- `npm test -- --run src/notebook ...` or `npx vitest run ...`
- `npx eslint ...`
- manual validation of:
  - typing in cells,
  - run/save sequencing,
  - insert/move/delete,
  - active-cell navigation,
  - AI attachments rendering under the correct cell.

## Open Questions

1. Should `semProjection` live in the same slice or a sibling slice under one store? This ticket assumes same slice for simplicity.
2. Should the page still own `rawActiveCellIndex`, or should the store normalize on `activeCellId` only? This ticket recommends `activeCellId`.

## References

- [frontend/src/notebook/useNotebookDocument.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/useNotebookDocument.ts#L48)
- [frontend/src/notebook/NotebookPage.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookPage.tsx#L15)
- [frontend/src/notebook/NotebookCellCard.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookCellCard.tsx#L75)
- [frontend/src/notebook/runtimeState.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/runtimeState.ts#L49)
- [frontend/src/sem/semProjection.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/sem/semProjection.ts#L403)
- [frontend/package.json](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/package.json#L1)

## References

<!-- Link to related documents, RFCs, or external resources -->
