---
Title: Investigation diary
Ticket: COZODB-002
Status: active
Topics:
    - streaming
    - structured-extraction
    - geppetto
    - pinocchio
    - rich-widgets
    - ai-completion
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/internal/extractor/semtemporal/register.go:Validated the reference bridge from structured events to SEM frames
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.ts
      Note: Diary evidence for frontend projection pattern
    - Path: ../../../../../../../../../workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.ts:Validated the canonical-id frontend projection pattern
    - Path: ../../../../../../../corporate-headquarters/geppetto/pkg/events/structuredsink/filtering_sink.go
      Note: Diary evidence for structured extraction behavior
    - Path: ../../../../../../../corporate-headquarters/geppetto/pkg/events/structuredsink/filtering_sink.go:Validated the structured extraction sink behavior
    - Path: ../../../../../../../corporate-headquarters/pinocchio/pkg/webchat/sem_translator.go
      Note: Diary evidence for SEM translation
    - Path: ../../../../../../../corporate-headquarters/pinocchio/pkg/webchat/sem_translator.go:Validated SEM translation rules and message-id handling
    - Path: backend/go.mod
      Note: Records the geppetto module wiring and required Go toolchain bump for implementation work
    - Path: backend/pkg/api/websocket.go
      Note: Diary evidence for missing cancellation and current transport
    - Path: backend/pkg/api/websocket.go:Validated request lifecycle, ad-hoc SEM envelope, and missing cancellation
    - Path: backend/pkg/api/ws_sem_sink.go
      Note: Bridges custom extraction events into websocket SEM envelopes using pinocchio's event translator
    - Path: backend/pkg/hints/engine.go:Validated the local inference path and JSON-only contract
    - Path: backend/pkg/hints/sem_registry.go
      Note: Registers custom pinocchio SEM handlers for cozo.hint/query_suggestion/doc_ref events
    - Path: backend/pkg/hints/streaming_sink.go
      Note: Captures the first geppetto event sink used to bridge partial text into the existing websocket contract
    - Path: backend/pkg/hints/structured_extractors.go
      Note: Implements the FilteringSink preview extractors for Cozo YAML families
    - Path: backend/pkg/hints/structured_parser.go
      Note: Performs authoritative final-response extraction and compatibility response synthesis
    - Path: frontend/src/DatalogPad.jsx:Validated frontend websocket handling and lack of projection layer
ExternalSources: []
Summary: Chronological investigation record for COZODB-002 covering repository validation, code-review findings, reference-pattern verification, and ticket deliverable preparation.
LastUpdated: 2026-03-15T02:08:15-04:00
WhatFor: Record what was validated, what patterns were confirmed, which commands were run, and how the final deliverable was produced.
WhenToUse: Use this diary when reviewing the ticket deliverable or continuing implementation from the design document.
---




# Investigation diary

## Goal

Capture how the COZODB-002 review and implementation guide were produced, including the exact repositories inspected, validation commands run, and the main conclusions that changed the ticket direction.

## Step 1: Independently validate the current app and the reference implementations

I started by treating the earlier ticket draft as untrusted until I had re-read the code myself. The main objective of this step was to determine whether `cozodb-editor` already had the necessary abstractions for geppetto plus pinocchio integration or whether the existing runtime would first need structural cleanup.

That validation quickly showed a clear split: the local app is still a narrow prototype around a direct Anthropic client, while the reference repos already contain the tested event, extraction, and projection pipeline that COZODB-002 actually wants. That difference is why the final document became an independent review plus staged migration guide rather than a light integration memo.

### Prompt Context

**User prompt (verbatim):** "Work on COZODB-002, which i is about using  use geppetto and pinocchio streaming events
  and structured data extraction . Analyze the code base and its quality and    
  review the code and then analyze in depth how to use                       
  /home/manuel/code/wesen/corporate-headquarters/geppetto and                
  /home/manuel/code/wesen/corporate-headquarters/pinocchio to do the inference
  and streaming, and to create the richwidget for SEM frames as its built and
  using the yaml structured event format for extraction . Look also at
  /home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships
  for how to do this in practice.

DO your own review, your colleague I think is not as smart, and upload to remarkable when done"

