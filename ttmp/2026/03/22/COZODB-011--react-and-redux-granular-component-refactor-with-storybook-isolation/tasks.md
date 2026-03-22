# Tasks

## Analysis And Setup

- [x] Create ticket `COZODB-011`
- [x] Write the detailed design and implementation guide
- [x] Create the diary
- [x] Create and run a ticket-local frontend component inventory script

## Ordered Implementation Tasks

- [x] Add Storybook for the Vite/React frontend and wire `storybook` / `build-storybook` scripts
- [x] Add Storybook preview configuration and shared decorators
- [x] Add Storybook mock notebook store helpers based on `makeStore()`
- [x] Extract shared UI primitives for buttons, pill controls, card surfaces, section labels, and code panels
- [x] Refactor `HintResponseCard` to use the shared primitives
- [x] Refactor `DiagnosisCard` to use the shared primitives
- [x] Refactor `CozoSemRenderer` to use the shared primitives
- [x] Add a broad set of stories for the primitives and presentational feature cards
- [x] Split `NotebookCellCard` into a Redux-aware container and a presentational view
- [x] Add mock-store stories for notebook cell states
- [ ] Split `NotebookPage` into container/view/controller layers
- [ ] Add page-shell and connected notebook stories
- [x] Run lint, tests, build, and Storybook build
- [ ] Reassess frontend readiness for the package modularization work in `COZODB-010`
