---
Title: Investigation diary
Ticket: COZODB-005
Status: active
Topics:
    - architecture
    - frontend
    - cozodb
    - ai-completion
DocType: reference
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: ""
LastUpdated: 2026-03-15T20:10:00-04:00
WhatFor: Record how the imported notebook proposal was checked against the current CozoDB editor, how the SQLite plus shared Pinocchio-timeline constraint changes the design, and how the final scoped implementation plan was derived.
WhenToUse: Use when resuming COZODB-005, reviewing why phase 1 includes real persistence, or checking which parts of the imported proposal matched or diverged from the live code.
---

# Investigation diary

## Goal

Capture how the imported CozoDB notebook proposal was validated against the live codebase, how the revised SQLite plus shared-timeline constraint changes the implementation, and how that turned into a scoped phase 1 notebook plan.

## Context

The user requested a new ticket specifically for turning the current CozoDB editor into a notebook playground. The request also explicitly constrained the scope: do not add too many features at once, and focus first on a robust notebook model with AI functionality under cells rather than broader hydration complexity.

## Quick Reference

### Prompt Context

**User prompt (verbatim):** "Create a new ticket to turn this into a cozodb notebook playground. docmgr import file --file /tmp/cozodb-notebook.md --ticket ... and read it. We don't want to add too many feratures at once, and instead focus on having a robust notebook model with ai functionality under cells. no staleness and complexity like that.

Create a detailed analysis / design / implementation guide that is very detailed for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file
  references.
  It should be very clear and detailed. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Create a new docmgr ticket, import the notebook proposal, verify it against the current code, write a detailed intern-facing design guide with a conservative MVP scope, and upload the resulting ticket bundle to reMarkable.

**Inferred user intent:** Reframe the CozoDB editor as a notebook product, but do it in a way that does not explode the implementation surface.

### Step 1: create the ticket and import the proposal

I created `COZODB-005` and imported the proposal directly into the ticket workspace so the final design doc could cite a stable local source path rather than a transient `/tmp` file.

Commands run:

- `docmgr ticket list`
- `ls -l /tmp/cozodb-notebook.md`
- `docmgr status --summary-only`
- `docmgr ticket create-ticket --ticket COZODB-005 --title "CozoDB Notebook Playground" --topics notebook,frontend,cozodb,ai,cells,editor`
- `docmgr doc add --ticket COZODB-005 --doc-type design-doc --title "CozoDB Notebook Playground Architecture and Intern Guide"`
- `docmgr doc add --ticket COZODB-005 --doc-type reference --title "Investigation diary"`
- `docmgr import file --file /tmp/cozodb-notebook.md --ticket COZODB-005`

What worked:

- ticket creation
- document creation
- source import into `sources/local/cozodb-notebook.md`

What I learned:

- unlike the earlier COZODB-004 import drift, the requested `docmgr import file --file ...` syntax matches the current CLI and worked directly.

### Step 2: audit the imported proposal against the current app

I then treated the imported proposal as a design hypothesis rather than as a spec. The important verification step was to compare its claims against the current editor and backend.

Files read:

- imported proposal:
  - `ttmp/2026/03/15/COZODB-005--cozodb-notebook-playground/sources/local/cozodb-notebook.md`
- current line editor model:
  - `frontend/src/editor/usePadDocument.js`
  - `frontend/src/editor/PadEditor.jsx`
- current screen orchestration:
  - `frontend/src/DatalogPad.jsx`
- current SEM projector:
  - `frontend/src/sem/semProjection.js`
- current backend API and websocket path:
  - `backend/main.go`
  - `backend/pkg/api/handlers.go`
  - `backend/pkg/api/websocket.go`

Verified conclusions:

- The proposal is right that the app is still fundamentally line-oriented.
- The proposal is right that `#??` is a prototype affordance, not a durable notebook interaction model.
- The proposal is right that cell ownership is the correct future unit for execution and AI attachment.
- The proposal is too ambitious for a first pass if it includes notebook document changes, kernel/session management, staleness, replay, and timeline hydration all together.

