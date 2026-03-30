---
Title: Split notebook store layer and introduce backend preset registry
Ticket: COZODB-018
Status: complete
Topics:
    - architecture
    - backend
    - notebook
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: backend/pkg/notebook/store_open.go
      Note: Top-level store definition after the responsibility split
    - Path: backend/pkg/notebook/store_bootstrap.go
      Note: Default notebook/bootstrap persistence after the store split
    - Path: backend/pkg/notebook/store_cells.go
      Note: Cell ordering and mutation persistence after the store split
    - Path: backend/main.go
      Note: Backend host startup now resolved through the preset registry
    - Path: backend/pkg/notebook/preset_registry.go
      Note: Registry for default notebook presets and normalized startup options
    - Path: backend/pkg/notebook/module.go
      Note: Module surface that the registry should construct and return uniformly
    - Path: backend/pkg/notebook/current_cozo.go
      Note: Current preset constructor that shows the existing duplicated assembly pattern
    - Path: backend/pkg/notebook/current_javascript.go
      Note: Current JavaScript preset constructor
    - Path: backend/pkg/notebook/current_sqlite.go
      Note: Current SQLite preset constructor
ExternalSources: []
Summary: Cleanup/design ticket for splitting the backend notebook store by responsibility and replacing the hardcoded backend preset switch with a registry-backed startup path.
LastUpdated: 2026-03-23T14:40:00-04:00
WhatFor: Track and explain the backend cleanup phase that split store responsibilities and moved backend preset selection behind a registry for future extensibility.
WhenToUse: Use when reviewing the cleanup, onboarding a new engineer to the backend preset system, or planning future language presets and startup registration.
---

# Split notebook store layer and introduce backend preset registry

## Overview

This ticket is about backend cleanup, not new end-user functionality. The repository now has enough preset families and enough persistence logic that two backend areas have become clear pressure points:

- `backend/pkg/notebook/store.go` has grown into a large multi-responsibility file
- `backend/main.go` still chooses presets through a hardcoded switch rather than a reusable registry

The goal is to clean up those surfaces before the next backend feature or preset lands, while keeping behavior stable.

## Key Links

- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field
- **Design Guide**: [design-doc/01-notebook-store-split-and-backend-preset-registry-implementation-guide.md](./design-doc/01-notebook-store-split-and-backend-preset-registry-implementation-guide.md)
- **Reference Inventory**: [reference/01-notebook-store-and-preset-registry-inventory.md](./reference/01-notebook-store-and-preset-registry-inventory.md)
- **Inventory Script**: [scripts/01-backend-store-and-preset-surface-inventory.sh](./scripts/01-backend-store-and-preset-surface-inventory.sh)
- **Inventory Output**: [sources/01-backend-store-and-preset-surface-inventory.txt](./sources/01-backend-store-and-preset-surface-inventory.txt)

## Status

Current status: **complete**

## Topics

- architecture
- backend
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
