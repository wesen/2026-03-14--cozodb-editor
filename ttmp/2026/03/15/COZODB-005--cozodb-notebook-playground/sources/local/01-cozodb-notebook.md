---
Title: Imported proposal - CozoDB Notebook
Ticket: COZODB-005
Status: active
Topics:
    - architecture
    - frontend
    - cozodb
    - ai-completion
DocType: source
Intent: reference
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: Imported local proposal describing a cell-based Cozo notebook direction for the current line-oriented editor.
LastUpdated: 2026-03-15T17:28:00-04:00
WhatFor: Preserve the imported notebook proposal inside the ticket workspace as a design input.
WhenToUse: Use when comparing the raw proposal with the ticket's scoped MVP design.
---

Yes. The right move is to stop treating the notebook as “one text blob with decorations” and start treating it as a sequence of authored computation units.

Right now the app is line-centric:

* `DatalogPad.jsx` is one long document
* `PadEditor.jsx` is effectively one input per line
* `usePadDocument.js` turns `#??` lines into AI requests
* `semProjection.js` hangs outputs off line numbers and arrival order

That is why it keeps getting weird. The unit of authorship is pretending to be a line, but the unit of meaning is actually a **cell**. Jupyter figured this out years ago. The goblin is old.

## The core thesis

Build a **cell-based Cozo notebook**, not a decorated editor.

Five rules should drive the whole design:

1. A **cell** is the unit of authorship.
2. A **run** is the unit of execution.
3. An **output** is the unit of rendering.
4. An **AI bundle** is the unit of semantic grouping.
5. The **notebook document** and the **runtime projection** are different stores.

That separation fixes most of the current pain in one stroke.

---

# 1. What the new experience should feel like

The user should feel like they are building a computational narrative:

* write a Cozo cell
* run it
* see a result directly under it
* if it errors, see the error under it
* ask AI about that cell
* get a grouped AI output under that same cell
* insert suggested code as a **new cell below**, not as spooky line surgery

So the main screen becomes:

* top toolbar: notebook title, run all, restart kernel, connection state, workspace mode
* main column: a vertical list of cells
* optional right panel: schema explorer, relation inspector, docs, run history
* each cell has:

  * input area
  * execution badge like `[3]`
  * status badges: dirty, stale, running, error
  * toolbar: run, ask AI, duplicate, convert type, delete
  * output area below

That is the experience. Not “type a question into a comment and hope the line number survives.”

---

# 2. Cell types

For MVP, I would only ship **three** cell types.

## Code cell

Contains CozoScript.

This is the main unit. It runs against the notebook kernel/session and produces outputs.

## Markdown cell

For notes, explanation, hypotheses, interpretation of results.

This matters more than it sounds. Notebook users need a place for intent that is not fake code and not AI output.

## AI request cell or attached AI request

There are two viable designs:

### Option A: attached AI requests on code cells

Each code cell has actions like:

* Explain this cell
* Help me write this
* Fix this error
* Suggest next query
* Show relevant docs

These create AI outputs attached to the cell.

### Option B: explicit AI cells

A dedicated cell type where the user writes a natural-language request.

That produces an output bundle and often a suggested code cell below.

For MVP, I would do **Option A first**. It keeps the model clean: AI is an output of a cell action, not another full authoring mode. Later, explicit AI cells can be added for larger planning prompts.

---

# 3. The notebook’s mental model

The notebook should not pretend to be purely declarative. Cozo has side effects. Schema changes, inserts, deletes, relation creation, all that jazz. So the notebook needs a **kernel/session model** like Jupyter, but slightly more honest.

## Kernel/session

A notebook is attached to a runtime session:

* `kernel_id`
* `execution_count`
* `workspace_state_version`
* status: idle / running / disconnected / restarting

Every time a code cell runs:

* it gets a new `run_id`
* it increments execution count
* it records the workspace state before and after

## Staleness