That last point matters. The user explicitly asked for a robust notebook model with AI under cells and specifically warned against overloading the work with too much complexity. So the correct response is not to mirror the proposal’s biggest version. The correct response is to scope the first implementation more tightly.

### Step 3: derive the initial scoped design

The initial design recommendation was:

- replace the line array with a notebook document model
- introduce code and markdown cells
- make cell runs first-class
- attach result/error/AI outputs to `cellId`
- keep the existing extraction stack but change ownership from `anchorLine` to `ownerCellId`
- postpone advanced hydration and replay work until the notebook substrate is stable

This cut was technically coherent and aligned with the explicit user constraint to avoid adding too many features at once.

### Step 4: revise the design for SQLite notebook storage plus a shared Pinocchio timeline DB

The user then added a more specific storage and ownership requirement:

- notebook types must live in `cozodb-editor`
- Pinocchio must remain unchanged
- notebook storage must use SQLite
- the Pinocchio timeline store must use the same SQLite database as the notebook store
- the system should support crosslinking notebooks to timelines and snapshots

That changed the shape of phase 1 significantly. The earlier draft deferred timeline-backed persistence. After reading the relevant Pinocchio code, that deferment was no longer correct for this ticket.

Files checked:

- Pinocchio timeline store:
  - `/home/manuel/code/wesen/corporate-headquarters/pinocchio/pkg/persistence/chatstore/timeline_store_sqlite.go`
- Pinocchio persistence bootstrap examples:
  - `/home/manuel/code/wesen/corporate-headquarters/pinocchio/pkg/cmds/chat_persistence.go`
- Current backend entrypoint:
  - `backend/main.go`
- Current query and websocket API:
  - `backend/pkg/api/handlers.go`
  - `backend/pkg/api/websocket.go`

Verified conclusions:

- Pinocchio already exposes a SQLite timeline store that can be opened from a DSN.
- That store creates `timeline_*` tables and can safely coexist with notebook-owned tables if the notebook code uses a separate prefix such as `nb_*`.
- There is no need to modify Pinocchio for phase 1.
- The correct design is not "build notebook state now, decide persistence later". The correct design is "introduce notebook source tables plus timeline persistence together, but keep all notebook-specific translation code local to this repo".

### Cross-check summary table

### Cross-check summary table

| Proposal claim | Verified locally? | Final judgment |
| --- | --- | --- |
| The current app is line-centric | Yes | Correct |
| `#??` should go away in a notebook | Yes | Correct |
| Outputs should attach to cells, not lines | Yes | Correct |
| AI bundles should belong under cell outputs | Yes | Correct |
| Full runtime hydration UI should be part of the first notebook implementation | Not required by current code | Deferred |
| Timeline persistence should be part of the first notebook implementation | Yes, after revised user constraints | Included in phase 1 |
| Pinocchio should be modified for notebook support | No | Explicitly rejected |
| Pinocchio timeline SQLite store can be reused unchanged | Yes | Included in phase 1 |

## Usage Examples

### Step 5: implement notebook phase 1

After the ticket was re-scoped, I implemented a working first notebook slice instead of stopping at planning.

#### Backend work completed

Files added:

- `backend/pkg/notebook/types.go`
- `backend/pkg/notebook/store.go`
- `backend/pkg/notebook/service.go`
- `backend/pkg/notebook/service_test.go`
- `backend/pkg/api/notebook_handlers.go`

Files updated:

- `backend/main.go`
- `backend/pkg/api/types.go`
- `backend/pkg/api/websocket.go`
- `backend/pkg/hints/projection_defaults.go`
- `backend/pkg/hints/structured_events.go`
- `backend/pkg/hints/sem_registry.go`

What changed:

