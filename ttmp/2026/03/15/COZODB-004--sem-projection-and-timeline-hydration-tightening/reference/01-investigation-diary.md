---
Title: Investigation diary
Ticket: COZODB-004
Status: active
Topics:
    - frontend
    - sem
    - streaming
    - architecture
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../../../../../tmp/cozodb-streaming-improvements.md
      Note: Imported proposal reviewed during investigation
    - Path: backend/pkg/api/types.go
      Note: Confirmed request and websocket event contract gaps
    - Path: backend/pkg/hints/structured_types.go
      Note: Confirmed doc refs lack anchor support
    - Path: frontend/src/editor/PadEditor.jsx
      Note: Confirmed notebook-style after-line render seam
    - Path: frontend/src/editor/usePadDocument.js
      Note: Confirmed line-array editor model constraint
ExternalSources:
    - local:01-cozodb-streaming-improvements.md
Summary: Chronological record for COZODB-004 covering proposal import, proposal-versus-code verification, and production of a local-only SEM projection and hydration-readiness refactor guide.
LastUpdated: 2026-03-15T15:42:00-04:00
WhatFor: Record how the imported proposal was checked against the local codebase and how the final design and task plan were produced.
WhenToUse: Use when continuing COZODB-004 or reviewing which parts of the imported proposal were accepted, narrowed, or deferred.
---


# Investigation diary

## Goal

Capture how the imported SEM streaming proposal was validated against the local `cozodb-editor` codebase, what the current system actually does, and how the final local-only refactor plan was derived.

## Step 1: Import the proposal and verify the current CLI behavior

I started by creating a fresh ticket workspace, because the request was explicitly for a new docmgr ticket rather than an addition to COZODB-002 or COZODB-003. The first concrete task was to import `/tmp/cozodb-streaming-improvements.md` into the ticket and make sure the current `docmgr` CLI still matched the requested import syntax before I treated the proposal as a formal source document.

The import itself succeeded, but the requested command shape was slightly stale. The current `docmgr import file` command accepts `--file`, not `--tmp`, so I had to rerun the import with the current flag. That mismatch was worth recording because it is exactly the sort of small operational detail that can slow down an intern following the same workflow later.

### Prompt Context

**User prompt (verbatim):** "Create a new docmgr ticket to tighten the SEM project and timeline rendering / hydration. Import the file with `docmgr import file --tmp /tmp/cozodb-streaming-improvements.md --ticket ...` and read it carefully. We are only addressing this project, no pinocchio/geppetto changes for now. Make your own implementation plan by cross verifying that the information in the proposal matches what is in the codebase, and create a detailed granular list of tasks to tackle the refactor/cleanup. 

Create a detailed analysis / design / implementation guide that is very detailed for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file
  references.
  It should be very clear and detailed. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Create a new ticket workspace, import the proposal, verify it against the actual local code, and produce a detailed local-only implementation guide plus a granular task plan, then upload the final bundle to reMarkable.

**Inferred user intent:** Turn an external proposal into an evidence-backed, repo-specific execution document that a new engineer could follow without relying on assumptions about external systems.

### What I did
- Ran:
  - `docmgr status --summary-only`
  - `docmgr ticket list`
  - `ls -l /tmp/cozodb-streaming-improvements.md`
- Created the ticket workspace:
  - `docmgr ticket create-ticket --ticket COZODB-004 --title "SEM Projection and Timeline Hydration Tightening" --topics frontend,sem,streaming,timeline,hydration`
- Added the two core documents:
  - `docmgr doc add --ticket COZODB-004 --doc-type design-doc --title "SEM Projection and Timeline Hydration Refactor Guide"`
  - `docmgr doc add --ticket COZODB-004 --doc-type reference --title "Investigation diary"`
- Tried the requested import command:
  - `docmgr import file --tmp /tmp/cozodb-streaming-improvements.md --ticket COZODB-004`
