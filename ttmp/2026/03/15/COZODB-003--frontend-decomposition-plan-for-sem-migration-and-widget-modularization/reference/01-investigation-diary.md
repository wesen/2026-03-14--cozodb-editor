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
  - `346cc99 frontend(sem): add projection and extract feature cards`

## Step 6: Extract theme tokens, add tests, and finalize the smaller screen shell

After the SEM and feature layers landed, the remaining work was cleanup with real leverage: centralize the visual tokens that were still hardcoded into the screen, add enough automated coverage to make future widget changes safer, and make an explicit decision about the composition root. At this point the architecture was already substantially improved, so this final local implementation phase was about making the new structure durable rather than just possible.

I moved the root design tokens and the most repeated shell/card/table styles into `theme/*.css`, wired those styles into the screen and extracted feature components, added a minimal Vitest setup with jsdom and Testing Library, and wrote tests for the new SEM projection plus one feature card. I also verified that `App.jsx` should remain trivial for now: the real composition root is still `DatalogPad.jsx`, and there is no current need to push extra orchestration into `App.jsx`.

### Prompt Context

**User prompt (verbatim):** "go ahead and do it, task by task, commit at appropriate intervals and keep a detailed diary"

**Assistant interpretation:** Complete the remaining decomposition tasks rather than stopping after the structural refactor.

**Inferred user intent:** Finish the ticket in a way that is both implemented and reviewable, not just partially decomposed.

### What I did
- Added theme files:
  - `frontend/src/theme/tokens.css`
  - `frontend/src/theme/cards.css`
  - `frontend/src/theme/layout.css`
- Imported the theme CSS into `frontend/src/DatalogPad.jsx`.
- Moved the root CSS variables and shell container styling out of inline JSX into `tokens.css`.
- Added reusable classes for:
  - the pad root shell
  - header/status bars
  - AI cards
  - diagnosis cards
  - code panels
  - query-result table shells
- Replaced repeated inline shell/card/table styles with class usage where the duplication was highest-value to remove first.
- Added frontend test dependencies:
  - `vitest`
  - `jsdom`
  - `@testing-library/react`
- Added a `test` script to `frontend/package.json`.
- Added `test.environment = "jsdom"` to `frontend/vite.config.js`.
- Added tests:
  - `frontend/src/sem/semProjection.test.js`
  - `frontend/src/features/hints/HintResponseCard.test.jsx`
- Verified that `frontend/src/App.jsx` should remain a trivial wrapper around `DatalogPad` for now.
- Measured the reduced screen size:
  - `frontend/src/DatalogPad.jsx` is now 441 lines instead of the earlier 1039-line monolith captured during investigation.

### Why
- Theme extraction reduces the chance that future component work reintroduces design-token duplication back into JSX.
- Tests were the biggest remaining quality gap once the architecture was cleaner.
- Leaving `App.jsx` trivial avoids inventing a second orchestration layer without an actual runtime need.

### What worked
- The theme pass did not require a visual redesign to meaningfully improve structure.
- The new tests cover the exact seams introduced by this ticket:
  - event projection
  - card rendering from normalized hint data
- Final local validation passed:
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `docmgr doctor --ticket COZODB-003 --stale-after 30`

### What didn't work
- The first `HintResponseCard` test used a text query that was too broad because the word `create` appears in multiple parts of the rendered card. Tightening the assertion to target the button role fixed that and produced a better test.
- The theme extraction is intentionally partial. Many inline styles remain, but the high-value shared tokens and repeated shells are now centralized, which is enough for this ticket.

### What I learned
- Once responsibilities are separated cleanly, adding tests becomes straightforward because the seams are obvious.
- The right stopping point for theme work is not "no inline styles anywhere". It is "the shared design language and repeated shells are no longer trapped inside one file".
- `DatalogPad.jsx` does not need to become tiny to be acceptable. It needed to stop being the place where every domain concern lived.

### What was tricky to build
- The main tricky part was keeping the theme pass pragmatic. It would have been easy to chase a full CSS migration and turn the ticket into a styling rewrite.
- The test pass required choosing assertions that were specific enough to stay stable without being coupled to incidental implementation details.