- added notebook-owned SQLite tables `nb_notebooks`, `nb_cells`, `nb_runs`, and `nb_link_timeline_snapshots`
- added a notebook service that opens Pinocchio's SQLite timeline store against the same application DB file
- added notebook CRUD endpoints and `POST /api/notebook-cells/{cellId}/run`
- persisted cell run outputs as notebook-owned timeline entities in Pinocchio
- added notebook runtime hydration by reading the latest timeline snapshot for each cell conversation
- changed websocket ownership payloads to carry `notebookId`, `ownerCellId`, and `runId`

The most important implementation choice was to keep notebook runtime translation local to this repo. Pinocchio remains unchanged. The app now uses Pinocchio as a storage primitive, not as the place where notebook concepts live.

#### Frontend work completed

Files added:

- `frontend/src/notebook/useNotebookDocument.js`
- `frontend/src/notebook/NotebookPage.jsx`
- `frontend/src/notebook/NotebookCellCard.jsx`
- `frontend/src/notebook/notebook.css`

Files updated:

- `frontend/src/App.jsx`
- `frontend/src/transport/httpClient.js`
- `frontend/src/sem/semProjection.js`
- `frontend/src/sem/semProjection.test.js`

What changed:

- replaced the app root with a notebook page
- introduced a document hook for notebook loading, editing, insertion, movement, deletion, and per-cell execution
- rendered code and markdown cells as first-class notebook units
- rendered query results and error outputs under cells
- moved AI attachment from line ownership to `ownerCellId`
- reused the existing SEM widget renderer under notebook cells
- added cell-local AI prompt handling and "insert suggestion as new code cell below" behavior

#### Validation and debugging notes

Commands run successfully:

- `go test ./...` in `backend`
- `npm test`
- `npm run lint`
- `npm run build`

Notable issues encountered:

- the backend initially failed with `go: updates to go.mod needed`, which was resolved by running `go mod tidy`
- the first notebook service test failed with `proto: invalid type: []string`, which revealed that timeline entity props need `[]any`-compatible values before passing them into `structpb.NewStruct`
- the first frontend lint pass failed because the initial hook implementation used avoidable effect-driven state mirroring and manual memoization that the repo's React rules reject; the fix was to simplify the notebook hook and page rather than fight the linter

#### Commit checkpoints

- `aea7889` `docs(ticket): rescope COZODB-005 for sqlite notebook runtime`
- `a012a8f` `feat(notebook): add notebook phase 1 runtime and ui`

### Step 6: TypeScript port and System 7 UI redesign (Phase 2)

After phase 1 shipped with a working notebook runtime, the next step was to port the entire frontend from JavaScript to TypeScript and redesign the UI with classic Macintosh System 7 aesthetics.

#### TypeScript infrastructure

Changes:

- added `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess`, ES2022 target
- installed `typescript`, `typescript-eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`
- replaced `vite.config.js` with `vite.config.ts`
- updated `eslint.config.js` to use `tseslint.configs.recommended` and lint `.ts`/`.tsx` files
- updated `index.html` entry point to reference `main.tsx`
- added `vite-env.d.ts` for Vite client types

What I learned:

- the existing project already had `@types/react` and `@types/react-dom` in devDependencies from the Vite scaffold, so React typing worked immediately
- `.at()` on arrays requires ES2022 lib, which is a common gotcha when upgrading from ES2020

#### TypeScript port approach

The key lesson from this phase is that porting to TypeScript and changing the chrome does not by itself finish the semantic notebook pivot. The app can look like a notebook and still leak line-oriented assumptions in the projector and fallback rendering paths.

### Step 7: finish notebook AI ownership in the phase 2 UI

After the TypeScript and System 7 pass, I reviewed the notebook AI path again and found a remaining ownership bug:

- notebook requests were already sent with `ownerCellId`
- structured Cozo threads were already selectable by cell
- but line/global selectors still picked up cell-owned events because they only checked `anchorLine`
- and fallback `hint.result` / diagnosis payloads could still disappear because the notebook UI only rendered structured Cozo threads plus live streaming deltas

That meant ownership was only partially migrated.

Files updated:

- `frontend/src/sem/semProjection.ts`
- `frontend/src/sem/semProjection.test.ts`
- `frontend/src/notebook/NotebookCellCard.tsx`
- `frontend/src/features/cozo-sem/CozoSemRenderer.tsx`

