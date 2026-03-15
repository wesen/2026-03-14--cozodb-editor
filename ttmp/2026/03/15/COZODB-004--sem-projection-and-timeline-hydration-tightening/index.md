---
Title: SEM Projection and Timeline Hydration Tightening
Ticket: COZODB-004
Status: active
Topics:
    - frontend
    - sem
    - streaming
    - architecture
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: /tmp/cozodb-streaming-improvements.md
      Note: Imported proposal that seeded the ticket
    - Path: /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/sem/semProjection.js
      Note: Current adjacency-based projector that this ticket is tightening
    - Path: /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/api/websocket.go
      Note: Current request plumbing that drops anchorLine
ExternalSources:
    - local:01-cozodb-streaming-improvements.md
Summary: Ticket workspace for tightening the local Cozo SEM projector and rendering contract so grouping is deterministic and future hydration can reuse the same entity model.
LastUpdated: 2026-03-15T12:15:00-04:00
WhatFor: Track the analysis, tasks, and delivery artifacts for the local-only SEM projection and hydration-readiness cleanup.
WhenToUse: Use when planning or reviewing bundle-based grouping, anchor propagation, frontend projector cleanup, and later replay-readiness work in `cozodb-editor`.
---


# SEM Projection and Timeline Hydration Tightening

## Overview

This ticket narrows the imported SEM streaming proposal to the code that exists in `cozodb-editor` today. The main conclusion is that the current bug is a deterministic-grouping problem, not a missing-LLM-output problem: the frontend groups Cozo SEM widgets by adjacency because the backend does not yet emit explicit bundle and parent metadata. The design doc for this ticket explains the current architecture in detail and recommends a local-only refactor that fixes that contract first.

The ticket intentionally does not include external geppetto or pinocchio changes. It focuses on:

- request anchor plumbing,
- backend-generated bundle metadata,
- deterministic preview/final child IDs,
- frontend bundle-based projection,
- hydration-readiness through stable entity relations.

## Key Links

- Primary design doc: [design-doc/01-sem-projection-and-timeline-hydration-refactor-guide.md](./design-doc/01-sem-projection-and-timeline-hydration-refactor-guide.md)
- Investigation diary: [reference/01-investigation-diary.md](./reference/01-investigation-diary.md)
- Imported proposal source: [sources/local/01-cozodb-streaming-improvements.md](./sources/local/01-cozodb-streaming-improvements.md)
- Tasks: [tasks.md](./tasks.md)
- Changelog: [changelog.md](./changelog.md)

## Status

Current status: **active**

The analysis, task plan, and diary are complete. Implementation work has not started yet.

## Topics

- frontend
- sem
- streaming
- architecture

## Scope Summary

In scope:

- local backend request and structured-event contract cleanup
- local frontend projector and renderer cleanup
- deterministic grouping that is safe for future replay or hydration

Out of scope:

- pinocchio runtime changes
- geppetto extractor API changes
- adding a persistent local timeline store right now

## Tasks

See [tasks.md](./tasks.md) for the granular implementation checklist.

## Changelog

See [changelog.md](./changelog.md) for ticket setup and analysis milestones.