**Assistant interpretation:** Produce an evidence-backed ticket deliverable that independently reviews the current `cozodb-editor` architecture, validates the external reference repos, and explains how to implement geppetto streaming, pinocchio SEM translation, YAML structured extraction, and rich widgets in practice.

**Inferred user intent:** Avoid repeating an earlier shallow analysis and instead create a higher-confidence implementation guide that can be handed off directly for execution.

### What I did
- Read the COZODB-002 workspace and existing draft analysis before trusting any of its claims.
- Mapped the local surface area in `backend/` and `frontend/`.
- Pulled line-anchored evidence from:
  - `backend/pkg/hints/engine.go`
  - `backend/pkg/hints/prompt.go`
  - `backend/pkg/api/websocket.go`
  - `frontend/src/DatalogPad.jsx`
  - `geppetto/pkg/events/chat-events.go`
  - `geppetto/pkg/events/sink.go`
  - `geppetto/pkg/events/structuredsink/filtering_sink.go`
  - `pinocchio/pkg/sem/registry/registry.go`
  - `pinocchio/pkg/webchat/sem_translator.go`
  - `pinocchio/pkg/webchat/timeline_registry.go`
  - `pinocchio/cmd/web-chat/thinkingmode/backend.go`
  - `temporal-relationships/internal/extractor/structured/context_extractors.go`
  - `temporal-relationships/internal/extractor/structured/context_events.go`
  - `temporal-relationships/internal/extractor/semtemporal/register.go`
  - `temporal-relationships/internal/extractor/gorunner/sinks.go`
  - `temporal-relationships/ui/src/ws/semProjection.ts`
- Ran focused validation commands:
  - `go test ./...` in `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend`
  - `go test ./pkg/events/structuredsink` in `/home/manuel/code/wesen/corporate-headquarters/geppetto`
  - `go test ./pkg/webchat ./cmd/web-chat/thinkingmode` in `/home/manuel/code/wesen/corporate-headquarters/pinocchio`
  - `go test ./internal/extractor/structured ./internal/extractor/semtemporal ./internal/extractor/gorunner` in `/home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships`

### Why
- The user explicitly asked for an independent review.
- The earlier draft workspace already existed, so the highest-value move was to validate or reject its assumptions rather than regenerate similar prose.
- The requested feature crosses three repos and two runtimes, so code-backed validation mattered more than speculation.

### What worked
- The reference packages that matter most for this ticket all passed targeted tests:
  - `geppetto/pkg/events/structuredsink`
  - `pinocchio/pkg/webchat`
  - `pinocchio/cmd/web-chat/thinkingmode`
  - `temporal-relationships/internal/extractor/structured`
  - `temporal-relationships/internal/extractor/semtemporal`
  - `temporal-relationships/internal/extractor/gorunner`
- The code confirmed that `temporal-relationships` is a strong practical reference, not just an aspirational one.
- The local repo review surfaced concrete upgrade blockers rather than vague "needs refactor" language.

### What didn't work
- `go test ./...` in `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend` provided almost no protection because every package reported `[no test files]`.
- The current local prompt/output contract could not be reused for tagged YAML extraction because it still requires a single valid JSON object and parses only the final full response.

### What I learned
- The local websocket envelope already looks SEM-shaped enough that a superficial read could mistake it for a near-complete migration. The missing pieces are deeper: typed event production, structured extraction, projection, and canonical entity handling.
- The strongest reusable patterns are not only in pinocchio; the frontend projection model in `temporal-relationships/ui/src/ws/semProjection.ts` is especially relevant for this app because `cozodb-editor` does not need the full pinocchio webchat shell.

### What was tricky to build
- The main difficulty was separating "SEM-like envelope compatibility" from actual SEM architecture. The local code already emits `{sem:true,event:{...}}`, which can hide the fact that it still lacks registry-driven translation, typed payloads, and replayable entity state.
- Another tricky point was being precise about preview versus authoritative extraction. The reference implementations are explicit that preview events are UX-only, and that needed to stay true in the final design rather than getting blurred into persistence advice.