### What warrants a second pair of eyes
- The CSS extraction could continue later if the team wants a more tokenized component library, but that would be follow-on cleanup rather than a blocker for SEM/widget migration.
- If the app grows beyond one main screen, the decision to keep `App.jsx` trivial should be revisited.

### What should be done in the future
- Refresh the reMarkable bundle so the ticket documents reflect the final implemented state.
- If more SEM families are added, extend the projection tests before extending the UI.
- Add more focused tests around editor helpers if that area starts changing frequently.

### Code review instructions
- Review the theme files:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/theme/tokens.css`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/theme/cards.css`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/theme/layout.css`
- Review the frontend test wiring:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/package.json`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/vite.config.js`
- Review the new tests:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/sem/semProjection.test.js`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/features/hints/HintResponseCard.test.jsx`
- Confirm the final screen size and shape:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx`

### Technical details
- Commands run during this step:
  - `npm install -D vitest jsdom @testing-library/react`
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `wc -l frontend/src/DatalogPad.jsx`
  - `docmgr doctor --ticket COZODB-003 --stale-after 30`
- New files created:
  - `frontend/src/theme/tokens.css`
  - `frontend/src/theme/cards.css`
  - `frontend/src/theme/layout.css`
  - `frontend/src/sem/semProjection.test.js`
  - `frontend/src/features/hints/HintResponseCard.test.jsx`
- Existing files updated:
  - `frontend/package.json`
  - `frontend/package-lock.json`
  - `frontend/vite.config.js`
  - `frontend/src/DatalogPad.jsx`
  - `frontend/src/features/diagnosis/DiagnosisCard.jsx`
  - `frontend/src/features/hints/HintResponseCard.jsx`
  - `frontend/src/features/hints/StreamingMessageCard.jsx`
  - `frontend/src/features/query-results/QueryResultsTable.jsx`
  - `ttmp/2026/03/15/COZODB-003--frontend-decomposition-plan-for-sem-migration-and-widget-modularization/tasks.md`
  - `ttmp/2026/03/15/COZODB-003--frontend-decomposition-plan-for-sem-migration-and-widget-modularization/changelog.md`

## Step 7: Refresh the ticket bundle and deliver the implemented state to reMarkable

Once the implementation and local validation were complete, the last requirement was operational rather than architectural: make sure the ticket bundle now reflects the actual implemented state, then push that refreshed bundle to reMarkable and verify it remotely. This step matters because COZODB-003 is not just source code. It is also a planning and onboarding artifact, and those docs become misleading if they stop at the design stage while the code has moved on.

I re-ran ticket validation, uploaded the refreshed bundle to the same remote directory with force overwrite, and verified that the expected document name was present afterward. That closed the loop between the repository state and the external reading copy.

### Prompt Context

**User prompt (verbatim):** "go ahead and do it, task by task, commit at appropriate intervals and keep a detailed diary"

**Assistant interpretation:** Finish the ticket all the way through documentation and delivery, not just local code changes.

**Inferred user intent:** Have a usable final implementation plus a synchronized ticket bundle available on reMarkable.

### What I did
- Re-ran:
  - `docmgr doctor --ticket COZODB-003 --stale-after 30`
- Uploaded the refreshed bundle with:
  - `remarquee upload bundle ttmp/2026/03/15/COZODB-003--frontend-decomposition-plan-for-sem-migration-and-widget-modularization --name "COZODB-003 Frontend Decomposition Guide" --remote-dir "/ai/2026/03/15/COZODB-003" --toc-depth 2 --force --non-interactive`
- Verified the remote listing with:
  - `remarquee cloud ls /ai/2026/03/15/COZODB-003 --long --non-interactive`

### Why
- The user explicitly asked for ticket work plus reMarkable delivery.
- The earlier upload reflected the planning artifact. This refresh makes the external bundle reflect the implemented architecture instead.

