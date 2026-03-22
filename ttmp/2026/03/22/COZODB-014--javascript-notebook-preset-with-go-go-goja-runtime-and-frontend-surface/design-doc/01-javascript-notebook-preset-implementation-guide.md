---
Title: JavaScript notebook preset implementation guide
Ticket: COZODB-014
Status: complete
Topics:
    - architecture
    - backend
    - frontend
    - javascript
    - notebook
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../corporate-headquarters/go-go-goja/engine/factory.go
      Note: |-
        Runtime builder, module registrar, and lifecycle API used for the JavaScript kernel
        explicit runtime builder and lifecycle used by the preset
    - Path: backend/pkg/notebook/current_javascript.go
      Note: |-
        Final JavaScript backend preset constructor implemented from this guide
        current JavaScript backend preset constructor and defaults
    - Path: backend/pkg/notebook/javascript_runtime.go
      Note: go-go-goja-backed runtime manager and value shaping implementation
    - Path: backend/pkg/notebook/runtime.go
      Note: Backend seam that must become language-neutral before the JavaScript preset can fit cleanly
    - Path: frontend/src/notebook/currentJavaScript.tsx
      Note: |-
        Final JavaScript frontend preset wrapper implemented from this guide
        current JavaScript frontend preset wrapper
    - Path: frontend/src/notebook/currentJavaScriptConfig.ts
      Note: JavaScript shell and experience defaults
    - Path: frontend/src/notebook/experienceConfig.ts
      Note: Frontend experience seam already extracted from Cozo-specific defaults
ExternalSources: []
Summary: Detailed intern-facing design and implementation guide for adding a go-go-goja-backed JavaScript notebook preset without forking the reusable notebook package.
LastUpdated: 2026-03-22T16:36:47.527476799-04:00
WhatFor: Explain the packaging strategy, backend and frontend API design, implementation order, and test matrix required to add JavaScript as the second notebook preset.
WhenToUse: Use when implementing or reviewing the JavaScript preset, especially when onboarding a new engineer who does not yet understand the current notebook package split.
---


# JavaScript notebook preset implementation guide

## Executive Summary

The repository now has the right packaging seams for multiple notebook presets, but only one concrete preset exists: Cozo. This ticket adds preset `#2`, JavaScript, by composing the existing notebook package with a `go-go-goja` runtime on the backend and a JavaScript-specific experience config on the frontend. The goal is not to build a second app. The goal is to prove that the package can host multiple language/runtime families through preset configuration and small adapter layers.

The first technical move is not "write Goja code". It is "remove the remaining Cozo-specific leakage from the generic notebook runtime seam." Today [runtime.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/runtime.go) returns Cozo types. That is acceptable for one preset, but it is the wrong abstraction for two. Once the runtime seam is notebook-generic, the Goja adapter becomes straightforward: it can evaluate JavaScript, shape results into notebook output, expose module/global metadata for schema-like inspection, and support kernel resets by replacing the owned runtime instance.

## Problem Statement

The notebook package is now modular, but its most important backend seam is still biased toward Cozo:

- [runtime.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/runtime.go) returns `cozo.QueryResult` and `cozo.RelationInfo`
- [service.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/service.go) assumes tabular query semantics and turns successful executions into `query_result`
- the current preset story is explicit for Cozo, but only planned for JavaScript

On the frontend side, the shared package is in better shape, but still only one preset family is real in production:

- [currentCozo.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentCozo.tsx) is the only live preset wrapper
- [currentCozoConfig.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentCozoConfig.ts) is the only preset config bundle
- Storybook proves isolation for the Cozo preset, but not yet for a second runtime family

If we bolt JavaScript on top of these Cozo-shaped seams, we will end up with conditional logic and misleading names everywhere. The correct design is to make the notebook contracts generic once, then add JavaScript beside Cozo as a sibling preset.

## Proposed Solution

Introduce the JavaScript preset in four layers:

1. Backend notebook runtime contract cleanup.
   - Replace Cozo-specific runtime return types with notebook-owned result and metadata structs.
   - Keep the service API stable from the notebook package outward.
   - Let preset runtimes map their domain concepts into the notebook-owned contract.

2. Backend JavaScript runtime adapter.
   - Build a dedicated Go runtime wrapper around `go-go-goja` using [factory.go](/home/manuel/code/wesen/corporate-headquarters/go-go-goja/engine/factory.go) and [runtime.go](/home/manuel/code/wesen/corporate-headquarters/go-go-goja/engine/runtime.go).
   - Expose notebook-friendly methods for `Query`, `GetSchema`, `ListRelations`, `DescribeRelation`, and `Reset`.
   - Register notebook-owned Goja modules through runtime module registrars rather than global mutation.

3. Backend current JavaScript preset.
   - Add `OpenCurrentJavaScriptModule(config)` beside [OpenCurrentCozoModule](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/current_cozo.go).
   - Fill `NotebookProfile` with JavaScript defaults.
   - Fill `WebSocketConfig` with JavaScript-oriented fallback copy and, initially, no special structured sink unless a JS SEM vocabulary is added in this ticket.

