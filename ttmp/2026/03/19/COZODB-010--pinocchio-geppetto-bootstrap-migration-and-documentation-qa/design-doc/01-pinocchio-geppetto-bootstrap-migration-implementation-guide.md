---
Title: Pinocchio Geppetto bootstrap migration implementation guide
Ticket: COZODB-010
Status: active
Topics:
    - backend
    - geppetto
    - pinocchio
    - glazed
    - migration
    - profiles
    - config
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: 2026-03-14--cozodb-editor/backend/main.go
      Note: Server bootstrap entrypoint that initializes the hints engine from environment state
    - Path: 2026-03-14--cozodb-editor/backend/pkg/api/websocket.go
      Note: Fallback messaging updated to match provider-agnostic bootstrap semantics
    - Path: 2026-03-14--cozodb-editor/backend/pkg/hints/engine.go
      Note: Actual server-side migration seam and first Geppetto API update
    - Path: 2026-03-14--cozodb-editor/backend/pkg/hints/engine_test.go
      Note: Regression tests covering the updated constructor path
    - Path: 2026-03-14--cozodb-editor/backend/main_test.go
      Note: Regression tests locking the lean CLI surface and app-owned profile defaulting behavior
    - Path: pinocchio/pkg/doc/tutorials/07-migrating-cli-verbs-to-glazed-profile-bootstrap.md
      Note: Only consulted technical source for the migration recipe captured in this design doc
ExternalSources: []
Summary: Tutorial-driven migration plan and documentation quality review for moving a CozoDB editor Pinocchio integration onto the modern Glazed and profile bootstrap path.
LastUpdated: 2026-03-19T18:48:16.044433756-04:00
WhatFor: Translate the tutorial into an implementation plan for the CozoDB editor codebase while keeping tutorial-derived facts separate from repo-specific unknowns.
WhenToUse: Use when porting the current Pinocchio integration, reviewing migration readiness, or checking whether the tutorial is sufficiently clear for another engineer to execute.
---




# Pinocchio Geppetto bootstrap migration implementation guide

## Executive Summary

The tutorial describes a standard migration path from hand-wired Cobra verbs to the modern Pinocchio and Geppetto bootstrap stack. The end state is a command that declares its own flags with Glazed, mounts shared Geppetto sections, loads Pinocchio config through the profile bootstrap mapper, resolves final merged `InferenceSettings`, and exposes parsed-field plus inference provenance debug exits.

For CozoDB editor, this ticket turns that tutorial into a bounded implementation plan and a documentation-quality review. Because this document is intentionally based on the tutorial only, the first implementation step is to locate the exact CozoDB editor command or bootstrap seam that still behaves like the pre-migration pattern. Until that discovery happens, this guide should be treated as a migration recipe and checklist, not as a file-by-file patch plan.

That discovery and port are now in place. The backend entrypoint has been moved onto a Glazed-built Cobra command, but the final shape is narrower than the first port: only the server flags plus `profile` and `profile-registries` remain visible, while hidden base sections are still used to resolve inference settings. The bootstrap is now application-owned under the `cozodb-editor` config and env namespace, and the app applies `gpt-5-mini` as its implicit profile when profile registries are configured.

## Problem Statement

The tutorial names the recurring failure modes of the old approach:

- config loading drifts between verbs,
- profile and profile-registry handling diverges,
- and debugging is weak because parsed-field and provenance output are missing.

If the CozoDB editor codebase still has a Pinocchio-backed CLI or bootstrap entrypoint that uses raw Cobra flags or a bespoke initialization path, it will likely inherit the same problems. The repository-specific problem is not yet fully identified from the tutorial alone, so this ticket must solve two problems at once:

1. Port the relevant integration to the new bootstrap API.
2. Validate whether the tutorial is clear enough for that port to be executed without hidden repo knowledge.

## Proposed Solution

Use the tutorial as the canonical migration recipe and adapt it to the actual downstream constraints:

1. Replace local, imperative Cobra flag registration with a `cmds.CommandDescription` that declares the verb-specific flags and arguments.
2. Use the shared Geppetto base sections as hidden bootstrap inputs, not necessarily as visible command flags.
3. Expose only the application’s intended command surface. For CozoDB editor, that means server flags plus `profile` and `profile-registries`, not the full Geppetto flag set.
4. Rebuild the Cobra command through `cli.BuildCobraCommandFromCommand(...)` and initialize the root with `clay.InitGlazed(...)` plus `logging.InitLoggerFromCobra(...)`.
5. Replace any default config-file loading path with a middleware chain that still uses the Pinocchio config mapper. The tutorial’s generic “use Glazed config loading” guidance is insufficient for real Pinocchio-shaped configs because top-level keys like `repositories` are not section maps.
6. Resolve the final merged engine settings exactly once through the shared bootstrap machinery, but with an application-owned `AppBootstrapConfig` instead of inheriting the `pinocchio` app name directly.
7. Build engines or runtime defaults from `resolved.FinalInferenceSettings`, not from raw profile payloads.
8. If the application wants a default profile, apply it at the application layer when registries are present instead of blindly making it a CLI default. For CozoDB editor, the effective default profile is `gpt-5-mini`.
9. Run the translated validation checklist, translated to the actual CozoDB editor command path.
10. Perform a documentation QA pass that records where the tutorial was clear, where implementation required extra discovery, and which instructions should be tightened.

The expected deliverable is not just migrated code. It is migrated code plus a written record of whether the tutorial was sufficient for another engineer to reproduce the port with minimal guesswork.

At this point, the main repository-specific discovery is complete: the active migration seam is the embedded hints-engine bootstrap in `backend/pkg/hints/engine.go`, initialized from `backend/main.go`. The final implementation keeps the server shape but still ports it onto a real Glazed plus Cobra command, so the tutorial now maps both conceptually and structurally.

## Design Decisions

### Keep the migration recipe tutorial-first

The tutorial already provides a coherent architecture: declarative command description, shared sections, a Pinocchio-aware middleware chain, and a single settings-resolution step. This ticket adopts that shape directly instead of inventing a CozoDB-specific variant.

### Treat repo discovery as an explicit first-class task

The tutorial is strong on the destination architecture but does not identify which CozoDB editor file or command corresponds to the example `pinocchio js` verb. Rather than guessing, the ticket makes repository discovery a visible prerequisite.

That discovery pointed at a server bootstrap path, not a CLI verb. The practical consequence was to preserve runtime behavior while wrapping the server in a Glazed command and driving inference through Pinocchio profile/bootstrap instead of hand-built environment parsing.

### Use final merged settings as the only engine-construction baseline

The tutorial explicitly calls out the runtime bug caused by building from raw profile data alone. This ticket therefore treats `resolved.FinalInferenceSettings` as the only acceptable source of truth for engine creation or JS runtime defaults.

### Make documentation review part of the implementation

The user asked for both a port and a documentation-quality validation. That means every unclear step, hidden assumption, or missing “how do I map this to my repo?” moment must be documented during implementation rather than remembered afterward.

### Adapt the tutorial, do not force a fake Cobra command

The tutorial assumes a CLI verb. CozoDB editor exposed an HTTP server whose hints engine was configured directly from environment variables inside `hints.NewEngine()`. The implemented migration borrows the tutorial’s settings-resolution ideas and wraps the server in a real Glazed command, but keeps the long-running server behavior intact.

### Keep the visible CLI lean while still using hidden base sections

The first deep port mounted the full Geppetto sections directly on the command. That matched the tutorial literally but produced the wrong UX for this backend. The final implementation keeps only server flags plus `profile` and `profile-registries` visible, while the hidden base sections remain part of bootstrap resolution through `geppetto/pkg/cli/bootstrap`.

### Own the bootstrap config at the application layer

