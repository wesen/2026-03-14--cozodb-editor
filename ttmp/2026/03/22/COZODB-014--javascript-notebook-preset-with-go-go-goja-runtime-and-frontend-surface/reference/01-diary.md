---
Title: Diary
Ticket: COZODB-014
Status: complete
Topics:
    - architecture
    - backend
    - frontend
    - javascript
    - notebook
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../corporate-headquarters/go-go-goja/engine/factory.go
      Note: Runtime factory API inspected during initial design work
    - Path: backend/pkg/notebook/current_cozo.go
      Note: Existing preset constructor used as the baseline for the JavaScript preset
    - Path: backend/pkg/notebook/javascript_runtime.go
      Note: diary step 3 implemented the Goja runtime manager
    - Path: backend/pkg/notebook/runtime.go
      Note: |-
        First implementation slice will generalize this seam for the JavaScript preset
        diary step 2 generalized the notebook runtime seam
    - Path: frontend/src/notebook/CurrentJavaScriptNotebookApp.stories.tsx
      Note: diary step 4 added full preset validation stories
    - Path: frontend/src/notebook/semHandlers.ts
      Note: diary step 4 extracted generic sem handler registration types
ExternalSources: []
Summary: Chronological diary for designing and implementing the JavaScript notebook preset on top of the shared notebook package using go-go-goja.
LastUpdated: 2026-03-22T16:36:47.723610135-04:00
WhatFor: Preserve the implementation trail, key commands, decisions, failures, and review notes for the JavaScript preset ticket.
WhenToUse: Use when continuing work on COZODB-014, reviewing what changed in each slice, or retracing why a design or implementation decision was made.
---


# Diary

## Goal

Capture each implementation slice for the JavaScript preset, including planning, runtime design decisions, concrete code changes, validation commands, failures, and review guidance.

## Context

The repository already supports one packaged notebook preset, Cozo. `COZODB-014` introduces the second preset, JavaScript, using `go-go-goja` as the backend runtime and the shared React/Redux notebook package as the frontend host.

## Quick Reference

## Step 1: Open the JavaScript preset ticket and define the implementation approach

I started by inspecting the actual `go-go-goja` lifecycle API instead of designing against stale assumptions. The important discovery was that the runtime is now built through `engine.NewBuilder().WithModules(...).Build().NewRuntime(ctx)`, which gives us a clean factory/runtime split and a natural reset strategy. That confirmed the JavaScript preset should own a runtime manager that swaps owned runtimes on reset instead of mutating one VM forever.

I also verified that the notebook package is not fully language-neutral yet. The remaining blocker is [runtime.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/runtime.go), which still exposes Cozo-specific result types. That means the first implementation slice should generalize the runtime seam before adding the Goja adapter. I created `COZODB-014`, wrote the initial implementation guide and task list, and added a local inventory script so the ticket contains its own source-gathering evidence.

### Prompt Context

**User prompt (verbatim):** "Ok, let's start the JS one. We are going to use go-go-goja /home/manuel/code/wesen/corporate-headquarters/go-go-goja for the JS"

**Assistant interpretation:** Start the JavaScript preset work immediately, using the local `go-go-goja` repository as the runtime technology and following the same ticket-and-diary workflow as previous tickets.

**Inferred user intent:** Turn the packaging design from `COZODB-013` into real implementation work for a second preset family, while keeping the work documented and reviewable.

### What I did
- inspected `go-go-goja` runtime builder and lifecycle files
- inspected the current Cozo preset backend and frontend wrappers
- created ticket `COZODB-014`
- created the implementation guide and diary documents
- added the task backlog for the ticket
- added `scripts/01-js-preset-inventory.sh`

### Why
- the Goja runtime API needed to be verified before choosing the adapter shape
- the ticket needed a concrete plan and file map before code edits started
- the first slice needed to identify the real architectural blocker, which is the Cozo-shaped runtime seam

### What worked
- `go-go-goja` exposes exactly the factory/runtime lifecycle needed for a resettable notebook runtime
- the current Cozo preset already provides a strong reference shape for both backend and frontend presets
- the existing package seams from `COZODB-013` are sufficient to host the second preset without forking the app

### What didn't work
- A first attempt to inspect `backend/pkg/cozo/types.go` failed because the types are actually defined in `backend/pkg/cozo/db.go`.
  - Command: `sed -n '1,220p' backend/pkg/cozo/types.go`
  - Error: `sed: can't read backend/pkg/cozo/types.go: No such file or directory`

### What I learned
- `go-go-goja` no longer wants legacy convenience construction; explicit factory composition is the intended embedding path
- the remaining genericity gap is narrow and well-defined
- the frontend preset architecture is already ready for a JavaScript sibling preset once the backend seam is cleaned up

