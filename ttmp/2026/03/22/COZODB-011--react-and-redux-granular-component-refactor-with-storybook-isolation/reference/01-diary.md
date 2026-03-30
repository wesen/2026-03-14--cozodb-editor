---
Title: Diary
Ticket: COZODB-011
Status: active
Topics:
    - architecture
    - frontend
    - rich-widgets
DocType: reference
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Chronological diary for the React/Redux granularity and Storybook isolation refactor."
LastUpdated: 2026-03-22T12:14:32-04:00
WhatFor: "Record the analysis, implementation slices, validation commands, and commit checkpoints for COZODB-011."
WhenToUse: "Use when continuing the frontend refactor, reviewing changes, or checking which tasks and commits completed each slice."
---

# Diary

## Goal

Track the pre-modularization frontend refactor that splits the current notebook UI into smaller reusable widgets, connected containers, and Storybook-validated building blocks.

## Step 1: Create the ticket, inventory the current frontend, and define the refactor plan

I created a dedicated ticket for frontend granularity work instead of folding it into `COZODB-010`. That separation is important because this ticket is not about package publishing yet. It is about making the current React app granular enough that package extraction is technically safe later.

I also created and ran a ticket-local inventory script so the design guide could point to concrete evidence: there is no Storybook scaffold, `NotebookPage` and `NotebookCellCard` are still large connected components, and the existing tests already show the difference between pure feature-card coverage and connected store-backed coverage.

### Prompt Context

**User prompt (verbatim):** "Create a new ticket and a detailed guide and analysis on how to split the react and redux into grnaular reusable components and primitive widgets to be reused, using a lot of storybook stories to validate that they work well and they are properly isoltated as standalone components (or mocked using a mock redux store).\n\nAdd a detailed implementation and analysis guide, and a detailed list of tasks to refactor the current react app before further modularizing it as described in the first ticket.\n\nThen work on the tasks one by one, committing at appropriate intervals, and keeping a detailed diary as you go."

**Assistant interpretation:** Create a new frontend-focused ticket that defines a React/Redux granularity refactor with Storybook-based validation, then start implementing the plan in task-sized slices with commits and diary updates.

**Inferred user intent:** Establish a concrete, reviewable frontend refactor path that prepares the codebase for later package modularization and proves component isolation through Storybook, not just code organization.

**Commit (code):** N/A

### What I did
- Created ticket `COZODB-011`.
- Added the primary design guide and this diary.
- Reviewed:
  - `COZODB-003`
  - `COZODB-010`
  - current frontend file structure
  - current component tests
  - current Redux store boundary
- Added `scripts/01-frontend-component-inventory.sh`.
- Ran the inventory script and saved output to `sources/01-frontend-component-inventory.txt`.
- Wrote the design guide and detailed task sequence for the refactor.

### Why
- `COZODB-010` assumes a reusable frontend package boundary, but current components are still too coarse for that extraction.
- The app needs one intermediate refactor layer focused on component granularity and isolation testing.

### What worked
- The current codebase already has enough presentational feature components and store-test patterns to support a Storybook-first refactor.
- Existing component tests made it straightforward to pick the first safe implementation slice.

### What didn't work
- N/A

### What I learned
- The strongest first slice is not `NotebookPage` or `NotebookCellCard`; it is the already-mostly-presentational hints/diagnosis/SEM card layer plus primitive controls.

### What was tricky to build
- The main design challenge was drawing a clear line between this ticket and `COZODB-010`.
- This ticket had to be narrow enough to avoid duplicating the package-modularization plan, but broad enough to be a real prerequisite rather than a minor cleanup ticket.

### What warrants a second pair of eyes
- Review whether the proposed folder split under `frontend/src/components/` is the right level of granularity before implementation expands.

### What should be done in the future
- Start implementation with Storybook setup and primitive extraction before attempting the connected container split.

