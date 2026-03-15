---
Title: UX Brief - Phase 3 Notebook Runtime and Authoring
Ticket: COZODB-005
Status: active
Topics:
    - ux
    - frontend
    - notebook
    - cozodb
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: ""
LastUpdated: 2026-03-15T20:05:00-04:00
WhatFor: Brief a UX designer on the current state of the CozoDB notebook playground, the real phase 3 goals, and the design problems to solve next without assuming prior context from the implementation work.
WhenToUse: Use when designing the next notebook interaction pass, reviewing runtime and staleness UX, or onboarding a designer who has not followed the previous tickets closely.
---

# UX Brief - Phase 3 Notebook Runtime and Authoring

## What This Project Is

The CozoDB editor is no longer just a text editor for queries. It is becoming a notebook-style environment for working with CozoScript, running cells against a live runtime, and receiving structured AI assistance directly under those cells.

The current product direction is:

- a notebook document made of cells
- code cells and markdown cells
- per-cell execution
- per-cell outputs
- per-cell AI assistance
- persistent local storage

This is not a generic notes app and not a full Jupyter clone. It is a domain-specific computational notebook for CozoScript and database exploration.

## What Already Exists

The designer should assume the following is already implemented:

- The app opens into a notebook UI, not the old line-based pad.
- Notebooks and cells are persisted locally in SQLite.
- Code cells can run individually.
- Query results render under the owning cell.
- Errors render under the owning cell.
- AI requests are attached to a cell and render under that cell.
- Structured AI threads can include hints, query suggestions, and documentation references.
- The current visual theme has already been moved toward a classic Macintosh / System 7 style windowed notebook interface.

Key source files:

- notebook page:
  - [frontend/src/notebook/NotebookPage.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookPage.tsx)
- notebook cell card:
  - [frontend/src/notebook/NotebookCellCard.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookCellCard.tsx)
- notebook runtime state:
  - [frontend/src/notebook/runtimeState.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/runtimeState.ts)
- notebook styles:
  - [frontend/src/notebook/notebook.css](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/notebook.css)
- SEM projection:
  - [frontend/src/sem/semProjection.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/sem/semProjection.ts)

## What Phase 3 Actually Is

Phase 3 is not primarily about polish in the abstract. It is about making the notebook runtime legible to a user.

We already have a basic run model:

- cells can run
- each run has an execution count
- each cell can have latest output

We also now have a conservative runtime-state model:

- `dirty`
  - the cell changed since its last run, or has never been run
- `stale`
  - an earlier cell changed or reran in a way that may invalidate this cell

This is the real design problem now:

How do we help users understand the trustworthiness and status of each cell without drowning them in system noise?

That is the core Phase 3 UX challenge.

## The User Problem

The notebook is stateful. That means earlier cells can affect later cells. If the interface does not make this visible, users will misread results as current when they are actually based on an older runtime state.

The most important user risks are:

- A user edits a cell and forgets to rerun it.
- A user reruns a stateful cell near the top and assumes later cells are still valid.
- A user sees AI advice under a cell but cannot tell whether it belongs to the latest run or an older context.
- A user cannot quickly tell which cell needs attention.

The UI must therefore communicate:

- what changed
- what needs rerunning
- what is current
- what is attached to the current cell and run

## Current Runtime Model in Plain English

The designer does not need the code details, but does need the semantics.

### Dirty

A cell is `dirty` when its source changed since the last successful run, or when it has never been run.

Interpretation for UI:

- the content in the editor is newer than the output below it
- the output may still be useful as history, but it is not current

### Stale

A cell is `stale` when an earlier cell changed or reran in a way that may invalidate the current cell’s result.

This is conservative on purpose.

Interpretation for UI:

- the cell itself may not have changed
- but its output should not be treated as trustworthy until rerun

### Running

A cell is actively executing.

Interpretation for UI:

- input is still visible
- output area may be updating
- the user needs immediate state feedback

### Error

The last run failed.

Interpretation for UI:

- the cell needs intervention
- AI diagnosis may appear under the error

## The Main Design Questions

The UX designer should focus on these questions:

1. How should a user visually distinguish `dirty` from `stale` at a glance?
2. How much prominence should runtime status have relative to the cell content itself?
3. How do we show historical output without implying that it is current?
4. How should markdown cells behave when they are not actively being edited?
5. How should focus move after creating cells or inserting AI-suggested code below?

These are not just visual questions. They shape how comprehensible the notebook feels.

## Design Goals

The next design pass should optimize for:

- rapid scanability
- low ambiguity
- preserving the notebook feeling rather than turning cells into dashboard widgets
- keeping runtime feedback near the owning cell
- making the next action obvious

More concretely:

- A user should be able to scan the notebook and find every cell that needs attention in seconds.
- A user should be able to tell whether an output is current, outdated, or invalidated.
- A user should understand that AI responses belong to the cell, not to a separate chat sidebar.
- Markdown should feel like authored notebook narrative, not just another textarea.

