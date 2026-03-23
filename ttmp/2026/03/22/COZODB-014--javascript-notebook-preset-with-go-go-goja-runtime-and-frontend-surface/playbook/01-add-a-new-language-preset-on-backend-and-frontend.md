---
Title: Add a new language preset on backend and frontend
Ticket: COZODB-014
Status: complete
Topics:
    - architecture
    - backend
    - frontend
    - javascript
    - notebook
DocType: playbook
Intent: long-term
Owners: []
RelatedFiles:
    - Path: backend/pkg/notebook/current_javascript.go
      Note: |-
        Reference backend preset constructor for a non-Cozo language
        reference backend preset constructor for a second language
    - Path: backend/pkg/notebook/runtime.go
      Note: |-
        Shared backend runtime contract that all language presets must implement honestly
        shared backend contract every new language preset must satisfy
    - Path: frontend/src/notebook/currentJavaScript.tsx
      Note: |-
        Reference frontend preset wrapper for a non-Cozo language
        reference frontend preset wrapper for a second language
    - Path: frontend/src/notebook/currentJavaScriptConfig.ts
      Note: |-
        Reference frontend shell and experience config for a non-Cozo language
        reference frontend language config pattern
    - Path: frontend/src/storybook/notebookApiHandlers.ts
      Note: |-
        Reference MSW fixture layer for isolated preset validation
        reference MSW fixture layer for preset validation
ExternalSources: []
Summary: Tutorial-style playbook for adding another language preset to the shared notebook package on both backend and frontend without forking the notebook architecture.
LastUpdated: 2026-03-22T21:35:00-04:00
WhatFor: ""
WhenToUse: ""
---


# Add a new language preset on backend and frontend

## Purpose

This playbook explains how to add a new language to the notebook system without forking the app. It is written in the style of a Glazed help tutorial/application entry: it is procedural, discoverable, and explicit about what to change, why to change it, and how to know you did not accidentally break the preset architecture.

Use this when you want to add a language such as Python, SQL, Lua, or a richer JavaScript variant. The intended outcome is:

- one new backend preset constructor
- one new runtime implementation or adapter
- one new frontend preset wrapper/config
- one new Storybook + MSW validation surface
- no duplicated notebook page
- no duplicated notebook service

## Environment Assumptions

This playbook assumes all of the following are true:

- you are working in `/home/manuel/code/wesen/2026-03-14--cozodb-editor`
- the shared notebook package already exists on both backend and frontend
- you are adding a **preset family**, not a one-off prototype
- you can run:
  - `go test ./...` in `backend/`
  - `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `npm run build-storybook` in `frontend/`

This playbook also assumes the same architecture rule that guided `COZODB-014`:

> Do not fork `backend/pkg/notebook` or `frontend/src/notebook` for the new language. Add a sibling preset beside Cozo and JavaScript.

### Mental model

Treat the notebook system like this:

```text
shared notebook backend + shared notebook frontend
    + preset-specific runtime/config/wrapper code
    = one language-specific notebook experience
```

If your change does not fit that model, stop and re-evaluate before writing code.

## Commands

### 0. Get oriented before changing anything

Read the current reference preset files first.

```bash
cd /home/manuel/code/wesen/2026-03-14--cozodb-editor

sed -n '1,220p' backend/pkg/notebook/runtime.go
sed -n '1,260p' backend/pkg/notebook/current_javascript.go
sed -n '1,260p' backend/pkg/notebook/javascript_runtime.go
sed -n '1,220p' frontend/src/notebook/currentJavaScript.tsx
sed -n '1,220p' frontend/src/notebook/currentJavaScriptConfig.ts
sed -n '1,260p' frontend/src/storybook/notebookApiHandlers.ts
```

What this gives you:

- the shared backend contract
- the backend preset shape
- the runtime manager shape
- the frontend preset wrapper shape
- the frontend config shape
- the Storybook/MSW validation shape

### 1. Decide whether the new language needs a new runtime or an adapter

Ask this first:

- is the language already executed by a runtime manager in this repo?
- can it adapt to `notebook.Runtime` cleanly?
- does it need reset support?
- does it need schema/object introspection?

If the answer is "yes, the runtime already exists elsewhere", prefer an adapter.

If the answer is "no, we need a new execution engine", build a new runtime manager.

Use this decision rule:

```pseudocode
if existing runtime can execute code, reset, and describe runtime objects:
    write adapter -> notebook.Runtime
