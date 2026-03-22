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
LastUpdated: 2026-03-22T14:52:53-04:00
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
