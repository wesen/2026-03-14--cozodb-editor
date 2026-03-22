---
Title: Notebook packaging API design and current app preset guide
Ticket: COZODB-013
Status: active
Topics:
    - architecture
    - backend
    - frontend
    - cozodb
    - javascript
DocType: index
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Packaging and API design ticket for extracting reusable notebook frontend/backend modules, defining the current app as preset #1, and preparing for a JavaScript-oriented second surface."
LastUpdated: 2026-03-22T12:43:19.565973251-04:00
WhatFor: "Define the next-stage package and API design for turning the current notebook system into reusable frontend and backend modules with a current-app preset and a future JavaScript-language surface."
WhenToUse: "Use when planning or implementing package extraction after the frontend and backend cutovers, onboarding an intern to the packaging work, or designing the follow-on JavaScript-targeting preset."
---

# Notebook packaging API design and current app preset guide

## Overview

This ticket follows `COZODB-011` and `COZODB-012`. The frontend and backend are now modularized enough that the next problem is explicit package design: what should the reusable notebook APIs actually look like, how should the current app be expressed as a preset on top of them, and how should we leave room for a second language surface that exposes JavaScript instead of only Cozo.

## Key Links

- Design guide:
  [design-doc/01-notebook-packaging-api-design-and-current-app-preset-implementation-guide.md](./design-doc/01-notebook-packaging-api-design-and-current-app-preset-implementation-guide.md)
- Diary:
  [reference/01-diary.md](./reference/01-diary.md)
- Package inventory script:
  [scripts/01-package-surface-inventory.sh](./scripts/01-package-surface-inventory.sh)
- Package inventory output:
  [sources/01-package-surface-inventory.txt](./sources/01-package-surface-inventory.txt)

## Status

Current status: **active**

- Research and package-boundary analysis are complete.
- The detailed intern-facing guide is written.
- The current app preset strategy is defined.
- The package inventory script and captured source output are available.
- The future JavaScript-language surface is framed as the next reusable preset family.
- The ticket bundle has been uploaded to reMarkable.

## Topics

- architecture
- backend
- frontend
- cozodb
- javascript

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