- Reran the import with the current CLI:
  - `docmgr import file --ticket COZODB-004 --file /tmp/cozodb-streaming-improvements.md`
- Verified the imported source landed in:
  - `ttmp/2026/03/15/COZODB-004--sem-projection-and-timeline-hydration-tightening/sources/local/01-cozodb-streaming-improvements.md`

### Why
- The user asked for a new ticket, not an extension of an existing one.
- The imported proposal needed to be treated as a first-class source in the ticket workspace.
- Verifying the current CLI behavior before proceeding avoids writing docs around a command that no longer works as written.

### What worked
- Ticket creation and document creation succeeded without any extra vocabulary or config work.
- Import with `--file` succeeded and updated the ticket index automatically.
- The proposal was now stored in a stable ticket-local location, which made later referencing much easier.

### What didn't work
- The requested command syntax no longer matched the current CLI:
  - Command: `docmgr import file --tmp /tmp/cozodb-streaming-improvements.md --ticket COZODB-004`
  - Error: `Error: unknown flag: --tmp`
- The fix was to rerun using:
  - `docmgr import file --ticket COZODB-004 --file /tmp/cozodb-streaming-improvements.md`

### What I learned
- The current `docmgr` import workflow is still straightforward, but some older command examples drifted from the CLI.
- Importing the proposal into `sources/local/` was the right move because it let the final design doc cite a stable project-local source path instead of a transient `/tmp` file.

### What was tricky to build
- The tricky part was not ticket creation; it was making sure the imported file became part of the ticket workspace before any analysis started. If I had only read the `/tmp` file directly, the final deliverable would have had weaker provenance and a more fragile source path.

### What warrants a second pair of eyes
- Nothing architectural yet. The only thing to double-check is whether any local team scripts or notes still reference the old `docmgr import file --tmp ...` syntax.

### What should be done in the future
- Update any internal examples that still use `--tmp` for `docmgr import file`.

### Code review instructions
- Verify the imported source exists at:
  - `ttmp/2026/03/15/COZODB-004--sem-projection-and-timeline-hydration-tightening/sources/local/cozodb-streaming-improvements.md`
- Re-run the successful import command if needed:
  - `docmgr import file --ticket COZODB-004 --file /tmp/cozodb-streaming-improvements.md`

### Technical details
- Ticket path:
  - `ttmp/2026/03/15/COZODB-004--sem-projection-and-timeline-hydration-tightening`
- Imported source metadata is tracked in:
  - `ttmp/2026/03/15/COZODB-004--sem-projection-and-timeline-hydration-tightening/.meta/sources.yaml`

## Step 2: Cross-check the proposal against the local backend and frontend code

After the proposal was imported, I treated it as a hypothesis, not a specification. The next step was to validate each major claim against the actual backend request path, structured event path, and frontend projection/rendering path, because the user explicitly asked for an implementation plan based on the codebase rather than on the proposal alone.

That verification showed a useful split. The proposal is right about the current grouping bug and the missing anchor plumbing, but it overstates the local “timeline hydration” surface. This repo does not currently have a real local timeline store or replay runtime. The right local interpretation is therefore “make the raw event contract and projector deterministic enough that later hydration would be straightforward,” not “tighten an existing hydrated timeline subsystem.”

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Audit the imported proposal claim by claim against the current code so the final guide reflects the repo that exists, not the system someone wished existed.

**Inferred user intent:** Get a trustworthy implementation plan, not a plan that accidentally assumes already-shipped plumbing from other repos.

### What I did
- Read the imported proposal carefully with:
  - `sed -n '1,260p' /tmp/cozodb-streaming-improvements.md`
  - `sed -n '261,520p' /tmp/cozodb-streaming-improvements.md`
  - `sed -n '521,780p' /tmp/cozodb-streaming-improvements.md`