If a user edits or reruns an earlier stateful cell, later cells are no longer trustworthy.

So each code cell needs one of these states:

* **clean**: source matches last successful run and upstream state is compatible
* **dirty**: source changed since last run
* **stale**: upstream state changed after this cell last ran
* **running**
* **error**

That is not optional. Without stale markers, notebook state becomes occult nonsense.

For MVP, be conservative:

* if any earlier **mutating** cell changes or reruns successfully, mark all later code cells stale
* if a user edits any earlier cell and you cannot classify it, also mark later cells stale

Later you can get fancier with read/write analysis, but do not start there.

## Kernel actions

The toolbar should expose:

* Run cell
* Run all
* Run all above
* Restart kernel
* Restart and run all

Those are the real operations users need.

---

# 4. What an output is

Outputs are not miscellaneous UI junk. They are first-class, typed objects attached to a cell run or cell request.

For Cozo, the initial output kinds should be:

* `query_result`
* `text_result`
* `error_result`
* `ai_bundle`

That’s enough.

## Query result

For successful execution.

Payload:

```ts
type QueryResultOutput = {
  id: string;
  kind: "query_result";
  cellId: string;
  runId: string;
  headers: string[];
  rows: unknown[][];
  tookMs?: number;
  rowCount?: number;
};
```

## Text result

For commands or informational output.

## Error result

For execution failures.

Payload:

```ts
type ErrorResultOutput = {
  id: string;
  kind: "error_result";
  cellId: string;
  runId: string;
  message: string;
  display?: string;
  code?: string;
};
```

## AI bundle

This is the key one.

An AI request should produce **one parent output bundle** with:

* summary text, streaming into place
* structured hint/doc/suggestion items as children
* status preview/complete/error
* mode: assist / diagnose / explain / next-step

That means the current split between `llm_text_stream` and separate structured widgets should disappear. They are one thing.

### AI bundle shape

```ts
type AIBundleOutput = {
  id: string;              // ai-bundle:<requestId>
  kind: "ai_bundle";
  ownerCellId: string;
  runId?: string;          // present for diagnosis/explain-on-result
  requestId: string;
  mode: "assist" | "diagnose" | "explain" | "next_step";
  status: "streaming" | "complete" | "error";
  summaryText: string;
  createdAtMs: number;
  updatedAtMs: number;
};
```

Children:

```ts
type AIItemOutput = {
  id: string;              // ai-item:<requestId>:<family>:<ordinal>
  kind: "cozo_hint" | "cozo_query_suggestion" | "cozo_doc_ref";
  parentId: string;        // ai_bundle id
  ownerCellId: string;
  runId?: string;
  ordinal: number;
  status: "preview" | "complete" | "error";
  data: Record<string, unknown>;
  error?: string;
};
```

That is the grouping contract. No line anchors. No adjacency inference. No haunted reducer state.

---

# 5. Why the current editor model fails

The current editor model has three structural mismatches:

## Lines are not stable owners

A line number is not a durable identity. Insert a line and the world shifts. That works for a cursor, not for semantic ownership.

## Outputs are not attached to executable units

You currently run a whole text document and then try to place results around it. A notebook runs a cell and attaches outputs to that cell.

## AI is encoded as fake source text

`#??` is clever in the way a trapdoor is clever. It’s fine for a sketch. It is not a durable interaction model. Natural language should not masquerade as commented-out code.

The notebook model fixes all three:

* ownership by `cellId`
* execution by `runId`
* AI by `requestId` and `bundleId`

---

# 6. The document model

The notebook document should be persisted separately from runtime outputs.

I would model it roughly like this:

```ts
type Notebook = {
  id: string;
  title: string;
  metadata: {
    language: "cozoscript";
    kernelMode: "workspace" | "sandbox";
  };
  cellOrder: string[];
};

type NotebookCell = {
  id: string;
  notebookId: string;
  kind: "code" | "markdown";
  source: string;
  metadata: {
    collapsed?: boolean;
    name?: string;
    tags?: string[];
  };
  createdAtMs: number;
  updatedAtMs: number;
};
```