## What Needs Design Work Next

### 1. Runtime badges and cell chrome

We already render small badges, but they are not a finished language yet.

This area needs:

- a clearer hierarchy between:
  - execution count
  - run status
  - dirty
  - stale
- visual rules for when multiple states appear together
- rules for how much emphasis to place on stale versus dirty

Design task:

- define a badge system or compact status strip that can scale without becoming noisy

### 2. Markdown edit versus preview mode

Markdown cells currently still feel too close to raw editing.

They need a more notebook-like lifecycle:

- preview when at rest
- edit mode when activated
- clear transition between the two

Design task:

- specify the interaction and visual treatment for markdown preview/edit switching

### 3. Active-cell model

The notebook needs a stronger sense of “where the user is”.

This is important for:

- keyboard navigation
- add-below flows
- AI suggestion insertion
- maintaining orientation in longer notebooks

Design task:

- define how the active cell is indicated
- define what happens visually when focus moves
- define how insertion below should hand off focus

### 4. Output containment

Some outputs, especially AI threads and large query results, can dominate the cell.

Design task:

- define output-collapse or output-summary behavior that keeps cells readable
- preserve the feeling that output belongs to the cell rather than becoming a detached panel

### 5. AI attachment semantics

AI is already cell-owned in the runtime model. The interface should make that obvious.

Design task:

- ensure AI affordances feel like “ask about this cell” rather than generic global assistant actions
- define how to visually distinguish:
  - live streaming AI response
  - structured AI thread
  - fallback simple AI answer
  - diagnosis tied to an error

## Recommended Interaction Model

The designer should work from this preferred interaction model unless there is a strong reason to change it.

### Code cell

Resting state:

- title/status strip
- editable code area
- latest output immediately below
- AI threads immediately below output

Focused state:

- stronger active-cell indication
- keyboard shortcuts visible or inferable
- run affordance easy to find

Dirty state:

- signal that source changed after the last run
- keep output visible but visually downgraded as historical

Stale state:

- signal that the output may be invalid due to earlier changes
- make rerun affordance obvious

### Markdown cell

Resting state:

- rendered markdown, not raw source

Focused/edit state:

- editable source area
- clear preview/edit distinction

### AI interaction

Preferred flow:

1. User focuses a code cell.
2. User asks AI about that cell.
3. Streaming answer appears under that cell.
4. Structured thread or fallback answer settles in place.
5. Query suggestion can insert a new code cell directly below the source cell.

This should feel like notebook augmentation, not chat bolted on underneath.

## Anti-Goals

The designer should explicitly avoid these directions for now:

- turning the notebook into a multi-pane chat product
- moving AI into a detached sidebar as the primary interaction
- designing for advanced replay/history browsers in this phase
- building a visually overloaded status language with too many colors or counters
- hiding stale/dirty state so aggressively that trustworthiness becomes unclear

## Suggested Deliverables

The designer’s output should ideally include:

- one notebook-level interaction spec
- one cell anatomy spec
- one runtime-status language spec
- one markdown preview/edit interaction spec
- one AI-under-cell interaction spec

Even lightweight wireframes are fine, but they should answer the state questions above.

## Concrete Screens or States To Mock

At minimum, mock these:

1. Notebook with:
   - one clean code cell
   - one dirty code cell
   - one stale downstream cell
   - one markdown cell in preview mode

2. Error case:
   - code cell with failed run
   - diagnosis result attached underneath

3. AI case:
   - code cell with streaming response
   - settled structured AI thread
   - suggestion inserting a new code cell below

4. Long notebook navigation case:
   - active cell clearly visible
   - insertion below maintains orientation

## Vocabulary

Use these terms consistently:

- `cell`
  - an authored notebook unit
- `run`
  - one execution of a code cell
- `output`
  - rendered result of a run
- `dirty`
  - cell changed since last run
- `stale`
  - earlier changes may invalidate this cell’s output
- `AI thread`
  - structured AI bundle attached to a cell
- `fallback answer`
  - non-structured AI result still attached to a cell

## References For Review

- ticket overview:
  - [index.md](/home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/15/COZODB-005--cozodb-notebook-playground/index.md)
- main architecture guide:
  - [01-cozodb-notebook-playground-architecture-and-intern-guide.md](/home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/15/COZODB-005--cozodb-notebook-playground/design-doc/01-cozodb-notebook-playground-architecture-and-intern-guide.md)
- current task list:
  - [tasks.md](/home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/15/COZODB-005--cozodb-notebook-playground/tasks.md)
- implementation diary:
  - [01-investigation-diary.md](/home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/15/COZODB-005--cozodb-notebook-playground/reference/01-investigation-diary.md)

## Short Summary

The notebook is already real enough that the next design work is not speculative. The main task is to make runtime trust and authoring flow legible:

- what changed
- what is outdated
- what belongs to this cell
- what the user should do next

If the designer solves those four things well, the notebook will start to feel coherent rather than merely functional.