### What was tricky to build
- The tricky part at this stage was not code, but scope discipline. It is tempting to jump directly into a Goja runtime manager, but doing so before fixing the runtime seam would lock in more Cozo leakage. The right sequence is to generalize the contract first, then add the new preset behind it.

### What warrants a second pair of eyes
- The planned notebook-owned runtime result types should be reviewed before they spread through both presets
- The result-shaping rules for irregular JavaScript values will need careful review once implemented

### What should be done in the future
- Implement the backend runtime seam cleanup next
- Then add the Goja runtime adapter and the current JavaScript preset constructor

### Code review instructions
- Start with [runtime.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/runtime.go) and [current_cozo.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/current_cozo.go)
- Read the plan in [01-javascript-notebook-preset-implementation-guide.md](/home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/22/COZODB-014--javascript-notebook-preset-with-go-go-goja-runtime-and-frontend-surface/design-doc/01-javascript-notebook-preset-implementation-guide.md)
- Validate the inventory script with `bash ttmp/2026/03/22/COZODB-014--javascript-notebook-preset-with-go-go-goja-runtime-and-frontend-surface/scripts/01-js-preset-inventory.sh`

### Technical details
- `go-go-goja` files inspected:
  - `/home/manuel/code/wesen/corporate-headquarters/go-go-goja/engine/factory.go`
  - `/home/manuel/code/wesen/corporate-headquarters/go-go-goja/engine/runtime.go`
  - `/home/manuel/code/wesen/corporate-headquarters/go-go-goja/engine/runtime_modules.go`
  - `/home/manuel/code/wesen/corporate-headquarters/go-go-goja/pkg/repl/evaluators/javascript/evaluator.go`
