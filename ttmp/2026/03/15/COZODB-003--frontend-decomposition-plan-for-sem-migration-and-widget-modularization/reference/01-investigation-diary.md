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