### Code review instructions
- Read the design guide first.
- Then inspect `sources/01-frontend-component-inventory.txt` to confirm the current-state evidence.
- Finally compare the proposed task order with the current frontend tests and component boundaries.

### Technical details
- Commands run:
  - `docmgr ticket create-ticket --ticket COZODB-011 --title "React and Redux granular component refactor with Storybook isolation" --topics architecture,frontend,rich-widgets`
  - `docmgr doc add --ticket COZODB-011 --doc-type design-doc --title "React and Redux granular refactor, primitive widget extraction, and Storybook guide"`
  - `docmgr doc add --ticket COZODB-011 --doc-type reference --title "Diary"`
  - `ttmp/2026/03/22/COZODB-011--react-and-redux-granular-component-refactor-with-storybook-isolation/scripts/01-frontend-component-inventory.sh > ttmp/2026/03/22/COZODB-011--react-and-redux-granular-component-refactor-with-storybook-isolation/sources/01-frontend-component-inventory.txt`

## Step 2: Add Storybook, extract the first primitive layer, and refactor the presentational cards

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Continue from analysis into real implementation, one task slice at a time.

**Inferred user intent:** Do not stop at planning; start the refactor and leave a clean diary trail.

**Commit (code):** `cf623a2` (`frontend: add storybook and reusable notebook primitives`)

### What I did
- Added Storybook to the Vite frontend and wired:
  - `npm run storybook`
  - `npm run build-storybook`
- Simplified the generated Storybook scaffold so it only keeps:
  - `.storybook/main.ts`
  - `.storybook/preview.tsx`
  - `@storybook/react-vite`
  - `@storybook/addon-a11y`
  - `@storybook/addon-docs`
- Removed Storybook demo stories and generated asset noise.
- Added a first reusable primitive layer in `frontend/src/components/primitives/`:
  - `ActionRow`
  - `CodePanel`
  - `MacButton`
  - `PillButton`
  - `SectionLabel`
  - `primitives.css`
- Refactored the already-mostly-presentational cards to use the primitives:
  - `frontend/src/features/hints/HintResponseCard.tsx`
  - `frontend/src/features/diagnosis/DiagnosisCard.tsx`
  - `frontend/src/features/cozo-sem/CozoSemRenderer.tsx`
- Added isolated stories for:
  - all first-pass primitives
  - `HintResponseCard`
  - `DiagnosisCard`
  - `CozoSemRenderer`

### Why
- This slice created a visual workbench before touching the more fragile connected notebook components.
- It also turned implicit CSS-only visual conventions into explicit React components, which is the minimum foundation needed before larger container/view splits.

### What worked
- Storybook integrated cleanly with the existing Vite setup after trimming the default scaffold back to the essentials.
- The three presentational cards were already close enough to pure components that they could be migrated to primitives without changing their public behavior.
- Existing component tests for hints and SEM cards were a good proxy for choosing the safest first extraction target.

### What didn't work
- The Storybook initializer generated extra demo assets and addons that were not appropriate for this repo and would have diluted the intended modular surface.
- `apply_patch` could not directly delete the generated binary Storybook asset files, so I had to normalize them first and then remove them explicitly in patch form.
- The generated preview file used JSX in a `.ts` file; that needed to be corrected to `.tsx` to keep the configuration type-safe.

### What I learned
- The repo already had a stable visual vocabulary in CSS; the missing layer was explicit React primitives, not a full theme rewrite.
- The first extraction target really was the feature-card layer, not `NotebookPage` or the connected notebook shell.

### What was tricky to build
- The main implementation choice was keeping the primitive layer small and local instead of exploding it into many folders too early.
- I needed to trim the Storybook scaffold aggressively enough to make it feel like product infrastructure rather than a generic Storybook demo repo.

### What warrants a second pair of eyes
- Review whether `CodePanel` should remain a single primitive or be split later into `CodeSurface` and `CodePanelAction`.
- Review whether `PillButton` should gain a stronger semantic API before more features start depending on it.