- Verified the backend request path and current request structs:
  - `nl -ba backend/pkg/api/types.go | sed -n '1,220p'`
  - `nl -ba backend/pkg/api/websocket.go | sed -n '1,260p'`
  - `nl -ba backend/pkg/hints/types.go | sed -n '1,220p'`
- Verified the structured extraction, parsing, and SEM translation contract:
  - `nl -ba backend/pkg/hints/structured_types.go | sed -n '1,220p'`
  - `nl -ba backend/pkg/hints/structured_events.go | sed -n '1,260p'`
  - `nl -ba backend/pkg/hints/structured_extractors.go | sed -n '1,260p'`
  - `nl -ba backend/pkg/hints/structured_parser.go | sed -n '1,260p'`
  - `nl -ba backend/pkg/hints/sem_registry.go | sed -n '1,260p'`
  - `nl -ba backend/pkg/hints/engine.go | sed -n '1,320p'`
  - `nl -ba backend/pkg/api/ws_sem_sink.go | sed -n '1,220p'`
- Verified the frontend projector and rendering path:
  - `nl -ba frontend/src/DatalogPad.jsx | sed -n '140,470p'`
  - `nl -ba frontend/src/sem/semProjection.js | sed -n '1,360p'`
  - `nl -ba frontend/src/features/cozo-sem/CozoSemRenderer.jsx | sed -n '1,260p'`
  - `nl -ba frontend/src/editor/PadEditor.jsx | sed -n '1,220p'`
  - `nl -ba frontend/src/editor/usePadDocument.js | sed -n '1,220p'`
- Verified the existing tests and search surface:
  - `nl -ba frontend/src/sem/semProjection.test.js | sed -n '1,320p'`
  - `nl -ba backend/pkg/hints/structured_parser_test.go | sed -n '1,260p'`
  - `nl -ba backend/pkg/hints/sem_registry_test.go | sed -n '1,240p'`
  - `rg -n "timeline|hydrate|hydration|projector|bundleId|parentId|ordinal|stream_id" . -S -g '!frontend/node_modules' -g '!backend/.cache'`

### Why
- The imported proposal was opinionated and mostly sound, but the user asked for an implementation plan that matches this codebase.
- Evidence-backed review was necessary to distinguish “current bug” from “future architecture opportunity.”

### What worked
- The proposal’s key claims about dropped anchors, adjacency grouping, and missing `DocRefPayload` anchors all matched the code.
- The search pass clarified that the repo does not yet have a local timeline/hydration implementation to refactor directly.
- The current frontend/editor seams were easy to map because COZODB-003 already split the monolith.

### What didn't work
- One planned inspection file did not exist:
  - Command: `nl -ba backend/pkg/hints/structured_extractors_test.go | sed -n '1,260p'`
  - Error: `nl: backend/pkg/hints/structured_extractors_test.go: No such file or directory`
- That was not a blocker; the meaningful current backend coverage was in `structured_parser_test.go` and `sem_registry_test.go`.

### What I learned
- The imported proposal is strongest when read as a contract cleanup plan, not as a literal description of current local hydration infrastructure.
- The frontend already has the exact seam needed for notebook-style follow-up widgets: `PadEditor.renderAfterLine(...)`.
- The real long-term win is not “better streaming visuals.” It is making the projector deterministic enough that replay would not need accidental adjacency rules.

### What was tricky to build
- The hardest part conceptually was separating “hydration-readiness” from “hydration implementation.” The imported proposal mixes those a little because it comes from a broader architecture perspective. For this repo, the correct cut is to tighten the event and projector contract now and explicitly defer persistence or replay.

### What warrants a second pair of eyes
- The assumption that one backend request should map to one synthetic bundle is strong and sensible, but it should be reviewed once against diagnosis UX as well as hint UX.
- The choice to keep a temporary adjacency fallback for one rollout window should be reviewed to make sure it does not linger after the backend contract ships.