Then separately:

```ts
type CellRun = {
  id: string;
  notebookId: string;
  cellId: string;
  kernelId: string;
  executionCount: number;
  sourceHash: string;
  status: "running" | "complete" | "error" | "cancelled";
  startedAtMs: number;
  finishedAtMs?: number;
  workspaceVersionBefore?: number;
  workspaceVersionAfter?: number;
};
```

And outputs:

```ts
type CellOutput = QueryResultOutput | TextResultOutput | ErrorResultOutput | AIBundleOutput | AIItemOutput;
```

## Important design choice

Do **not** use the runtime timeline store as the primary notebook document store.

Why:

* notebook editing is mutable and high-churn
* keystroke-level or frequent source upserts are not what the timeline store is good at
* document ordering and editing semantics are different from append-only event projection

Use a normal document store for notebook source. Use Pinocchio/timeline for runtime outputs and hydration if you want that machinery.

That split is very healthy.

---

# 7. UI structure

This is the screen I would build.

## Top bar

Contains:

* notebook title
* run all
* restart kernel
* workspace mode indicator
* connection state
* schema state badge
* maybe “stale cells: 3”

## Main notebook column

A vertically ordered list of cells.

### Each code cell shows:

* execution count gutter, like `[7]`
* editor block
* status badges: dirty/stale/running/error
* toolbar: run, ask AI, more
* output area below

### Each markdown cell shows:

* rendered markdown in command mode
* editor in edit mode

## Right panel

Optional but very useful:

* current schema
* relations list
* relation preview
* docs
* selected cell history

This keeps the notebook itself focused and prevents result cards from becoming the entire universe.

---

# 8. How cell execution should work

The current `/api/query` runs one script blob. That is the wrong primitive for a notebook.

The backend primitive should become:

* **run cell**
* optionally **run sequence of cells**

## Run cell

Input:

```json
{
  "notebookId": "nb-1",
  "cellId": "cell-3",
  "source": "...",
  "kernelId": "k-1"
}
```

Returns or streams:

* `run_id`
* `execution_count`
* status events
* result/error outputs

## Run all / run to here

This is not a frontend loop over `/api/query`. The backend should orchestrate it because:

* it owns execution order
* it owns kernel state
* it can emit consistent run events
* it can cancel cleanly

For MVP, one active execution per notebook is enough.

## Mutation awareness

When a cell runs successfully, the backend can classify it as:

* query
* mutation
* schema change
* command
* unknown

Even a rough classifier helps the frontend know which downstream cells to mark stale.

You do not need perfect parsing to start. A decent server-side heuristic is already much better than pretending the issue does not exist.

---

# 9. AI in the notebook

This should become much better than the current comment-trigger model.

## Per-cell AI actions

Each code cell should expose actions such as:

* Explain this cell
* Help complete this query
* Suggest a next query
* Diagnose this error
* Show docs relevant to this result

These all generate one AI request with a `requestId`, yielding one `ai_bundle`.

## What context goes into an AI request

For a notebook, the request context should be cell-based, not line-based.

Something like:

```ts
type AIRequestContext = {
  notebookId: string;
  cellId: string;
  runId?: string;
  mode: "assist" | "diagnose" | "explain" | "next_step";
  currentCellSource: string;
  selectedText?: string;
  priorCells: Array<{
    cellId: string;
    kind: "code" | "markdown";
    source: string;
    latestRunSummary?: string;
  }>;
  currentSchema: string;
  currentError?: string;
  latestResultPreview?: {
    headers: string[];
    rows: unknown[][];
  };
};
```

You can trim this down for token budgets, but this is the conceptual shape.

## Prompt changes