### What should be done in the future
- The next step should move up one layer: split `NotebookCellCard` into a connected container and a pure view, then validate both the pure and connected surfaces in Storybook.

### Code review instructions
- Review commit `cf623a2`.
- Open Storybook and inspect the primitive stories first, then the feature-card stories.
- Confirm that the refactored presentational cards did not reintroduce store dependencies.
- Confirm that `npm test`, `npm run lint`, `npm run build`, and `npm run build-storybook` all passed before the commit was cut.

### Technical details
- Commands run:
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `npm run build-storybook`
- Files added:
  - `frontend/.storybook/main.ts`
  - `frontend/.storybook/preview.tsx`
  - `frontend/src/components/primitives/*`
  - `frontend/src/components/primitives/*.stories.tsx`
  - `frontend/src/features/hints/HintResponseCard.stories.tsx`
  - `frontend/src/features/diagnosis/DiagnosisCard.stories.tsx`
  - `frontend/src/features/cozo-sem/CozoSemRenderer.stories.tsx`
- Files refactored:
  - `frontend/src/features/hints/HintResponseCard.tsx`
  - `frontend/src/features/diagnosis/DiagnosisCard.tsx`
  - `frontend/src/features/cozo-sem/CozoSemRenderer.tsx`
  - `frontend/src/notebook/NotebookPage.tsx`

## Step 3: Split NotebookCellCard into a Redux container and a presentational view, then add mock-store stories

This slice took the next architectural step after the primitive extraction: the connected notebook cell card now has an explicit view layer and a Storybook mock-store path.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Continue implementing the ordered refactor tasks instead of stopping after Storybook setup and the first presentational slice.

**Inferred user intent:** Establish the real React/Redux boundary by making connected notebook UI previewable in isolation and through a mock Redux store.

**Commit (code):** `ea9b9c6` (`frontend: split notebook cell card into view and container`)

### What I did
- Extracted the render-heavy view from `frontend/src/notebook/NotebookCellCard.tsx` into `frontend/src/notebook/NotebookCellCardView.tsx`.
- Kept `NotebookCellCard.tsx` as the Redux-aware container responsible for:
  - selectors
  - dispatches
  - local UI state
  - mapping notebook/SEM state into view props
- Added Storybook support for connected notebook stories:
  - `frontend/src/storybook/createNotebookStoryStore.ts`
  - `frontend/src/storybook/notebookStoryStore.tsx`
- Added pure stories for the new presentational surface:
  - `frontend/src/notebook/NotebookCellCardView.stories.tsx`
- Added connected stories using a mock notebook store:
  - `frontend/src/notebook/NotebookCellCard.stories.tsx`
- Extended validation to include `npx tsc --noEmit`.

### Why
- `NotebookCellCard` was the clearest remaining example of mixed Redux/view logic blocking reuse.
- Splitting it now creates a reusable view surface for later package extraction while preserving the current app wiring.
- The mock-store story path turns the test-only `makeStore()` pattern into a reusable preview tool.

### What worked
- The container/view split was largely mechanical once the presentational layer and primitive buttons existed.
- Existing tests for `NotebookCellCard` continued to pass after the split, which is a strong sign that the external behavior stayed stable.
- The mock-store helper is small and uses real reducers, so stories exercise real selectors instead of fake prop plumbing.

### What didn't work
- ESLint started scanning `storybook-static` after Storybook builds, which produced irrelevant lint failures against generated files.
- The initial Storybook store helper mixed component and non-component exports, which violated the React refresh lint rule.
- `npx tsc --noEmit` surfaced story typing issues that were not visible in the normal build because the app build is transpilation-oriented.

### What I learned
- The pure view and connected story layers complement each other:
  - pure stories are better for state matrix coverage
  - connected stories are better for selector/store integration coverage
- Typechecking Storybook stories is worth running explicitly in this repo because regular Vite builds do not catch all story arg-shape issues.