What changed:

- line/global selectors now explicitly ignore entities and bundles that already have `ownerCellId`
- notebook-only selectors remain responsible for cell-owned threads and streaming entries
- non-structured `hint.result` payloads are now retained for cell-owned notebook requests instead of being dropped unconditionally
- diagnosis entities are now selectable by `ownerCellId`
- the notebook cell renderer now shows fallback hint cards and diagnosis cards under the owning cell when no structured thread exists
- SEM thread chrome now says "Attached to cell" when ownership is cell-based instead of pretending everything is still line/global

Why this matters:

- the notebook path now owns notebook AI semantically, not just transport-wise
- fallback AI answers no longer vanish simply because structured extraction did not yield a visible thread
- legacy line-based views can still exist without stealing notebook-owned events

Validation:

- `npm test`
- `npm run lint`
- `npm run build`
- `go test ./...`

### Step 8: define phase 3 after the ownership pivot

Once phase 2 finished the ownership model, the next sensible phase was no longer backend persistence. The bottleneck shifts to notebook ergonomics.

The reason is straightforward:

- phase 1 created a real notebook substrate
- phase 2 made AI semantically cell-owned
- the next visible product weakness is now authoring feel rather than ownership correctness

So phase 3 is defined as two small clusters:

1. notebook ergonomics
   - markdown preview mode
   - active-cell indication
   - keyboard navigation
   - deterministic insert-below focus behavior
   - output collapse for large result and AI sections

2. lightweight runtime UX
   - dirty indicators
   - richer execution badges
   - a decision point on whether latest-output-only is still enough

This is intentionally not a replay/hydration phase. That would blur the roadmap and re-open a larger runtime scope before the notebook authoring surface feels solid.

### Step 9: implement the first phase 3 runtime slice

After correcting the roadmap, I implemented the first actual phase 3 slice: dirty and stale notebook state.

Files added:

- `frontend/src/notebook/runtimeState.ts`
- `frontend/src/notebook/runtimeState.test.ts`

Files updated:

- `frontend/src/transport/httpClient.ts`
- `frontend/src/notebook/useNotebookDocument.ts`
- `frontend/src/notebook/NotebookPage.tsx`
- `frontend/src/notebook/NotebookCellCard.tsx`

What changed:

- the frontend now derives notebook execution state as a separate pure layer instead of scattering dirty/stale rules across components
- dirty state is driven by local unsaved edits, lack of any prior run, or persisted edits newer than the last run
- stale state is conservative: if an earlier code cell is dirty or if an earlier risky cell reran after the current cell, downstream cells become stale
- notebook cell chrome now renders `dirty` and `stale` badges

Important implementation detail:

I kept this phase frontend-derived rather than inventing a new backend stale-propagation subsystem immediately. The backend already exposes enough run metadata for a conservative first pass:

- cell order from the notebook document
- `execution_count`
- `finished_at_ms`
- latest per-cell runtime hydration

That gives the notebook a meaningful run model now, while still leaving room for a later backend-owned stale classifier if the product needs stronger guarantees.

Validation:

- `npm test`
- `npm run lint`
- `npm run build`
- `go test ./...`

I ported files bottom-up in dependency order:

1. Pure constants: `semEventTypes.ts` (no changes needed, just rename)
2. View-model functions: `hintViewModel.ts`, `toHintViewModel.ts`, `toQuerySuggestionViewModel.ts`, `toDocRefViewModel.ts`
3. Transport layer: `httpClient.ts` (added interfaces for all API types: `NotebookCell`, `Notebook`, `CellRuntime`, `NotebookDocument`, etc.), `hintsSocket.ts` (added `SemEvent`, `SemEnvelope`, `HintsSocket` types)
4. SEM projection: `semProjection.ts` (the largest file — added `SemEntity`, `SemBundleEntity`, `SemProjectionState`, `SemThread`, `EntityKind`, `EntityStatus` types)
5. Handler registration: `registerDefaultSemHandlers.ts`, `registerCozoSemHandlers.ts`
6. React components: all `.jsx` → `.tsx` with typed props interfaces
7. Notebook components: `useNotebookDocument.ts` with `UseNotebookDocumentResult` return type, `NotebookCellCard.tsx` with `NotebookCellCardProps`, `NotebookPage.tsx`
8. Entry points: `App.tsx`, `main.tsx`
9. Tests: renamed to `.test.ts`/`.test.tsx` — all 16 tests passed without code changes