The prompt should stop saying “embedded in a Datalog query editor” and say “embedded in a Cozo notebook.”

It should also stop talking about line-oriented edits. The assistant should propose:

* complete cell content
* a corrected version of the current cell
* a new cell to insert below
* short explanations attached to the current cell

That is much cleaner.

### Example prompt framing

```text
You are a CozoScript assistant embedded in a computational notebook.

You are helping with one notebook cell inside an ordered sequence of code and markdown cells.

The user may ask you to:
- explain the current cell
- diagnose an error from the current cell run
- suggest the next cell
- rewrite the current cell
- generate a new CozoScript cell

Rules:
- refer to cells, not line numbers
- when suggesting code, produce complete cell content
- do not invent IDs, parent-child metadata, or anchors
- structured blocks describe content only; runtime ownership is injected by the system
```

That last rule matters. The LLM should not be asked to do bookkeeping.

---

# 10. Streaming and hydration

This is where the notebook design really cleans things up.

## Streaming

When an AI request or cell run starts, the backend emits events keyed by:

* `notebook_id`
* `cell_id`
* `run_id` or `request_id`
* `stream_id`

All live updates attach to one owner.

For AI, `stream_id` should be the `requestId`, and the parent bundle should be `ai-bundle:<requestId>`.

For query execution, outputs can be keyed by `runId`.

## Hydration

When the notebook reloads, the frontend loads:

* notebook document
* latest run per cell
* outputs for those runs
* active in-flight request state if any

Because outputs are keyed by `cellId` and `parentId`, the hydrated view is the same as the live view. No more “looked folded while streaming, looked different after refresh.”

That was the symptom. Cells are the cure.

---

# 11. Frontend architecture

I would replace the current architecture with two top-level state domains.

## A. Notebook document state

Owns editable source.

```ts
type NotebookDocState = {
  notebookId: string;
  title: string;
  cellOrder: string[];
  cellsById: Record<string, NotebookCell>;
  selectedCellId: string | null;
  editorModeByCell: Record<string, "edit" | "command">;
};
```

## B. Notebook runtime state

Owns runs and outputs.

```ts
type NotebookRuntimeState = {
  kernel: {
    id: string | null;
    status: "idle" | "running" | "disconnected" | "restarting";
    executionCount: number;
    workspaceVersion?: number;
  };
  runsById: Record<string, CellRun>;
  latestRunByCellId: Record<string, string>;
  outputsById: Record<string, CellOutput>;
  outputOrderByOwnerId: Record<string, string[]>;
  activeRequestsById: Record<string, { ownerCellId: string; status: string }>;
};
```

## Selectors

Then you render the notebook via selectors, not ad hoc line attachment logic.

Examples:

* `selectCellViewModel(cellId)`
* `selectLatestOutputsForCell(cellId)`
* `selectAIBundlesForCell(cellId)`
* `selectBundleChildren(bundleId)`
* `selectCellRunStatus(cellId)`

This is the architectural version of growing up.

## Component structure

I’d split the current `DatalogPad` into something like:

* `NotebookPage`
* `NotebookToolbar`
* `NotebookCellList`
* `CodeCell`
* `MarkdownCell`
* `CellOutputArea`
* `ResultOutputRenderer`
* `ErrorOutputRenderer`
* `AIBundleRenderer`

`QueryResultsTable` can survive. `CozoSemRenderer` can survive conceptually, but it should become a renderer for an `ai_bundle`, not an inferred line thread.

`PadEditor` and `usePadDocument` should be retired, not elaborated.

And yes, use a real multi-line code editor per cell. CodeMirror 6 is a sane choice. The current one-input-per-line setup is a charming prototype and a rotten notebook substrate.

---

# 12. Backend architecture

The backend needs three clear subsystems.

## A. Notebook document service

Handles:

* create notebook
* load notebook
* insert/delete/move/update cell
* save metadata

This can live in a simple relational store or even Cozo-backed metadata relations.