### What warrants a second pair of eyes
- The migration boundary between a lightweight local editor UI and pinocchio's heavier webchat conventions deserves one architectural review before implementation starts.
- The choice between pure JSON payloads inside custom SEM data versus first-class protobuf schemas for Cozo widget families should be reviewed before backend/frontend work begins.

### What should be done in the future
- Implement the design doc in phases rather than attempting a one-pass rewrite.
- Add tests in the local repo before or alongside the migration so behavior changes are observable outside the browser.

### Code review instructions
- Start with the primary design doc for the architectural recommendation.
- Then verify the local findings in:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/hints/engine.go`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/websocket.go`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx`
- Validate the reference patterns in:
  - `/home/manuel/code/wesen/corporate-headquarters/geppetto/pkg/events/structuredsink/filtering_sink.go`
  - `/home/manuel/code/wesen/corporate-headquarters/pinocchio/pkg/webchat/sem_translator.go`
  - `/home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/internal/extractor/semtemporal/register.go`
  - `/home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.ts`
- Re-run the validation commands listed above.

### Technical details
- Local surface-area counts captured during investigation:
  - `frontend/src/DatalogPad.jsx`: 1039 lines
  - `backend/pkg/api/websocket.go`: 201 lines
  - `backend/pkg/hints/engine.go`: 123 lines
- The local app currently uses direct Anthropic streaming and JSON post-processing.
- The reference stack uses geppetto typed events, `FilteringSink`, pinocchio SEM translation, and projected frontend entity state.

## Related

- Primary design doc: `../design-doc/01-independent-review-and-implementation-guide-for-geppetto-pinocchio-and-sem-extraction-widgets.md`
- Earlier draft analysis: `../analysis/01-geppetto-pinocchio-streaming-structured-extraction-architecture-analysis.md`

## Step 2: Validate the workspace and deliver the bundle to reMarkable

After the design doc and diary existed, I switched from analysis to delivery hygiene. The main job in this step was to ensure the ticket workspace was actually consistent according to `docmgr`, then package the right set of documents into one bundle and verify that the remote upload really landed.

The only issue `docmgr doctor` found was a legacy problem in the original index frontmatter: several stale relative related-file entries no longer resolved on disk. Once those were replaced with absolute file notes, the workspace validated cleanly and the upload path went through without further changes.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Finish the ticket as a proper deliverable, not just a local analysis, and upload the result to reMarkable with verification.

**Inferred user intent:** End with a review artifact that is documented, validated, and already delivered to the user's reading device.

### What I did
- Related the key source files to the design doc and diary via `docmgr doc relate`.
- Updated the changelog via `docmgr changelog update`.
- Ran `docmgr doctor --ticket COZODB-002 --stale-after 30`.
- Fixed the index's stale relative related-file entries by replacing them with absolute file notes.
- Ran:
  - `remarquee status`
  - `remarquee cloud account --non-interactive`
  - `remarquee upload bundle --dry-run ... --name "COZODB-002 Geppetto Pinocchio SEM Review" --remote-dir "/ai/2026/03/14/COZODB-002" --toc-depth 2`
  - `remarquee upload bundle ... --name "COZODB-002 Geppetto Pinocchio SEM Review" --remote-dir "/ai/2026/03/14/COZODB-002" --toc-depth 2`
  - `remarquee cloud ls /ai/2026/03/14/COZODB-002 --long --non-interactive`

### Why
- The user explicitly asked for upload to reMarkable when done.
- A ticket deliverable is incomplete if it cannot survive `docmgr doctor`.
- The dry-run step reduces avoidable upload mistakes.

### What worked
- `docmgr doctor` passed cleanly after fixing the stale index relations.
- `remarquee status` returned `remarquee: ok`.
- `remarquee cloud account --non-interactive` returned `user=wesen@ruinwesen.com sync_version=1.5`.
- Dry-run bundle generation succeeded with the expected five ticket documents.
- Real upload succeeded:
  - `OK: uploaded COZODB-002 Geppetto Pinocchio SEM Review.pdf -> /ai/2026/03/14/COZODB-002`
- Remote verification succeeded:
  - `[f]	COZODB-002 Geppetto Pinocchio SEM Review`

### What didn't work
- The first `remarquee cloud ls /ai/2026/03/14/COZODB-002 --long --non-interactive` ran before the upload finished and returned:
  - `Error: no matches for 'COZODB-002'`
- `docmgr doctor` initially failed on stale legacy relative file references in `index.md`.

### What I learned
- The current ticket workspace was structurally sound once the inherited index metadata was cleaned up.
- The upload race on the first listing attempt was purely timing-related, not a bundle-generation or auth failure.

### What was tricky to build
- The main sharp edge here was not document writing but metadata hygiene: `docmgr doctor` is strict about related file paths, so inherited relative entries that look plausible can still block a clean validation report.
- The listing check also had a timing dependency. Running it in parallel with the upload can produce a false-negative "no matches" result even when the upload itself is healthy.

### What warrants a second pair of eyes
- The uploaded bundle intentionally excludes the earlier draft analysis to avoid duplication. If someone expects the superseded draft to be part of the PDF, call that out explicitly in review.

### What should be done in the future
- When new implementation work lands for COZODB-002, update this ticket and re-upload an incremented bundle rather than starting a second ad-hoc workspace.

### Code review instructions
- Confirm the workspace validates locally:
  - `docmgr doctor --ticket COZODB-002 --stale-after 30`
- Confirm the upload target exists:
  - `remarquee cloud ls /ai/2026/03/14/COZODB-002 --long --non-interactive`
- Review the bundled documents in this order:
  - `../index.md`
  - `../design-doc/01-independent-review-and-implementation-guide-for-geppetto-pinocchio-and-sem-extraction-widgets.md`
  - `./01-investigation-diary.md`

### Technical details
- Bundle name: `COZODB-002 Geppetto Pinocchio SEM Review`
- Remote directory: `/ai/2026/03/14/COZODB-002`
- Included docs:
  - `index.md`
  - primary design doc
  - investigation diary
  - `tasks.md`
  - `changelog.md`

## Step 4: Replace the local hint runtime with geppetto while keeping the websocket contract stable

The first implementation slice focused on the narrowest backend seam that would materially reduce migration risk: swap out the direct Anthropic client in `backend/pkg/hints/engine.go`, keep the current websocket event shape intact for the frontend, and make the in-flight inference cancel when the websocket connection dies. That let me move the runtime closer to the target architecture without dragging SEM extraction and UI work into the same commit.

The key constraint in this step was preserving observable behavior while changing almost everything underneath it. The app still needs `llm.start`, `llm.delta`, `llm.error`, and `hint.result` for the current frontend, so the geppetto integration was intentionally introduced behind the existing `HintResponse` contract rather than forcing structured extraction into the same patch.

### Prompt Context

**User prompt (verbatim):** "ok build the tasks 1 by 1, commit at appropriate intervals, keep a diary"

**Assistant interpretation:** Execute the COZODB-002 implementation in staged slices, commit after coherent milestones, and record the work in detail so continuation and review stay easy.

**Inferred user intent:** Make real implementation progress now, but do it with enough discipline that the migration can be audited and resumed cleanly.

**Commit (code):** `9af6a58` — `backend(hints): switch streaming inference to geppetto`

### What I did
- Updated `backend/go.mod` to add the geppetto dependency, stage the local pinocchio replace path, and align the backend module with the Go toolchain level required by the reference repos.
- Replaced the direct Anthropic SDK code in `backend/pkg/hints/engine.go` with:
  - geppetto step-settings construction for Claude
  - an engine built via `factory.NewEngineFromStepSettings(...)`
  - session-driven inference via `session.NewSession()` and `enginebuilder.New(...)`
  - final text recovery from the generated turn while preserving the existing `HintResponse` parser
- Added `backend/pkg/hints/streaming_sink.go` to bridge geppetto `partial` and `final` events back into the current `DeltaCallback`.
- Updated `backend/pkg/api/websocket.go` so hint and diagnosis requests inherit a websocket-scoped context instead of running on `context.Background()`.
- Ran:
  - `gofmt -w backend/pkg/hints/engine.go backend/pkg/hints/streaming_sink.go backend/pkg/api/websocket.go`
  - `cd backend && go test ./...`
  - `env GOTOOLCHAIN=auto go test ./...`
  - `env GOTOOLCHAIN=auto go mod tidy`
  - `env GOTOOLCHAIN=auto go test ./...`

### Why
- The old engine was the highest-risk backend blocker because it bypassed geppetto entirely and made the later structured extraction work much harder.
- Keeping the websocket contract stable reduces the number of moving parts per commit and gives the frontend a functioning fallback state while the SEM path is still being built.
- Context propagation had to be fixed now because a geppetto-based stream is more expensive than the original direct client call and should not survive a dead websocket.

### What worked
- The backend now runs through geppetto while still producing the current delta and result events expected by the frontend.
- The session-based integration gives the ticket a real engine-builder seam and step-controller foothold instead of another provider-specific one-off.
- `env GOTOOLCHAIN=auto go test ./...` passed in `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend`.

### What didn't work
- The first validation run failed with the pre-existing backend toolchain level:
  - Command: `cd backend && go test ./...`
  - Error: `go: module ../../corporate-headquarters/geppetto requires go >= 1.25.8 (running go 1.25.5)`
- After bumping the backend module once, the staged pinocchio wiring exposed the next toolchain boundary:
  - Command: `env GOTOOLCHAIN=auto go test ./...`
  - Error: `go: module ../../corporate-headquarters/pinocchio requires go >= 1.26.1 (running go 1.25.8)`
- `go test` then reported a dependency graph drift until the module was normalized:
  - Error: `go: updates to go.mod needed; to update it: go mod tidy`

### What I learned
- The practical toolchain floor for COZODB-002 backend work is already driven by the checked-out reference repos, not by the original `cozodb-editor` module.
- It is possible to move to geppetto now without committing to SEM payloads yet, as long as the adapter layer preserves the current websocket contract.
- Keeping pinocchio in `replace` form but deferring the actual import is the cleanest way to avoid mixing SEM translation work into this first slice.

### What was tricky to build
- The sharp edge in this step was separating "runtime migration" from "protocol migration". If I had changed the engine, websocket event schema, and frontend rendering at once, a failure would have been much harder to localize.
- Another subtle point was final text recovery. The current app still wants a single `HintResponse` object at the end, while geppetto naturally yields event streams plus generated blocks on the updated turn. The implementation had to use streaming deltas for live UX and still recover authoritative assistant text from the final turn.

### What warrants a second pair of eyes
- The backend now depends on the newer Go toolchain level required by geppetto and pinocchio. That is probably correct, but it should be reviewed as an intentional project-wide constraint before more slices land.
- The current adapter still translates the geppetto output back into the legacy `HintResponse` shape. That is necessary for this slice, but reviewers should confirm that later extraction work fully replaces it instead of accreting another compatibility layer.

### What should be done in the future
- Introduce the extractor family types and `FilteringSink` next, because that is the real bridge from plain text streaming to Cozo-specific structured events.
- Add the actual pinocchio translator import only when `WebSocketSEMSink` lands, so the next slice has a single clear purpose.
- Add backend tests around the geppetto sink bridge once the structured extraction path exists, so event-family regressions become visible.

### Code review instructions
- Start with:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/hints/engine.go`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/hints/streaming_sink.go`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/websocket.go`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/go.mod`
- Verify the behavior and dependency state with:
  - `env GOTOOLCHAIN=auto go test ./...`
- Confirm that the websocket still emits the old frontend-facing event family while the inference backend is now geppetto-backed.

### Technical details
- geppetto integration path:
  - `factory.NewEngineFromStepSettings(...)`
  - `session.NewSession()`
  - `enginebuilder.New(enginebuilder.WithBase(...), enginebuilder.WithEventSinks(...), enginebuilder.WithStepController(...))`
- Claude runtime settings used in this slice:
  - model default: `claude-sonnet-4-20250514`
  - base URL: `https://api.anthropic.com`
  - env override for model: `ANTHROPIC_MODEL`
