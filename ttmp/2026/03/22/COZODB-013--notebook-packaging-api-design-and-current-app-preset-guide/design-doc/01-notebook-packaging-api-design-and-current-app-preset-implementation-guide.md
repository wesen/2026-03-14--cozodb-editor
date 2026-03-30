---
Title: Notebook packaging API design and current app preset implementation guide
Ticket: COZODB-013
Status: active
Topics:
    - architecture
    - backend
    - frontend
    - cozodb
    - javascript
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: backend/main.go
      Note: |-
        Current app backend composition root that already consumes notebook-owned mounts
        Current backend host composition that should become the first preset assembly
    - Path: backend/pkg/notebook/http.go
      Note: |-
        Backend notebook REST transport mount surface
        Current backend notebook REST mount surface that needs module packaging
    - Path: backend/pkg/notebook/service.go
      Note: |-
        Backend notebook service and constructor surface
        Current backend notebook service constructor and orchestration surface
    - Path: backend/pkg/notebook/websocket.go
      Note: |-
        Backend notebook WebSocket and AI transport mount surface
        Current backend notebook WebSocket mount surface and AI engine seam
    - Path: frontend/src/notebook/NotebookPage.tsx
      Note: |-
        Current app-facing notebook container and default composition point
        Current frontend app composition point that should become preset #1
    - Path: frontend/src/notebook/NotebookPageView.tsx
      Note: |-
        Current shell/view split and UI injection boundary
        Current notebook shell/view boundary for package API design
    - Path: frontend/src/notebook/state/notebookSlice.ts
      Note: |-
        Frontend notebook domain state and transport coupling
        Current domain state core and transport coupling
    - Path: frontend/src/notebook/useNotebookPageController.ts
      Note: |-
        Frontend environment wiring, keyboard ownership, and AI dispatch logic
        Current frontend environment wiring and action orchestration
    - Path: frontend/src/theme/tokens.css
      Note: Current theme token layer for the first app preset
    - Path: frontend/src/transport/hintsSocket.ts
      Note: |-
        Current WebSocket transport contract shape
        Current WebSocket contract and browser-specific socket creation
    - Path: frontend/src/transport/httpClient.ts
      Note: |-
        Current REST transport contract shape
        Current REST transport contract and route assumptions
ExternalSources: []
Summary: 'Detailed intern-oriented guide for packaging the current notebook system into reusable frontend and backend modules, expressing the current app as preset #1, and leaving room for a second JavaScript-oriented language surface.'
LastUpdated: 2026-03-22T12:43:33.466161434-04:00
WhatFor: Guide the next implementation phase after the frontend and backend cutovers by defining concrete package APIs, current-app presets, and future multi-language expansion points.
WhenToUse: Use when extracting reusable notebook packages, designing package boundaries, onboarding an intern to the packaging work, or planning the JavaScript-surface follow-up.
---


# Notebook packaging API design and current app preset implementation guide

## Executive Summary

The project is now in the right architectural state to stop talking about “modularity” in the abstract and start defining real package APIs. The backend notebook domain already owns its service construction and notebook-specific transports in [backend/pkg/notebook/service.go](../../../../../../backend/pkg/notebook/service.go), [backend/pkg/notebook/http.go](../../../../../../backend/pkg/notebook/http.go), and [backend/pkg/notebook/websocket.go](../../../../../../backend/pkg/notebook/websocket.go). The frontend notebook domain already has a page/view/controller split plus modular transport and theme layers in [frontend/src/notebook/NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx), [frontend/src/notebook/useNotebookPageController.ts](../../../../../../frontend/src/notebook/useNotebookPageController.ts), [frontend/src/transport/httpClient.ts](../../../../../../frontend/src/transport/httpClient.ts), [frontend/src/transport/hintsSocket.ts](../../../../../../frontend/src/transport/hintsSocket.ts), and [frontend/src/theme/tokens.css](../../../../../../frontend/src/theme/tokens.css).