else:
    build new runtime manager behind notebook.Runtime
```

### 2. Start on the backend, but only through the shared seam

First confirm the shared contract is still good enough.

Files to inspect:

- [runtime.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/runtime.go)
- [service.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/service.go)

Checklist:

- can your runtime return `RuntimeQueryResult` honestly?
- can your runtime support `ListRelations()` and `DescribeRelation()` semantically, even if the names are slightly legacy?
- can your runtime reset itself without hidden leftover state?

If the answer is "no", fix the shared contract first. Do not add preset hacks to compensate.

### 3. Add the backend preset constructor

Create a sibling file beside [current_javascript.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/current_javascript.go).

Suggested naming pattern:

```text
backend/pkg/notebook/current_<language>.go
```

Suggested constructor shape:

```go
type Current<MyLanguage>ModuleConfig struct {
    AppDBPath string
    EnableAI  bool
    BasePaths BasePaths
    Logf      func(format string, args ...any)
}

func OpenCurrent<MyLanguage>Module(config Current<MyLanguage>ModuleConfig) (*Module, error)
```

What this constructor should do:

1. open the language runtime
2. open notebook store with preset-specific profile
3. open timeline store
4. create notebook module
5. attach any extra closers

Pseudo-flow:

```pseudocode
runtime = open language runtime
profile = current<Language>NotebookProfile()
wsConfig = current<Language>WebSocketConfig()
store = OpenStoreWithConfig(...)
timeline = OpenSQLiteTimelineStore(...)

module = NewModule(
    Runtime: runtime,
    Store: store,
    Timeline: timeline,
    WebSocket: wsConfig,
    BasePaths: config.BasePaths,
)

module.additionalClosers += runtime.Close
return module
```

### 4. Add preset-specific backend defaults

Your preset should provide at least:

- notebook profile
- starter cells
- notebook title
- default language string
- AI fallback chips/docs/copy

Reference:

- [current_javascript.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/current_javascript.go)

Backend questions to answer for the new language:

- what should the starter code cell teach first?
- what language string should notebook documents persist?
- what hint fallback text makes sense when AI is off?
- what docs should show up in the fallback response?

### 5. Wire the backend host entrypoint

Add the new preset to [backend/main.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/main.go).

Pattern:

```go
switch *preset {
case "cozo":
    ...
case "javascript":
    ...
case "<language>":
    notebookModule, err = notebook.OpenCurrent<Language>Module(...)
default:
    log.Fatalf("Unknown preset %q", *preset)
}
```

Do not create a second main binary just to host the new language unless you have a strong host-level reason.

### 6. Add backend tests before touching the frontend

Create at least:

- runtime manager test
- preset constructor boot test

Use the JavaScript references:

- [javascript_runtime_test.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/javascript_runtime_test.go)
- [current_javascript_test.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/current_javascript_test.go)

Minimum backend assertions:

- code executes
- success output is shaped correctly
- reset clears runtime state
- preset routes mount successfully

### 7. Add the frontend preset config

Create a sibling config file beside [currentJavaScriptConfig.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentJavaScriptConfig.ts).

Suggested naming:

```text
frontend/src/notebook/current<Language>Config.ts
```

Expected exports:

```ts
export const current<Language>NotebookShellConfig: NotebookShellConfig
export const current<Language>NotebookExperienceConfig: NotebookExperienceConfig
export function createCurrent<Language>NotebookStore(...)
```

At minimum, set:

- app name
- code cell placeholder
- code fence language
- any preset-specific renderer if one exists

Important rule:

- spread the default experience config unless you are replacing every field intentionally

Reference:

```ts
export const currentJavaScriptNotebookExperienceConfig: NotebookExperienceConfig = {
  ...defaultNotebookExperienceConfig,
  codeCellPlaceholder: "// Enter JavaScript...",
  codeFenceLanguage: "javascript",
}
```

### 8. Add the frontend preset wrapper

Create a sibling wrapper beside [currentJavaScript.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentJavaScript.tsx).

Suggested naming:

```text
frontend/src/notebook/current<Language>.tsx
```

The wrapper should:

- create or accept a store
- create or accept a websocket
- pass shell config
- pass experience config
- choose the right sem handler registration path
- render the shared `NotebookApp`

Pseudo-flow:

```pseudocode
Current<Language>NotebookApp(props):
    resolvedStore = store ?? createCurrent<Language>NotebookStore(...)
    ws = props.ws ?? useHintsSocket(...)
    return NotebookApp(
        store = resolvedStore,
        ws = ws,
        shellConfig = current<Language>NotebookShellConfig,
        experienceConfig = current<Language>NotebookExperienceConfig,
        registerSemHandlers = register<Language>SemHandlers or registerDefaultNotebookSemHandlers,
    )