### What should be done in the future
- Add explicit projector tests for interleaved bundles and child-before-hint ordering once implementation starts.
- Revisit whether a local timeline store is actually needed after the deterministic bundle projector lands.

### Code review instructions
- Start with the evidence files:
  - `backend/pkg/api/websocket.go`
  - `backend/pkg/hints/structured_events.go`
  - `backend/pkg/hints/structured_parser.go`
  - `frontend/src/sem/semProjection.js`
- Then compare them with the imported source:
  - `ttmp/2026/03/15/COZODB-004--sem-projection-and-timeline-hydration-tightening/sources/local/cozodb-streaming-improvements.md`

### Technical details
- Key verified current-state facts:
  - `anchorLine` is sent by the frontend but not represented in backend request structs.
  - `DocRefPayload` has no `Anchor`.
  - leaf IDs are currently derived from `meta.ID:seq`.
  - translated `cozo.*` websocket payloads do not carry `bundleId`, `parentId`, `ordinal`, or `mode`.
  - thread grouping is currently built from adjacency in `buildSemThreads(...)`.

## Step 3: Write the local-only refactor guide, granular task plan, and delivery bundle

With the proposal audited, I switched to synthesis. The job in this step was to produce one detailed intern-facing design doc, one granular task list, and one diary that explain the actual current architecture, explicitly call out what is verified, and propose a phased local-only implementation plan that does not rely on geppetto or pinocchio changes.

I also made the ticket docs reflect the key scoping conclusion from Step 2: this ticket is about making the local SEM contract and projector hydration-ready, not about implementing a local hydrated timeline store. That distinction is central to keeping the work coherent and achievable.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Turn the validated findings into a polished design doc and execution checklist, validate the ticket, and publish the bundle to reMarkable.

**Inferred user intent:** End with a clean ticket package that can be handed to an intern or reviewer without needing to reconstruct the architecture from source files.

### What I did
- Wrote:
  - `ttmp/2026/03/15/COZODB-004--sem-projection-and-timeline-hydration-tightening/design-doc/01-sem-projection-and-timeline-hydration-refactor-guide.md`
  - `ttmp/2026/03/15/COZODB-004--sem-projection-and-timeline-hydration-tightening/tasks.md`
  - `ttmp/2026/03/15/COZODB-004--sem-projection-and-timeline-hydration-tightening/changelog.md`
  - `ttmp/2026/03/15/COZODB-004--sem-projection-and-timeline-hydration-tightening/index.md`
- Filled the design doc with:
  - proposal audit,
  - evidence-backed current-state architecture,
  - deterministic bundle/child contract,
  - backend/frontend phase plan,
  - testing strategy,
  - risks and alternatives,
  - references.
- Related the main code files to the design doc and diary with `docmgr doc relate`.
- Updated the changelog with a meaningful entry via `docmgr changelog update`.
- Validated the workspace with:
  - `docmgr doctor --ticket COZODB-004 --stale-after 30`
- Verified reMarkable connectivity and account:
  - `remarquee status`
  - `remarquee cloud account --non-interactive`
- Dry-ran and performed bundle upload:
  - `remarquee upload bundle --dry-run ...`
  - `remarquee upload bundle ...`
- Verified the remote listing:
  - `remarquee cloud ls /ai/2026/03/15/COZODB-004 --long --non-interactive`

### Why
- The user asked for a detailed intern-facing guide, not just notes.
- The task list needed to be granular enough to drive actual implementation slices.
- Upload verification is part of the requested handoff quality bar.

### What worked
- The design doc could stay local-only while still preserving the useful parts of the imported proposal.
- The task plan naturally broke into backend contract work, frontend projector work, prompt cleanup, and compatibility cleanup.
- `docmgr doctor` passed after the docs and metadata were updated.
- The bundle upload and remote listing verification completed successfully.

### What didn't work
- N/A

## Step 4: Implement and validate the backend contract slice