4. Frontend current JavaScript preset.
   - Add `currentJavaScriptNotebookShellConfig`, `currentJavaScriptNotebookExperienceConfig`, `createCurrentJavaScriptNotebookStore`, and `CurrentJavaScriptNotebookApp`.
   - Reuse [NotebookApp.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookApp.tsx), shared CSS, and shared Redux logic.
   - Add Storybook stories backed by MSW for a full interactive JavaScript notebook experience.

### System overview

```text
┌───────────────────────────────────────────────────────────────┐
│ Shared notebook package                                      │
│                                                               │
│  frontend/src/notebook            backend/pkg/notebook        │
│  - NotebookApp                    - Module                    │
│  - page/store/state               - Service                   │
│  - shell/experience config        - Store/Timeline/HTTP/WS    │
└───────────────┬───────────────────────────────┬───────────────┘
                │                               │
        preset #1: Cozo                  preset #2: JavaScript
                │                               │
    currentCozo.tsx / current_cozo.go   currentJavaScript.tsx / current_javascript.go
                │                               │
         Cozo runtime + SEM               go-go-goja runtime + JS-specific docs/rendering
```

### Backend API reference

Recommended notebook-owned contract:

```go
type RuntimeQueryResult struct {
    OK      bool
    Headers []string
    Rows    [][]any
    Took    float64
    Code    string
    Message string
    Display string
}

type RuntimeObjectInfo struct {
    Name        string
    Kind        string
    Description string
    Fields      []RuntimeFieldInfo
}

type Runtime interface {
    DescribeRelation(name string) (*RuntimeObjectInfo, error)
    GetSchema() (string, error)
    ListRelations() ([]string, error)
    Query(script string, params map[string]any) (*RuntimeQueryResult, error)
    Reset() (int64, error)
}
```

Notes for the intern:

- Keep the method names for now even though `Relation` is Cozo-flavored. Renaming can happen later once both presets are live.
- The important change is the data shape, not the method spelling.
- Avoid spreading Goja-specific types outside the JavaScript runtime adapter.

### JavaScript execution model

The runtime should own a `go-go-goja` factory and replace the concrete runtime on reset:

```pseudocode
class JavaScriptRuntimeManager:
    generation = 1
    factory = buildFactory(config)
    runtime = factory.NewRuntime()

    Query(script, params):
        if params not empty:
            inject params into JS scope or call helper wrapper
        value = run script inside owned runtime
        return shapeValueAsNotebookResult(value)

    Reset():
        nextRuntime = factory.NewRuntime()
        swap runtime
        close old runtime
        generation += 1
        return generation
```

Recommended result shaping rules:

- Arrays of objects with consistent keys become a table.
- Arrays of arrays can become a table when widths are consistent.
- Primitive values become a one-cell table or a display string, but pick one convention and keep it stable.
- Plain objects should become either:
  - a two-column key/value table for small objects, or
  - a JSON display string for nested/irregular objects.
- thrown JS exceptions should become notebook `error_result` outputs with a readable message and stack snippet when available.

### JavaScript module design

Do not start with a large module catalog. Start with the minimum needed to make notebook cells useful and inspectable:

- a small notebook runtime helper module, for example `require("notebook")`
- optional host modules from `go-go-goja` default registry only when they are safe and actually useful

Suggested `require("notebook")` surface:

```javascript
const notebook = require("notebook")

notebook.print(value)
notebook.table(rows)
notebook.inspect(value)
notebook.version()
```

Implementation guidance:

- business logic for value-shaping and metadata extraction should live in plain Go helpers
- goja-facing loader code should only decode inputs, expose exports, and convert values
- add runtime integration tests that execute `require("notebook")` inside the real runtime

### Frontend API reference

Recommended frontend exports:

```ts
export const currentJavaScriptNotebookShellConfig: NotebookShellConfig
export const currentJavaScriptNotebookExperienceConfig: NotebookExperienceConfig
export function createCurrentJavaScriptNotebookStore(options?: { apiBase?: string }): AppStore
export function CurrentJavaScriptNotebookApp(props: CurrentJavaScriptNotebookAppProps): JSX.Element
```

Recommended experience defaults:

- `appName: "JavaScript Notebook"`
- `codeCellPlaceholder: "// Enter JavaScript... (Shift+Enter run, Alt/Ctrl+Enter run+new)"`
- `codeFenceLanguage: "javascript"`
- a JavaScript-focused structured-thread renderer only if the backend actually produces JS-specific SEM events in this ticket

### Storybook and MSW strategy

Add both pure-config stories and live-style stories:

- preset wrapper story for `CurrentJavaScriptNotebookApp`
- generic `NotebookApp` host story using JavaScript preset config explicitly
- full notebook story using MSW to fake bootstrap, edit, run, clear, and reset endpoints
- mocked hints socket or static AI fallback events for JS-oriented help responses

