---
Title: CozoDB Notebook Playground
Ticket: COZODB-005
Status: active
Topics:
    - architecture
    - frontend
    - cozodb
    - ai-completion
DocType: index
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources:
    - local:01-cozodb-notebook.md
Summary: ""
LastUpdated: 2026-03-15T20:10:00-04:00
WhatFor: Track the notebook-playground redesign for the CozoDB editor and collect the design, source proposal, SQLite storage plan, tasks, and diary for the work.
WhenToUse: Use when continuing COZODB-005 or locating the notebook-playground plan, storage strategy, and imported source material.
---


# CozoDB Notebook Playground

## Overview

This ticket explores how to evolve the current CozoDB editor from a line-oriented Datalog pad into a cell-based notebook playground. The imported proposal argues for a full notebook pivot, and the local design doc now narrows that into a first implementation focused on:

- a real notebook document model,
- code and markdown cells,
- cell-owned execution outputs,
- AI bundles attached under cells,
- SQLite notebook persistence owned by `cozodb-editor`,
- Pinocchio's existing timeline store reused unchanged in the same SQLite file,
- and a deliberately conservative first scope that postpones deeper hydration UI complexity.

The first implementation slice is now in place in the application code: the app boots into a notebook page, notebooks and cells are persisted in SQLite, per-cell runs are tracked and hydrated, and AI widgets render under cells via `ownerCellId`.

## Key Links

- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field
- **Design guide**: [design-doc/01-cozodb-notebook-playground-architecture-and-intern-guide.md](./design-doc/01-cozodb-notebook-playground-architecture-and-intern-guide.md)
- **UX brief**: [design-doc/02-ux-brief-phase-3-notebook-runtime-and-authoring.md](./design-doc/02-ux-brief-phase-3-notebook-runtime-and-authoring.md)
- **Diary**: [reference/01-investigation-diary.md](./reference/01-investigation-diary.md)
- **Tasks**: [tasks.md](./tasks.md)

## Status

Current status: **active**

## Topics

- architecture
- frontend
- cozodb
- ai-completion

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