Notable decisions:

- `semProjection.ts` event handling required a `getEventData()` helper to safely extract the data field, since `SemEvent.data` can be either a string or an object depending on the event type
- used `"in" operator` type narrowing in `useNotebookDocument.ts` to discriminate between API success and error responses rather than optional chaining on untyped objects
- kept the entity constants as `as const` to preserve literal types

#### System 7 UI redesign

The user requested macOS 1 / System 7 retro aesthetics. The redesign involved:

- **Menu bar**: fixed top bar with Apple logo, File/Edit/Cell/Runtime menus, and connection status
- **Window chrome**: classic System 7 title bar with horizontal stripe pattern (via CSS `repeating-linear-gradient`), close box, and 2px black borders with `box-shadow: 2px 2px 0px #000`
- **Buttons**: 1px black bordered buttons with shadow, invert to black-on-white on hover
- **Color palette**: monochrome grayscale — white windows on `#a8a8a8` desktop with subtle dither pattern (via `repeating-conic-gradient`)
- **Typography**: IBM Plex Sans for UI, IBM Plex Mono for code — closest modern equivalents to Chicago and Monaco
- **Cell cards**: nested windows inside the main notebook window, each with its own title bar showing cell type and execution status
- **Keyboard shortcuts**: Shift+Enter to run cells, Enter to send AI prompts
- **Empty state**: centered prompt with code/markdown buttons when notebook has no cells

CSS class naming shifted from `cozo-notebook-*` to `mac-*` for new components. Legacy `cozo-*` classes kept for the SEM/AI card components that were restyled but not renamed.

#### Validation

- `npx tsc --noEmit` — clean, zero errors
- `npm run build` — builds in ~108ms
- `npm run lint` — clean
- `npm test` — all 16 tests pass

#### Commit checkpoint

- `301bac4` `feat(frontend): port to TypeScript with System 7 retro Mac UI`

### How to use this diary when implementing COZODB-005

1. Read the imported source at `sources/local/cozodb-notebook.md`.
2. Read the design doc for the scoped MVP decisions.
3. Start implementation from the notebook document model plus shared SQLite bootstrap, not from replay UI or advanced hydration.
4. Re-check the current code paths listed above before deciding what to retire versus what to preserve.

### Review instructions

Start with these files to understand the current mismatch:

- `frontend/src/editor/usePadDocument.js`
- `frontend/src/editor/PadEditor.jsx`
- `frontend/src/DatalogPad.jsx`
- `frontend/src/sem/semProjection.js`
- `/home/manuel/code/wesen/corporate-headquarters/pinocchio/pkg/persistence/chatstore/timeline_store_sqlite.go`

Then compare them against the imported proposal:

- `ttmp/2026/03/15/COZODB-005--cozodb-notebook-playground/sources/local/cozodb-notebook.md`

Then read the design doc:

- `ttmp/2026/03/15/COZODB-005--cozodb-notebook-playground/design-doc/01-cozodb-notebook-playground-architecture-and-intern-guide.md`

## Related

- design doc:
  - `ttmp/2026/03/15/COZODB-005--cozodb-notebook-playground/design-doc/01-cozodb-notebook-playground-architecture-and-intern-guide.md`
- imported source:
  - `ttmp/2026/03/15/COZODB-005--cozodb-notebook-playground/sources/local/cozodb-notebook.md`
- related earlier tickets:
  - `COZODB-003` frontend decomposition
  - `COZODB-004` SEM projection tightening
