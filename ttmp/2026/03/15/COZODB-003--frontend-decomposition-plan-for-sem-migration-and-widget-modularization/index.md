---
Title: frontend decomposition plan for SEM migration and widget modularization
Ticket: COZODB-003
Status: active
Topics:
    - frontend
    - architecture
    - streaming
    - sem
    - rich-widgets
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/DatalogPad.jsx
      Note: Primary decomposition target
    - Path: /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/main.jsx
      Note: Frontend boot entrypoint
    - Path: /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/App.jsx
      Note: Current app shell
    - Path: /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/types.go
      Note: Current browser-consumed API contracts
    - Path: /home/manuel/code/wesen/corporate-headquarters/pinocchio/cmd/web-chat/web/src/sem/registry.ts
      Note: Reference event-to-entity frontend registry
    - Path: /home/manuel/workspaces/2026-03-02/deliver-mento-1/temporal-relationships/ui/src/ws/semProjection.ts
      Note: Reference projection model to adapt locally
ExternalSources: []
Summary: Frontend-only ticket for decomposing the JSX architecture of cozodb-editor into clean transport, editor, projection, feature, and theme modules before the larger SEM migration lands.
LastUpdated: 2026-03-15T00:33:24.731261323-04:00
WhatFor: Analyze how to modularize the current frontend so the later geppetto/pinocchio/SEM migration is easier, safer, and reviewable.
WhenToUse: Use this ticket when planning or reviewing frontend-only decomposition work ahead of the richer streaming integration.
---

# frontend decomposition plan for SEM migration and widget modularization

## Overview

This ticket focuses only on the JSX side of `cozodb-editor`. The goal is to explain the current frontend architecture in enough detail for a new intern to understand it, identify the main modularity problems, and propose a staged decomposition plan that prepares the app for future SEM-driven streaming and widget work.

The primary deliverable is an intern-facing design and implementation guide that explains:

- what each current file does,
- how the browser talks to the backend,
- why `DatalogPad.jsx` has become the main coupling point,
- which new folders and modules should exist,
- in what order the split should happen.

## Key Links

- Primary guide: `design-doc/01-frontend-decomposition-architecture-review-and-intern-implementation-guide.md`
- Investigation diary: `reference/01-investigation-diary.md`
- Task breakdown: `tasks.md`

## Status

Current status: **active**

Current deliverables in this ticket:

- detailed current-state frontend review,
- decomposition architecture and migration phases,
- granular task list for implementation,
- delivery bundle for reMarkable.

## Topics

- frontend
- architecture
- streaming
- sem
- rich-widgets

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