After the ticket was written, I switched from analysis to execution. I kept the first implementation slice backend-only so the commit boundary would stay coherent: request anchor plumbing, deterministic bundle metadata, stable child IDs, and backend tests that prove preview and authoritative extraction now agree on identity.

The key design constraint in this step was to avoid changing the transport shape in a way that would break the existing frontend while still making the projector hydration-ready. That led to a conservative contract change: keep the existing websocket `id` for request-level stream text, add optional `stream_id` for bundle correlation, and enrich `cozo.*` payloads with explicit `bundleId`, `parentId`, `ordinal`, `mode`, and `anchor`.

### Prompt Context

**User prompt (verbatim):** "Ok, work on it task by task, as you go, commit at appropriate intervals, write a diary."

**Assistant interpretation:** Execute the COZODB-004 task list in small slices, commit after a coherent milestone, and record both successful and failed attempts in the diary.

**Inferred user intent:** Produce auditable implementation progress, not just a final diff.

### What I did
- Added request anchor plumbing:
  - `backend/pkg/api/types.go`
  - `backend/pkg/hints/types.go`
  - `backend/pkg/api/websocket.go`
- Added deterministic projection helpers:
  - `backend/pkg/hints/projection_defaults.go`
- Extended structured event metadata:
  - `backend/pkg/hints/structured_events.go`
  - `backend/pkg/hints/structured_types.go`
- Updated preview extraction and authoritative parsing:
  - `backend/pkg/hints/structured_extractors.go`
  - `backend/pkg/hints/structured_parser.go`
  - `backend/pkg/hints/engine.go`
- Updated SEM translation:
  - `backend/pkg/hints/sem_registry.go`
- Added and updated tests:
  - `backend/pkg/hints/structured_projection_test.go`
  - `backend/pkg/hints/structured_parser_test.go`
  - `backend/pkg/hints/sem_registry_test.go`
- Formatted the backend changes:
  - `gofmt -w backend/pkg/api/types.go backend/pkg/api/websocket.go backend/pkg/hints/engine.go backend/pkg/hints/projection_defaults.go backend/pkg/hints/sem_registry.go backend/pkg/hints/sem_registry_test.go backend/pkg/hints/structured_events.go backend/pkg/hints/structured_extractors.go backend/pkg/hints/structured_parser.go backend/pkg/hints/structured_parser_test.go backend/pkg/hints/structured_projection_test.go backend/pkg/hints/structured_types.go backend/pkg/hints/types.go`
- Validated the backend slice with a fresh build cache:
  - `env GOTOOLCHAIN=auto GOCACHE=/tmp/cozodb-go-build-cache-004a go test ./pkg/hints ./pkg/api`
- Committed the backend slice:
  - `git commit -m "backend(sem): stabilize bundle metadata and anchors"`
  - Commit: `99f18ac`

### Why
- The proposal’s central defect is nondeterministic identity and incomplete anchor propagation. Those problems are rooted in the backend contract, so they needed to be fixed before the frontend selector cleanup.
- Keeping the backend work in one commit makes rollback and review much easier than mixing it with renderer changes.

### What worked
- Request-level anchors now flow through the backend hint request context.
- One response now gets one generated bundle ID, and that bundle identity is available to the frontend via `stream_id`, `bundleId`, and `parentId`.
- Preview and authoritative parse now use the same deterministic child ID scheme based on `(bundleId, family, ordinal)`.
- The backend tests passed once the build cache was isolated.

### What didn't work
- The first `go test` attempt took unusually long because the sandbox had to compile `github.com/mattn/go-sqlite3` from scratch under a fresh cache. This turned out to be expected compile cost, not a semantic failure.
- My first attempt to commit the backend slice failed because I incorrectly ran `git add` and `git commit` in parallel. The commit saw an unstaged worktree and exited with:
  - `no changes added to commit (use "git add" and/or "git commit -a")`