### What worked
- `docmgr doctor` passed cleanly.
- Upload succeeded:
  - `OK: uploaded COZODB-003 Frontend Decomposition Guide.pdf -> /ai/2026/03/15/COZODB-003`
- Remote verification succeeded:
  - `[f] COZODB-003 Frontend Decomposition Guide`

### What didn't work
- Nothing failed in this step.

### What I learned
- Re-running the external delivery at the end of implementation is cheap and prevents documentation drift.

### What was tricky to build
- The only operational wrinkle was remembering to force overwrite the existing remote document, because the plan-phase bundle had already been uploaded earlier.

### What warrants a second pair of eyes
- Nothing urgent. The ticket bundle and local repo state are aligned.

### What should be done in the future
- If implementation continues beyond this ticket, refresh the bundle again rather than assuming the current reMarkable copy stays accurate.

### Code review instructions
- Validate the final ticket:
  - `docmgr doctor --ticket COZODB-003 --stale-after 30`
- Validate the remote copy:
  - `remarquee cloud ls /ai/2026/03/15/COZODB-003 --long --non-interactive`

### Technical details
- Remote directory: `/ai/2026/03/15/COZODB-003`
- Bundle name: `COZODB-003 Frontend Decomposition Guide`
- Commit created:
  - `7ebec66 frontend(editor): extract pad document and line renderer`

## Step 5: Introduce a lightweight SEM projection and extract the remaining feature blocks

Once transport and editor responsibilities were extracted, the next problem became clearer: websocket events were still writing directly into ad hoc render state, and the remaining feature JSX was still embedded inside `DatalogPad.jsx`. Those two issues reinforce each other. If state stays transport-shaped, render extraction is awkward. If render code stays inline, projection has nowhere clean to project into. I handled those together in one implementation slice because they are tightly related and can be reviewed as one "event-to-feature" boundary change.

The approach stayed intentionally modest. I did not introduce Redux or a generic entity store. I added a small SEM projection module that knows how to fold `llm.start`, `llm.delta`, `llm.error`, and `hint.result` into projected entities plus selectors for the current UI. On top of that, I moved the remaining UI blocks into `features/` modules so `DatalogPad.jsx` became primarily an orchestration shell rather than a place where transport, editor, and every card implementation all coexist.

### Prompt Context

**User prompt (verbatim):** "go ahead and do it, task by task, commit at appropriate intervals and keep a detailed diary"

**Assistant interpretation:** Continue decomposing the monolith in reviewable increments while preserving behavioral continuity and documenting the rationale.

**Inferred user intent:** Reach a frontend shape that is ready for SEM/widget migration without taking a detour into a larger rewrite than the ticket actually requires.

### What I did
- Added `frontend/src/sem/semEventTypes.js` with named event constants for:
  - `llm.start`
  - `llm.delta`
  - `llm.error`
  - `hint.result`
- Added `frontend/src/sem/semProjection.js` with:
  - `createSemProjectionState()`
  - `applySemEvent(state, event)`
  - `getStreamingEntries(state)`
  - `getCompletedHintEntries(state)`
- Replaced websocket render-state accumulation in `DatalogPad.jsx` with projection updates through `setSemProjection(current => applySemEvent(current, event))`.
- Kept diagnosis-specific side effects in the screen layer while moving generic streaming/final hint state into the projection layer.
- Renamed the old fallback-only browser-side response store to `mockAiBlocks` so the boundary between projected server results and mock fallback results is explicit.
- Added feature modules:
  - `frontend/src/features/hints/StreamingMessageCard.jsx`
  - `frontend/src/features/hints/HintResponseCard.jsx`
  - `frontend/src/features/hints/DocPreviewChip.jsx`
  - `frontend/src/features/hints/hintViewModel.js`
  - `frontend/src/features/diagnosis/DiagnosisCard.jsx`
  - `frontend/src/features/query-results/QueryResultsTable.jsx`
- Rewired `DatalogPad.jsx` to import and compose those feature components instead of defining them inline.
- Introduced a small hint-response view-model helper so card rendering is based on normalized props rather than directly on transport-shaped response objects.