- Validation command that passed:
  - `env GOTOOLCHAIN=auto go test ./...`

## Step 5: Add the structured extraction and SEM translation pipeline behind the existing websocket UX

Once the runtime was geppetto-backed, the next job was to make the output stream carry real structured Cozo artifacts instead of only plain deltas and a final compatibility card. I kept the old `hint.result` path alive for the existing frontend, but added the actual extraction pipeline underneath it: tagged YAML blocks in the prompt contract, preview extraction through `FilteringSink`, authoritative extraction from the final assistant text, and websocket SEM forwarding through pinocchio for the new `cozo.*` event families.

The most important design choice in this step was to split preview and authoritative extraction exactly the way the reference repos do. The `FilteringSink` sessions only emit transient preview events while the model is still streaming, and the final parsed assistant text produces the authoritative `extracted` or `failed` events after inference completes. That keeps the system honest about what is and is not durable.

### Prompt Context

**User prompt (verbatim):** (same as Step 4)

**Assistant interpretation:** Continue implementing the next backend tasks in order, commit a coherent extraction/SEM slice, and keep the ticket record detailed enough for continuation.

**Inferred user intent:** Turn the design doc into a real streaming/extraction backend rather than stopping at the engine swap.

**Commit (code):** `9ef88f6` — `backend(sem): add structured extraction event pipeline`

