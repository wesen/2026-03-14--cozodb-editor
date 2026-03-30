---
Title: Backend notebook package cutover and current app rewiring
Ticket: COZODB-012
Status: complete
Topics:
    - architecture
    - backend
    - cozodb
    - frontend
DocType: index
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: Backend modularization ticket for moving notebook backend ownership into backend/pkg/notebook and rewiring the current app to use that package surface directly.
LastUpdated: 2026-03-22T12:39:08.358609309-04:00
WhatFor: Track the backend cutover work that follows the completed frontend decomposition ticket.
WhenToUse: Use when continuing backend modularization, reviewing the backend cut sequence, or locating the implementation guide and diary for COZODB-012.
---


# Backend notebook package cutover and current app rewiring

## Overview

This ticket is the backend counterpart to `COZODB-011`. Its purpose is to move notebook package ownership into `backend/pkg/notebook`, then rewire the current app to use that package directly without preserving the old assembly paths.

## Key Links

- Design guide:
  [design-doc/01-backend-notebook-package-cutover-implementation-guide.md](./design-doc/01-backend-notebook-package-cutover-implementation-guide.md)
- Diary:
  [reference/01-diary.md](./reference/01-diary.md)
- Coupling inventory script:
  [scripts/01-backend-coupling-inventory.sh](./scripts/01-backend-coupling-inventory.sh)

## Status

Current status: **complete**

- Planning is complete.
- Notebook service dependency inversion is complete.
- Notebook REST route ownership is complete.
- Notebook WebSocket and AI transport cutover is complete.
- Frontend and backend validation are complete.
- `COZODB-010` is now unblocked for package extraction work.

## Topics

- architecture
- backend
- cozodb
- frontend

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
