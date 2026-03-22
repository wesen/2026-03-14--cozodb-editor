---
Title: Diary
Ticket: COZODB-013
Status: active
Topics:
    - architecture
    - backend
    - frontend
    - cozodb
    - javascript
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: backend/main.go
      Note: Main now opens the current Cozo notebook preset instead of assembling notebook runtime and AI directly (commit a9a362c)
    - Path: backend/pkg/api/handlers.go
      Note: Generic API server now depends on a runtime interface instead of concrete Cozo manager state (commit a9a362c)
    - Path: backend/pkg/notebook/current_cozo.go
      Note: Current Cozo app preset factory now owns backend runtime and AI startup (commit a9a362c)
    - Path: backend/pkg/notebook/current_cozo_test.go
      Note: Preset test verifies custom-path mounting through the current app preset (commit a9a362c)
    - Path: backend/pkg/notebook/module.go
      Note: Backend module wrapper now owns configurable base paths and optional resource cleanup (commits ee21331
    - Path: backend/pkg/notebook/runtime.go
      Note: Notebook runtime contract now covers host-facing schema/query capabilities too (commit a9a362c)
    - Path: ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/scripts/01-package-surface-inventory.sh
      Note: Ticket-local script used to inventory current backend/frontend package surfaces
    - Path: ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/sources/01-package-surface-inventory.txt
      Note: Captured inventory output used as evidence for the guide
ExternalSources: []
Summary: Chronological diary for the packaging/API design ticket that follows the frontend and backend modularization work.
LastUpdated: 2026-03-22T15:37:42-04:00
WhatFor: Record how the packaging design guide, inventory evidence, and reMarkable bundle were produced for COZODB-013.
WhenToUse: Use when continuing the packaging-design work, reviewing the evidence trail, or checking how the deliverable bundle was assembled.
---



# Diary

## Goal

Track the creation of the package and API design ticket that prepares the repository for reusable notebook packaging and a later JavaScript-oriented surface.

## Step 1: Create the packaging design ticket and write the guide

This ticket does not change runtime code. Its job is to make the next implementation phase legible. I used the now-complete frontend and backend cutover tickets as inputs, re-read the current package surfaces in the codebase, and wrote a packaging guide aimed at an intern who needs both conceptual framing and concrete file-level orientation.

The key new design constraint is the future JavaScript language surface. That changed the guide materially: instead of describing package extraction only as “make the Cozo app reusable,” the guide now describes a preset-based architecture in which the current Cozo app is preset #1 and a JavaScript-oriented notebook becomes preset #2.

### Prompt Context

**User prompt (verbatim):**
> ok, create a new ticket, and write a detailed implementation guide for our internn and upload to remarkable. on the whole packaging and api design and app example.
>
> My plan is that once we have this going, we design a second surface on the backend and frontend that exposes JS as a language.

**Assistant interpretation:** Create a new ticket focused on package extraction and host-facing APIs, write a detailed intern guide that explains the current app preset and future multi-language direction, and upload the deliverables to reMarkable.

**Inferred user intent:** Lock down the next-stage architecture before implementation starts, with enough specificity that an intern can work from the guide and enough foresight that the future JavaScript surface does not force a redesign.

**Commit (code):** Pending

### What I did
- Created ticket `COZODB-013`.
- Added the primary design doc and diary.
- Inspected the current backend package surface in:
  - `backend/main.go`
  - `backend/pkg/notebook/service.go`
  - `backend/pkg/notebook/http.go`
  - `backend/pkg/notebook/websocket.go`
- Inspected the current frontend package surface in:
  - `frontend/src/notebook/NotebookPage.tsx`
  - `frontend/src/notebook/useNotebookPageController.ts`
  - `frontend/src/notebook/NotebookPageView.tsx`
  - `frontend/src/notebook/state/notebookSlice.ts`
  - `frontend/src/transport/httpClient.ts`
  - `frontend/src/transport/hintsSocket.ts`
  - `frontend/src/theme/tokens.css`
- Wrote the packaging and API design guide.
- Added a ticket-local package inventory script.

### Why
- The modularization work is now past the point where “split this file” guidance is useful. The next risk is unclear package APIs and unclear preset boundaries.
- The future JavaScript surface needs to influence the package design now, before the public-facing APIs hard-code Cozo-only assumptions.

### What worked
- The repository already has credible package centers on both backend and frontend.
- The previous tickets provide a clean sequence: first frontend decomposition, then backend cutover, now package API design.
- The current app is already close to a preset, which makes the guide concrete rather than aspirational.
- The final bundle uploaded cleanly to `/ai/2026/03/22/COZODB-013`, and `remarquee cloud ls /ai/2026/03/22/COZODB-013 --long --non-interactive` returned the uploaded PDF.

### What didn't work
- My first version of the inventory script pointed one directory too high when resolving the repository root.
- Command:
  - `bash ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/scripts/01-package-surface-inventory.sh > ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/sources/01-package-surface-inventory.txt`
- Error:
  - `rg: backend/pkg/notebook: IO error for operation on backend/pkg/notebook: No such file or directory (os error 2)`
- Fix:
  - changed the script root traversal from `../../../../../../..` to `../../../../../..`
  - reran the script successfully and captured the output in `sources/01-package-surface-inventory.txt`
- My first reMarkable upload attempt failed during PDF generation because the diary stored the user prompt as one quoted string with literal `\n` sequences.
- Command:
  - `remarquee upload bundle ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/index.md ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/design-doc/01-notebook-packaging-api-design-and-current-app-preset-implementation-guide.md ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/tasks.md ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/reference/01-diary.md --name "COZODB-013 notebook packaging api design" --remote-dir "/ai/2026/03/22/COZODB-013" --toc-depth 2`
- Error:
  - `Error: pandoc failed: Error producing PDF.`
  - `! Undefined control sequence.`
  - `l.1322 ...aging and api design and app example. \n`
- Fix:
  - rewrote the prompt as a multiline blockquote in the diary
  - reran the upload successfully

### What I learned
- The real leverage point is not adding more interfaces everywhere. It is deciding which variability belongs to presets, which belongs to language profiles, and which should stay in the notebook domain.
- The current code is now structured well enough that package design can be evidence-driven instead of speculative.

### What was tricky to build
- The subtle part was incorporating the future JavaScript surface without over-generalizing the current code. If the guide abstracted everything immediately, it would become hand-wavy. If it ignored JavaScript, it would age badly almost immediately.
- The workable compromise was to recommend neutral host-facing module/preset APIs while keeping current Cozo-specific details in the first preset and the first language profile.

### What warrants a second pair of eyes
- Review whether the proposed backend `Module` abstraction should be introduced immediately or only after the first preset factory exists.
- Review whether the frontend preset should own store creation or whether store creation should remain a separate exported helper.

### What should be done in the future
- Start implementation against the packaging backlog from this ticket.
- Use the current-app preset as the first proving ground before adding the JavaScript-oriented preset family.

### Code review instructions
- Read the design guide first.
- Compare its proposed module/preset APIs against the current files listed above.
- Confirm that the JavaScript future plan is represented as a preset/language-profile extension, not as a separate architecture.

### Technical details
- Key code evidence:
  - `backend/pkg/notebook/http.go` exports `MountHTTPRoutes`
  - `backend/pkg/notebook/websocket.go` exports `MountWebSocketRoutes`
  - `backend/pkg/notebook/service.go` exports `NewService` and `OpenService`
  - `frontend/src/notebook/NotebookPage.tsx` is the current default app composition point
  - `frontend/src/notebook/useNotebookPageController.ts` still owns environment wiring
  - `frontend/src/transport/httpClient.ts` and `frontend/src/transport/hintsSocket.ts` already define transport modules that can become preset dependencies
  - `ttmp/.../scripts/01-package-surface-inventory.sh` captures the current package file inventory and key exported mount points

## Step 2: Add the backend module API and configurable base paths

The first implementation slice turns the design doc into a real backend package surface. I added a `Module` wrapper in `backend/pkg/notebook`, moved notebook-owned path strings into explicit `BasePaths` configuration, and rewired `backend/main.go` to consume the module instead of mounting the service and WebSocket functions directly.

This is still intentionally narrow. It does not yet create a full current-app preset factory that owns Cozo runtime creation and hints-engine startup. It does, however, create the host-facing package seam that preset work will build on next.

### Prompt Context

**User prompt (verbatim):** "alright, add tasks, implement one by one, git commit at appropriate intervals, and keep a detailed diary"

**Assistant interpretation:** Start implementing the packaging backlog in small validated slices, commit after each coherent step, and keep the ticket docs synchronized with the actual code history.

**Inferred user intent:** Turn `COZODB-013` from a design-only artifact into the beginning of the real package-extraction implementation, without losing the disciplined ticket workflow used in the earlier tickets.

**Commit (code):** ee21331 — "backend: add notebook module api and base path config"

### What I did
- Added `backend/pkg/notebook/module.go` with:
  - `Module`
  - `ModuleConfig`
  - `OpenModule`
  - `MountHTTP`
  - `MountWebSocket`
  - `Close`
- Expanded `backend/pkg/notebook/config.go` with `BasePaths`, defaults, and validation.
- Added `MountHTTPRoutesWithBasePaths` in `backend/pkg/notebook/http.go`.
- Added `MountWebSocketRoutesWithBasePaths` in `backend/pkg/notebook/websocket.go`.
- Rewired `backend/main.go` to use `notebook.OpenModule(...)`, `module.MountHTTP(...)`, and `module.MountWebSocket(...)`.
- Added custom-path coverage in:
  - `backend/pkg/notebook/http_test.go`
  - `backend/pkg/notebook/websocket_test.go`
- Added `openTestRuntime` in `backend/pkg/notebook/service_test.go` so module tests can reuse the in-memory runtime setup.
- Ran:
  - `cd backend && gofmt -w main.go pkg/notebook/config.go pkg/notebook/module.go pkg/notebook/http.go pkg/notebook/http_test.go pkg/notebook/service_test.go pkg/notebook/websocket.go pkg/notebook/websocket_test.go`
  - `cd backend && go test ./...`

### Why
- The design doc called for a real host-facing backend module, not just a set of useful low-level functions.
- Preset work needs configurable route ownership; otherwise the package surface would still quietly assume the current app’s exact `/api/...` and `/ws/...` paths.

### What worked
- The existing notebook package had already been cut cleanly enough in `COZODB-012` that the module wrapper was mostly composition, not another deep refactor.
- Custom-path tests passed immediately once the route trim logic was fixed.
- `main.go` is now noticeably closer to a host preset instead of a transport-assembly file.

### What didn't work
- The first version of `handleNotebook` in `backend/pkg/notebook/http.go` still trimmed against the old hard-coded `/api/notebooks/` prefix before attempting the new configurable prefix.
- Symptom:
  - custom path requests would not route correctly for `"/x/notebooks/bootstrap"` and other non-default prefixes.
- Fix:
  - changed the trim logic to derive directly from `h.basePaths.Notebooks + "/"` before running the backend tests.

### What I learned
- The backend package API can evolve incrementally without destabilizing the host app as long as the old public helpers remain thin wrappers over the new configurable path.
- Base-path configuration is small, but it forces the right design conversation early: which assumptions belong to the notebook module, and which belong to the host preset.

### What was tricky to build
- The trickiest part was choosing how much abstraction to introduce in the first slice. A `Module` wrapper was useful immediately because it simplified the host-facing API, but a full “current app preset” factory would have dragged runtime ownership, AI startup policy, and cleanup semantics into the same commit.
- I kept that second concern out of this slice on purpose so the first commit could stay about package API shape and path configurability only.

### What warrants a second pair of eyes
- Review whether `Module` should eventually expose a richer host-facing API than just `Service`, `AI`, and `BasePaths`.
- Review whether the current `OpenModule(appDBPath, runtime, engine)` convenience constructor should survive once a real current-app preset factory exists.

### What should be done in the future
- Add the backend current-app preset factory that owns Cozo runtime creation, hints-engine startup, and cleanup.
- Then move to the frontend preset-driven package API.

### Code review instructions
- Start with `backend/pkg/notebook/module.go` and `backend/pkg/notebook/config.go`.
- Then inspect `backend/pkg/notebook/http.go` and `backend/pkg/notebook/websocket.go` to confirm the new configurable path mount variants.
- Finally inspect `backend/main.go` and the new custom-path tests in `backend/pkg/notebook/http_test.go` and `backend/pkg/notebook/websocket_test.go`.
- Validate with:
  - `cd backend && go test ./...`

### Technical details
- New backend package concepts:
  ```go
  type BasePaths struct {
      Notebooks     string
      NotebookCells string
      ResetKernel   string
      HintsWS       string
  }

  type Module struct {
      Service   *Service
      AI        AIEngine
      BasePaths BasePaths
  }
  ```
- Default current-app paths still remain:
  - `/api/notebooks`
  - `/api/notebook-cells`
  - `/api/runtime/reset-kernel`
  - `/ws/hints`

## Step 3: Add the backend current-app preset factory

With the module wrapper in place, I moved the current app’s backend assembly into the notebook package itself. The new current-app preset opens the Cozo runtime, performs the existing warmup query, conditionally creates the hints engine, and returns a notebook module that owns the runtime cleanup path.

That means `backend/main.go` is no longer responsible for constructing the notebook runtime stack directly. It now acts much more like a real host preset entrypoint: parse flags, ask for the current Cozo notebook preset, mount generic query/schema routes, and delegate notebook-specific assembly to the notebook package.

### Prompt Context

**User prompt (verbatim):** (see Step 2)

**Assistant interpretation:** Continue landing the packaging backlog in coherent slices and keep the ticket diary aligned with the actual commits.

**Inferred user intent:** Replace the remaining app-specific backend composition with package-owned preset logic so the current app becomes an explicit preset rather than a privileged special case.

**Commit (code):** a9a362c — "backend: add current cozo notebook preset"

### What I did
- Added `backend/pkg/notebook/current_cozo.go` with:
  - `CurrentCozoModuleConfig`
  - `OpenCurrentCozoModule`
- Added runtime ownership cleanup support to `backend/pkg/notebook/module.go` so a module can close resources it created itself.
- Added `Service.Runtime()` in `backend/pkg/notebook/service.go` so the host can still mount the generic query/schema API against the preset-owned runtime.
- Expanded the notebook runtime interface in `backend/pkg/notebook/runtime.go` to include `ListRelations` and `DescribeRelation`, because the host still exposes the generic Cozo schema/query API.
- Changed `backend/pkg/api/handlers.go` so the generic API server depends on a small runtime interface instead of a concrete `*cozo.Manager`.
- Rewired `backend/main.go` to use `notebook.OpenCurrentCozoModule(...)`.
- Added `backend/pkg/notebook/current_cozo_test.go` to verify that the preset honors custom base paths.
- Ran:
  - `cd backend && gofmt -w main.go pkg/api/handlers.go pkg/notebook/current_cozo.go pkg/notebook/current_cozo_test.go pkg/notebook/module.go pkg/notebook/runtime.go pkg/notebook/service.go`
  - `cd backend && go test ./...`

### Why
- The design doc explicitly called for the current app to become preset `#1`, not just a caller that happens to use reusable internals.
- Until runtime and AI startup moved behind a current-app preset function, `main.go` still owned too much notebook-specific composition.

### What worked
- The module wrapper from Step 2 made the preset extraction mostly an ownership change instead of another structural rewrite.
- Moving `api.Server` to a small runtime interface reduced one more concrete dependency in the host layer.
- The backend test suite stayed green after the preset move.

### What didn't work
- The first version of the preset wiring failed to compile because `api.Server` still expected a concrete Cozo manager, while `Service.Runtime()` exposed the notebook runtime interface.
- Command:
  - `cd backend && go test ./...`
- Error:
  - `./main.go:41:30: cannot use notebookModule.Service.Runtime() (value of interface type notebook.Runtime) as "github.com/wesen/cozodb-editor/backend/pkg/api".Runtime value in struct literal: notebook.Runtime does not implement "github.com/wesen/cozodb-editor/backend/pkg/api".Runtime (missing method DescribeRelation)`
- Fix:
  - widened `backend/pkg/notebook/runtime.go` to include `ListRelations` and `DescribeRelation`
  - changed `backend/pkg/api/handlers.go` to depend on an interface instead of `*cozo.Manager`

### What I learned
- Preset extraction works best after the low-level module API is already stable. Doing both at once would have mixed too many concerns into one commit.
- The generic query/schema API is an important reminder that “host code” still has its own runtime needs even after notebook-specific composition moves into the notebook package.

### What was tricky to build
- The subtle part was deciding who owns runtime cleanup once the preset creates the runtime internally. The fix was to let `Module` carry optional additional closers so resource ownership can move with the constructor that created the resource.
- That keeps the lower-level `OpenModule(appDBPath, runtime, engine)` convenience constructor valid for externally-owned runtimes while still letting the current-app preset own runtime lifecycle when it creates the runtime itself.

### What warrants a second pair of eyes
- Review whether the current-app preset should eventually return richer metadata about runtime/AI availability instead of relying on logs only.
- Review whether the generic query/schema API should eventually also move behind a preset-oriented composition helper, even if it does not belong inside the notebook module itself.

### What should be done in the future
- Move to the frontend package API next.
- Specifically, inject notebook HTTP transport through the store/thunk layer and lift the current socket/theme/shell defaults into an explicit frontend preset.

### Code review instructions
- Start with `backend/pkg/notebook/current_cozo.go`.
- Then inspect `backend/pkg/notebook/module.go`, `backend/pkg/notebook/runtime.go`, and `backend/pkg/notebook/service.go` to understand runtime ownership and exposure.
- Finally inspect `backend/main.go`, `backend/pkg/api/handlers.go`, and `backend/pkg/notebook/current_cozo_test.go`.
- Validate with:
  - `cd backend && go test ./...`

### Technical details
- The preset currently owns:
  - Cozo runtime construction
  - Cozo warmup query
  - optional hints-engine construction
  - runtime cleanup registration on module close
- The host `main.go` now delegates notebook composition through:
  ```go
  notebook.OpenCurrentCozoModule(notebook.CurrentCozoModuleConfig{
      Engine:    *engine,
      DBPath:    *dbPath,
      AppDBPath: *appDBPath,
      EnableAI:  os.Getenv("ANTHROPIC_API_KEY") != "",
      Logf:      log.Printf,
  })
  ```

## Step 4: Inject the frontend notebook transport through store services

The first frontend packaging slice removed direct HTTP knowledge from the notebook thunks. I changed the Redux store to own service injection, added a typed notebook transport interface around the HTTP client, and rewired the notebook thunks to read that transport through thunk extra arguments rather than importing REST functions directly.

This is the point where the frontend package API stops being “React files that happen to work together” and starts becoming a hostable module. Once the store owns transport injection, preset code can choose route prefixes and transport implementations without rewriting notebook state logic.

### Prompt Context

**User prompt (verbatim):** (see Step 2)

**Assistant interpretation:** Continue implementing the packaging backlog in small validated frontend slices and capture the exact failures and fixes in the diary.

**Inferred user intent:** Make the frontend notebook package genuinely reusable by moving environment-specific route and HTTP assumptions out of the Redux domain layer.

**Commit (code):** 3b69ec1 — "frontend: inject notebook transport through store services"

### What I did
- Added `NotebookTransport` and `createHTTPNotebookTransport` in `frontend/src/transport/httpClient.ts`.
- Kept the existing exported REST helpers as wrappers over a default transport so the refactor could stay incremental while the package surface settled.
- Changed `frontend/src/app/store.ts` to accept `AppServices` and install them as thunk `extraArgument`.
- Rewired the notebook thunks in `frontend/src/notebook/state/notebookSlice.ts` to use `notebookTransport` from thunk services.
- Updated the affected tests in:
  - `frontend/src/notebook/state/notebookSlice.test.ts`
  - `frontend/src/notebook/NotebookCellCard.test.tsx`
- Ran:
  - `cd frontend && npm test`
  - `cd frontend && npm run lint`
  - `cd frontend && npx tsc --noEmit`
  - `cd frontend && npm run build`

### Why
- The design guide called for explicit transport injection points on the frontend package surface.
- Without this change, the current app and any future JavaScript-oriented preset would still be forced to share one hard-coded `/api/...` assumption buried inside domain thunks.

### What worked
- The transport refactor fit naturally into Redux thunk `extraArgument`, so the notebook slice did not need any structural redesign.
- The HTTP client already had a clean enough grouping of notebook methods that turning it into a transport object was straightforward.
- Lint, typecheck, tests, and build all passed after the mocks were adjusted.

### What didn't work
- The first test run failed because `frontend/src/app/store.ts` now imports `createHTTPNotebookTransport`, but the existing Vitest mocks for `../transport/httpClient` did not provide that export.
- Command:
  - `cd frontend && npm test`
- Error:
  - `No "createHTTPNotebookTransport" export is defined on the ".../transport/httpClient" mock`
- Fix:
  - added `createHTTPNotebookTransport: vi.fn(() => ({ ... }))` to the transport mocks in both `notebookSlice.test.ts` and `NotebookCellCard.test.tsx`
  - switched those tests to create stores with explicit injected `notebookTransport` services

### What I learned
- The Redux store is the right ownership point for notebook transport configuration. It is close enough to the domain to be ergonomic and high enough to be host-controlled.
- Small mock changes were enough to preserve test isolation, which is a good sign that the new package boundary is coherent.

### What was tricky to build
- The subtle part was avoiding a half-finished boundary where the store accepted services but the notebook slice still imported HTTP functions directly. That would have created two transport paths and confused later preset work.
- The solution was to do the whole dependency inversion in one slice: transport type, store service injection, thunk rewiring, and test updates together.

### What warrants a second pair of eyes
- Review whether the package should eventually stop exporting the legacy top-level REST helper functions from `httpClient.ts` now that `NotebookTransport` exists.
- Review whether the store service object should later gain a hints-channel or docs-profile dependency, or whether those should stay outside Redux.

### What should be done in the future
- Add the frontend current-app preset on top of this transport seam.
- Move theme/shell and SEM-registration defaults behind explicit preset wiring.

### Code review instructions
- Start with `frontend/src/transport/httpClient.ts` and `frontend/src/app/store.ts`.
- Then inspect `frontend/src/notebook/state/notebookSlice.ts`.
- Finally read the test updates in `frontend/src/notebook/state/notebookSlice.test.ts` and `frontend/src/notebook/NotebookCellCard.test.tsx`.
- Validate with:
  - `cd frontend && npm test`
  - `cd frontend && npm run lint`
  - `cd frontend && npx tsc --noEmit`
  - `cd frontend && npm run build`

### Technical details
- The new frontend seam is:
  ```ts
  export interface AppServices {
    notebookTransport: NotebookTransport;
  }
  ```
- The store now installs services through thunk middleware:
  ```ts
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    thunk: {
      extraArgument: resolvedServices,
    },
  })
  ```

## Step 5: Add the frontend package entrypoint and current Cozo preset

With the transport seam in place, I extracted the frontend’s real package surface. The notebook module now exports a package-level `NotebookApp`, the current app is represented explicitly as `CurrentCozoNotebookApp`, shell labels are configurable, and Cozo-specific SEM registration is no longer hard-coded inside the page controller.

This is the first point where the current app is visibly “just a preset.” The live app bootstrap now renders the current preset, while lower-level package consumers can render `NotebookApp` directly with their own store, socket, shell labels, and SEM-handler registration strategy.

### Prompt Context

**User prompt (verbatim):** (see Step 2)

**Assistant interpretation:** Continue the packaging implementation by turning the current frontend app into an explicit preset and package API.

**Inferred user intent:** Make the current frontend a concrete example host on top of a reusable notebook package rather than the hidden center of the system.

**Commit (code):** 073ba4e — "frontend: add notebook app and current cozo preset"

### What I did
- Added `frontend/src/notebook/NotebookApp.tsx` as the package-level React entrypoint that owns the Redux `Provider` boundary.
- Added shell configuration in `frontend/src/notebook/config.ts`.
- Added `frontend/src/notebook/registerCurrentCozoSemHandlers.ts` so Cozo-specific SEM wiring lives outside the generic controller.
- Added `frontend/src/notebook/currentCozo.tsx` and `frontend/src/notebook/currentCozoConfig.ts`:
  - current Cozo store factory
  - current Cozo preset wrapper
  - theme CSS ownership for the current app preset
- Added `frontend/src/notebook/index.ts` exports for the package surface.
- Updated:
  - `frontend/src/notebook/NotebookPageView.tsx` to accept shell configuration
  - `frontend/src/notebook/useNotebookPageController.ts` to accept injected SEM registration
  - `frontend/src/notebook/NotebookPage.tsx` to accept shell and SEM config from callers
  - `frontend/src/App.tsx` and `frontend/src/main.tsx` so the live app now boots through `CurrentCozoNotebookApp`
- Added `frontend/src/notebook/CurrentCozoNotebookApp.stories.tsx` to exercise the preset wrapper directly.
- Ran:
  - `cd frontend && npm test`
  - `cd frontend && npm run lint`
  - `cd frontend && npx tsc --noEmit`
  - `cd frontend && npm run build`
  - `cd frontend && npm run build-storybook`

### Why
- The design doc called for a real frontend package API and a real current-app preset, not only a nicer internal folder structure.
- Preset work needed three explicit host seams:
  - transport/store ownership
  - shell/theme ownership
  - language-specific SEM registration ownership

### What worked
- The existing page/view/controller split made the preset extraction clean.
- The current app could adopt the new preset wrapper with a very small `App.tsx` and `main.tsx`.
- Storybook built successfully with the new preset story, so the current-app wrapper is now directly testable outside the live app bootstrap.

### What didn't work
- ESLint rejected the first version of `frontend/src/notebook/currentCozo.tsx` because the file exported both React components and non-component helpers.
- Command:
  - `cd frontend && npm run lint`
- Error:
  - `Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components`
- Fix:
  - moved the current Cozo shell config and store factory into `frontend/src/notebook/currentCozoConfig.ts`
  - left `currentCozo.tsx` as the component-oriented preset entrypoint

### What I learned
- The preset model works well on the frontend when “theme” is treated as ownership of both CSS imports and shell defaults, not only colors.
- Pulling Cozo-specific SEM registration out of the controller was the important move for future JavaScript preset work, even more than the visual preset wrapper itself.

### What was tricky to build
- The trickiest part was introducing a preset wrapper without making the low-level package surface dependent on browser-only hooks. `CurrentCozoNotebookApp` needs a live WebSocket in the real app but stories need an injected static socket.
- I solved that by giving the current preset a `ws` override path: if a caller provides a socket, the preset uses it directly; otherwise it creates the live socket through `useHintsSocket`.

### What warrants a second pair of eyes
- Review whether `NotebookApp` should eventually accept a richer preset object instead of separate `store`, `ws`, `shellConfig`, and `registerSemHandlers` props.
- Review whether the current shell config should eventually also own iconography or theme class names, not only labels and shortcut hints.

### What should be done in the future
- Add direct package-level smoke coverage around the new package surface.
- Continue separating notebook-domain concepts from Cozo-specific concepts on both backend and frontend.

### Code review instructions
- Start with `frontend/src/notebook/NotebookApp.tsx`, `frontend/src/notebook/currentCozo.tsx`, and `frontend/src/notebook/currentCozoConfig.ts`.
- Then inspect `frontend/src/notebook/useNotebookPageController.ts`, `frontend/src/notebook/NotebookPage.tsx`, and `frontend/src/notebook/NotebookPageView.tsx`.
- Finally inspect the live app bootstrap in `frontend/src/App.tsx` and `frontend/src/main.tsx`, plus the preset story in `frontend/src/notebook/CurrentCozoNotebookApp.stories.tsx`.
- Validate with:
  - `cd frontend && npm test`
  - `cd frontend && npm run lint`
  - `cd frontend && npx tsc --noEmit`
  - `cd frontend && npm run build`
  - `cd frontend && npm run build-storybook`

### Technical details
- The preset-owned theme path now lives in:
  - `frontend/src/index.css`
  - `frontend/src/components/primitives/primitives.css`
  - `frontend/src/theme/cards.css`
  - `frontend/src/theme/layout.css`
  - `frontend/src/theme/tokens.css`
  - `frontend/src/notebook/notebook.css`
- The package-level app entrypoint is:
  ```tsx
  export function NotebookApp({
    confirmAction,
    registerSemHandlers,
    shellConfig,
    store,
    ws,
  }: NotebookAppProps) {
    return (
      <Provider store={store}>
        <NotebookPageContainer
          confirmAction={confirmAction}
          registerSemHandlers={registerSemHandlers}
          shellConfig={shellConfig}
          ws={ws}
        />
      </Provider>
    );
  }
  ```

## Step 6: Add notebook package smoke coverage and API-base tests

After the main frontend refactor was in place, I added direct coverage around the public package surface instead of only around the internal implementation details. The new Storybook story mounts `NotebookApp` inside an outer host shell, and the new transport tests verify that API-base configuration really prefixes notebook requests as intended.

This step matters because it exercises the “reusable package” claim directly. The current app preset is no longer the only proof that the code works. There is now a generic embedding story and a direct test for route-prefix configuration, both of which will matter again when the JavaScript preset is introduced.

### Prompt Context

**User prompt (verbatim):** (see Step 2)

**Assistant interpretation:** Keep moving through the packaging backlog and add validation that proves the new notebook package surface is actually reusable.

**Inferred user intent:** Avoid stopping at architectural cleanup alone; make the new package seams observable and trustworthy through concrete examples and tests.

**Commit (code):** 9f657e1 — "frontend: add notebook package smoke coverage"

### What I did
- Added `frontend/src/notebook/NotebookApp.stories.tsx`:
  - mounts `NotebookApp` directly
  - wraps it in a surrounding host shell
  - uses MSW notebook handlers and a static hints socket
- Added `frontend/src/transport/httpClient.test.ts` to verify `createHTTPNotebookTransport({ apiBase })` prefixes notebook requests correctly.
- Ran:
  - `cd frontend && npm test`
  - `cd frontend && npm run lint`
  - `cd frontend && npx tsc --noEmit`
  - `cd frontend && npm run build`
  - `cd frontend && npm run build-storybook`

### Why
- The ticket backlog explicitly called for package-level smoke examples for embedding the notebook in another host.
- API-base configuration is only useful if it is tested directly instead of being left implicit inside the preset factory.

### What worked
- The embedded Storybook story fit naturally on top of the new `NotebookApp` package boundary.
- The new transport test increased Vitest coverage from 30 to 32 tests without introducing brittle setup.
- All frontend validation remained green after the additional story and tests.

### What didn't work
- N/A

### What I learned
- The right smoke example for this package is not a second app fork. It is a host shell that mounts `NotebookApp` with explicit injected dependencies.
- The API-base route test is small but strategically important because it protects the exact seam preset work depends on.

### What was tricky to build
- The main subtlety was making the embedded host example prove something meaningful instead of just wrapping the current preset in another component. That would not have tested the generic package surface.
- The solution was to mount `NotebookApp` directly with:
  - an injected store
  - an injected static socket
  - injected Cozo SEM registration
  - custom shell labels

### What warrants a second pair of eyes
- Review whether the package-level smoke story should later gain one variant with a non-empty `apiBase` once the Storybook MSW handlers are generalized for prefixed routes.
- Review whether additional transport tests should cover notebook mutation endpoints beyond bootstrap and run.

### What should be done in the future
- Finish the remaining domain-separation task between notebook-generic and Cozo-specific contracts.
- Then move into the JavaScript preset design tasks on both backend and frontend.

### Code review instructions
- Start with `frontend/src/notebook/NotebookApp.stories.tsx`.
- Then inspect `frontend/src/transport/httpClient.test.ts`.
- Validate with:
  - `cd frontend && npm test`
  - `cd frontend && npm run lint`
  - `cd frontend && npx tsc --noEmit`
  - `cd frontend && npm run build`
  - `cd frontend && npm run build-storybook`

### Technical details
- The embedded host story renders a two-column outer shell and mounts:
  ```tsx
  <NotebookApp
    confirmAction={() => true}
    registerSemHandlers={registerCurrentCozoSemHandlers}
    shellConfig={{
      appName: "Embedded Notebook",
      menuItems: ["Host", "Notebook", "Help"],
    }}
    store={store}
    ws={createStaticHintsSocket(true)}
  />
  ```
- The new transport tests assert calls like:
  - `"/cozo/api/notebooks/bootstrap"`
  - `"/cozo/api/notebook-cells/cell_1/run"`