### What I did
- Added Cozo payload schemas in `backend/pkg/hints/structured_types.go`:
  - `HintPayload`
  - `QuerySuggestionPayload`
  - `DocRefPayload`
  - optional `AnchorPayload`
- Added generic Cozo extraction event types in `backend/pkg/hints/structured_events.go` for:
  - preview
  - extracted
  - failed
- Implemented typed preview extractors in `backend/pkg/hints/structured_extractors.go` using the same `ContextPayloadExtractor[T]` shape as the `temporal-relationships` reference.
- Added authoritative full-text parsing in `backend/pkg/hints/structured_parser.go`, which:
  - strips `<cozo:...:v1>` blocks from visible text
  - parses YAML payloads into typed structs
  - emits `extracted` or `failed` events
  - synthesizes the legacy `HintResponse` for the current frontend
- Added `backend/pkg/hints/extraction_config.yaml` plus `backend/pkg/hints/extraction_config.go` and rewrote `backend/pkg/hints/prompt.go` to instruct the model to emit tagged YAML blocks instead of final JSON.
- Updated `backend/pkg/hints/engine.go` to:
  - wrap the stream in `FilteringSink`
  - send preview events during streaming
  - parse the final assistant text authoritatively
  - forward extracted/failed events to downstream sinks
- Added pinocchio SEM registration in `backend/pkg/hints/sem_registry.go` for:
  - `cozo.hint.preview|extracted|failed`
  - `cozo.query_suggestion.preview|extracted|failed`
  - `cozo.doc_ref.preview|extracted|failed`
