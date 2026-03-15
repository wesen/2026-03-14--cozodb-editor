---
Title: Investigation diary
Ticket: COZODB-003
Status: active
Topics:
    - frontend
    - architecture
    - streaming
    - sem
    - rich-widgets
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.ts
      Note: Diary evidence for lightweight projection
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.ts:Evidence for a lightweight projection approach
    - Path: ../../../../../../../corporate-headquarters/pinocchio/cmd/web-chat/web/src/sem/registry.ts
      Note: Diary evidence for the target registry pattern
    - Path: ../../../../../../../corporate-headquarters/pinocchio/cmd/web-chat/web/src/sem/registry.ts:Evidence for the desired browser-side registry pattern
    - Path: backend/pkg/api/types.go:Evidence for the current browser-facing API contracts
    - Path: frontend/package.json:Evidence for current frontend tooling and missing tests
    - Path: frontend/src/DatalogPad.jsx
      Note: Diary evidence for frontend coupling
    - Path: frontend/src/DatalogPad.jsx:Main evidence source for current frontend coupling
ExternalSources: []
Summary: Chronological investigation record for COZODB-003 covering the current frontend architecture, reference-pattern validation, and delivery steps for the decomposition guide.
LastUpdated: 2026-03-15T00:33:32.74447872-04:00
WhatFor: Record how the frontend decomposition guide was derived and what validation/delivery steps were completed.
WhenToUse: Use this diary when reviewing or continuing COZODB-003.
---


# Investigation diary

## Goal

Capture how the frontend decomposition ticket was investigated and delivered, including the evidence used to derive the target module boundaries and the rationale for splitting transport and projection before SEM integration.

## Step 1: Map the current frontend and the target reference patterns

I started by treating the frontend as a decomposition problem rather than a feature problem. The first question was not "how do we add SEM?" It was "what runtime responsibilities already exist inside the browser, and where are they currently mixed together?" That required reading both the local app and the reference browser-side modules that already implement explicit event and projection layers.

The local evidence was straightforward: the frontend has almost no file surface area, but one file owns nearly everything important. The reference evidence was also clear: pinocchio and temporal-relationships both separate transport, projection, and rendering much more cleanly. That contrast became the backbone of the ticket.

### Prompt Context

**User prompt (verbatim):** "Ok, create a new ticket where you analyze how to decompose the TSX/JSX side to be clean and modular and prepare for the migrations. Create a detailed analysis / design / implementation guide that is very detailed for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file
  references.
  It should be very clear and detailed. Store in the ticket and the nupload to remarkable.

Also add a granular and detailed list of tasks to the ticket."

**Assistant interpretation:** Create a new frontend-focused ticket, deeply review the current JSX architecture, explain the system to an intern, propose a clean decomposition plan for later streaming migration work, and deliver the result as a ticket bundle plus reMarkable upload.

**Inferred user intent:** Reduce future migration risk by understanding and modularizing the frontend before more event, widget, and extraction complexity is added.

### What I did
- Created ticket `COZODB-003`.
- Added a primary design doc and diary document.
- Read the current frontend entrypoints:
  - `frontend/src/main.jsx`
  - `frontend/src/App.jsx`
  - `frontend/src/DatalogPad.jsx`
  - `frontend/src/index.css`
  - `frontend/package.json`
  - `frontend/vite.config.js`
- Read the current backend files that define the browser-facing boundary:
  - `backend/pkg/api/types.go`
  - `backend/pkg/api/handlers.go`
  - `backend/pkg/api/websocket.go`
- Read reference browser architecture material:
  - `pinocchio/pkg/doc/tutorials/05-building-standalone-webchat-ui.md`
  - `pinocchio/cmd/web-chat/web/src/sem/registry.ts`
  - `temporal-relationships/ui/src/ws/semProjection.ts`
  - `temporal-relationships/ui/src/ws/semProjection.test.ts`