### Why
- Projection was the missing seam between websocket transport and browser rendering.
- Extracting feature components at the same time prevents the new projection layer from immediately coupling itself back to a monolithic screen.
- The current app does not justify a full client state framework yet, but it does need a deterministic event-folding layer.

### What worked
- The projected state now replaces the old websocket-specific `streamingBlocks` state and the websocket-backed portion of `aiBlocks`.
- `DatalogPad.jsx` is materially smaller and easier to reason about because the remaining JSX is mostly shell/layout logic plus screen-level callbacks.
- The `features/` split preserved behavior while giving the future SEM-widget work obvious landing zones.
- Validation passed cleanly after the refactor:
  - `npm run lint`
  - `npm run build`

### What didn't work
- The first projection pass still left one unused `useRef` import behind after the old streaming accumulator disappeared. This was minor, but it reinforced the same lesson from the editor phase: extract, then do a dead-code pass before calling the slice complete.
- The new projection intentionally models only the event families needed today. That is a strength for this ticket, but it also means new SEM event families will require deliberate extension rather than falling out automatically.

### What I learned
- A lightweight projection plus selectors is enough to unlock the architecture here. The app did not need a bigger state framework to stop being transport-driven.
- Separating mock fallback results from projected websocket results makes the data flow much easier to understand, especially for an intern reading the code for the first time.
- The remaining complexity in `DatalogPad.jsx` is now mostly style/layout duplication and composition, not hidden domain logic.

### What was tricky to build
- The tricky boundary was keeping diagnosis side effects in the screen while moving generic hint/stream accumulation into the projection. If too much moved into projection, the module would start owning UI concerns. If too little moved, projection would not actually improve the architecture.
- Another subtle point was preserving the current rendering order. The projection selectors had to preserve insertion order so streaming and completed hint cards still appear in a predictable way.

### What warrants a second pair of eyes
- The current projection entity shape is intentionally minimal. Before richer SEM payload families land, it is worth checking whether a slightly richer discriminated shape would make widget rendering clearer.
- `HintResponseCard` currently still owns local open-doc and copied-state behavior. That is fine, but if the team wants URL-addressable card state later, that local UI state may need revisiting.

### What should be done in the future
- Finish the theme extraction so the remaining repeated inline style tokens are centralized.
- Add frontend tests for the projection layer and at least one feature card.
- Re-upload the ticket bundle once the remaining theme/test phases land so the docs reflect the actual code state.

### Code review instructions
- Review the event/projection seam:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/sem/semEventTypes.js`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/sem/semProjection.js`
- Review the extracted feature modules:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/features/hints/StreamingMessageCard.jsx`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/features/hints/HintResponseCard.jsx`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/features/hints/DocPreviewChip.jsx`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/features/hints/hintViewModel.js`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/features/diagnosis/DiagnosisCard.jsx`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/features/query-results/QueryResultsTable.jsx`
- Then verify how the screen composes the new layers in:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx`
- Re-run the frontend checks:
  - `cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend && npm run lint`
  - `cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend && npm run build`

### Technical details
- Commands run during this step:
  - `sed -n '1,240p' /home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.ts`
  - `rg -n "streamingBlocks|aiBlocks|llm.start|llm.delta|hint.result|llm.error" frontend/src/DatalogPad.jsx`
  - `npm run lint`
  - `npm run build`
  - `git diff -- frontend/src/DatalogPad.jsx frontend/src/sem/semEventTypes.js frontend/src/sem/semProjection.js`
  - `git diff -- frontend/src/DatalogPad.jsx frontend/src/features/...`
- New files created:
  - `frontend/src/sem/semEventTypes.js`
  - `frontend/src/sem/semProjection.js`
  - `frontend/src/features/hints/StreamingMessageCard.jsx`
  - `frontend/src/features/hints/HintResponseCard.jsx`
  - `frontend/src/features/hints/DocPreviewChip.jsx`
  - `frontend/src/features/hints/hintViewModel.js`
  - `frontend/src/features/diagnosis/DiagnosisCard.jsx`
  - `frontend/src/features/query-results/QueryResultsTable.jsx`
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