- The fix was to rerun staging and commit sequentially.

### What I learned
- The cleanest local transport contract is to preserve request-level `id` for LLM text streams and add `stream_id` strictly as bundle correlation. That keeps current streaming UI behavior intact while making thread hydration deterministic.
- `DocRefPayload` needed anchor support to keep the “bundle anchor decides placement” rule consistent across all Cozo widget families.

### What was tricky to build
- The main subtlety was keeping preview and final IDs stable without forcing the frontend to understand backend parser internals. The `ProjectionDefaults` helper layer solved that by centralizing bundle ID, anchor injection, and canonical child ID generation.

### What warrants a second pair of eyes
- Preview failure events still do not have dedicated coverage. The authoritative failure path is covered, but the preview-side malformed path should be verified explicitly in a later cleanup slice.
- Prompt examples still mention legacy per-item IDs. They are not blocking the runtime contract, but they should be cleaned up before the ticket closes.

### What should be done in the future
- Finish the frontend projector slice so explicit bundle relations replace adjacency-first grouping.
- Add one focused test for preview failure bundle metadata if the malformed preview path becomes more important in practice.

### Code review instructions
- Review the backend contract entry points first:
  - `backend/pkg/api/websocket.go`
  - `backend/pkg/hints/projection_defaults.go`
  - `backend/pkg/hints/structured_extractors.go`
  - `backend/pkg/hints/structured_parser.go`
  - `backend/pkg/hints/sem_registry.go`
- Then confirm the tests that enforce the new behavior:
  - `backend/pkg/hints/structured_projection_test.go`
  - `backend/pkg/hints/structured_parser_test.go`
  - `backend/pkg/hints/sem_registry_test.go`

### Technical details
- New backend contract facts after commit `99f18ac`:
  - `hint.request` can carry `anchorLine` end to end.
  - `llm.*` events preserve request `id` and add optional `stream_id`.
  - translated `cozo.*` SEM envelopes now carry enough metadata for deterministic bundle grouping on the client.
- Validation command that passed:
  - `env GOTOOLCHAIN=auto GOCACHE=/tmp/cozodb-go-build-cache-004a go test ./pkg/hints ./pkg/api`

## Step 5: Implement the frontend projector and bundle-thread selectors

With the backend contract in place, I moved to the frontend slice. The goal here was to make the projector treat one response as one explicit bundle when the metadata is present, while preserving one temporary compatibility path for older events that still arrive without bundle metadata.

I deliberately kept this work inside the projector and tests instead of spreading it into `DatalogPad.jsx`. The screen component already had the right control surface from the earlier decomposition work: it calls selectors, renders returned threads, and keys collapse/dismiss state by `thread.id`. That meant the main frontend job was to make `thread.id` become the synthetic bundle ID for explicit Cozo bundles.

### Prompt Context

**User prompt (verbatim):** "Ok, work on it task by task, as you go, commit at appropriate intervals, write a diary."

**Assistant interpretation:** Continue with the next coherent implementation slice, commit it separately, and record the architectural reasoning and validation.

**Inferred user intent:** Keep backend/frontend milestones reviewable and independently reversible.

### What I did
- Extended the projector state and event readers:
  - `frontend/src/sem/semProjection.js`
- Added and updated projector tests:
  - `frontend/src/sem/semProjection.test.js`
- Tightened renderer tests around bundle-keyed threads:
  - `frontend/src/features/cozo-sem/CozoSemRenderer.test.jsx`
- Re-read the consuming screen to verify no extra projection logic was being pulled into it:
  - `frontend/src/DatalogPad.jsx`
- Validated the frontend slice:
  - `npm test`
  - `npm run lint`
  - `npm run build`
- Committed the frontend slice:
  - `git commit -m "frontend(sem): group threads by bundle metadata"`
  - Commit: `3587339`