- current notebook preset files inspected:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/current_cozo.go`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentCozo.tsx`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentCozoConfig.ts`

## Usage Examples

- Continue implementation by appending a new diary step after each code commit.
- Use the checklist in the design doc before broadening the preset surface.
- Run the ticket-local inventory script when you need a quick map of preset-related files.

## Step 2: Generalize the backend runtime seam before adding Goja

The first real code slice was intentionally not about JavaScript execution. I changed the notebook runtime interface so it stopped returning Cozo package types. That gave the notebook package its own `RuntimeQueryResult`, `RuntimeRelationInfo`, and `RuntimeColumnInfo` types, then I added a small Cozo adapter so the existing preset still fit cleanly. This was committed as `fb965e2`.

That change matters because it prevents the JavaScript preset from fabricating Cozo-shaped results just to satisfy the package contract. The rest of the system could then continue to think in "notebook runtime" terms while presets translate their own domain data behind that interface.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Start the JavaScript preset work by fixing the remaining architecture seam that would otherwise make every later preset implementation misleading.

**Inferred user intent:** Make JavaScript a real second preset, not a thin compatibility layer disguised as one.

**Commit (code):** `fb965e2` — `backend: make notebook runtime contract package-owned`

### What I did
- updated [runtime.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/runtime.go) to define notebook-owned runtime result and relation types
- added [cozo_runtime.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/cozo_runtime.go) as a translation adapter from `cozo.Manager`
- rewired [current_cozo.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/current_cozo.go) to inject the adapter instead of the raw manager
- changed [handlers.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/handlers.go) to depend on the notebook runtime contract
- fixed the affected service and HTTP tests

### Why
- the generic notebook package should own its own types
- a second preset would otherwise hard-code Cozo semantics into JavaScript integration
- this was the minimum contract cleanup needed before adding Goja runtime code

### What worked
- the contract change was narrow and did not require rewriting the notebook service
- the adapter approach preserved the current Cozo preset without polluting generic types
- the backend test suite remained a good safety net during the refactor

### What didn't work
- `go test ./...` initially failed because [http_test.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/http_test.go) still referenced the removed `openTestRuntime` helper.
  - Error: `pkg/notebook/http_test.go:29:18: undefined: openTestRuntime`

### What I learned
- the runtime seam was the only meaningful backend genericity gap left from the packaging work
- the Cozo adapter pattern is also the right shape for future preset-specific runtimes beyond JavaScript

### What was tricky to build
- The main subtlety was not the types themselves, but keeping the direction of dependency correct. The notebook package should own the contract; Cozo should adapt to it. Reversing that would have recreated the original problem.

### What warrants a second pair of eyes
- reviewers should confirm the notebook-owned runtime types are expressive enough for both Cozo and JavaScript without immediately needing another contract revision

### What should be done in the future
- add the Goja runtime behind the new contract
- keep the next preset-specific logic behind adapters or preset constructors

### Code review instructions
- start at [runtime.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/runtime.go)
- then inspect [cozo_runtime.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/cozo_runtime.go)
- verify with `cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend && go test ./...`

### Technical details
- adapter maps `cozo.QueryResult` into `notebook.RuntimeQueryResult`
- adapter maps `cozo.RelationInfo` into `notebook.RuntimeRelationInfo`
- raw Cozo manager close/reset behavior stayed where it belonged: in the preset/runtime implementation, not in generic notebook types

## Step 3: Add the go-go-goja runtime manager and current JavaScript backend preset

The second code slice introduced the actual JavaScript runtime. I added a resettable Goja runtime manager that composes `go-go-goja` through its explicit factory API, registers a small notebook-native module, shapes JS values into tabular notebook results, and swaps owned runtimes on reset. I also added `OpenCurrentJavaScriptModule`, preset-owned profile defaults, preset websocket fallback copy, and the backend preset selection flag in [main.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/main.go). This landed as `ccedfbb`.

Two implementation details were important here. First, I wired the backend to the local `go-go-goja` checkout through a `replace` directive in [go.mod](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/go.mod), because the user explicitly asked to use that local runtime source. Second, I discovered that top-level `const` bindings do not show up in the global object, so the runtime's schema/listing surface now intentionally describes `globalThis`-visible values rather than pretending it can introspect every lexical binding.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Add the real JavaScript runtime and preset behavior now that the generic contract exists.

**Inferred user intent:** Make the second preset executable and not just architecturally planned.

**Commit (code):** `ccedfbb` — `backend: add javascript notebook preset with goja runtime`

### What I did
- added [javascript_runtime.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/javascript_runtime.go)
- added [current_javascript.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/current_javascript.go)
- added tests in [javascript_runtime_test.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/javascript_runtime_test.go) and [current_javascript_test.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/current_javascript_test.go)
- updated [main.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/main.go) to accept `--preset cozo|javascript`
- updated [go.mod](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/go.mod) to use the local `go-go-goja` repository

### Why
- the new preset needed a real runtime, not a placeholder
- reset behavior needed to be explicit and clean
- schema/help/hints flows still needed a meaningful runtime description even in JavaScript mode

### What worked
- `go-go-goja` factory composition fit the notebook runtime lifecycle well
- shaping arrays of objects into notebook tables produced a usable notebook UX immediately
- the preset constructor pattern from Cozo translated cleanly to JavaScript

### What didn't work
- `go test ./...` initially failed because [current_javascript.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/current_javascript.go) was missing the `strings` import and because websocket fallback docs were typed incorrectly.
  - Errors:
    - `pkg/notebook/current_javascript.go:88:13: undefined: strings`
    - `cannot use []map[string]string{…} as []hints.DocRef`
- runtime tests initially assumed top-level `const` bindings would appear in `ListRelations()` and schema output. They did not, so the failing assertions forced a correction.
  - Evidence:
    - expected `"users"` in `[]string{"notebook", "params"}`
    - expected `"settings:"` in schema that only showed `"notebook"` and `"params"`

### What I learned
- `go-go-goja` is cleanest when used as an owned runtime with `Owner.Call(...)` rather than direct unsynchronized VM access
- JavaScript runtime introspection should make a clear promise: it can reliably describe `globalThis`-visible state and preset-owned modules
- hiding internal helper globals with a `__` prefix keeps the schema surface honest

### What was tricky to build
- The sharp edge here was JavaScript scope semantics. Execution persistence and runtime introspection are not identical concepts. Top-level declarations can persist between evaluations without becoming enumerable globals. The fix was to align the preset's starter cell and tests around `globalThis` when discoverability matters, instead of forcing the runtime to guess lexical bindings it cannot reliably enumerate.

### What warrants a second pair of eyes
- the result-shaping heuristics in [javascript_runtime.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/javascript_runtime.go)
- the decision to expose a small `require("notebook")` module rather than the whole default registry by default
- the `replace` directive to the local Goja checkout

### What should be done in the future
- decide whether more host modules should be exposed to notebook cells
- consider a richer runtime schema endpoint once more JS-specific assistance is needed

### Code review instructions
- start with [javascript_runtime.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/javascript_runtime.go)
- then inspect [current_javascript.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/current_javascript.go)
- validate with `cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend && go test ./...`

### Technical details
- runtime creation path:
  - `engine.NewBuilder()`
  - `WithModules(engine.NativeModuleSpec{...})`
  - `Build()`
  - `NewRuntime(context.Background())`
- reset path:
  - create next owned runtime
  - swap runtime under lock
  - close previous runtime
  - increment generation

## Step 4: Add the frontend JavaScript preset, Storybook coverage, and final validation

The third code slice added the frontend sibling preset and the validation surface that proves it is real. I extracted a generic sem-handler registrar type into [semHandlers.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/semHandlers.ts), added [currentJavaScriptConfig.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentJavaScriptConfig.ts) and [currentJavaScript.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentJavaScript.tsx), updated [App.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/App.tsx) to switch presets via `VITE_NOTEBOOK_PRESET`, and added JavaScript Storybook stories and JS-specific MSW notebook fixtures. This landed as `10f2094`.

This slice also confirmed that the shared CSS still holds up for both preset families. There was no need for a second CSS system. The different preset identity came entirely from shell and experience config plus story fixtures. I also ran the final validation matrix here, including a JavaScript-specific production build by setting `VITE_NOTEBOOK_PRESET=javascript`.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Finish the second preset end-to-end by wiring the frontend surface, validation stories, and entrypoint selection.

**Inferred user intent:** Make JavaScript usable as a full notebook experience, not only as a backend experiment.

**Commit (code):** `10f2094` — `frontend: add javascript notebook preset and stories`

### What I did
- added [semHandlers.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/semHandlers.ts)
- added [currentJavaScriptConfig.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentJavaScriptConfig.ts)
- added [currentJavaScript.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentJavaScript.tsx)
- added [CurrentJavaScriptNotebookApp.stories.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/CurrentJavaScriptNotebookApp.stories.tsx)
- extended [NotebookApp.stories.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookApp.stories.tsx) with an embedded JavaScript host story
- added JavaScript-specific MSW fixture helpers in [notebookApiHandlers.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/storybook/notebookApiHandlers.ts)
- updated [App.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/App.tsx) and [index.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/index.ts)

### Why
- the package proof required a second frontend preset beside Cozo
- the generic sem handler type should not be imported from a Cozo-named file
- Storybook and build output needed to validate that the shared shell and CSS still worked under JavaScript defaults

### What worked
- the preset wrapper pattern from Cozo translated directly to JavaScript
- default notebook sem handlers were enough for the JavaScript preset because there is no JS-specific structured event vocabulary yet
- the shared CSS did not require preset-specific divergence

### What didn't work
- my first attempt to run tests used a Jest-style flag that Vitest does not accept.
  - Command: `npm test -- --runInBand`
  - Error: `CACError: Unknown option \`--runInBand\``