- Added `backend/pkg/api/ws_sem_sink.go` and wired it into `backend/pkg/api/websocket.go` so custom extraction events are translated into websocket SEM envelopes using pinocchio's `EventTranslator`.
- Added backend tests:
  - `backend/pkg/hints/structured_parser_test.go`
  - `backend/pkg/hints/sem_registry_test.go`
- Ran:
  - `gofmt -w backend/pkg/hints/*.go backend/pkg/api/*.go`
  - `env GOTOOLCHAIN=auto go mod tidy`
  - `env GOTOOLCHAIN=auto go test ./...`

### Why
- The migration would not become UI-ready until the backend emitted stable semantic artifacts rather than one opaque final blob.
- Prompt changes, preview extraction, authoritative parsing, and SEM registration belong together because they define one contract.
- Keeping the existing `hint.result` compatibility response avoids coupling this backend milestone to the later frontend SEM migration.

### What worked
- The backend now emits custom Cozo semantic event families over the websocket without breaking the current frontend.
- Preview extraction happens during streaming, while final extraction happens from the completed assistant text, matching the reference architecture.
- `env GOTOOLCHAIN=auto go test ./...` passed with the new pinocchio dependency and the added backend tests.

### What didn't work
- After introducing the actual pinocchio imports, the backend failed until the module graph was normalized:
  - Command: `env GOTOOLCHAIN=auto go test ./...`
  - Error: `module github.com/go-go-golems/pinocchio provides package ... and is replaced but not required; to add it: go get github.com/go-go-golems/pinocchio`
- That required a second normalization pass:
  - Command: `env GOTOOLCHAIN=auto go mod tidy`