The tutorial centers the `pinocchio` app. CozoDB editor now uses its own bootstrap config with `AppName: cozodb-editor` and `EnvPrefix: COZODB_EDITOR`, while still reusing the Pinocchio config mapper and Geppetto base sections. This is the right downstream pattern when an app wants shared mechanics but not another application’s config namespace.

### Use an implicit default profile instead of a literal flag default

Setting `gpt-5-mini` as the literal `--profile` default looked attractive at first but would have forced the backend to require profile registries on every launch. The final implementation applies `gpt-5-mini` only when registries are configured and leaves base-only startup untouched.

## Alternatives Considered

### Patch the existing Cobra command in place without moving to Glazed

Rejected. The tutorial’s whole point is that patching one more local flag or config path preserves drift instead of removing it.

### Inspect the whole repository first and write a file-specific design now

Rejected for this ticket-creation pass. The user asked to use the migration tutorial only as far as possible, so this document avoids pretending that unretrieved repository context is already known.

### Treat documentation review as a follow-up after code lands

Rejected. The prompt requires the clarity review to happen alongside the migration, and the diary needs to capture confusion when it happens.

## Implementation Plan

1. Confirm the embedded hints-engine bootstrap in `backend/pkg/hints/engine.go` and `backend/main.go` as the migration target.
2. Preserve current runtime behavior while replacing removed Geppetto API calls with the current `InferenceSettings` plus engine-factory helpers.
3. Wrap the server in a Glazed command and route environment, optional config, defaults, and profiles through the Pinocchio-aware bootstrap helpers instead of hand-merging values.
4. Add debug exits that fit a server process:
   - `--print-parsed-fields`
   - `--print-inference-settings`
   - `--print-inference-settings-sources`
5. Redact provider secrets from the debug exits so the new diagnostics are safe to use on a workstation with real credentials loaded.
6. If the service later exposes JS profile helpers, pass the final merged settings into runtime defaults before profile-derived engine construction.
7. Run the translated validation checklist:
   - `<command> --help`
   - `<command>` to verify base-only startup still works with no registries
   - `<command> --profile <slug>` to verify missing registries fail cleanly
   - targeted Go tests for the command package
   - targeted Go tests for any bootstrap or profile package touched by the migration
8. Update the tutorial-quality notes with:
   - what mapped cleanly,
   - what required lookup,
   - what wording was ambiguous,
   - and which examples need stronger generalization outside `pinocchio js`.

## Open Questions

1. Should CozoDB editor eventually grow its own profile-registry discovery convention under the `cozodb-editor` namespace, or is explicit `--profile-registries`/config sufficient?
2. Which additional integration tests would best cover the server startup path without depending on the full cgo-backed runtime?
3. Is the tutorial clear enough on how to select the right migration target in a repo that is not the Pinocchio CLI itself?
4. The tutorial names several “most useful reference files” but does not say when those files become mandatory to consult. Should that escalation path be made more explicit?
5. The validation checklist is Pinocchio-specific. Should the tutorial explain more directly how to generalize those commands for downstream repositories?
6. The tutorial recommends shared bootstrap/config wiring, but does not say clearly when visible command flags should be narrower than the hidden bootstrap sections. Should that distinction be explicit?
7. The tutorial does not warn that generic Glazed config loading can fail on Pinocchio-shaped configs unless the Pinocchio mapper is preserved. Should that constraint be documented?
8. The tutorial recommends debug exits but does not warn that they may leak secrets if the raw settings object is printed. Should it explicitly require redaction?

## References

- Source tutorial used for this ticket: `pinocchio/pkg/doc/tutorials/07-migrating-cli-verbs-to-glazed-profile-bootstrap.md`
- Follow-up references named by the tutorial, but not yet consulted during this ticket-creation pass:
  - `pinocchio/cmd/pinocchio/cmds/js.go`
  - `pinocchio/pkg/cmds/profilebootstrap`
  - `pinocchio/pkg/cmds/cmdlayers/helpers.go`
  - `geppetto/pkg/sections`
