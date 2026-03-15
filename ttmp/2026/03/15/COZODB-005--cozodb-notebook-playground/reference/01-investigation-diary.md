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