That means the next step is no longer “split things more.” The next step is to define:

1. a reusable backend notebook module API,
2. a reusable frontend notebook module API,
3. a current-app preset that composes those modules into the existing CozoDB editor,
4. a forward-compatible preset model that will later support a JavaScript-first notebook surface.

The recommendation is to keep the package count small and the preset count explicit. There should still be one in-repo backend module centered on `backend/pkg/notebook` and one in-repo frontend module centered on `frontend/src/notebook`. The variability should move into configuration objects, adapter interfaces, and preset assemblies, not into an explosion of packages.

The current app should become preset #1. The future JavaScript experience should become preset #2, built against the same notebook domain contracts but with a different runtime, different prompt/docs defaults, and likely different output renderers.

## Problem Statement

The repository now has the right internal separations to support reuse, but it does not yet have explicit packaging and API surfaces.

Today:

- the backend entrypoint in [backend/main.go](../../../../../../backend/main.go#L17) still composes the current application directly,
- the backend notebook package exports useful functions, but not yet an intentional “module API” for host apps,
- the frontend notebook package has reusable pieces, but the current app still treats [NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx#L76) as the whole product entry,
- the transport files still embed current route and connection conventions directly,
- the theme files still express the first app’s identity rather than a formal preset layer,
- there is no formal story for “language surface” yet, only the current Cozo-specific runtime and hinting path.

The user’s stated plan changes the target architecture in an important way. We are no longer only packaging “the notebook app.” We are packaging:

- a notebook domain,
- a current Cozo-oriented app preset,
- and a second surface in which JavaScript is a first-class language.

That means the package boundaries cannot be designed around Cozo-only assumptions. Cozo can be the first implementation, but not the only vocabulary baked into the reusable surface.

The problem this design addresses is therefore:

How do we package the current notebook system so that the current app becomes one host/preset, while preserving a clean path to a second backend/frontend surface that exposes JavaScript as a language without forking the whole architecture?

## Proposed Solution

The proposed solution is a preset-based packaging model with a small number of stable module surfaces.

### Core principle

Do not split by technology first. Split by responsibility first.

The reusable center should be:

- backend notebook domain module,
- frontend notebook domain module,
- transport adapters,
- theme/renderer adapters,
- app presets that compose the above.

### Target topology

```text
Reusable Backend Module
  notebook domain service
  notebook storage
  notebook REST mount
  notebook WS mount
  runtime + AI interfaces

Reusable Frontend Module
  notebook state
  notebook controller contract
  notebook views and cell primitives
  transport interfaces
  renderer/theme hooks

Preset: Current Cozo App
  backend: Cozo runtime + SQLite + hints engine
  frontend: Mac theme + Cozo renderers + current routes/socket

Preset: Future JavaScript App
  backend: JavaScript runtime + notebook persistence + JS docs/AI defaults
  frontend: JS-oriented renderers + docs + theme or shell variant
```

### Backend package API

The current backend already exposes the right low-level building blocks:

- `NewService(config ServiceConfig)` in [backend/pkg/notebook/service.go](../../../../../../backend/pkg/notebook/service.go#L24)
- `OpenService(appDBPath string, runtime Runtime)` in [backend/pkg/notebook/service.go](../../../../../../backend/pkg/notebook/service.go#L39)
- `MountHTTPRoutes(mux *http.ServeMux, service *Service)` in [backend/pkg/notebook/http.go](../../../../../../backend/pkg/notebook/http.go#L42)
- `MountWebSocketRoutes(mux *http.ServeMux, runtime Runtime, engine AIEngine)` in [backend/pkg/notebook/websocket.go](../../../../../../backend/pkg/notebook/websocket.go#L61)

That is enough to function, but it is not yet an intentional host-facing module API. The next layer should wrap those pieces into explicit host composition types.

Recommended backend shape:

```go
package notebook

type Module struct {
    Service *Service
}

type ModuleConfig struct {
    ServiceConfig ServiceConfig
    AI AIEngine
    BasePaths BasePaths
}

type BasePaths struct {
    APIBase string
    NotebookBase string
    NotebookCellBase string
    RuntimeBase string
    HintsWSPath string
}

func NewModule(cfg ModuleConfig) (*Module, error)
func (m *Module) Close() error
func (m *Module) MountHTTP(mux *http.ServeMux)
func (m *Module) MountWebSocket(mux *http.ServeMux)
```

Why this helps:

- the host app receives one notebook module object instead of manually mounting pieces,
- route customization becomes explicit rather than hard-coded,
- the Cozo app preset becomes just one constructor that fills this config,
- the future JavaScript preset can fill the same config with a different runtime.

### Frontend package API

The frontend package should similarly stop exposing only “the page for this app” and instead expose an explicit host composition surface.

The current modularized pieces already suggest the split:

- [NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx#L17) is the current container/default composition,
- [useNotebookPageController.ts](../../../../../../frontend/src/notebook/useNotebookPageController.ts#L36) is the behavioral orchestration layer,
- [NotebookPageView.tsx](../../../../../../frontend/src/notebook/NotebookPageView.tsx#L50) is the shell/view layer,
- [notebookSlice.ts](../../../../../../frontend/src/notebook/state/notebookSlice.ts#L149) is the domain state core,
- [httpClient.ts](../../../../../../frontend/src/transport/httpClient.ts#L109) and [hintsSocket.ts](../../../../../../frontend/src/transport/hintsSocket.ts#L38) are already modular transport layers,
- [tokens.css](../../../../../../frontend/src/theme/tokens.css#L2) is already a theme token surface.

Recommended frontend shape:

```ts
export interface NotebookTransport {
  bootstrapNotebook(): Promise<NotebookDocument | APIError>;
  updateNotebookTitle(...): Promise<...>;
  insertNotebookCell(...): Promise<...>;
  clearNotebook(...): Promise<...>;
  updateNotebookCell(...): Promise<...>;
  moveNotebookCell(...): Promise<...>;
  deleteNotebookCell(...): Promise<...>;
  runNotebookCell(...): Promise<...>;
  resetNotebookKernel(...): Promise<...>;
}

export interface NotebookHintsChannel {
  connected: boolean;
  send(type: string, data: Record<string, unknown>): boolean;
  on(type: string, handler: SemEventHandler): () => void;
  onAny(handler: SemEventHandler): () => void;
  off(type: string, handler?: SemEventHandler): void;
}

export interface NotebookPreset {
  id: string;
  themeClassName: string;
  transport: NotebookTransport;
  hints: NotebookHintsChannel;
  registerSemHandlers: (hints: NotebookHintsChannel, onProject: OnProject) => Array<() => void>;
  renderers: NotebookRenderers;
  docsProfile: NotebookDocsProfile;
}

export function createNotebookStore(deps: { transport: NotebookTransport }): AppStore
export function NotebookApp(props: { preset: NotebookPreset; confirmAction?: ConfirmAction }): JSX.Element
```

Why this helps:

- the notebook package becomes hostable without assuming `window.fetch`, `window.location`, or the current `/api` paths,
- the current app preset becomes a concrete object that binds transport, hints socket, theme, and renderers,
- the future JavaScript preset can swap docs/profile/renderers without rewriting notebook state or page structure.

### Current app preset

The current app should be modeled as the first supported preset, not as the default implementation hidden inside random files.

#### Backend current-app preset

```go
func NewCurrentCozoPreset(appDBPath string, engine string, dbPath string, aiEnabled bool) (*notebook.Module, error) {
    runtime := cozo.NewManager(engine, dbPath)
    store := notebook.OpenStore(appDBPath)
    timeline := notebook.OpenSQLiteTimelineStore(store.DBPath())
    service := notebook.NewService(notebook.ServiceConfig{
        Runtime: runtime,
        Store: store,
        Timeline: timeline,
    })
    return notebook.NewModule(notebook.ModuleConfig{
        ServiceConfig: ...,
        AI: maybeHintsEngine(aiEnabled),
        BasePaths: notebook.DefaultBasePaths(),
    })
}
```

#### Frontend current-app preset

```ts
export function createCurrentCozoPreset(): NotebookPreset {
  return {
    id: "cozo-current-app",
    themeClassName: "mac-desktop",
    transport: createHTTPNotebookTransport({ apiBase: "" }),
    hints: createBrowserHintsSocket({ path: "/ws/hints" }),
    registerSemHandlers: registerCozoNotebookSemHandlers,
    renderers: createCozoRenderers(),
    docsProfile: createCozoDocsProfile(),
  };
}
```

This makes the current app explicit and reviewable. It also means the eventual JavaScript preset has a clear place to live.

### Future JavaScript surface

The user’s plan should shape the packaging now, not later.

The future JavaScript surface should not be treated as “some special mode.” It should be treated as a second language-oriented preset family.

There are two good ways to think about that:

#### Option A: language-specific presets on top of one notebook domain

This is the recommended approach.

- The notebook data model remains shared.
- The state model remains shared.
- The shell/view primitives remain shared.
- The runtime adapter, docs profile, renderers, starter cells, and AI defaults vary by language.

That gives you:

```text
Shared notebook domain
  + Cozo preset
  + JavaScript preset
```

#### Option B: separate notebook packages per language

This is not recommended yet.

- It duplicates page/state/transport logic too early.
- It obscures what is truly shared.
- It makes cross-language notebooks and mixed-host experiments harder later.

### Language surface contract

To support Cozo now and JavaScript later, define a language profile contract on both sides.

#### Backend language profile

```go
type LanguageRuntime interface {
    GetSchema() (string, error)
    Query(script string, params map[string]any) (*cozo.QueryResult, error)
    Reset() (int64, error)
}

type LanguageProfile interface {
    ID() string
    Runtime() LanguageRuntime
    AIEngine() AIEngine
    StarterNotebook() StarterNotebookSpec
}
```

The name `Query` can eventually become more neutral, for example `Execute`, once the JavaScript runtime arrives. But do not rename it until the second implementation exists; otherwise the abstraction becomes vague too early.

#### Frontend language profile

```ts
interface NotebookLanguageProfile {
  id: "cozo" | "javascript";
  starterCells: NotebookStarterCell[];
  renderers: NotebookRenderers;
  docsProfile: NotebookDocsProfile;
  registerSemHandlers: RegisterSemHandlers;
  askAIDefaults: AskAIDefaults;
}
```

This is how the future JavaScript surface stays additive instead of disruptive.

## Design Decisions

### Decision 1: Keep one backend package and one frontend package

Rationale:

- The user explicitly does not want package explosion.
- The current codebase is not large enough to justify splitting by every layer.
- The main missing piece is API shape, not package count.

Consequence:

- `backend/pkg/notebook` remains the reusable backend center.
- `frontend/src/notebook` remains the reusable frontend center.
- Presets and adapter interfaces carry the variation.

### Decision 2: The current app becomes preset #1

Rationale:

- If the current app is not represented as a preset, the reusable API is not really being exercised.
- Preset #1 provides a concrete baseline against which the JavaScript preset can later be compared.

Consequence:

- The packaging effort must produce explicit preset factory code, not just generalized internals.

### Decision 3: Model JavaScript as a language surface, not a separate architecture

Rationale:

- The notebook domain is shared even if the execution language changes.
- The main differences are runtime implementation, renderers/docs, starter content, and prompt defaults.

Consequence:

- Introduce language profile contracts early.
- Do not hard-code Cozo terms into the long-term public package APIs where neutral terms make sense.

### Decision 4: Separate domain contracts from browser/runtime details

Rationale:

- The frontend transport layer still depends on current window/location conventions in [hintsSocket.ts](../../../../../../frontend/src/transport/hintsSocket.ts#L25) and current route strings in [httpClient.ts](../../../../../../frontend/src/transport/httpClient.ts#L1).
- The backend transport mount points still hard-code route strings in [http.go](../../../../../../backend/pkg/notebook/http.go#L42) and [websocket.go](../../../../../../backend/pkg/notebook/websocket.go#L61).

Consequence:

- Route/base path configuration should become explicit preset config.
- Browser-only socket construction should become a transport factory, not a notebook-domain assumption.

## Alternatives Considered

### Alternative 1: Publish the package immediately without internal preset APIs

Rejected because:

- the exported surface would likely reflect current implementation accidents,
- the current app would still not be expressed as a reusable host,
- the JavaScript surface would force API churn immediately afterward.

### Alternative 2: Build a JavaScript package separately from the Cozo package

Rejected because:

- it would prematurely duplicate the notebook shell/state/transport model,
- it would weaken the shared notebook abstraction,
- it would make cross-language evolution harder.

### Alternative 3: Generalize every naming choice now

Rejected because:

- abstractions with only one implementation are often fake abstractions,
- some current names can stay Cozo-specific until the JavaScript implementation appears,
- the right compromise is to generalize only the host-facing module and preset contracts now.

## Implementation Plan

### Phase 1: Formalize backend module API

Goal:

- Turn the existing notebook package into an explicit host-facing module rather than a set of useful functions.

Tasks:

- Add `Module` and `ModuleConfig` types in `backend/pkg/notebook`.
- Move route/path defaults behind an explicit config struct.
- Provide `NewModule` plus `MountHTTP` and `MountWebSocket` methods.
- Keep the current `main.go` implementation working through that module.

Files:

- `backend/pkg/notebook/service.go`
- `backend/pkg/notebook/http.go`
- `backend/pkg/notebook/websocket.go`
- `backend/pkg/notebook/config.go`
- `backend/main.go`

### Phase 2: Formalize frontend module API

Goal:

- Convert the current notebook view/controller/state assembly into an explicit preset-driven host API.

Tasks:

- Define `NotebookTransport`, `NotebookHintsChannel`, and `NotebookPreset`.
- Split current direct imports from package-level interfaces.
- Build a `NotebookApp` component that accepts a preset.
- Keep the existing default export as the current app preset wrapper initially.

Files:

- `frontend/src/notebook/NotebookPage.tsx`
- `frontend/src/notebook/useNotebookPageController.ts`
- `frontend/src/notebook/NotebookPageView.tsx`
- `frontend/src/notebook/state/notebookSlice.ts`
- `frontend/src/transport/httpClient.ts`
- `frontend/src/transport/hintsSocket.ts`

### Phase 3: Extract the current Cozo app preset

Goal:

- Make the current app one documented preset on both sides.

Tasks:

- Add backend preset factory for Cozo runtime + SQLite + hints engine.
- Add frontend preset factory for current routes, socket path, Mac theme, and Cozo-specific SEM registration.
- Update stories/tests to exercise the preset object directly where possible.

### Phase 4: Introduce language profile contracts

Goal:

- Prepare the shared packaging for a second JavaScript-oriented surface without building the full JS runtime yet.

Tasks:

- Define backend language profile interfaces.
- Define frontend language profile interfaces.
- Move Cozo-specific docs/rendering defaults behind the Cozo profile.
- Add design-only placeholder for JavaScript profile in code or docs.

### Phase 5: Build the JavaScript preset family

Goal:

- Add a second fully intentional surface exposing JavaScript as a language.

Tasks:

- Implement a JavaScript backend runtime adapter.
- Define JS starter notebook defaults.
- Add frontend JS renderers and docs profile.
- Add preset-specific stories and smoke examples.

## Validation Strategy

The packaging work should be validated at three levels.

### Level 1: module-level tests

- backend module constructor tests
- backend route mounting tests
- frontend store/controller tests against injected transport interfaces
- Storybook stories for current-app preset rendering

### Level 2: preset-level tests

- current Cozo preset smoke test
- future JavaScript preset smoke test
- route/base-path override tests
- no-AI fallback behavior tests

### Level 3: host-level tests

- current app still boots with the preset path
- a minimal embedded host can render notebook UI with mocked transport
- backend minimal host can mount notebook module under a non-default prefix

## Intern Guidance

If you are a new intern, follow this order:

1. Read [COZODB-011](../../COZODB-011--react-and-redux-granular-component-refactor-with-storybook-isolation/design-doc/01-react-and-redux-granular-refactor-primitive-widget-extraction-and-storybook-guide.md) to understand the frontend split.
2. Read [COZODB-012](../../COZODB-012--backend-notebook-package-cutover-and-current-app-rewiring/design-doc/01-backend-notebook-package-cutover-implementation-guide.md) to understand the backend cutover.
3. Inspect [backend/main.go](../../../../../../backend/main.go), [backend/pkg/notebook/http.go](../../../../../../backend/pkg/notebook/http.go), and [backend/pkg/notebook/websocket.go](../../../../../../backend/pkg/notebook/websocket.go) to see how the current host is assembled.
4. Inspect [frontend/src/notebook/NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx), [frontend/src/notebook/useNotebookPageController.ts](../../../../../../frontend/src/notebook/useNotebookPageController.ts), and [frontend/src/notebook/state/notebookSlice.ts](../../../../../../frontend/src/notebook/state/notebookSlice.ts) to see how the frontend host is assembled.
5. Only after that start defining package APIs. Do not generalize blindly from filenames; generalize from responsibilities.

When in doubt, ask:

- Is this notebook-domain behavior?
- Is this host/preset configuration?
- Is this language-specific behavior?
- Is this purely transport or theme plumbing?

Those four questions are the whole packaging strategy.

## Open Questions

Open questions that should stay explicit:

- Should backend base paths be configurable immediately, or only once the first non-default host exists?
- Should the frontend preset own the Redux store creation, or should store creation be a separate helper?
- Should JavaScript execution be synchronous request/response like Cozo at first, or should it introduce a different run model?
- Should the JavaScript preset reuse the exact same notebook cell types, or should it add language metadata to notebook documents?

These questions should not block phase 1 or phase 2. They mostly matter once the second language surface starts to become code.

## References

- `COZODB-010`: reusable notebook architecture guide
- `COZODB-011`: frontend modularization and Storybook isolation
- `COZODB-012`: backend notebook package cutover and current-app rewiring
- [backend/main.go](../../../../../../backend/main.go)
- [backend/pkg/notebook/service.go](../../../../../../backend/pkg/notebook/service.go)
- [backend/pkg/notebook/http.go](../../../../../../backend/pkg/notebook/http.go)
- [backend/pkg/notebook/websocket.go](../../../../../../backend/pkg/notebook/websocket.go)
- [frontend/src/notebook/NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx)
- [frontend/src/notebook/useNotebookPageController.ts](../../../../../../frontend/src/notebook/useNotebookPageController.ts)
- [frontend/src/notebook/NotebookPageView.tsx](../../../../../../frontend/src/notebook/NotebookPageView.tsx)
- [frontend/src/notebook/state/notebookSlice.ts](../../../../../../frontend/src/notebook/state/notebookSlice.ts)
- [frontend/src/transport/httpClient.ts](../../../../../../frontend/src/transport/httpClient.ts)
- [frontend/src/transport/hintsSocket.ts](../../../../../../frontend/src/transport/hintsSocket.ts)
- [frontend/src/theme/tokens.css](../../../../../../frontend/src/theme/tokens.css)
