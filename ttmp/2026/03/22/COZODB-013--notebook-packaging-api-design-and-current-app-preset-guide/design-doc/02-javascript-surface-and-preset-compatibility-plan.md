---
Title: JavaScript surface and preset compatibility plan
Ticket: COZODB-013
Status: active
Topics:
    - architecture
    - backend
    - frontend
    - javascript
    - testing
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/profile.go
      Note: Backend notebook profile now carries language/title/starter-cell defaults for preset-specific runtimes
    - Path: /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/ws_config.go
      Note: Backend websocket fallback and SEM-sink ownership now live behind preset configuration
    - Path: /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentCozoConfig.ts
      Note: Current frontend preset now owns Cozo-specific experience configuration
    - Path: /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/experienceConfig.ts
      Note: Frontend notebook experience boundary now separates generic UI concerns from language-specific rendering
ExternalSources: []
Summary: Concrete follow-through plan for introducing a JavaScript notebook preset on top of the new package/profile seams and validating compatibility across Cozo and JavaScript preset families.
LastUpdated: 2026-03-22T16:15:08-04:00
WhatFor: Turn the remaining COZODB-013 design tasks into an explicit next-step plan now that the package and preset seams exist in code.
WhenToUse: Use when building the JavaScript runtime preset, the JavaScript frontend experience preset, or the preset compatibility test matrix.
---

# JavaScript surface and preset compatibility plan

## Goal

The repository now has real preset seams in code:

- backend notebook profile and websocket config
- frontend notebook experience config and shell config
- current Cozo preset wrappers on both sides

The next objective is to add preset `#2`, where JavaScript is the first-class language, without forking the notebook architecture again.

## Current state

What is already generic:

- Backend notebook persistence can now vary by `NotebookProfile`.
- Backend websocket fallback copy and SEM sink creation now vary by `WebSocketConfig`.
- Frontend code fences, code placeholders, and structured-thread rendering now vary by `NotebookExperienceConfig`.
- The current Cozo app is now clearly one preset instead of the only app shape.

What is still intentionally Cozo-specific:

- the concrete backend runtime implementation
- the concrete structured SEM projection vocabulary
- the concrete frontend SEM renderer for Cozo bundles/items
- the generic `/api/query` and `/api/schema` host API in [handlers.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/handlers.go)

That is the correct state for ending `COZODB-013`: the reusable package surface is real, and the next preset can be added against explicit seams.

## Backend JavaScript surface

### Recommended shape

Do not create a new backend package. Add a second preset constructor next to `OpenCurrentCozoModule`.

Recommended entrypoint:

```go
func OpenCurrentJavaScriptModule(config CurrentJavaScriptModuleConfig) (*notebook.Module, error)
```

Recommended config:

```go
type CurrentJavaScriptModuleConfig struct {
    AppDBPath string
    EnableAI  bool
    BasePaths notebook.BasePaths
    Logf      func(format string, args ...any)
}
```

### Runtime contract

The existing `notebook.Runtime` interface is close enough to host a JavaScript runtime, but the implementation should interpret the methods differently:

- `Query(script, params)` becomes "execute notebook source and return structured output"
- `GetSchema()` becomes "return runtime help / globals / module surface summary"
- `ListRelations()` and `DescribeRelation()` should be adapted to JavaScript runtime concepts rather than preserved literally as fake Cozo relations

The clean approach is to keep the interface stable for now and map it onto JavaScript runtime concepts:

- `ListRelations()` returns exported runtime namespaces or registered modules
- `DescribeRelation(name)` returns structured metadata for a JS global/module binding
- `QueryResult.Headers` and `QueryResult.Rows` become one valid output shape for tabular JavaScript results
- non-tabular JS results should use notebook `CellOutput.Data` rather than force table encoding

### Notebook profile for JavaScript

The JavaScript preset should fill `NotebookProfile` with:

- `DefaultLanguage: "javascript"`
- `DefaultNotebookTitle: "JavaScript Notebook"`
- starter cells:
  - markdown intro
  - code sample such as `const users = [{ name: "Ada", age: 31 }];`

### WebSocket config for JavaScript

The JavaScript preset should fill `WebSocketConfig` with:

- JavaScript-oriented AI fallback text
- JavaScript-oriented chips such as `show async example`, `explain this exception`
- a JavaScript-specific SEM sink factory only if the AI engine emits structured JS events

If the JS preset ships before structured JS SEM events exist, the sink factory should remain `nil` and the frontend should rely only on `hint.result`, `llm.delta`, and `hint.result` diagnosis flows.

## Frontend JavaScript surface

### Recommended shape

Do not build a second page. Build a second preset config next to `currentCozo`.

Recommended exports:

```ts
export const currentJavaScriptNotebookShellConfig: NotebookShellConfig
export const currentJavaScriptNotebookExperienceConfig: NotebookExperienceConfig
export function createCurrentJavaScriptNotebookStore(...)
export function CurrentJavaScriptNotebookApp(...)
```

### Experience config for JavaScript

The JavaScript preset should fill `NotebookExperienceConfig` with:

- `codeCellPlaceholder: "// Enter JavaScript..."`
- `codeFenceLanguage: "javascript"`
- `SemThreadRenderer: JavaScriptSemRenderer`

The JavaScript renderer should eventually replace Cozo bundle/item assumptions with a JS-specific view model vocabulary:

- exception diagnosis
- refactor suggestion
- doc reference
- runtime inspection

### Shell config for JavaScript

The JavaScript preset should fill `NotebookShellConfig` with:

- `appName: "JavaScript Notebook"`
- menu labels that remain generic unless the JS host genuinely needs different top-level menus

### Docs and prompt defaults

The frontend JS preset should own:

- chip defaults aimed at JavaScript help rather than Cozo help
- markdown note code fences with `javascript`
- future docs-profile configuration once notebook docs helpers move out of Cozo-specific features

## Preset compatibility test strategy

### Level 1: package-unit coverage

Backend:

- profile test for default notebook creation
- websocket fallback-copy test
- runtime adapter tests for each preset

Frontend:

- transport prefix tests
- notebook experience config tests for code fence language and placeholder
- renderer stories/tests for each preset renderer

### Level 2: preset smoke coverage

Backend:

- current Cozo preset boot test
- current JavaScript preset boot test

Frontend:

- current Cozo preset Storybook page
- current JavaScript preset Storybook page
- generic embedded `NotebookApp` host story for each preset family

### Level 3: live manual matrix

Run this matrix before declaring a new preset ready:

1. bootstrap notebook
2. edit title
3. insert markdown cell
4. insert code cell
5. run code cell
6. clear notebook
7. reset runtime
8. hint request with AI disabled
9. hint request with AI enabled

Expected evidence:

- backend tests green
- frontend tests green
- Storybook build green
- one live manual pass for each preset

## Recommended build order

1. Implement backend JavaScript runtime adapter.
2. Add `OpenCurrentJavaScriptModule`.
3. Add frontend JavaScript experience config and preset wrapper.
4. Add JS preset Storybook stories.
5. Add backend/frontend smoke tests.
6. Run the compatibility matrix.

## Intern notes

What not to do:

- Do not fork `frontend/src/notebook` into `frontend/src/javascript-notebook`.
- Do not fork `backend/pkg/notebook` into `backend/pkg/javascript-notebook`.
- Do not reintroduce Cozo-specific defaults into generic notebook config files.

What to do instead:

- keep generic seams in generic modules
- keep Cozo specifics in the current Cozo preset
- add JavaScript specifics in a second preset beside it
- expand tests around the seam, not around app-specific wiring only