### Why
- The decomposition guide needed to explain both the current system and the target architectural direction.
- The local frontend alone would show the problem, but not the best shape of the solution.
- The reference repos already contain patterns proven useful for streaming/projection work.

### What worked
- The current architecture was easy to map because the frontend is concentrated into a tiny number of files.
- The reference docs and code aligned well: pinocchio provides the layered architecture story, and temporal-relationships provides a lighter projection implementation closer to this app’s scale.
- The resulting recommendation stayed narrow and practical: split transport, then editor state, then projection, then feature renderers.

### What didn't work
- There is still no frontend test stack in the current package, so decomposition recommendations cannot point to existing local tests.
- The current styling model is so inline-heavy that clean extraction and style cleanup are tightly related, even though the ticket should avoid turning into a visual redesign.

### What I learned
- This frontend does not need a large rewrite to become more maintainable. It needs a better set of seams.
- The most important missing seam is the projection layer between transport and rendering.
- `temporal-relationships/ui/src/ws/semProjection.ts` is a better local model for this app than adopting the full pinocchio webchat shell.

### What was tricky to build
- The main challenge was to keep the guide useful for an intern without over-prescribing infrastructure the app does not yet need. For example, it would have been easy to suggest Redux just because pinocchio uses it, but the local evidence does not justify that as the first decomposition step.
- Another tricky point was separating "future SEM architecture" from "preparation work". The guide had to stay focused on preparation, not silently turn into the COZODB-002 implementation plan.

### What warrants a second pair of eyes
- The exact boundary between a plain projection module and a future reducer/store solution should be re-evaluated once the first extraction PR is done.
- The decision to stay in JS/JSX for the decomposition phase is pragmatic, but someone on the team may want to revisit TS/TSX immediately after the split.

### What should be done in the future
- Use this ticket as the planning artifact for the actual decomposition PRs.
- Once phase 1 or 2 lands, update the ticket with implementation notes and re-upload a refreshed bundle.

### Code review instructions
- Start with the design doc.
- Then verify the current-state claims in:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/package.json`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/types.go`
- Verify the proposed target patterns in:
  - `/home/manuel/code/wesen/corporate-headquarters/pinocchio/cmd/web-chat/web/src/sem/registry.ts`
  - `/home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.ts`

### Technical details
- Local frontend line counts captured during investigation:
  - `App.jsx`: 7
  - `main.jsx`: 10
  - `DatalogPad.jsx`: 1039
  - `index.css`: 10
- Current frontend package has no test runner configured.
- Current backend proxy shape is `/api` plus `/ws`.

## Related

- Primary guide: `../design-doc/01-frontend-decomposition-architecture-review-and-intern-implementation-guide.md`

## Step 2: Validate the ticket and deliver the bundle

Once the design doc, index, task list, and diary existed, I switched from architecture analysis to ticket hygiene and delivery. The aim of this step was to make sure the workspace would pass `docmgr doctor`, then bundle exactly the right documents and upload them to reMarkable so the ticket was usable outside the repository.

The main correction needed here was metadata hygiene rather than content: the new topic slugs had to be added to vocabulary, and the index frontmatter needed proper `Path` plus `Note` related-file records instead of shorthand inline strings. After that, validation and delivery were straightforward.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Finish the ticket as a stored and delivered artifact, not just a local markdown draft.

**Inferred user intent:** Have a reusable frontend decomposition guide in the ticket workspace and already available on reMarkable for reading and planning.

### What I did
- Added new topic vocabulary entries:
  - `architecture`
  - `sem`
- Normalized the index frontmatter related-file records.
- Ran `docmgr doctor --ticket COZODB-003 --stale-after 30`.
- Ran:
  - `remarquee status`
  - `remarquee cloud account --non-interactive`
  - `remarquee upload bundle --dry-run ... --name "COZODB-003 Frontend Decomposition Guide" --remote-dir "/ai/2026/03/15/COZODB-003" --toc-depth 2`
  - `remarquee upload bundle ... --name "COZODB-003 Frontend Decomposition Guide" --remote-dir "/ai/2026/03/15/COZODB-003" --toc-depth 2`
  - `remarquee cloud ls /ai/2026/03/15/COZODB-003 --long --non-interactive`