Use Storybook as an isolation check, not just a gallery:

- prove the preset can boot without the main app shell
- prove the CSS still works with a second preset name and second placeholder/code-fence language
- prove Redux wiring can be mocked or host-injected without implicit Cozo assumptions

## Design Decisions

### 1. Keep one notebook package, add one more preset

Reason:

- the package extraction work in `COZODB-013` was done specifically to avoid language-specific forks
- adding a sibling preset is the only honest proof that the package boundary is real

### 2. Make runtime results notebook-owned before adding Goja

Reason:

- otherwise the JavaScript preset would have to fabricate Cozo result types
- generic types are the stable API; preset adapters are supposed to vary behind them

### 3. Use explicit go-go-goja factory composition

Reason:

- the current `go-go-goja` API explicitly favors `engine.NewBuilder().Build().NewRuntime(...)`
- that builder path supports runtime module registrars and clean lifecycle management
- reset behavior becomes a normal owned-runtime swap instead of ad hoc VM mutation

### 4. Keep method names stable for now

Reason:

- `ListRelations` and `DescribeRelation` are awkward for JavaScript, but method renames would create broad churn while we are still proving the second preset
- we can map them to "runtime namespaces / globals / modules" until a later cleanup ticket

### 5. Start with shallow JS structured events

Reason:

- the notebook already works without custom SEM bundles because default websocket events cover fallback and text responses
- JS-specific structured rendering can be layered in later once execution and preset composition are proven

## Alternatives Considered

### Fork the notebook package into a JavaScript-specific package

Rejected because:

- it duplicates the whole packaging effort
- it hides architectural problems instead of fixing them
- it makes every future language preset more expensive

### Keep Cozo result types and wrap JavaScript outputs into fake Cozo objects

Rejected because:

- the abstraction becomes misleading immediately
- review and future maintenance get harder, not easier
- frontend and backend contracts remain semantically wrong

### Delay frontend preset work until the backend is feature-complete

Rejected because:

- presets are a vertical feature
- the package proof only exists once both backend and frontend can boot through the new preset
- Storybook is one of the main validation tools for isolation

### Build the JavaScript preset as a brand-new UI page

Rejected because:

- it would bypass the package contract we just designed
- it would reintroduce layout and state duplication

## Implementation Plan

### Phase 1: Documentation and inventory

- write this guide, tasks, and diary
- save a ticket-local inventory script in `scripts/`
- relate current notebook and go-go-goja files to the ticket

### Phase 2: Backend seam cleanup

- introduce notebook-owned runtime result and object metadata structs
- update [runtime.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/runtime.go)
- adapt the Cozo runtime implementation to the new types
- update service and transport tests

### Phase 3: Backend JavaScript preset

- add a Goja runtime manager under `backend/pkg/notebook`
- add notebook-owned module registration and value shaping helpers
- add `OpenCurrentJavaScriptModule`
- add preset profile and websocket fallback config
- add runtime tests for execution, reset, and metadata

### Phase 4: Frontend JavaScript preset

- add `currentJavaScriptConfig.ts` and `currentJavaScript.tsx`
- add exports in [index.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/index.ts)
- add JavaScript stories, MSW handlers, and CSS verification
- keep shared CSS generic; do not create parallel theme files unless the new preset truly needs them

### Phase 5: Validation and closeout

- run backend tests
- run frontend tests, lint, typecheck, build, and Storybook build
- perform one manual smoke pass if needed
- update diary and changelog after each slice
- upload the final ticket bundle to reMarkable

### Review checklist

- Does any generic notebook file still mention Cozo where it should not?
- Does the JavaScript preset boot without the main app doing special-case work?
- Can the same notebook shell render both presets cleanly?
- Are result-shaping rules stable and documented?
- Is reset implemented by replacing the owned runtime cleanly?

## Open Questions

These are open at ticket start and should be resolved or narrowed during implementation:

- Which `go-go-goja` default modules are safe and useful for notebook exposure on day one?
- Should JavaScript object outputs prefer JSON display or key/value tables by default?
- Do we want a first-pass JavaScript structured-event renderer in this ticket, or do we stop at text/fallback events?
- Should frontend docs helpers remain generic markdown note builders, or is there still hidden Cozo vocabulary to extract afterward?

## References

- [COZODB-013 packaging guide](/home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/design-doc/01-notebook-packaging-api-design-and-current-app-preset-implementation-guide.md)
- [COZODB-013 JavaScript follow-through plan](/home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/design-doc/02-javascript-surface-and-preset-compatibility-plan.md)
- [go-go-goja factory.go](/home/manuel/code/wesen/corporate-headquarters/go-go-goja/engine/factory.go)
- [go-go-goja runtime.go](/home/manuel/code/wesen/corporate-headquarters/go-go-goja/engine/runtime.go)
