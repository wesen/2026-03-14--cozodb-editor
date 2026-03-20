---
Title: Pinocchio Geppetto bootstrap migration and documentation QA
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
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: 2026-03-14--cozodb-editor/backend/main.go
      Note: Glazed backend entrypoint now resolves inference settings through Pinocchio profile/bootstrap
    - Path: 2026-03-14--cozodb-editor/backend/pkg/hints/engine.go
      Note: Hints engine now accepts resolved InferenceSettings directly
    - Path: pinocchio/pkg/doc/tutorials/07-migrating-cli-verbs-to-glazed-profile-bootstrap.md
      Note: Primary source tutorial for the migration plan and documentation QA criteria
ExternalSources: []
Summary: Tutorial-driven migration ticket for moving a CozoDB editor Pinocchio integration onto the Glazed and profile bootstrap path while tracking documentation clarity gaps.
LastUpdated: 2026-03-19T18:48:16.004253023-04:00
WhatFor: Plan a tutorial-driven migration onto the modern Pinocchio and Geppetto bootstrap path and record where the source tutorial is clear or incomplete.
WhenToUse: Use when identifying the CozoDB editor Pinocchio integration point, porting it to the Glazed profile bootstrap stack, or reviewing the migration tutorial for quality gaps.
---



# Pinocchio Geppetto bootstrap migration and documentation QA

## Overview

This ticket captures a migration plan for moving the relevant CozoDB editor Pinocchio integration onto the modern Glazed plus profile bootstrap path described in `pinocchio/pkg/doc/tutorials/07-migrating-cli-verbs-to-glazed-profile-bootstrap.md`.

The current ticket is intentionally source-bounded. It only uses that tutorial plus local `docmgr` scaffolding, so repo-specific implementation details that are not explicit in the tutorial are left as discovery tasks instead of being guessed.

## Key Links

- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field
- **Implementation guide**: `design-doc/01-pinocchio-geppetto-bootstrap-migration-implementation-guide.md`
- **Diary**: `reference/01-diary.md`

## Status

Current status: **active**

Planning and documentation are in place. Repository-specific implementation work has not started yet because the tutorial does not identify the exact CozoDB editor entrypoint that should be migrated.

## Topics

- backend
- geppetto
- pinocchio
- glazed
- migration
- profiles
- config

## Tasks

See [tasks.md](./tasks.md) for the current task list.

## Changelog

See [changelog.md](./changelog.md) for recent changes and decisions.

## Structure

- design/ - Architecture and design documents
- reference/ - Prompt packs, API contracts, context summaries
- playbooks/ - Command sequences and test procedures
- scripts/ - Temporary code and tooling
- various/ - Working notes and research
- archive/ - Deprecated or reference-only artifacts