- The prompt migration also forced a compatibility rewrite: the old JSON parser could no longer be kept once tagged YAML became the source of truth.

### What I learned
- The cleanest way to preserve the old UI while moving to structured extraction is to derive the legacy `HintResponse` from the authoritative extracted payloads rather than trying to keep two prompt formats alive.
- pinocchio can be introduced incrementally if the websocket sink forwards only the new custom extraction event types for now and leaves the legacy `llm.*` transport untouched.
- The Cozo families are small enough that an explicit typed parser is more maintainable than a fully generic reflection-heavy approach.

### What was tricky to build
- The hardest part was identity consistency between preview and final events. The `FilteringSink` assigns `item_id`s based on stream order, so the final parser had to mirror that ordering scheme to make preview-to-final replacement possible later in the frontend projection layer.
- Another sharp edge was avoiding duplicated `llm.*` events. pinocchio's default handlers would happily translate start, delta, and final model events too, but the current frontend still expects the older hand-written shapes. The websocket SEM sink therefore only forwards the new custom Cozo events in this slice.

### What warrants a second pair of eyes
- The prompt contract is now materially different: it depends on the model reliably producing valid tagged YAML blocks. Reviewers should read the extraction config and prompt text together, not in isolation.
- The compatibility path from extracted payloads back into `HintResponse` is intentionally temporary. It should be reviewed to ensure it does not become the permanent source of truth once the frontend SEM widgets land.

### What should be done in the future
- Implement the frontend SEM projection and Cozo widget rendering next so the new `cozo.*` events become visible in the UI.
- Retire the legacy `hint.result` path once the frontend can consume `llm.final` plus `cozo.*.extracted` directly.
- Add frontend tests for preview-to-final merges using the item IDs now emitted by the backend.

