---
Title: Resolve origin-main merge conflicts between notebook modularization and CozoScript editor integration
Ticket: COZODB-015
Status: active
Topics:
    - merge-conflict
    - frontend
    - notebook
    - codemirror
    - packaging
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: frontend/package-lock.json
      Note: Mechanical conflict that should be regenerated after package reconciliation
    - Path: frontend/src/editor/CozoScriptEditor.tsx
      Note: Incoming editor implementation that should survive the merge as the code-cell editor surface
    - Path: frontend/src/notebook/NotebookCellCard.tsx
      Note: Primary semantic merge hotspot where the remote editor branch intersects the local card/view split
    - Path: frontend/src/notebook/NotebookPage.tsx
      Note: Primary semantic merge hotspot where the remote keyboard changes intersect the local page/controller split
    - Path: frontend/src/notebook/useNotebookPageController.ts
      Note: Current non-conflicted target that should absorb the remote page keyboard behavior
ExternalSources: []
Summary: ""
LastUpdated: 2026-03-22T22:14:02.738075197-04:00
WhatFor: Track the documentation and execution plan for resolving the current origin/main merge conflict between the notebook modularization line and the incoming CozoScript editor integration line.
WhenToUse: Use when coordinating the current merge resolution, finding the relevant design and reference docs, or reviewing the intended semantic merge strategy before code changes begin.
---


# Resolve origin-main merge conflicts between notebook modularization and CozoScript editor integration

## Overview

This ticket documents how to resolve the current merge from `origin/main` without regressing either the newer notebook package architecture or the incoming CozoScript CodeMirror editor integration. The conflict is concentrated in two frontend notebook files plus two mechanical files, and the intended strategy is a semantic merge: preserve the local modular structure while porting the remote editor and keyboard behavior into the correct post-refactor surfaces.

## Key Links

- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field
- **Design Guide**: [design-doc/01-merge-conflict-resolution-analysis-design-and-implementation-guide.md](./design-doc/01-merge-conflict-resolution-analysis-design-and-implementation-guide.md)
- **Evidence Notes**: [reference/01-merge-conflict-evidence-and-notes.md](./reference/01-merge-conflict-evidence-and-notes.md)
- **Inventory Script**: [scripts/01-merge-conflict-inventory.sh](./scripts/01-merge-conflict-inventory.sh)
- **Inventory Output**: [sources/01-merge-conflict-inventory.txt](./sources/01-merge-conflict-inventory.txt)

## Status

Current status: **active**

Current conclusion: the merge is not catastrophic, but the two notebook file conflicts require a manual semantic merge because the incoming editor work landed on pre-refactor file shapes.

## Topics

- merge-conflict
- frontend
- notebook
- codemirror
- packaging

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
