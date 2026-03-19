---
Title: Notebook QOL Improvements
Ticket: COZODB-006
Status: active
Topics:
    - frontend
    - cozodb
DocType: index
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Ticket for notebook quality-of-life improvements around run sequencing, keyboard shortcuts, and compact auto-growing editors."
LastUpdated: 2026-03-19T10:17:22.611812692-04:00
WhatFor: "Track notebook ergonomics changes that are smaller than feature work but still deserve review history and implementation notes."
WhenToUse: "Use when reviewing or extending notebook quality-of-life behavior in the frontend."
---

# Notebook QOL Improvements

## Overview

This ticket now tracks two layers of notebook work. The first completed layer restored save-before-run behavior for dirty cells, added `Alt+Enter` / `Ctrl+Enter` as run-and-insert shortcuts, and made notebook editors start compact and auto-grow with content.

The second layer is the design and implementation planning work for the next refactor: fix insertion-position integrity, add `clear notebook` and `reset kernel`, and move notebook orchestration into a Redux Toolkit slice. The code is recorded in commit `96fcedef6046242e709460cbcf3479960c8dc9e8` (`feat(notebook): improve run shortcuts and editor sizing`). The implementation diary lives under `reference/01-diary.md`, and the detailed intern guide lives under `design-doc/01-notebook-state-refactor-and-qol-implementation-guide.md`.

## Key Links

- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field
- **Diary**: [reference/01-diary.md](./reference/01-diary.md)
- **Design Doc**: [design-doc/01-notebook-state-refactor-and-qol-implementation-guide.md](./design-doc/01-notebook-state-refactor-and-qol-implementation-guide.md)

## Status

Current status: **active**

## Topics

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