## B. Notebook runtime service

Handles:

* kernel/session lifecycle
* run cell
* run all / run to here
* state version tracking
* output generation

## C. AI assist service

Handles:

* cell assist requests
* diagnosis requests
* structured extraction
* streaming and semantic output bundling

This can keep using the current hints engine pattern, but the request contract changes from line-based to cell-based.

---

# 13. Event model

I would unify streaming operations behind one notebook socket.

For example:

* `notebook.cell.run`
* `notebook.cell.ai.request`
* `notebook.cell.cancel`
* `notebook.kernel.restart`

And emitted events like:

* `notebook.run.started`
* `notebook.run.finished`
* `cozo.result.upsert`
* `cozo.error.upsert`
* `cozo.ai.bundle.started`
* `llm.delta`
* `cozo.hint.preview`
* `cozo.hint.extracted`
* `cozo.query_suggestion.extracted`
* `cozo.doc_ref.extracted`
* `cozo.ai.bundle.finished`

For notebook grouping, every emitted event should carry the ownership fields that matter:

```json
{
  "notebook_id": "nb-1",
  "cell_id": "cell-3",
  "run_id": "run-9",
  "request_id": "req-4",
  "stream_id": "req-4",
  "bundle_id": "req-4"
}
```

Then structured children get:

```json
{
  "parent_id": "ai-bundle:req-4",
  "ordinal": 2
}
```

That makes the projector deterministic.

---

# 14. Pinocchio fit

Pinocchio is a good fit for **runtime projection and hydration**, not for the editable notebook document.

That is the clean line.

## Use Pinocchio for:

* timeline-style storage of outputs/runs
* `TimelineEntityV2` upserts for notebook runtime entities
* live `timeline.upsert` hydration of result/error/AI bundle outputs
* shared raw-event → entity reducers if you want

## Do not use Pinocchio for:

* per-keystroke notebook source edits
* cell ordering as the primary authoring store
* command-mode/edit-mode UI state

## Recommended notebook runtime entity kinds in Pinocchio

You do not need protobuf surgery. `TimelineEntityV2` is already flexible enough.

Use kinds like:

* `notebook_run`
* `query_result`
* `error_result`
* `ai_bundle`
* `cozo_hint`
* `cozo_query_suggestion`
* `cozo_doc_ref`

Props should include:

* `ownerCellId`
* `runId`
* `parentId`
* `ordinal`
* `mode`
* `status`
* `executionCount`

That is enough.

## Small Pinocchio improvements that would help

No schema changes required, but a few conventions would help a lot:

* standard props: `ownerId`, `ownerKind`, `parentId`, `ordinal`
* selectors/helpers for hierarchical entity grouping
* JS reducer context including `conv_id`, maybe `stream_id`, possibly notebook scope metadata

That makes notebook runtime projection easier without turning Pinocchio into a notebook editor.

---

# 15. Geppetto fit

Geppetto should remain the inference/extraction engine.

It should not become the notebook orchestrator.

## Keep in Geppetto:

* LLM request/response handling
* streaming
* structured extraction of hint/query suggestion/doc ref blocks
* context propagation into extractors

## Add for notebook support:

The AI request context should carry:

* `notebookId`
* `cellId`
* `runId?`
* `requestId`
* `mode`
* maybe `selection`
* maybe compact prior-cell context

And the structured extractor sessions should receive deterministic projection defaults:

* `bundleId`
* `parentId`
* `ownerCellId`
* `runId?`
* `ordinal`
* `mode`

Same story as before: let the model produce content, let the system inject ownership.

---

# 16. The most important semantic change

Replace `anchorLine` with `ownerCellId`.

That is the true notebook pivot.

If you later want finer-grained explain-on-selection, add:

```ts
selection?: {
  startLine: number;
  startCh: number;
  endLine: number;
  endCh: number;
}
```

But that is **secondary context**, not ownership.