### Why
- The user explicitly asked to store the work in the ticket and upload it to reMarkable.
- A validated ticket workspace is easier to continue later and less likely to rot.

### What worked
- `docmgr doctor` passed cleanly after metadata fixes.
- `remarquee status` returned `remarquee: ok`.
- `remarquee cloud account --non-interactive` returned `user=wesen@ruinwesen.com sync_version=1.5`.
- Dry-run bundle generation succeeded.
- Real upload succeeded:
  - `OK: uploaded COZODB-003 Frontend Decomposition Guide.pdf -> /ai/2026/03/15/COZODB-003`
- Remote listing verification succeeded:
  - `[f]	COZODB-003 Frontend Decomposition Guide`

### What didn't work
- The first remote listing ran before the upload finished and failed with:
  - `Error: entry '15' doesnt exist`
- `docmgr doctor` initially warned about unknown topic slugs and malformed index frontmatter related-file records.

### What I learned
- The ticket content itself was fine on first pass; the only blockers were metadata hygiene details.
- Upload verification should be sequenced after upload completion, not in parallel, if you want to avoid a false-negative listing error.

### What was tricky to build
- The tricky part was not the upload command. It was making the ticket comply with `docmgr` conventions after manually editing frontmatter. The tool is strict in useful ways, and the strictness catches sloppy metadata early.

### What warrants a second pair of eyes
- The guide intentionally recommends JS-first decomposition rather than an immediate TSX migration. If the team has a strong appetite for TypeScript-first work, that tradeoff should be explicitly reviewed.

### What should be done in the future
- Update this ticket as implementation begins, especially once phase 1 transport extraction lands.
- Re-upload a revised bundle after the first decomposition PR so the planning doc and actual code state stay aligned.

### Code review instructions
- Validate the ticket:
  - `docmgr doctor --ticket COZODB-003 --stale-after 30`
- Validate the remote upload:
  - `remarquee cloud ls /ai/2026/03/15/COZODB-003 --long --non-interactive`
- Review the bundle in this order:
  - `../index.md`
  - `../design-doc/01-frontend-decomposition-architecture-review-and-intern-implementation-guide.md`
  - `../tasks.md`
  - `./01-investigation-diary.md`

### Technical details
- Bundle name: `COZODB-003 Frontend Decomposition Guide`
- Remote directory: `/ai/2026/03/15/COZODB-003`
- Included docs:
  - `index.md`
  - primary design doc
  - investigation diary
  - `tasks.md`
  - `changelog.md`

## Step 3: Land the first implementation slice by extracting the transport boundary

After the planning ticket existed, the work changed from analysis to execution. The immediate goal was not to split everything at once. It was to create the first clean architectural seam with minimal behavior change so later editor and SEM work would have somewhere sensible to attach. That meant starting with transport, because the existing browser component was still mixing fetch logic, websocket lifecycle, event parsing, and UI orchestration in one file.

This step intentionally stayed narrow. I created the target frontend folders, documented their intended ownership, moved HTTP request code into a transport module, moved websocket lifecycle logic into a socket hook, upgraded websocket subscriptions from one handler per event to multi-subscriber fan-out, and kept `DatalogPad.jsx` functioning as the orchestration screen while it consumed the new modules. I also cleaned up the transport-related lint debt exposed by the extraction so the first commit would be stable.

### Prompt Context

**User prompt (verbatim):** "go ahead and do it, task by task, commit at appropriate intervals and keep a detailed diary"

**Assistant interpretation:** Start implementing the decomposition plan in the repository, execute the task list incrementally, create meaningful commit boundaries, and document each phase in detail.

**Inferred user intent:** Turn COZODB-003 from a research ticket into an implementation ticket while preserving a clear record of what changed and why.

