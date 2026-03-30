---
Title: SQLite notebook preset with backend runtime and frontend surface
Ticket: COZODB-016
Status: complete
Topics:
    - architecture
    - backend
    - frontend
    - sqlite
    - notebook
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: backend/main.go
      Note: Backend preset switch point that will expose the SQLite preset
    - Path: backend/pkg/notebook/runtime.go
      Note: Shared backend notebook runtime seam for the new SQLite preset
    - Path: frontend/src/App.tsx
      Note: Frontend preset switch point that will expose the SQLite preset
    - Path: frontend/src/notebook/currentJavaScriptConfig.ts
      Note: Reference preset config to mirror for SQLite
ExternalSources: []
Summary: ""
LastUpdated: 2026-03-23T01:02:00-04:00
WhatFor: Track the design and implementation of a third notebook preset that exposes SQLite on both backend and frontend using the shared notebook package seams.
WhenToUse: Use when implementing or reviewing the SQLite preset, locating the ticket docs, or onboarding an engineer to this preset-specific work.
---


# SQLite notebook preset with backend runtime and frontend surface

## Overview

This ticket adds SQLite as a sibling preset to Cozo and JavaScript. The backend work is a SQLite runtime plus a current-preset constructor; the frontend work is a current SQLite notebook wrapper, config, and Storybook/MSW coverage. The work intentionally follows the same preset architecture that `COZODB-014` used for JavaScript.

## Key Links

- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field
- **Design Guide**: [design-doc/01-sqlite-notebook-preset-implementation-guide.md](./design-doc/01-sqlite-notebook-preset-implementation-guide.md)
- **Diary**: [reference/01-sqlite-preset-implementation-diary.md](./reference/01-sqlite-preset-implementation-diary.md)
- **Inventory Script**: [scripts/01-sqlite-preset-surface-inventory.sh](./scripts/01-sqlite-preset-surface-inventory.sh)
- **Inventory Output**: [sources/01-sqlite-preset-surface-inventory.txt](./sources/01-sqlite-preset-surface-inventory.txt)

## Status

Current status: **complete**

## Topics

- architecture
- backend
- frontend
- sqlite
- notebook

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