```

### 9. Export the new preset from the frontend package surface

Update:

- [index.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/index.ts)
- possibly [App.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/App.tsx)

If the preset should be selectable from the default host app, also wire it through `VITE_NOTEBOOK_PRESET` in [App.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/App.tsx).

### 10. Add Storybook + MSW coverage

Do not skip this.

Add:

- a preset wrapper story
- an embedded host story
- language-specific MSW runtime fixtures

Reference:

- [CurrentJavaScriptNotebookApp.stories.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/CurrentJavaScriptNotebookApp.stories.tsx)
- [NotebookApp.stories.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookApp.stories.tsx)
- [notebookApiHandlers.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/storybook/notebookApiHandlers.ts)

Why this matters:

- it proves the preset can run without the live app shell
- it proves the package boundary is real
- it catches CSS drift early

### 11. Validate in this order

Run validation in the same order every time.

```bash
cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend
go test ./...

cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend
npm test
npm run lint
npx tsc --noEmit
npm run build
VITE_NOTEBOOK_PRESET=<language> npm run build
npm run build-storybook
```

If you added docs or ticket artifacts:

```bash
cd /home/manuel/code/wesen/2026-03-14--cozodb-editor
docmgr doctor --ticket COZODB-014 --stale-after 30
```

### 12. Optional: manual smoke pass

If the preset is substantial or the runtime semantics are unusual, run it live.

Example:

```bash
cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend
go run . --preset <language>

cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend
VITE_NOTEBOOK_PRESET=<language> npm run dev
```

Check:

- notebook boots
- starter cells make sense
- code cell runs
- reset works
- hint fallback text matches the language
- Storybook and live app feel consistent

## Exit Criteria

You are done when all of the following are true:

- backend preset exists and boots
- backend runtime implements the shared contract honestly
- frontend preset exists and uses the shared notebook app
- no shared notebook file was forked for the new language
- Storybook has isolated coverage for the new preset
- validation matrix passes
- the new language feels like preset `#N`, not a special case welded into preset `#1`

## Notes

### Common failure modes

Problem | Cause | Solution
--- | --- | ---
New runtime shape does not fit `RuntimeQueryResult` | Shared seam is too narrow or runtime is being forced into the wrong abstraction | Fix the shared contract first, then continue
Frontend wants a whole new page | Preset-specific concerns are being confused with package concerns | Keep the shared page and add config/wrapper/renderers instead
Schema/listing output is misleading | Runtime introspection promise is too ambitious | Narrow the promise to what the runtime can actually describe honestly
Storybook story is hard to write | Transport or preset wrapper is too coupled to the host app | Push coupling down into preset config or store creation seams
CSS diverges per language | Visual identity is being implemented through one-off CSS instead of config | Keep shared CSS generic unless the preset truly needs a different visual system

### Working rule

Do not add a new language by copying the JavaScript or Cozo tree into a third notebook package. Add a sibling preset, validate it in isolation, and keep the shared contract truthful.

### See Also

- [01-javascript-notebook-preset-implementation-guide.md](/home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/22/COZODB-014--javascript-notebook-preset-with-go-go-goja-runtime-and-frontend-surface/design-doc/01-javascript-notebook-preset-implementation-guide.md)
- [02-javascript-notebook-preset-postmortem-and-intern-analysis.md](/home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/22/COZODB-014--javascript-notebook-preset-with-go-go-goja-runtime-and-frontend-surface/design-doc/02-javascript-notebook-preset-postmortem-and-intern-analysis.md)
- [01-notebook-packaging-api-design-and-current-app-preset-implementation-guide.md](/home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/design-doc/01-notebook-packaging-api-design-and-current-app-preset-implementation-guide.md)