### What I did
- Created the planned frontend directories:
  - `frontend/src/app`
  - `frontend/src/editor`
  - `frontend/src/transport`
  - `frontend/src/sem`
  - `frontend/src/features`
  - `frontend/src/theme`
- Added ownership notes to each new folder with local `README.md` files so future extraction work has explicit placement rules.
- Added `frontend/src/transport/httpClient.js` with:
  - `executeQuery(script, params = {})`
  - `fetchSchema()`
- Added `frontend/src/transport/hintsSocket.js` with:
  - websocket URL derivation from `window.location.protocol`
  - reconnect behavior
  - SEM envelope parsing
  - malformed payload warnings
  - multi-subscriber `on()` handling
  - wildcard `onAny()` support
- Removed in-file transport code from `frontend/src/DatalogPad.jsx` and rewired it to import `executeQuery` and `useHintsSocket`.
- Changed the websocket cleanup in `DatalogPad.jsx` from map mutation through `off(type)` to unsubscribe closures returned by `ws.on(...)`.
- Removed dead code encountered during the extraction and replaced ANSI escape stripping with a small parser function so lint would pass without suppressions.

### Why
- Transport was the cleanest first seam because it isolates network concerns without forcing immediate UI redesign.
- Multi-subscriber websocket handling is necessary before SEM projection or richer widgets can coexist with existing listeners.
- Folder ownership notes reduce the chance that future extraction work drifts back into the monolith simply because the destination is ambiguous.

### What worked
- The transport extraction landed without changing the visible runtime contract of the screen.
- `DatalogPad.jsx` now depends on a stable transport boundary instead of owning socket and fetch concerns directly.
- The new socket module already supports a more projection-oriented future because multiple consumers can subscribe to the same event type safely.
- Validation succeeded after the final ANSI stripping cleanup:
  - `npm run lint`
  - `npm run build`

### What didn't work
- The first ANSI escape cleanup attempt still triggered ESLint's `no-control-regex` rule, even when moved into a `RegExp` constructor. The practical fix was to stop encoding the control character in a regex literal or regex-string pattern and replace it with a small parser.
- The lint/build checks were not the hard part. The harder part was making sure the first slice stayed narrow enough that it was still a transport extraction rather than a half-complete general refactor.

### What I learned
- Even a small extraction immediately improves the shape of later work. Once transport moved out, the remaining responsibilities inside `DatalogPad.jsx` became easier to see as separate editor, feature-rendering, and projection problems.
- The old websocket hook design was more restrictive than it first looked because "one handler per type" silently blocks layering. That would have become a serious problem once both a projection layer and feature-specific behavior needed the same stream.

### What was tricky to build
- The tricky design constraint was preserving current behavior while also improving the architecture enough to matter. For example, it would have been easy to over-generalize the socket client or to start introducing SEM projection immediately, but that would have made the first commit harder to validate and review.
- Another subtle issue was lint hygiene. Small quality issues inside the monolith become more visible once code is moved, and it is better to fix them while the relevant area is open than to preserve avoidable debt for later phases.

### What warrants a second pair of eyes
- The current `hintsSocket` API is intentionally lightweight. Before the SEM projection phase lands, it is worth checking whether the wildcard subscriber contract should stay as `(event, envelope)` or whether a small normalized event shape would make downstream code clearer.
- The `fetchSchema()` helper is included because the near-term decomposition guide called for it, but it is not wired into the screen yet. That is fine, though it should be justified or removed if it remains unused for too long.

### What should be done in the future
- Next, extract editor state and line rendering into `editor/` modules without changing behavior.
- After that, introduce the SEM projection layer so streaming events stop writing directly into render-specific state structures.
- Re-run lint/build after each extraction phase and keep the diary synchronized with each commit boundary.