### Why
- The core bug from the imported proposal is adjacency-based grouping. Fixing that required explicit relation-based bundle selectors in the projector, not a renderer workaround.
- Keeping `DatalogPad.jsx` stable reduces integration risk because the screen remains a consumer of selector output rather than a second source of grouping truth.

### What worked
- The projector now creates explicit `cozo_bundle` entities when `bundleId`/`parentId` metadata is present.
- Thread selectors now group explicit Cozo threads by `parentId` and sort children by `ordinal`, which makes child-before-hint arrival safe.
- The compatibility path still supports old events that do not carry bundle metadata.
- The existing `DatalogPad.jsx` state shape already worked for bundle-keyed collapse and dismiss behavior because it keys everything off `thread.id`.

### What didn't work
- N/A

### What I learned
- The earlier frontend decomposition paid off here. The bundle migration mostly stayed inside the projector and tests because the rendering surface had already been split into sensible modules.
- Renderer changes were smaller than expected because the grouped-thread interface was already close to the desired final shape.

### What was tricky to build
- The main subtlety was preserving backward compatibility for legacy events while making explicit bundle grouping the primary path. The safest answer was to keep the external selector names and let them internally combine bundle-first grouping with a narrow adjacency fallback.

### What warrants a second pair of eyes
- The adjacency fallback should not be allowed to live indefinitely. It is useful for rollout, but it is also technical debt by design.
- There is still no dedicated `DatalogPad` component test for bundle-keyed dismiss/collapse state. The behavior is simple and was verified by direct code inspection, but an app-level regression test could still be added later if this area changes again.

### What should be done in the future
- Remove the compatibility fallback once the backend contract is universal.
- Decide whether a dedicated screen-level test is worth the extra harness cost after the fallback is removed.

### Code review instructions
- Start with the projector:
  - `frontend/src/sem/semProjection.js`
- Then check the bundle-focused tests:
  - `frontend/src/sem/semProjection.test.js`
  - `frontend/src/features/cozo-sem/CozoSemRenderer.test.jsx`
- Finally confirm the consumer stays thin:
  - `frontend/src/DatalogPad.jsx`

### Technical details
- New frontend projector facts after commit `3587339`:
  - `cozo.*` leaves can now retain `bundleId`, `parentId`, `ordinal`, and `mode`.
  - explicit `cozo_bundle` entities are inserted into projection state and ordered by first sighting.
  - bundle thread construction is relation-based and ordinal-aware.
  - legacy adjacency grouping remains only as a compatibility fallback.
- Validation commands that passed:
  - `npm test`
  - `npm run lint`
  - `npm run build`

## Step 6: Clean up the extraction examples so they match the new contract

Once the backend and frontend runtime slices were in place, the remaining low-risk cleanup was to make the extraction examples stop teaching the model to invent synthetic IDs. The runtime still accepts legacy identifier fields for compatibility, but the examples should not imply that those fields are primary anymore because bundle-scoped identity is now assigned by the backend.

This was intentionally a separate commit. It changes the instruction surface, not the live runtime behavior, and that separation makes it easier to review prompt/config drift independently from projector or transport logic.

### Prompt Context

**User prompt (verbatim):** "Ok, work on it task by task, as you go, commit at appropriate intervals, write a diary."

**Assistant interpretation:** Finish the remaining cleanup tasks that are small, coherent, and directly related to the landed refactor.

**Inferred user intent:** Leave the ticket in a consistent state, not with runtime code saying one thing and examples saying another.

### What I did
- Updated extraction examples and descriptions:
  - `backend/pkg/hints/extraction_config.yaml`
- Simplified parser test fixtures to match the new example style:
  - `backend/pkg/hints/structured_parser_test.go`
- Re-ran the hint package tests:
  - `env GOTOOLCHAIN=auto GOCACHE=/tmp/cozodb-go-build-cache-004b go test ./pkg/hints`
- Committed the cleanup:
  - `git commit -m "backend(prompts): remove synthetic id examples"`
  - Commit: `f47083f`

