---
Title: Reusable CodeMirror notebook editor with JavaScript and SQL preset highlighting
Ticket: COZODB-017
Status: complete
Topics:
    - frontend
    - codemirror
    - notebook
    - javascript
    - sqlite
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: frontend/src/editor/CozoScriptEditor.tsx
      Note: Existing notebook CodeMirror implementation that should be generalized rather than copied
    - Path: frontend/src/notebook/NotebookCellCardView.tsx
      Note: Notebook cell rendering seam where the preset-provided editor component is consumed
    - Path: frontend/src/notebook/currentCozoConfig.ts
      Note: Current preset that already injects a custom editor
    - Path: frontend/src/notebook/currentJavaScriptConfig.ts
      Note: JavaScript preset config now opts into the reusable CodeMirror editor
    - Path: frontend/src/notebook/currentSQLiteConfig.ts
      Note: SQLite preset config now opts into the reusable CodeMirror editor
ExternalSources: []
Summary: Extract a reusable CodeMirror notebook editor, then wire JavaScript and SQLite presets to it with Storybook coverage and validation.
LastUpdated: 2026-03-23T10:41:15.82385199-04:00
WhatFor: Track the extraction of a reusable notebook CodeMirror editor and the addition of JavaScript and SQL syntax highlighting for preset-based notebook experiences.
WhenToUse: Use when implementing or reviewing editor-layer modularization, preset editor wiring, or Storybook coverage for notebook code cells.
---

# Reusable CodeMirror notebook editor with JavaScript and SQL preset highlighting

## Overview

This ticket turns the current Cozo-only CodeMirror editor into a reusable notebook editor primitive and uses that primitive to add proper syntax highlighting to the JavaScript and SQLite presets. The goal is not just to make those two presets prettier. The real goal is to stop treating syntax highlighting as a one-off Cozo feature and instead make editor selection a first-class preset concern inside the packaged notebook system.

## Key Links

- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field
- **Design Guide**: [design-doc/01-codemirror-notebook-editor-extraction-and-javascript-sql-syntax-highlighting-guide.md](./design-doc/01-codemirror-notebook-editor-extraction-and-javascript-sql-syntax-highlighting-guide.md)
- **Diary**: [reference/01-codemirror-editor-implementation-diary.md](./reference/01-codemirror-editor-implementation-diary.md)
- **Inventory Script**: [scripts/01-editor-surface-inventory.sh](./scripts/01-editor-surface-inventory.sh)
- **Inventory Output**: [sources/01-editor-surface-inventory.txt](./sources/01-editor-surface-inventory.txt)

## Status

Current status: **complete**

## Topics

- frontend
- storybook
- editor
- notebook
- javascript
- sql

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
