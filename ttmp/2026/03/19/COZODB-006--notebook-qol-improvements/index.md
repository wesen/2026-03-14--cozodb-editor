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

This ticket tracks a small but user-visible notebook polish slice. The implemented changes restore save-before-run behavior for dirty cells, add `Alt+Enter` / `Ctrl+Enter` as run-and-insert shortcuts, and make notebook editors start compact and auto-grow with content.

The code is recorded in commit `96fcedef6046242e709460cbcf3479960c8dc9e8` (`feat(notebook): improve run shortcuts and editor sizing`). The implementation diary lives under `reference/01-diary.md`.

## Key Links

- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field
- **Diary**: [reference/01-diary.md](./reference/01-diary.md)

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