### Why
- The new deterministic identity contract is backend-owned. Keeping old synthetic IDs in the examples would encourage the model to produce fields that no longer carry architectural weight.
- Prompt/example cleanup is cheap now and more annoying later once people start cargo-culting the old examples.

### What worked
- The extraction config now emphasizes user-visible payload content plus optional anchor metadata.
- The hint package tests still pass with the leaner examples.

### What didn't work
- The test rerun again spent noticeable time compiling sqlite and transitive dependencies under a fresh cache. That was expected overhead, not a semantic failure, but it is still worth remembering when budgeting iteration time.

### What I learned
- The highest-leverage place to clean up prompt drift was the extraction config, not the top-level prompt wrapper. That config is what actually renders the structured output instructions shown to the model.

### What was tricky to build
- There was no real code complexity here. The main discipline was just keeping the cleanup isolated so it did not get hidden inside the larger frontend commit.

### What warrants a second pair of eyes
- The runtime structs still keep legacy identifier fields for compatibility. That is fine for now, but they may become cleanup candidates once the rollout window closes.

### What should be done in the future
- Decide whether the compatibility identifier fields in `structured_types.go` should be deprecated more aggressively or removed during the fallback-removal phase.

### Code review instructions
- Review:
  - `backend/pkg/hints/extraction_config.yaml`
  - `backend/pkg/hints/structured_parser_test.go`
- Then compare the rendered instruction source with the earlier ticket guidance in:
  - `ttmp/2026/03/15/COZODB-004--sem-projection-and-timeline-hydration-tightening/design-doc/01-sem-projection-and-timeline-hydration-refactor-guide.md`

### Technical details
- New instruction-surface facts after commit `f47083f`:
  - synthetic ID fields are no longer highlighted in example payloads.
  - extraction docs now explicitly mention backend-owned anchor metadata.
- Validation command that passed:
  - `env GOTOOLCHAIN=auto GOCACHE=/tmp/cozodb-go-build-cache-004b go test ./pkg/hints`

### What I learned
- The most valuable contribution of the imported proposal was its insistence on deterministic grouping metadata.
- The most important local adaptation was explicitly narrowing “timeline hydration” to “hydration-ready projector contract.”

### What was tricky to build
- The main difficulty was writing a guide that is detailed enough for a new intern while still being honest about what the repo does not yet implement. It would have been easy to overstate the current hydration story because earlier ticket docs reference pinocchio timeline infrastructure, but that would have made this ticket misleading.

### What warrants a second pair of eyes
- The bundle entity naming and contract should get one architecture review before implementation begins, because it becomes the central grouping primitive for future replay as well as current rendering.
- The temporary adjacency fallback should be reviewed during implementation planning so it stays truly temporary.

### What should be done in the future
- Once implementation begins, record each slice in this diary and keep the task list and changelog aligned with actual commits.

### Code review instructions
- Start with:
  - `ttmp/2026/03/15/COZODB-004--sem-projection-and-timeline-hydration-tightening/design-doc/01-sem-projection-and-timeline-hydration-refactor-guide.md`
- Then review:
  - `ttmp/2026/03/15/COZODB-004--sem-projection-and-timeline-hydration-tightening/tasks.md`
  - `ttmp/2026/03/15/COZODB-004--sem-projection-and-timeline-hydration-tightening/index.md`
- Re-run validation:
  - `docmgr doctor --ticket COZODB-004 --stale-after 30`

### Technical details
- Remote upload target:
  - `/ai/2026/03/15/COZODB-004`
- Bundle contents:
  - ticket index
  - primary design doc
  - investigation diary
  - tasks
  - changelog

## Related

- Primary design doc: `../design-doc/01-sem-projection-and-timeline-hydration-refactor-guide.md`
- Imported proposal: `../sources/local/01-cozodb-streaming-improvements.md`
