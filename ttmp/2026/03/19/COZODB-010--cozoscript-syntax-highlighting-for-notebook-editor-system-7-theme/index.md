---
Title: CozoScript Syntax Highlighting for Notebook Editor (System 7 Theme)
Ticket: COZODB-010
Status: active
Topics:
    - syntax-highlighting
    - codemirror
    - frontend
    - cozodb
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: 2026-02-24--cozoscript-treesitter-autocomplete/lang-cozoscript/src/complete.js
      Note: Context-aware autocomplete with 200+ completions (reuse as-is)
    - Path: 2026-02-24--cozoscript-treesitter-autocomplete/lang-cozoscript/src/cozoscript.grammar
      Note: Lezer grammar defining CozoScript syntax (396 lines
    - Path: 2026-02-24--cozoscript-treesitter-autocomplete/lang-cozoscript/src/highlight.js
      Note: styleTags mapping 73 node types to highlight tags (reuse as-is)
    - Path: 2026-02-24--cozoscript-treesitter-autocomplete/lang-cozoscript/src/index.js
      Note: Language package entry point with cozoLanguage export
    - Path: 2026-02-24--cozoscript-treesitter-autocomplete/lang-cozoscript/src/theme.js
      Note: Catppuccin Mocha theme (reference for System 7 theme)
    - Path: 2026-03-14--cozodb-editor/frontend/src/notebook/NotebookCellCard.tsx
      Note: Cell component with textarea to replace with CodeMirror
    - Path: 2026-03-14--cozodb-editor/frontend/src/theme/tokens.css
      Note: System 7 design tokens that new theme must match
ExternalSources: []
Summary: ""
LastUpdated: 2026-03-19T22:40:08.155333799-04:00
WhatFor: ""
WhenToUse: ""
---


# CozoScript Syntax Highlighting for Notebook Editor (System 7 Theme)

## Overview

<!-- Provide a brief overview of the ticket, its goals, and current status -->

## Key Links

- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field

## Status

Current status: **active**

## Topics

- syntax-highlighting
- codemirror
- frontend
- cozodb

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
