---
Title: Notebook store and preset registry inventory
Ticket: COZODB-018
Status: active
Topics:
    - architecture
    - backend
    - notebook
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: backend/pkg/notebook/store.go
      Note: Primary backend store inventory target
    - Path: backend/main.go
      Note: Host preset switch inventory target
    - Path: backend/pkg/notebook/current_cozo.go
      Note: Cozo preset constructor inventory target
    - Path: backend/pkg/notebook/current_javascript.go
      Note: JavaScript preset constructor inventory target
    - Path: backend/pkg/notebook/current_sqlite.go
      Note: SQLite preset constructor inventory target
ExternalSources: []
Summary: Copy/paste-ready inventory of the current backend store surface and preset composition points before the cleanup work begins.
LastUpdated: 2026-03-23T11:42:00-04:00
WhatFor: Provide a compact technical inventory that an implementer can use while splitting the store and introducing a registry.
WhenToUse: Use while implementing the cleanup or reviewing the current backend composition surface.
---

# Notebook store and preset registry inventory

## Goal

Provide a compact inventory of the backend surfaces that motivate this cleanup ticket, with enough structure that an engineer can quickly classify what belongs where during the refactor.

## Context

The backend already supports multiple presets and a shared notebook module. The remaining cleanup need is not about missing features. It is about code shape:

- `store.go` is large and multi-responsibility
- `main.go` still owns preset selection logic directly

## Quick Reference

### Current store concerns in one file

The current [store.go](../../../../../../backend/pkg/notebook/store.go) owns all of the following:

- store open/close
- migration
- default notebook bootstrap
- notebook CRUD
- cell CRUD and ordering
- run persistence
- runtime state clearing
- timeline snapshot link persistence
- helper functions for default IDs and ordering

### Current backend preset constructors

- [current_cozo.go](../../../../../../backend/pkg/notebook/current_cozo.go)
- [current_javascript.go](../../../../../../backend/pkg/notebook/current_javascript.go)
- [current_sqlite.go](../../../../../../backend/pkg/notebook/current_sqlite.go)

Shared structure across all three:

```pseudocode
open runtime
open optional AI engine
build preset profile
open store with profile
open timeline store
construct notebook module
register extra closers
```

### Current host preset selection

Current [main.go](../../../../../../backend/main.go) behavior:

```pseudocode
parse flags
switch preset name:
    open cozo module
    open javascript module
    open sqlite module
mount module routes
start HTTP server
```

### Recommended target decomposition

Store file split target:

- `store_open.go`
- `store_migrate.go`
- `store_bootstrap.go`
- `store_notebooks.go`
- `store_cells.go`
- `store_runs.go`
- `store_timeline.go`

Preset registry target:

- one registry type
- one normalized options struct
- one registration point for current presets

## Usage Examples

### Re-run the inventory script

```bash
cd /home/manuel/code/wesen/2026-03-14--cozodb-editor
ttmp/2026/03/23/COZODB-018--split-notebook-store-layer-and-introduce-backend-preset-registry/scripts/01-backend-store-and-preset-surface-inventory.sh
```

### Open the captured inventory

```bash
sed -n '1,260p' \
  /home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/23/COZODB-018--split-notebook-store-layer-and-introduce-backend-preset-registry/sources/01-backend-store-and-preset-surface-inventory.txt
```

## Related

- [../design-doc/01-notebook-store-split-and-backend-preset-registry-implementation-guide.md](../design-doc/01-notebook-store-split-and-backend-preset-registry-implementation-guide.md)
- [../sources/01-backend-store-and-preset-surface-inventory.txt](../sources/01-backend-store-and-preset-surface-inventory.txt)
