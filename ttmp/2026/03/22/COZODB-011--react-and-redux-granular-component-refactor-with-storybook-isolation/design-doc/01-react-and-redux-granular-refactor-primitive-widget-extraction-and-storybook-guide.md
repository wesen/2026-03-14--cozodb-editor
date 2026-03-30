---
Title: React and Redux granular refactor, primitive widget extraction, and Storybook guide
Ticket: COZODB-011
Status: active
Topics:
    - architecture
    - frontend
    - rich-widgets
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Detailed analysis and implementation guide for decomposing the current React and Redux notebook UI into reusable presentational widgets, connected containers, and Storybook-backed isolated stories before the broader package modularization in COZODB-010."
LastUpdated: 2026-03-22T12:14:32-04:00
WhatFor: "Provide a concrete pre-modularization frontend refactor plan that extracts granular reusable components and validates them in Storybook with isolated and mock-store-driven stories."
WhenToUse: "Use before further notebook package extraction work, when splitting connected notebook components, or when deciding how to add Storybook coverage to the current frontend."
---

# React and Redux granular refactor, primitive widget extraction, and Storybook guide

## Executive Summary

`COZODB-010` defines the long-term package boundary: one reusable notebook package on the frontend, assembled by environment presets. The frontend is not ready for that extraction yet. The current notebook experience already uses Redux, feature components, and SEM renderers, but the assembly layer is still too coarse: the page component owns shell behavior and environment wiring, the cell card owns too much local rendering and dispatch logic, and the reusable visual building blocks are mostly implicit CSS classes instead of explicit components.

This ticket is the missing intermediate step. Its job is to refactor the current React app into smaller reusable pieces before the broader package modularization begins. The rule is simple:

1. split connected containers from presentational widgets,
2. extract reusable primitive controls and chrome,
3. validate those pieces in Storybook,
4. only then continue with the package extraction described in `COZODB-010`.

## Implementation Status

As of `2026-03-22`, the first two implementation slices in this guide are complete:

- Storybook is installed and wired into the Vite frontend.
- A first primitive layer exists under `frontend/src/components/primitives/`.
- `HintResponseCard`, `DiagnosisCard`, and `CozoSemRenderer` now consume the shared primitives.
- `NotebookCellCard` has been split into a connected container and a presentational view.
- Storybook now covers both pure component stories and connected notebook stories backed by a mock Redux store.
- `NotebookPage` has been split into controller/container/view layers.
- Storybook now includes an MSW-backed interactive notebook page story in addition to isolated shell/component stories.

The decomposition work described in this guide is now complete enough for the frontend-side extraction work proposed in `COZODB-010`.

The current state supports this approach well:

- there is already a Redux store factory in [frontend/src/app/store.ts](../../../../../../frontend/src/app/store.ts)
- there are already isolated tests for some presentational components in [frontend/src/features/hints/HintResponseCard.test.tsx](../../../../../../frontend/src/features/hints/HintResponseCard.test.tsx) and [frontend/src/features/cozo-sem/CozoSemRenderer.test.tsx](../../../../../../frontend/src/features/cozo-sem/CozoSemRenderer.test.tsx)
- there is already a connected component test using a mock store pattern in [frontend/src/notebook/NotebookCellCard.test.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.test.tsx)

What is missing is systematic extraction and a visual validation surface.

## Problem Statement

The frontend has already moved past the single-file `DatalogPad.jsx` architecture described in `COZODB-003`, but it is still not granular enough to become a reusable package surface. Large UI chunks remain bound directly to Redux selectors, dispatch flows, and notebook-specific orchestration, which makes them hard to reuse and hard to preview outside the whole notebook runtime.

Concrete evidence:

- `NotebookPage.tsx` is still 365 lines and owns bootstrapping, WebSocket registration, keyboard shortcuts, run/insert flows, shell chrome, and cell list rendering in [frontend/src/notebook/NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx#L36).
- `NotebookCellCard.tsx` is still 354 lines and mixes Redux selectors, dispatches, local edit state, AI form behavior, markdown preview, output rendering, and cell toolbar behavior in [frontend/src/notebook/NotebookCellCard.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.tsx#L75).
- `HintResponseCard.tsx`, `DiagnosisCard.tsx`, and `CozoSemRenderer.tsx` are already partly presentational, but they still embed one-off button styles and implicit visual conventions rather than reusing a stable primitive layer:
  - [frontend/src/features/hints/HintResponseCard.tsx](../../../../../../frontend/src/features/hints/HintResponseCard.tsx#L34)
  - [frontend/src/features/diagnosis/DiagnosisCard.tsx](../../../../../../frontend/src/features/diagnosis/DiagnosisCard.tsx#L17)
  - [frontend/src/features/cozo-sem/CozoSemRenderer.tsx](../../../../../../frontend/src/features/cozo-sem/CozoSemRenderer.tsx#L78)
- There is no `.storybook` directory and no Storybook scripts in [frontend/package.json](../../../../../../frontend/package.json#L6), which means there is no isolated component-workbench layer.

The broad modularization in `COZODB-010` would be premature if we tried to expose today’s notebook components as reusable package exports. The visual layer is not factored into stable widgets yet, and the connected/presentational split is not explicit enough.

## Scope

This ticket covers frontend-only refactoring that should happen before `COZODB-010` style package extraction.

In scope:

- introduce Storybook for the Vite/React frontend
- define a primitive component layer for recurring UI controls and card chrome
- refactor presentational feature components to consume those primitives
- split connected notebook components into container and view layers
- add isolated stories for pure widgets and mock-store stories for connected notebook pieces

Out of scope:

- changing the backend
- changing the notebook data model
- publishing an npm package
- adding new notebook product features unrelated to refactoring
- fully theme-tokenizing every existing CSS selector in one pass

## Relationship To Existing Tickets

This ticket should be read as a bridge between two earlier tickets.

### Relation to COZODB-003

`COZODB-003` focused on escaping the original monolithic `DatalogPad.jsx` architecture. That work described the initial decomposition into transport, projection, editor, and widgets. Much of that has already landed: the codebase now has `features/`, `notebook/`, `transport/`, `sem/`, and `app/` folders.

This ticket starts where that work stops. The question is no longer “how do we split a monolith into modules?” The question is “how do we split those modules into reusable widgets and connected containers?”

### Relation to COZODB-010

`COZODB-010` describes the future frontend notebook package boundary. This ticket is a prerequisite because package extraction should not start from coarse components that still mix view logic and store wiring.

Recommended sequencing:

1. complete the React/Redux granularity work in this ticket
2. prove isolation with Storybook and mock-store stories
3. then continue the frontend side of `COZODB-010`

## Current-State Analysis

### Current Directory Shape

The relevant frontend folders are already present:

```text
frontend/src/
  app/
  features/
    cozo-sem/
    diagnosis/
    hints/
    query-results/
  notebook/
    state/
  sem/
  theme/
  transport/
```

That structure is promising, but it still hides two architectural problems:

1. the presentational layer is under-extracted,
2. the connected/container layer is under-defined.

### Current Redux Boundary

The Redux boundary is technically clean but visually coarse.

Observed facts:

- the store factory is tiny and reusable in [frontend/src/app/store.ts](../../../../../../frontend/src/app/store.ts#L4)
- `NotebookPage` reads several selectors directly and dispatches many notebook flows in [frontend/src/notebook/NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx#L37)
- `NotebookCellCard` reads many selectors and dispatches many actions/thunks directly in [frontend/src/notebook/NotebookCellCard.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.tsx#L83)
- the component test for `NotebookCellCard` already builds a real store with `makeStore()` and wraps the component in `Provider` in [frontend/src/notebook/NotebookCellCard.test.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.test.tsx#L40)

This means the app already has the seed of a mock-store pattern, but it is only used in tests. It is not yet a first-class story isolation strategy.

### Current Presentational Layer

Three groups of components already look like story candidates:

1. feature cards:
   - `HintResponseCard`
   - `DiagnosisCard`
   - `CozoSemRenderer`
2. feature widgets inside SEM:
   - `HintCard`
   - `QuerySuggestionCard`
   - `DocRefCard`
3. utility outputs:
   - `QueryResultsTable`
   - `StreamingMessageCard`
   - `DocPreviewChip`

However, these components still duplicate small UI patterns:

- pill buttons
- collapse/dismiss controls
- section labels
- code panels
- action rows
- surface containers

Those patterns are visible in repeated inline style blocks in:

- [frontend/src/features/hints/HintResponseCard.tsx](../../../../../../frontend/src/features/hints/HintResponseCard.tsx#L49)
- [frontend/src/features/diagnosis/DiagnosisCard.tsx](../../../../../../frontend/src/features/diagnosis/DiagnosisCard.tsx#L20)
- [frontend/src/features/cozo-sem/CozoSemRenderer.tsx](../../../../../../frontend/src/features/cozo-sem/CozoSemRenderer.tsx#L103)

If those style and structure patterns remain duplicated, the package extraction in `COZODB-010` will export multiple components that look visually related but do not share an explicit primitive contract.

### Current CSS Boundary

The CSS already hints at a reusable visual vocabulary:

- `.mac-btn` in [frontend/src/theme/layout.css](../../../../../../frontend/src/theme/layout.css#L130)
- `.cozo-ai-card`, `.cozo-diagnosis-card`, `.cozo-code-panel` in [frontend/src/theme/cards.css](../../../../../../frontend/src/theme/cards.css#L1)
- notebook-specific chrome and status classes in [frontend/src/notebook/notebook.css](../../../../../../frontend/src/notebook/notebook.css#L1)

The current problem is that these remain CSS-only conventions. They should become explicit React primitives.

### Current Validation Surface

Existing tests already tell us which components are isolated enough to move first:

- `HintResponseCard` has a direct render test with no Redux in [frontend/src/features/hints/HintResponseCard.test.tsx](../../../../../../frontend/src/features/hints/HintResponseCard.test.tsx#L5)
- `CozoSemRenderer` has direct render tests with stubbed thread data in [frontend/src/features/cozo-sem/CozoSemRenderer.test.tsx](../../../../../../frontend/src/features/cozo-sem/CozoSemRenderer.test.tsx#L10)
- `NotebookCellCard` has a connected test with a real store in [frontend/src/notebook/NotebookCellCard.test.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.test.tsx#L67)

That gives us the ideal refactor order:

1. pure feature widgets first
2. shared primitives second
3. connected notebook components third

## Gap Analysis

| Goal | Current state | Gap | Refactor needed |
| --- | --- | --- | --- |
| Reusable widgets | Several presentational cards exist | They duplicate controls and surface chrome | Extract a shared primitive layer |
| Storybook validation | No Storybook setup | No isolated visual workbench | Add Storybook and story helpers |
| Redux isolation | Connected tests exist, but no component split | View logic and store wiring are mixed | Split containers from presentational views |
| Mock-store previewing | `makeStore()` exists for tests | No reusable decorator/helper for stories | Add Storybook mock-store utilities |
| Future package export surface | `COZODB-010` wants reusable frontend package | Current components are too coarse | Export container/view/primitives from stable folders |

## Proposed Solution

### Target Frontend Shape

The immediate target is not a published package. The immediate target is a frontend that behaves like a reusable component library internally.

Recommended shape:

```text
frontend/src/
  components/
    primitives/
      buttons/
      badges/
      surfaces/
      code/
      index.ts
    notebook/
      NotebookCellCardView.tsx
      NotebookCellToolbar.tsx
      NotebookChromeView.tsx
      NotebookOutputStack.tsx
      index.ts
  features/
    hints/
    diagnosis/
    cozo-sem/
  notebook/
    containers/
      NotebookCellCardContainer.tsx
      NotebookPageContainer.tsx
    state/
  storybook/
    decorators/
    mocks/
```

Important constraint:
This is still one app. These folders are internal organization, not separate npm packages.

### Container / View Split

Every component that touches Redux directly should become either:

1. a container component that reads selectors and dispatches actions, or
2. a view component that only receives props.

Example target split:

```text
NotebookCellCardContainer
  -> use selectors
  -> derive state
  -> wire dispatch callbacks
  -> render NotebookCellCardView

NotebookCellCardView
  -> render toolbar, editor, preview, output stack, AI controls
  -> no direct Redux imports
```

That same pattern should apply to the page shell:

```text
NotebookPageContainer
  -> bootstrap notebook
  -> wire keyboard commands
  -> wire websocket projection
  -> render NotebookChromeView

NotebookChromeView
  -> title bar
  -> action buttons
  -> cell list slot
  -> empty/loading/error states
```

### Primitive Layer

The first primitive layer should stay intentionally small. Start with repeated patterns already visible in the codebase.

Recommended primitives:

- `MacButton`
  Wraps `.mac-btn`
- `PillButton`
  For fold/dismiss/chip buttons used in hints and SEM
- `StatusBadge`
  For status labels and connection badges
- `CardSurface`
  For AI / diagnosis / SEM cards
- `CardSectionLabel`
  For small uppercase labels like `AI ASSISTANT`, `SEM THREAD`, `QUERY ERROR`
- `CodePanel`
  For reusable code/output code framing
- `ActionRow`
  For repeated action button group layout

These should expose stable hooks using the theming skill’s contract:

- root marker via `data-widget` or scoped root class
- stable part selectors via `data-part`
- CSS variables for colors, spacing, and typography

This should not become a generic design system project. These primitives exist to remove duplication and stabilize story coverage.

### Storybook Strategy

Storybook should validate three kinds of stories:

1. pure primitive stories
2. pure presentational feature stories
3. connected container stories with mock Redux state

#### Primitive Stories

Examples:

- `MacButton` default, disabled, pressed-like state
- `PillButton` neutral, danger, active
- `CodePanel` short code, long wrapped code
- `StatusBadge` ok, error, stale, AI

#### Presentational Stories

Examples:

- `HintResponseCard` expanded, collapsed, with docs, with no code
- `DiagnosisCard` diagnosing, diagnosed, fix-with-code, no-fix
- `CozoSemRenderer` expanded thread, collapsed thread, child-only thread

#### Connected Stories

Examples:

- `NotebookCellCardContainer` with:
  - clean code cell
  - dirty code cell
  - markdown cell
  - runtime error with diagnosis
  - SEM thread present
- `NotebookPageContainer` with:
  - loading notebook
  - empty notebook
  - normal notebook

Connected stories should use a Storybook decorator that creates a mock store via `makeStore()` and dispatches seed actions like `notebookLoaded`, `runtimeUpdated`, and `semEventProjected`.

Pseudocode:

```tsx
export function withNotebookStore(seed: SeedState): Decorator {
  return (Story) => {
    const store = makeStore()
    applySeed(store, seed)
    return (
      <Provider store={store}>
        <Story />
      </Provider>
    )
  }
}
```

### Minimal Storybook Contract

For this repo, Storybook should provide at least:

- `npm run storybook`
- `npm run build-storybook`
- `.storybook/main.ts`
- `.storybook/preview.tsx`
- story discovery for `src/**/*.stories.tsx`
- a small `frontend/src/storybook/` helper layer

Keep the first pass minimal. Do not add many addons until the stories are paying for themselves.

## Design Decisions

### Decision 1: Storybook before deep component export cleanup

Why:

- visual isolation should drive extraction quality
- stories expose hidden coupling quickly
- Storybook is the easiest way to prove whether a component is actually reusable

### Decision 2: Prefer real Redux store mocks over fake prop reimplementations for connected stories

Why:

- the app already has `makeStore()`
- dispatching seed actions is closer to runtime truth
- it avoids brittle hand-built state objects in every story

This does not mean every story should be connected. Pure widgets should still use plain props.

### Decision 3: Extract primitives from repeated UI motifs, not from a speculative design system

Why:

- premature design-system work would slow down the notebook refactor
- the codebase already reveals which patterns deserve extraction
- small primitives are enough to improve story isolation and reuse

### Decision 4: Keep styles close to the primitives, but reuse the existing token files

Why:

- the current theme files already define useful variables
- extracting primitives should not fork the visual language
- future `COZODB-010` packaging can later decide what becomes package-level CSS

## Implementation Plan

### Phase 1: Storybook foundation

Goal:
Add Storybook to the Vite/React frontend and prove at least one story renders.

Tasks:

1. install Storybook for React + Vite
2. add `.storybook/main.ts`
3. add `.storybook/preview.tsx`
4. add `storybook` and `build-storybook` scripts
5. add one smoke-test story for a pure feature component

### Phase 2: Primitive extraction for shared card controls

Goal:
Turn repeated inline controls into reusable primitives.

Tasks:

1. create `frontend/src/components/primitives/`
2. extract `MacButton`, `PillButton`, `CodePanel`, `CardSurface`, `CardSectionLabel`, `ActionRow`
3. refactor `HintResponseCard`, `DiagnosisCard`, and `CozoSemRenderer` to use them
4. add stories for the primitives and refactored cards

### Phase 3: Notebook container/view split

Goal:
Separate notebook-specific Redux wiring from reusable notebook views.

Tasks:

1. split `NotebookCellCard` into container + view
2. extract toolbar/output/editor subcomponents from the view
3. keep `NotebookCellCardContainer` as the only Redux-aware wrapper for cell rendering
4. add mock-store stories for connected cell states

### Phase 4: Page shell split

Goal:
Reduce `NotebookPage` to environment/controller assembly and push render logic into reusable views.

Tasks:

1. extract shell view components for title bar, menubar, empty state, loading state
2. move keyboard orchestration into a dedicated controller hook
3. add stories for shell views and at least one connected page scenario

### Phase 5: Refactor completion gate before COZODB-010

Goal:
Make sure the frontend is granular enough for package extraction.

Exit criteria:

- presentational widgets can render in Storybook without Redux
- connected notebook surfaces can render in Storybook with a mock store decorator
- primitive controls remove most duplicated inline button/card chrome
- `NotebookCellCard` and `NotebookPage` no longer mix full view logic with store wiring

## Detailed Task List

The task file in this ticket mirrors the following task sequence:

1. Create Storybook infrastructure for Vite/React.
2. Add Storybook decorators and mock notebook store helpers.
3. Extract shared primitive controls from repeated notebook/hints/SEM card patterns.
4. Refactor `HintResponseCard` to use primitives.
5. Refactor `DiagnosisCard` to use primitives.
6. Refactor `CozoSemRenderer` to use primitives.
7. Add stories for all extracted primitives.
8. Add stories for presentational feature cards.
9. Split `NotebookCellCard` into container/view.
10. Add mock-store stories for notebook cell states.
11. Split `NotebookPage` into container/view plus controller hook.
12. Add page-level shell stories.
13. Run lint/tests/storybook build and fix regressions.
14. Re-evaluate readiness for `COZODB-010` frontend package extraction.

## Testing And Validation Strategy

Validation must cover both logic and isolation.

Required checks:

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run build-storybook`

Additional expectations:

- pure component stories should render without `Provider`
- connected stories should use a shared mock-store decorator
- existing component tests should still pass after primitive extraction

## Risks And Open Questions

### Risks

- Storybook setup may introduce dependency churn in `package-lock.json`.
- Primitive extraction could accidentally hard-code too much notebook-specific styling.
- Container/view splits can create prop bloat if the view boundaries are chosen poorly.

### Open Questions

1. Should `QueryResultsTable` stay feature-local or move into the primitive/widget layer?
2. Should `CozoSemRenderer` remain a feature renderer while only its chrome becomes primitive-based?
3. How far should page-level Storybook coverage go before it stops paying for itself?

## Recommended First Implementation Slice

The first slice should be:

1. Storybook foundation
2. primitive extraction for card controls
3. refactor `HintResponseCard` and `DiagnosisCard`
4. add stories for those primitives and cards

Why this slice first:

- the components are already mostly presentational
- they already have tests
- they do not require immediately solving the full Redux container split
- they prove the Storybook path before touching `NotebookCellCard` and `NotebookPage`

## References

- [frontend/package.json](../../../../../../frontend/package.json)
- [frontend/src/app/store.ts](../../../../../../frontend/src/app/store.ts)
- [frontend/src/notebook/NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx)
- [frontend/src/notebook/NotebookCellCard.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.tsx)
- [frontend/src/notebook/NotebookCellCard.test.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.test.tsx)
- [frontend/src/features/hints/HintResponseCard.tsx](../../../../../../frontend/src/features/hints/HintResponseCard.tsx)
- [frontend/src/features/hints/HintResponseCard.test.tsx](../../../../../../frontend/src/features/hints/HintResponseCard.test.tsx)
- [frontend/src/features/diagnosis/DiagnosisCard.tsx](../../../../../../frontend/src/features/diagnosis/DiagnosisCard.tsx)
- [frontend/src/features/cozo-sem/CozoSemRenderer.tsx](../../../../../../frontend/src/features/cozo-sem/CozoSemRenderer.tsx)
- [frontend/src/features/cozo-sem/CozoSemRenderer.test.tsx](../../../../../../frontend/src/features/cozo-sem/CozoSemRenderer.test.tsx)
- [frontend/src/notebook/notebook.css](../../../../../../frontend/src/notebook/notebook.css)
- [frontend/src/theme/layout.css](../../../../../../frontend/src/theme/layout.css)
- [frontend/src/theme/cards.css](../../../../../../frontend/src/theme/cards.css)
- [COZODB-003 guide](../../../../2026/03/15/COZODB-003--frontend-decomposition-plan-for-sem-migration-and-widget-modularization/design-doc/01-frontend-decomposition-architecture-review-and-intern-implementation-guide.md)
- [COZODB-010 guide](../../../../2026/03/22/COZODB-010--reusable-notebook-package-architecture-for-multi-environment-targets/design-doc/01-reusable-notebook-package-architecture-and-intern-implementation-guide.md)
- [sources/01-frontend-component-inventory.txt](../sources/01-frontend-component-inventory.txt)
- [scripts/01-frontend-component-inventory.sh](../scripts/01-frontend-component-inventory.sh)