Ownership is the cell.

---

# 17. Result and AI rendering rules

A code cell’s output area should render, in this order:

1. current run status
2. latest result or error for the latest run
3. attached AI bundles, newest first or by request time
4. optional history affordance

A few interaction rules matter:

* AI suggestions should default to **Insert as new cell below**
* “Replace current cell” should be secondary
* diagnosis should preserve the failing cell and propose a corrected sibling
* dismissing an AI bundle should hide that bundle, not mutate the cell source
* rerunning a cell should not delete older runs; it should just move the “latest run” pointer

That makes notebook history intelligible.

---

# 18. Persistence strategy

I would use two persistence layers.

## Notebook source store

Stores notebook and cells.

This can be:

* SQLite
* Postgres
* Cozo metadata relations
* even JSON files initially

Whatever is convenient. This is CRUD-shaped state.

## Runtime/output store

Stores runs and outputs.

This can be:

* Pinocchio timeline store
* a notebook-runs table family
* both, if Pinocchio is your hydration path

The frontend should merge them by `cellId` and `latestRunByCellId`.

That separation will save you from a lot of future nonsense.

---

# 19. Migration path from the current app

I would migrate in four phases.

## Phase 1: cell UI without deep backend changes

Replace the line editor with a notebook list of code cells.

Start with:

* one code cell
* run current cell
* render result below it
* markdown cell support

This immediately improves the UX.

## Phase 2: move AI to cell ownership

Kill `#??`.

Add per-cell AI actions and attach AI bundles under cells using `cellId`.

At this phase, `CozoSemRenderer` becomes a bundle renderer under a cell output area.

## Phase 3: add run model and staleness

Introduce:

* `runId`
* `executionCount`
* dirty/stale states
* run all / restart kernel

This makes the notebook honest.

## Phase 4: timeline-backed hydration

Use Pinocchio-style upserts or equivalent for runtime outputs so reload/hydration matches live streaming.

At that point, the streaming/hydration mismatch should largely disappear.

---

# 20. What I would not do

A few seductive bad ideas deserve pre-emptive insults.

## Do not keep `#??`

It is a prototype affordance, not a notebook primitive.

## Do not anchor outputs to line numbers

That problem is unsalvageable in a notebook design.

## Do not store notebook source as timeline chatter

Different beast.

## Do not ask the LLM to emit parent IDs, output IDs, or ownership metadata

That is deterministic runtime bookkeeping.

## Do not auto-rewrite current cells from AI by default

In notebooks, provenance matters. Insert below is safer.

---

# 21. A concrete example of the final UX

Imagine this notebook:

### Cell 1 `[1]` code

```cozo
:create users {name: String => age: Int, email: String}
```

Output:

* schema changed
* workspace rev `12 → 13`

### Cell 2 `[2]` code

```cozo
?[name, age, email] <- [
  ["Ada", 36, "ada@example.com"],
  ["Linus", 29, "linus@example.com"]
] :put users {name, age, email}
```

Output:

* text result: inserted 2 rows

### Cell 3 `[3]` code

```cozo
?[name, age] := *users{name, age}, age > 30
```

Output:

* result table

Then user clicks **Suggest next query** on cell 3.

Under cell 3 appears an AI bundle:

* streaming summary text
* primary hint
* two suggested next queries
* one doc reference

User clicks **Insert below** on suggestion 2.

A new code cell 4 appears with that suggestion prefilled.

That is the notebook experience. Clean. Traceable. No fake comments. No line-anchored poltergeists.

---

# 22. The design in one sentence

Turn the product from “a text pad that occasionally sprouts widgets” into “a cell notebook where every run and every AI interaction produces typed outputs attached to a stable cell owner.”

That is the whole move.

If you want, I can turn this into a concrete implementation spec next: frontend components, backend APIs, event schemas, and the exact entity model for `ai_bundle` and cell outputs.