### Code review instructions
- Review the transport seam in:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/transport/httpClient.js`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/transport/hintsSocket.js`
- Then verify the monolith no longer owns transport details directly in:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx`
- Validate the frontend checks:
  - `cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend && npm run lint`
  - `cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend && npm run build`

### Technical details
- Commands run during this step:
  - `git status --short`
  - `npm run build`
  - `npm run lint`
  - `sed -n '1,220p' frontend/src/transport/hintsSocket.js`
  - `sed -n '520,570p' frontend/src/DatalogPad.jsx`
  - `git diff -- frontend/src/DatalogPad.jsx frontend/src/transport/httpClient.js frontend/src/transport/hintsSocket.js ...`
- New files created:
  - `frontend/src/app/README.md`
  - `frontend/src/editor/README.md`
  - `frontend/src/features/README.md`
  - `frontend/src/sem/README.md`
  - `frontend/src/theme/README.md`
  - `frontend/src/transport/README.md`
  - `frontend/src/transport/httpClient.js`
  - `frontend/src/transport/hintsSocket.js`
- Existing files updated:
  - `frontend/src/DatalogPad.jsx`
  - `ttmp/2026/03/15/COZODB-003--frontend-decomposition-plan-for-sem-migration-and-widget-modularization/tasks.md`
  - `ttmp/2026/03/15/COZODB-003--frontend-decomposition-plan-for-sem-migration-and-widget-modularization/changelog.md`
- Commit created:
  - `c4fd50d frontend(ticket): add COZODB-003 and extract transport seam`

## Step 4: Extract editor state and line rendering behind an editor boundary

With the transport layer separated, the next bottleneck was the editor itself. `DatalogPad.jsx` still owned line-state mutation, cursor movement, question-trigger parsing, imperative focus management, and the full line-rendering tree. That is the exact cluster that becomes painful once SEM widgets or richer per-line interactions arrive, because transport may be modular while the view logic remains tightly coupled to raw state updates. The right next move was therefore to create an editor-domain seam without changing the observable editing behavior.

I split this into one pure helper module, one stateful hook, and one presentational component. The pure helper module handles line-array mutations. The hook owns document state plus question-trigger behavior. The component renders the line list, active input, and after-line attachments while the parent screen passes feature-specific blocks as render props or children. That kept the extraction narrow and let the current `AIBlock` rendering survive unchanged while moving the editor mechanics out of the monolith.

### Prompt Context

**User prompt (verbatim):** "go ahead and do it, task by task, commit at appropriate intervals and keep a detailed diary"

**Assistant interpretation:** Continue the decomposition sequentially, preserve reviewable commit slices, and keep documenting each phase.

**Inferred user intent:** Reduce the cost of later SEM/widget work by introducing clean frontend seams before behavior is expanded further.

### What I did
- Added `frontend/src/editor/documentCommands.js` with pure helpers for:
  - updating an existing line
  - inserting one or more lines after the current line
- Added `frontend/src/editor/usePadDocument.js` to own:
  - `lines`
  - `cursorLine`
  - the active input ref
  - the editor container ref
  - focus restoration
  - enter-to-append behavior
  - `#??` question extraction
  - chip/example/code insertion helpers
- Added `frontend/src/editor/PadEditor.jsx` to render:
  - the empty/onboarding editor state
  - line numbers
  - active-line input
  - non-active line display
  - per-line attached content through `renderAfterLine`
  - document-level trailing content through `children`
- Rewired `frontend/src/DatalogPad.jsx` to use `usePadDocument()` instead of directly owning line and cursor state.
- Replaced the old inline line-list render tree in `DatalogPad.jsx` with a `PadEditor` instance.
- Preserved the existing behavior for:
  - pressing Enter on a `#??` line
  - clicking example prompts
  - inserting code from AI responses
  - clicking lines to move the cursor
  - showing mock fallback AI blocks below matching lines

### Why
- The editor layer was the second major responsibility cluster inside `DatalogPad.jsx`, after transport.
- Pulling document mutations into an editor module makes later projection and widget work substantially less risky because the screen becomes more orchestration-oriented and less state-mechanical.
- Pure line-array helpers are easier to test later than anonymous inline mutations spread across one large component.