### What was tricky to build
- The main challenge was choosing the prop boundary for `NotebookCellCardView` without inventing a second state model.
- I kept the container responsible for orchestration and passed explicit callbacks rather than introducing a fake notebook controller abstraction too early.

### What warrants a second pair of eyes
- Review whether `NotebookCellCardViewProps` should be grouped into smaller prop objects before `NotebookPage` starts consuming more of the same patterns.
- Review whether the Storybook store helper should also grow fixture builders for multi-cell notebook scenarios.

### What should be done in the future
- The next major slice should split `NotebookPage` into page shell, connected controller, and cell-list view components.
- After that, the ticket should reassess how close the frontend is to the package surface proposed in `COZODB-010`.

### Code review instructions
- Review commit `ea9b9c6`.
- Compare `frontend/src/notebook/NotebookCellCard.tsx` before and after the split.
- Open both:
  - `Notebook/NotebookCellCardView`
  - `Notebook/NotebookCellCard`
  stories in Storybook and confirm the difference between pure and connected coverage.
- Confirm the validation sequence:
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `npm run build-storybook`
  - `npx tsc --noEmit`

### Technical details
- Commands run:
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `npm run build-storybook`
  - `npx tsc --noEmit`
- Files added:
  - `frontend/src/notebook/NotebookCellCardView.tsx`
  - `frontend/src/notebook/NotebookCellCardView.stories.tsx`
  - `frontend/src/notebook/NotebookCellCard.stories.tsx`
  - `frontend/src/storybook/createNotebookStoryStore.ts`
  - `frontend/src/storybook/notebookStoryStore.tsx`
- Files refactored:
  - `frontend/src/notebook/NotebookCellCard.tsx`
  - `frontend/eslint.config.js`
  - `frontend/src/features/diagnosis/DiagnosisCard.stories.tsx`

## Step 4: Split NotebookPage, tighten the page-level CSS surface, and add an MSW-backed full notebook Storybook story

This slice completed the page-level decomposition and added a full interactive notebook story that exercises real fetch-driven flows against a mocked backend.

### Prompt Context

**User prompt (verbatim):** "continue, and also make sure the css stuff still fits, because it's been diverging, also make pstorybook stories with the full notebook to interact with or something. We can use msw for fake backend api mocking."

**Assistant interpretation:** Continue the refactor by finishing the page split, tightening the themable CSS surface, and adding an interactive Storybook notebook backed by MSW instead of static props only.

**Inferred user intent:** Move beyond component isolation into an app-like Storybook surface while preventing CSS drift between page chrome, primitives, and notebook-specific styles.

**Commit (code):** `b5715bf` (`frontend: add interactive notebook page stories with msw`)

### What I did
- Split `NotebookPage` into:
  - a hook/controller in `frontend/src/notebook/useNotebookPageController.ts`
  - a pure shell view in `frontend/src/notebook/NotebookPageView.tsx`
  - a connected container in `frontend/src/notebook/NotebookPage.tsx`
- Added page stories:
  - `frontend/src/notebook/NotebookPageView.stories.tsx`
  - `frontend/src/notebook/NotebookPage.stories.tsx`
- Added MSW support for Storybook:
  - `msw` and `msw-storybook-addon`
  - global initialization in `.storybook/preview.tsx`
  - `staticDirs` in `.storybook/main.ts`
  - `frontend/public/mockServiceWorker.js`
- Added a full notebook API mock layer in `frontend/src/storybook/notebookApiHandlers.ts` covering:
  - bootstrap
  - title updates
  - cell insert/update/move/delete
  - run
  - clear
  - reset kernel
- Added a fake hints socket for connected stories in `frontend/src/storybook/createStaticHintsSocket.ts`.
- Tightened CSS cohesion by:
  - reusing `MacButton` in page-level notebook actions
  - adding explicit notebook shell layout classes like `mac-notebook-stack` and `mac-notebook-toolbar`
  - moving page-shell structure toward `data-part` hooks
  - using theme variables for menubar/window/button backgrounds instead of more hard-coded white blocks
  - adding a small responsive pass for the notebook shell