- TypeScript initially rejected [currentJavaScriptConfig.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentJavaScriptConfig.ts) because `NotebookExperienceConfig` requires `SemThreadRenderer`.
  - Error: `Property 'SemThreadRenderer' is missing`
  - Fix: spread `defaultNotebookExperienceConfig` and override only the JavaScript-specific fields

### What I learned
- the sem-handler type leak was worth fixing as part of this preset because it would otherwise keep the shared page/controller surface Cozo-named
- the shared notebook shell really is preset-ready now; the JS preset needed almost no CSS branching
- one extra build with `VITE_NOTEBOOK_PRESET=javascript` is a cheap but useful validation step

### What was tricky to build
- The subtle part was not the preset wrapper itself. It was making sure the generic package defaults became truly generic. The page controller previously defaulted to Cozo sem handlers, and the sem-handler type lived in a Cozo-specific file. That kind of naming leak is easy to ignore when there is only one preset, but it becomes technical debt immediately when the second preset arrives.

### What warrants a second pair of eyes
- the preset selection behavior in [App.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/App.tsx)
- the JavaScript Storybook fixtures in [notebookApiHandlers.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/storybook/notebookApiHandlers.ts)
- whether we want a richer JavaScript-specific thread renderer in a future ticket

### What should be done in the future
- add a JS-specific structured-event renderer if the backend starts emitting JS-oriented SEM bundles
- consider a small UI affordance that tells the user when they are in Cozo vs JavaScript mode beyond the title bar

### Code review instructions
- start with [currentJavaScript.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentJavaScript.tsx)
- then inspect [currentJavaScriptConfig.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentJavaScriptConfig.ts) and [semHandlers.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/semHandlers.ts)
- verify with:
  - `cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend && npm test`
  - `cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend && npm run lint`
  - `cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend && npx tsc --noEmit`
  - `cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend && npm run build`
  - `cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend && VITE_NOTEBOOK_PRESET=javascript npm run build`
  - `cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend && npm run build-storybook`

### Technical details
- JavaScript preset stories added:
  - `Notebook/CurrentJavaScriptNotebookApp`
  - `Notebook/NotebookApp` → `EmbeddedJavaScript`
- full validation matrix completed:
  - backend tests
  - frontend tests
  - frontend lint
  - frontend typecheck
  - frontend build for default preset
  - frontend build for JavaScript preset
  - Storybook build

## Related

<!-- Link to related documents or resources -->