### What worked
- The current editing flow still works with the new boundary in place.
- The new `PadEditor` component is generic enough to host current AI blocks and future SEM-linked renderers without baking those concerns into the editor layer.
- The hook API kept the `#??` trigger behavior intact by treating question dispatch as a callback instead of hardcoding hint logic into the editor module.
- Validation succeeded after removing one orphaned helper from the old monolith:
  - `npm run lint`
  - `npm run build`

### What didn't work
- The first post-extraction lint pass still found an orphaned `focusTextarea` helper that referenced a deleted `textareaRef`. That was easy to fix, but it is another reminder that extraction work should end with a deliberate dead-code pass rather than assuming the compiler will expose everything cleanly.
- The editor boundary is cleaner, but styling is still heavily inline. That is acceptable for this phase, though it means feature extraction will still carry some visual duplication until the later theme pass.

### What I learned
- The `renderAfterLine` plus `children` split is enough for the current screen. It allows the editor to own line mechanics while leaving richer feature rendering in the parent until those features get their own modules.
- Once line state moved into a hook, the remaining logic in `DatalogPad.jsx` became much easier to read as distinct feature areas instead of one continuous file.

### What was tricky to build
- The main tricky part was keeping the editor API minimal while still supporting the current behavior around examples, chips, and code insertion. Too little API surface would have forced the parent component back into direct line manipulation. Too much API surface would have turned the hook into an over-general abstraction prematurely.
- Another subtle point was where to put onboarding. I kept the onboarding markup supplied by the parent through the `emptyState` prop so the editor owns the "empty document shell" behavior without becoming responsible for feature-specific onboarding copy.

### What warrants a second pair of eyes
- The editor hook currently owns both `inputRef` and `editorRef`. If later phases no longer need the container ref, that part of the API can probably be simplified.
- The current helper module only contains two line operations because that is all this phase needed. If projection or widgets start needing document transforms too, it may be worth regrouping those helpers into a more explicit document-model API.

### What should be done in the future
- Next, extract the current feature blocks and result rendering into `features/` modules so `DatalogPad.jsx` becomes a thinner composition shell.
- After that, introduce the SEM projection module and route websocket updates through projected state instead of direct render-state objects.
- Once those layers exist, add frontend tests around the editor helpers and projection logic.

### Code review instructions
- Review the editor-domain modules:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/editor/documentCommands.js`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/editor/usePadDocument.js`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/editor/PadEditor.jsx`
- Then verify the remaining parent responsibilities in:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx`
- Re-run the frontend checks:
  - `cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend && npm run lint`
  - `cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend && npm run build`

### Technical details
- Commands run during this step:
  - `rg -n "const \\[lines|const \\[cursorLine|handleLineChange|handleKeyDown|handleSetQuestion|focusTextarea|setLines|textareaRef|editorRef" frontend/src/DatalogPad.jsx`
  - `sed -n '360,760p' frontend/src/DatalogPad.jsx`
  - `sed -n '760,980p' frontend/src/DatalogPad.jsx`
  - `npm run lint`
  - `npm run build`
  - `git diff -- frontend/src/DatalogPad.jsx frontend/src/editor/documentCommands.js frontend/src/editor/usePadDocument.js frontend/src/editor/PadEditor.jsx`
- New files created:
  - `frontend/src/editor/documentCommands.js`
  - `frontend/src/editor/usePadDocument.js`
  - `frontend/src/editor/PadEditor.jsx`
- Existing files updated:
  - `frontend/src/DatalogPad.jsx`
  - `ttmp/2026/03/15/COZODB-003--frontend-decomposition-plan-for-sem-migration-and-widget-modularization/tasks.md`
  - `ttmp/2026/03/15/COZODB-003--frontend-decomposition-plan-for-sem-migration-and-widget-modularization/changelog.md`