- Looked at the larger `os-openai-app-server` example and adopted the same general direction of stable `data-part` hooks plus story-specific shell framing rather than relying only on incidental class names.

### Why
- `NotebookPage` was the remaining coarse assembly surface blocking the transition from reusable components to a reusable notebook package.
- A full MSW-backed story is the first notebook-level validation surface that behaves like the app instead of a static screenshot story.
- The page shell needed a CSS pass because the button/window chrome and notebook-specific layout had started to drift apart as primitives were introduced.

### What worked
- The controller/view split reduced the page component cleanly without changing the notebook behavior model.
- MSW fit well with the existing REST transport layer because the HTTP client already used a narrow set of endpoints.
- Storybook now has both:
  - presentational page-shell stories
  - a connected interactive notebook story
- The CSS cleanup was small but high-leverage: using shared button primitives and token-backed shell backgrounds made the page feel more internally consistent again.

### What didn't work
- `npx msw init public/` copied the worker script successfully but then dropped into an interactive metadata prompt; I had to add the `msw.workerDirectory` package metadata manually instead of relying on the wizard to finish.
- ESLint initially tried to lint the generated `mockServiceWorker.js` file and needed an explicit ignore.
- The first version of the MSW handlers passed Storybook build but still needed explicit TypeScript guards in a couple of mutation paths.

### What I learned
- The transport layer is already modular enough that app-level Storybook interaction can be driven with MSW and a real Redux store instead of inventing a fake frontend-only controller.
- CSS drift in this repo is more about missing structure and theming hooks than about missing tokens.
- The `data-part` pattern from the larger themable widget example is a useful next-step discipline even in this smaller notebook codebase.

### What was tricky to build
- The main design choice was avoiding a second invented page state model. I kept the controller returning the same notebook/store-driven behavior and only separated orchestration from rendering.
- The MSW handlers had to preserve enough notebook semantics to make the interactive story useful without reimplementing the backend in detail.

### What warrants a second pair of eyes
- Review whether the notebook page shell should go further toward explicit `parts.ts` constants, similar to the larger themable widget example.
- Review whether AI/WebSocket behavior in Storybook should stay as a fake no-op socket or grow into a richer story harness later.

### What should be done in the future
- The frontend is now ready for the frontend-side extraction work described in `COZODB-010`.
- The next work item should focus on package boundary extraction rather than further decomposition inside this app.

### Code review instructions
- Review the page split and story wiring once the pending code commit lands.
- Open:
  - `Notebook/NotebookPageView`
  - `Notebook/NotebookPage`
  stories in Storybook.
- In the interactive notebook story, verify:
  - loading from the mocked bootstrap endpoint
  - editing and blurring a cell
  - inserting cells
  - running a query
  - clearing and resetting the notebook
- Confirm the validation sequence:
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `npm run build-storybook`
  - `npx tsc --noEmit`

### Technical details
- Commands run:
  - `npm install -D msw msw-storybook-addon`
  - `npx msw init public/`
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `npm run build-storybook`
  - `npx tsc --noEmit`
- Files added:
  - `frontend/src/notebook/NotebookPageView.tsx`
  - `frontend/src/notebook/useNotebookPageController.ts`
  - `frontend/src/notebook/NotebookPageView.stories.tsx`
  - `frontend/src/notebook/NotebookPage.stories.tsx`
  - `frontend/src/storybook/notebookApiHandlers.ts`
  - `frontend/src/storybook/createStaticHintsSocket.ts`
  - `frontend/public/mockServiceWorker.js`
- Files refactored:
  - `frontend/src/notebook/NotebookPage.tsx`
  - `frontend/src/notebook/notebook.css`
  - `frontend/src/theme/layout.css`
  - `frontend/.storybook/main.ts`
  - `frontend/.storybook/preview.tsx`
  - `frontend/package.json`
  - `frontend/eslint.config.js`
