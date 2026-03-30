---
Title: JavaScript notebook preset with go-go-goja runtime and frontend surface
Ticket: COZODB-014
Status: complete
Topics:
    - architecture
    - backend
    - frontend
    - javascript
    - notebook
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: /home/manuel/code/wesen/corporate-headquarters/go-go-goja/engine/factory.go
      Note: go-go-goja runtime builder and factory lifecycle that will host the JavaScript kernel
    - Path: /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/main.go
      Note: main entrypoint now selects cozo or javascript preset
    - Path: /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/current_javascript.go
      Note: current JavaScript preset constructor on the backend
    - Path: /home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/runtime.go
      Note: notebook runtime seam generalized for multiple presets
    - Path: /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/App.tsx
      Note: frontend entrypoint now selects cozo or javascript preset by env
    - Path: /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/currentJavaScript.tsx
      Note: current JavaScript preset wrapper on the frontend
    - Path: /home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/22/COZODB-014--javascript-notebook-preset-with-go-go-goja-runtime-and-frontend-surface/scripts/01-js-preset-inventory.sh
      Note: ticket-local inventory script used during initial design work
ExternalSources: []
Summary: 'Completed preset #2 for the notebook package with a go-go-goja-backed JavaScript runtime, a matching frontend preset, Storybook coverage, and intern-facing implementation documentation.'
LastUpdated: 2026-03-22T16:36:47.510734742-04:00
WhatFor: Track the implementation work required to turn the newly modular notebook package into a multi-language system with JavaScript as the second supported preset family.
WhenToUse: Use when implementing, reviewing, or validating the JavaScript notebook preset across backend runtime composition, frontend preset composition, testing, and onboarding documentation.
---



# JavaScript notebook preset with go-go-goja runtime and frontend surface

## Overview

This ticket implemented the first non-Cozo preset on top of the packaged notebook architecture. The backend result is a go-go-goja-backed runtime with notebook-owned result shaping, reset support, JavaScript starter defaults, and preset-owned websocket fallback copy. The frontend result is a JavaScript notebook preset that reuses the shared notebook package, but swaps in JavaScript-oriented defaults, stories, and entrypoint selection.

The critical architectural rule is that this work must not fork the notebook system. Generic notebook seams stay in [runtime.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/runtime.go), [profile.go](/home/manuel/code/wesen/2026-03-14--cozodb-editor/backend/pkg/notebook/profile.go), [NotebookApp.tsx](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/NotebookApp.tsx), and [experienceConfig.ts](/home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend/src/notebook/experienceConfig.ts). Cozo-specific behavior remains in the current Cozo preset; JavaScript-specific behavior must be introduced as a sibling preset.

## Key Links

- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field

## Status

Current status: **complete**

Current focus:
- backend runtime contract is notebook-owned instead of Cozo-owned
- current JavaScript backend preset exists beside the current Cozo preset
- current JavaScript frontend preset exists beside the current Cozo preset
- Storybook and build validation cover both preset families
- detailed postmortem and intern analysis added in `design-doc/02-...`

## Topics

- architecture
- backend
- frontend
- javascript
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