### Code review instructions
- Start with:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/hints/structured_extractors.go`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/hints/structured_parser.go`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/hints/sem_registry.go`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/ws_sem_sink.go`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/hints/prompt.go`
- Then validate:
  - `env GOTOOLCHAIN=auto go test ./...`
- Review the tests to confirm both the extraction and translation behavior:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/hints/structured_parser_test.go`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/hints/sem_registry_test.go`

### Technical details
- Structured family tags introduced in this slice:
  - `<cozo:hint:v1>`
  - `<cozo:query_suggestion:v1>`
  - `<cozo:doc_ref:v1>`
- New websocket semantic event types introduced:
  - `cozo.hint.preview`
  - `cozo.hint.extracted`
  - `cozo.hint.failed`
  - `cozo.query_suggestion.preview`
  - `cozo.query_suggestion.extracted`
  - `cozo.query_suggestion.failed`
  - `cozo.doc_ref.preview`
  - `cozo.doc_ref.extracted`
  - `cozo.doc_ref.failed`
- Validation commands that passed:
  - `env GOTOOLCHAIN=auto go mod tidy`
  - `env GOTOOLCHAIN=auto go test ./...`

## Step 3: Update the COZODB-002 UI plan after the frontend decomposition landed

After COZODB-003 was implemented, the frontend assumptions in COZODB-002 were no longer accurate enough. The original plan still described the browser as if the main migration task were "split the JSX first". That was true when the review was first written, but it stopped being the correct starting point once the repo gained explicit `transport`, `editor`, `sem`, `features`, and `theme` seams plus projection tests. The right move here was therefore to update the COZODB-002 design doc and tasks so the ticket now points at the real codebase rather than the pre-refactor snapshot.

This was not just a wording cleanup. The UI section needed to change from a general recommendation into a concrete file-level plan. The new version now explains how COZODB-002 should extend `frontend/src/sem/semProjection.js`, keep `frontend/src/DatalogPad.jsx` thin, route widget insertion through `frontend/src/editor/usePadDocument.js`, and add new Cozo SEM widgets under `frontend/src/features/` instead of inventing another frontend architecture from scratch.

### Prompt Context

**User prompt (verbatim):** "Now update the cozodb-002 plan with a detailed UI section now that this is all updated."

**Assistant interpretation:** Revise the existing COZODB-002 implementation guide to reflect the completed COZODB-003 frontend decomposition and add a much more concrete UI migration section.

**Inferred user intent:** Make COZODB-002 directly actionable from the current repository state, especially on the frontend side, without forcing future implementers to mentally reconcile two different frontend architectures.

### What I did
- Re-read the current COZODB-002 design doc and task list.
- Re-read the current frontend module tree and key implementation seams:
  - `frontend/src/transport/hintsSocket.js`
  - `frontend/src/editor/usePadDocument.js`
  - `frontend/src/sem/semProjection.js`
  - `frontend/src/features/...`
  - `frontend/src/theme/...`
- Updated the COZODB-002 design doc to:
  - note the frontend decomposition as the new starting point,
  - add a detailed post-COZODB-003 UI architecture section,
  - define the target browser pipeline,
  - describe the widget/file plan in concrete terms,
  - rewrite the frontend implementation phases to match the current repo.
- Expanded the COZODB-002 task list with granular UI tasks for:
  - SEM handler registration,
  - projection extension,
  - Cozo widget modules,
  - anchor-aware rendering,
  - frontend tests.
- Updated the changelog to record the plan refresh.

### Why
- A migration plan that still assumes the old frontend monolith will mislead implementers now that the decomposition already exists.
- The most useful COZODB-002 frontend guidance is no longer "create seams". It is "extend these exact seams correctly".

### What worked
- The current frontend structure made the rewrite straightforward because the new seams are clear and already validated.
- The updated task list is materially more actionable than the older generic items like "Build SEM projection layer" or "Build rich widget components".

### What didn't work
- Nothing failed technically in this update. The main issue was conceptual drift between the original design doc and the current repository state.

### What I learned
- Once a preparatory ticket like COZODB-003 lands, upstream architecture tickets need to be refreshed quickly or they start encoding obsolete sequencing advice.
- The best UI plan for COZODB-002 is now narrower and stronger at the same time: narrower because decomposition is done, stronger because the remaining work is anchored to actual files.

### What was tricky to build
- The tricky part was preserving the historical review findings while still making the doc useful as a current implementation plan. I handled that by keeping the original finding as evidence and explicitly adding a post-COZODB-003 update note plus a new detailed UI architecture section.

### What warrants a second pair of eyes
- The final naming/location for the new Cozo SEM widget modules under `frontend/src/features/` is still a design choice. The plan currently recommends `frontend/src/features/cozo-sem/`, which is coherent with the rest of the decomposition, but the implementation team should keep the naming consistent across widgets, view models, and renderer dispatch.

### What should be done in the future
- When COZODB-002 implementation starts for real, update the ticket again as the temporary `hint.result` compatibility path is removed.
- If the UI implementation changes the chosen file layout, refresh the design doc immediately rather than letting the plan drift again.

### Code review instructions
- Review the updated UI architecture section in:
  - `../design-doc/01-independent-review-and-implementation-guide-for-geppetto-pinocchio-and-sem-extraction-widgets.md`
- Review the expanded UI task list in:
  - `../tasks.md`
- Cross-check the current frontend seams in:
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/transport/hintsSocket.js`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/editor/usePadDocument.js`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/sem/semProjection.js`
  - `/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx`

### Technical details
- Commands run during this step:
  - `find frontend/src -maxdepth 3 -type f | sort`
  - `sed -n '1,240p' frontend/src/sem/semProjection.js`
  - `sed -n '1,220p' frontend/src/transport/hintsSocket.js`
  - `rg -n "DatalogPad|frontend|projection|widget|UI|semProjection|transport|monolith" .../COZODB-002.../design-doc/...md`
- Files updated:
  - `ttmp/2026/03/14/COZODB-002--geppetto-pinocchio-streaming-structured-extraction-for-sem-frame-rich-widgets/design-doc/01-independent-review-and-implementation-guide-for-geppetto-pinocchio-and-sem-extraction-widgets.md`
  - `ttmp/2026/03/14/COZODB-002--geppetto-pinocchio-streaming-structured-extraction-for-sem-frame-rich-widgets/tasks.md`
  - `ttmp/2026/03/14/COZODB-002--geppetto-pinocchio-streaming-structured-extraction-for-sem-frame-rich-widgets/changelog.md`
